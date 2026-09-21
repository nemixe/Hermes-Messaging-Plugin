"""Send a Mattermost DM using the default profile's messaging bot token."""
import argparse
import fcntl
import json
import os
from pathlib import Path
import re
import time
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlsplit
from urllib.request import Request, urlopen
import uuid


USER_ID = re.compile(r"^[a-z0-9]{26}$")
EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
ENV_KEY = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
REQUEST_ID = re.compile(r"^[0-9a-f]{32}$")
MAX_POST_LENGTH = 4000
LOOPBACK = {"localhost", "127.0.0.1", "::1"}
DEFAULT_WAIT = 150


def parse_env(path):
    values = {}
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].strip()
        if "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        if not key or any(character.isspace() for character in key):
            continue
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
            value = value[1:-1]
        values[key] = value
    return values


def messaging_home(environ=None, home=None):
    env = os.environ if environ is None else environ
    if home:
        return Path(home).expanduser()
    current = env.get("HERMES_HOME")
    if current:
        path = Path(current).expanduser()
        if path.parent.name == "profiles":
            return path.parent.parent
        return path
    return Path.home() / ".hermes"


def config_mattermost(root):
    """Read Mattermost url/token/allowlist from default-profile config.yaml."""
    path = root / "config.yaml"
    if not path.is_file():
        return "", "", ""
    try:
        import yaml
        data = yaml.safe_load(path.read_text()) or {}
    except Exception:
        return "", "", ""
    if not isinstance(data, dict):
        return "", "", ""
    platforms = data.get("platforms")
    if not isinstance(platforms, dict):
        return "", "", ""
    mattermost = platforms.get("mattermost")
    if not isinstance(mattermost, dict):
        return "", "", ""
    extra = mattermost.get("extra") if isinstance(mattermost.get("extra"), dict) else {}
    url = str(mattermost.get("url") or extra.get("url") or "").strip()
    token = str(mattermost.get("token") or extra.get("token") or "").strip()
    allowed = mattermost.get("allowed_users", extra.get("allowed_users", ""))
    if isinstance(allowed, list):
        allowed = ",".join(str(item) for item in allowed if str(item).strip())
    return url, token, str(allowed or "")


def credentials(environ=None, home=None):
    env = os.environ if environ is None else environ
    root = messaging_home(env, home)
    file_values = parse_env(root / ".env") if (root / ".env").is_file() else {}
    yaml_url, yaml_token, yaml_allowed = config_mattermost(root)
    url = (env.get("MATTERMOST_URL") or file_values.get("MATTERMOST_URL") or yaml_url or "").strip()
    token = (env.get("MATTERMOST_TOKEN") or file_values.get("MATTERMOST_TOKEN") or yaml_token or "").strip()
    allowed = env.get("MATTERMOST_ALLOWED_USERS")
    if allowed is None:
        allowed = file_values.get("MATTERMOST_ALLOWED_USERS")
        if allowed is None:
            allowed = yaml_allowed
    if not url or not token:
        raise ValueError(
            "Configure Mattermost on the default profile: MATTERMOST_URL and "
            "MATTERMOST_TOKEN in .env, or platforms.mattermost url/token in config.yaml")
    return url, token, allowed, root


def public_text(text, token):
    text = text or ""
    return text.replace(token, "***") if token else text


def validate_url(url):
    parsed = urlsplit(url)
    if (not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment
            or (parsed.scheme != "https" and not (
                parsed.scheme == "http" and parsed.hostname in LOOPBACK))):
        raise ValueError("MATTERMOST_URL must be an HTTPS base URL (HTTP is allowed only on loopback)")
    return url.rstrip("/")


def lookup_path(user):
    user = (user or "").strip().lstrip("@")
    if not user:
        raise ValueError("Supply a Mattermost username, email, or user ID")
    if USER_ID.fullmatch(user):
        return f"users/{user}"
    if EMAIL.fullmatch(user):
        return f"users/email/{quote(user, safe='')}"
    return f"users/username/{quote(user, safe='')}"


def allowlist(raw):
    text = (raw or "").strip()
    if not text or text == "*":
        return None
    return {part.strip() for part in text.split(",") if part.strip()}


def http_error_message(code, path, body, token):
    text = public_text(body, token)
    lowered = text.lower()
    if int(code) == 403 and ("1010" in text or "cloudflare" in lowered):
        return (
            f"Mattermost API 403 for {path}: Cloudflare error 1010 blocked this client. "
            "The helper used the default profile Mattermost bot token. Ask the Mattermost "
            "admin to allow API clients from this host.")
    return f"Mattermost API {code} for {path}: {text}"


def http_request(base_url, token, method, path, payload=None, timeout=30):
    if ".." in path:
        raise ValueError("Invalid Mattermost API path")
    url = f"{base_url}/api/v4/{path.lstrip('/')}"
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "User-Agent": "Hermes-Agent",
    }
    if body is not None:
        headers["Content-Type"] = "application/json"
    request = Request(url, data=body, method=method, headers=headers)
    try:
        with urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except HTTPError as error:
        raise ValueError(http_error_message(
            error.code, path, error.read().decode("utf-8", "replace")[:300], token)) from None
    except URLError:
        raise ValueError("Mattermost request failed; check MATTERMOST_URL") from None


def send_dm(user, message, *, environ=None, home=None, request=None):
    if not (message or "").strip():
        raise ValueError("Supply the Mattermost DM text")
    if len(message) > MAX_POST_LENGTH:
        raise ValueError(f"Mattermost DM text must be at most {MAX_POST_LENGTH} characters")
    url, token, allowed, _root = credentials(environ, home)
    base_url = validate_url(url)
    api = request or (lambda method, path, payload=None: http_request(base_url, token, method, path, payload))
    me = api("GET", "users/me")
    bot_id = str((me or {}).get("id") or "")
    if not USER_ID.fullmatch(bot_id):
        raise ValueError("Mattermost bot identity is missing; check MATTERMOST_TOKEN")
    target = api("GET", lookup_path(user))
    user_id = str((target or {}).get("id") or "")
    if not USER_ID.fullmatch(user_id):
        raise ValueError("Mattermost user not found")
    if user_id == bot_id:
        raise ValueError("The Mattermost bot cannot DM itself")
    permitted = allowlist(allowed)
    if permitted is not None and user_id not in permitted:
        raise ValueError("That Mattermost user is outside MATTERMOST_ALLOWED_USERS")
    channel = api("POST", "channels/direct", [bot_id, user_id])
    channel_id = str((channel or {}).get("id") or "")
    if not channel_id:
        raise ValueError("Mattermost did not return a DM channel")
    post = api("POST", "posts", {
        "channel_id": channel_id,
        "message": message,
        "props": {"disable_mentions": True},
    })
    post_id = str((post or {}).get("id") or "")
    if not post_id:
        raise ValueError("Mattermost did not return a post ID")
    return {
        "ok": True,
        "user_id": user_id,
        "username": target.get("username"),
        "channel_id": channel_id,
        "post_id": post_id,
    }


def store_dir(environ=None, home=None):
    home_root = messaging_home(environ, home)
    runtime = home_root / "runtime"
    root = runtime / "mattermost-dm"
    if any(path.is_symlink() for path in (home_root, runtime, root)):
        raise ValueError("The Mattermost DM runtime directory must not be symlinked")
    runtime.mkdir(exist_ok=True, mode=0o700)
    root.mkdir(exist_ok=True, mode=0o700)
    os.chmod(root, 0o700)
    return root


def _lock(root):
    lock_path = root / "store.lock"
    handle = lock_path.open("a")
    fcntl.flock(handle, fcntl.LOCK_EX)
    return handle


def _read_record(path):
    data = json.loads(path.read_text())
    if not isinstance(data, dict) or not REQUEST_ID.fullmatch(str(data.get("id") or "")):
        raise ValueError("Mattermost DM request record is invalid")
    return data


def _write_record(path, data):
    path.write_text(json.dumps(data, separators=(",", ":")))
    os.chmod(path, 0o600)


def public_record(data):
    return {key: data.get(key) for key in (
        "id", "status", "user_id", "username", "channel_id", "post_id", "dest", "keys",
        "origin_session_id", "profile_home", "created_at", "completed_at")}


def parse_keys(raw):
    if raw is None or str(raw).strip() == "":
        return []
    keys = [part.strip() for part in str(raw).split(",")]
    if any(not ENV_KEY.fullmatch(key) for key in keys):
        raise ValueError("Confidential names must be comma-separated identifiers")
    return keys


def validate_dest(dest, environ=None, home=None):
    env = os.environ if environ is None else environ
    dest = Path(dest).expanduser()
    if not dest.is_absolute():
        current = env.get("HERMES_HOME")
        if not current:
            raise ValueError("Set HERMES_HOME to resolve a relative destination path")
        dest = Path(current) / dest
    dest = dest.resolve()
    if dest.is_dir():
        raise ValueError("Destination must be a file")
    roots = []
    if env.get("HERMES_HOME"):
        roots.append(Path(env["HERMES_HOME"]).expanduser().resolve())
    message_root = messaging_home(env, home).resolve()
    roots.extend((message_root, message_root / "profiles"))
    store = message_root / "runtime" / "mattermost-dm"
    if dest.is_symlink() or any(path.is_symlink() for path in dest.parents):
        raise ValueError("Destination file must not be symlinked")
    if dest == store or dest.is_relative_to(store):
        raise ValueError("Destination file must not be the Mattermost DM request store")
    if not any(dest.is_relative_to(root) for root in roots):
        raise ValueError("Destination file must be inside the active profile or Hermes home")
    return dest


def request_dm(user, message, dest, keys=None, *, environ=None, home=None, request=None):
    env = os.environ if environ is None else environ
    destination = validate_dest(dest, env, home)
    names = parse_keys(keys)
    sent = send_dm(user, message, environ=env, home=home, request=request)
    root = store_dir(env, home)
    created = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    record = {
        "id": uuid.uuid4().hex,
        "status": "pending",
        "user_id": sent["user_id"],
        "username": sent.get("username"),
        "channel_id": sent["channel_id"],
        "post_id": sent["post_id"],
        "dest": str(destination),
        "keys": names,
        "origin_session_id": env.get("HERMES_SESSION_ID") or "",
        "origin_session_key": env.get("HERMES_SESSION_KEY") or "",
        "profile_home": str(Path(env["HERMES_HOME"]).expanduser().resolve()) if env.get("HERMES_HOME") else "",
        "created_at": created,
        "completed_at": None,
    }
    with _lock(root):
        for path in sorted(root.glob("*.json")):
            existing = _read_record(path)
            if existing.get("status") == "pending" and existing.get("user_id") == record["user_id"]:
                existing["status"] = "superseded"
                _write_record(path, existing)
        _write_record(root / f"{record['id']}.json", record)
    return {**public_record(record), "ok": True}


def pending_dm(user_id, channel_id=None, *, environ=None, home=None):
    user_id = (user_id or "").strip()
    if not USER_ID.fullmatch(user_id):
        raise ValueError("Supply the Mattermost user ID for the pending DM")
    root = store_dir(environ, home)
    matches = []
    with _lock(root):
        for path in sorted(root.glob("*.json")):
            data = _read_record(path)
            if data.get("status") != "pending" or data.get("user_id") != user_id:
                continue
            if channel_id and data.get("channel_id") != channel_id:
                continue
            matches.append(data)
    if not matches:
        return {"ok": True, "pending": False}
    matches.sort(key=lambda item: item.get("created_at") or "")
    return {"ok": True, "pending": True, **public_record(matches[-1])}


def complete_dm(request_id, *, environ=None, home=None):
    if not REQUEST_ID.fullmatch(request_id or ""):
        raise ValueError("Supply the Mattermost DM request id")
    root = store_dir(environ, home)
    path = root / f"{request_id}.json"
    with _lock(root):
        if not path.is_file():
            raise ValueError("Mattermost DM request not found")
        data = _read_record(path)
        if data.get("status") == "pending":
            data["status"] = "complete"
            data["completed_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            _write_record(path, data)
    return {"ok": True, **public_record(data)}


def wait_dm(request_id, *, timeout=DEFAULT_WAIT, poll=1.0, environ=None, home=None):
    if not REQUEST_ID.fullmatch(request_id or ""):
        raise ValueError("Supply the Mattermost DM request id")
    root = store_dir(environ, home)
    path = root / f"{request_id}.json"
    deadline = time.monotonic() + max(0.0, float(timeout))
    while True:
        with _lock(root):
            if not path.is_file():
                raise ValueError("Mattermost DM request not found")
            data = _read_record(path)
        if data.get("status") == "complete":
            return {"ok": True, **public_record(data)}
        if data.get("status") != "pending":
            return {"ok": True, **public_record(data)}
        if time.monotonic() >= deadline:
            return {"ok": True, "waited": True, **public_record(data)}
        time.sleep(max(0.05, float(poll)))


def _run(args):
    if args.command == "send":
        if not args.user or args.message is None:
            raise ValueError("send requires --user and --message")
        return send_dm(args.user, args.message, home=args.home)
    if args.command == "request":
        if not args.user or args.message is None or not args.dest:
            raise ValueError("request requires --user, --message and --dest")
        return request_dm(args.user, args.message, args.dest, args.keys, home=args.home)
    if args.command == "pending":
        if not args.user:
            raise ValueError("pending requires --user")
        return pending_dm(args.user, args.channel, home=args.home)
    if args.command == "complete":
        if not args.id:
            raise ValueError("complete requires --id")
        return complete_dm(args.id, home=args.home)
    if args.command == "wait":
        if not args.id:
            raise ValueError("wait requires --id")
        return wait_dm(args.id, timeout=args.timeout, home=args.home)
    raise ValueError("Unknown Mattermost DM command")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", nargs="?", default="send",
                        choices=("send", "request", "pending", "complete", "wait"))
    parser.add_argument("--user", help="Mattermost username, email, or user ID")
    parser.add_argument("--message", help="DM text")
    parser.add_argument("--dest", help="Profile path that will receive the confidential material")
    parser.add_argument("--keys", help="Comma-separated names of the confidential items to collect")
    parser.add_argument("--id", help="Personal-chat request id")
    parser.add_argument("--channel", help="Mattermost DM channel ID")
    parser.add_argument("--timeout", type=float, default=DEFAULT_WAIT)
    parser.add_argument("--home", help="Default Hermes home whose .env holds Mattermost credentials")
    args = parser.parse_args()
    try:
        print(json.dumps(_run(args), separators=(",", ":")))
    except (OSError, ValueError, json.JSONDecodeError) as error:
        parser.exit(1, f"Mattermost DM failed: {error}\n")
