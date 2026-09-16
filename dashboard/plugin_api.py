"""Desktop management API. Mounted behind Hermes's existing session/OAuth auth."""
import asyncio
from contextlib import contextmanager
import hashlib
import importlib
import json
from pathlib import Path
import re
import sqlite3
import time
from urllib.parse import urlsplit

import aiohttp
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
import yaml

from agent.secret_scope import build_profile_secret_scope, set_secret_scope, reset_secret_scope
from gateway.config import GatewayConfig, PlatformConfig
from gateway.config_loader import merge_platform_sections
from gateway.platforms._shared import extra_or_secret
from hermes_constants import get_default_hermes_root, set_hermes_home_override, reset_hermes_home_override
from hermes_cli.profiles import profiles_to_serve, read_profile_meta

# Hermes imports this API as a standalone module. Give relative imports the
# installed package root; never depend on another profile's plugin namespace.
__path__ = [str(Path(__file__).resolve().parent.parent)]
cli = importlib.import_module(__name__ + ".cli")
router = APIRouter()


@contextmanager
def root_scope():
    root = get_default_hermes_root()
    home_token = set_hermes_home_override(root)
    secret_token = None
    try:
        # A missing default-profile credential must not fall through to the
        # backend process's environment, which may belong to another profile.
        secret_token = set_secret_scope({"GITLAB_URL": "", "GITLAB_TOKEN": "",
                                         **build_profile_secret_scope(root)})
        yield root
    finally:
        if secret_token is not None:
            reset_secret_scope(secret_token)
        reset_hermes_home_override(home_token)


def settings(root):
    raw = (root / "config.yaml").read_bytes()
    config = cli.read_config(root / "config.yaml", raw=raw)
    extra = PlatformConfig.from_dict(merge_platform_sections(config, config.get("gateway", {}), {}).get("gitlab", {})).extra
    return config, extra, hashlib.sha256(raw).hexdigest()


def connection(extra):
    url = str(extra_or_secret(extra, "url", "GITLAB_URL") or "").rstrip("/")
    token = extra_or_secret(extra, "token", "GITLAB_TOKEN")
    parsed = urlsplit(url)
    if (not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment
            or (parsed.scheme != "https" and not (parsed.scheme == "http" and parsed.hostname in {"localhost", "127.0.0.1", "::1"}))):
        raise HTTPException(409, "Configure an HTTPS GitLab URL in Messaging → GitLab first")
    if not token:
        raise HTTPException(409, "Configure the bot PAT in Messaging → GitLab first")
    return url, str(token)


async def gitlab_get(extra, path, params=None):
    url, token = connection(extra)
    try:
        async with aiohttp.ClientSession(headers={"PRIVATE-TOKEN": token}, timeout=aiohttp.ClientTimeout(total=10)) as client:
            async with client.get(f"{url}/api/v4/{path}", params=params, allow_redirects=False) as response:
                if not 200 <= response.status < 300:
                    raise HTTPException(502, f"GitLab returned HTTP {response.status}; check the bot's access")
                return await response.json()
    except (aiohttp.ClientError, asyncio.TimeoutError, ValueError):
        raise HTTPException(502, "Could not reach GitLab; check the URL, PAT and network") from None


def repository(item, extra):
    try:
        ident = next(iter(cli.ids([item["id"]])))
        name = item["path_with_namespace"]
        if not isinstance(name, str) or not name.strip():
            raise ValueError()
        # Derive links from the configured server and GitLab's encoded namespace.
        from urllib.parse import quote
        url, _ = connection(extra)
        return {"id": ident, "name": name[:1000], "url": url + "/" + quote(name, safe="/")}
    except (KeyError, TypeError, ValueError):
        raise HTTPException(502, "GitLab returned an invalid repository") from None


@contextmanager
def errors():
    try:
        yield
    except yaml.YAMLError:
        raise HTTPException(409, "Invalid YAML in the default profile's config.yaml") from None
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from None
    except OSError:
        raise HTTPException(409, "Could not read or save Hermes configuration on this backend") from None


@router.get("/projects")
def projects():
    with errors(), root_scope() as root:
        config, extra, revision = settings(root)
        routes = [r for r in cli.route_settings(config).get("profile_routes", []) if cli.managed_route(r)]
        info = extra.get("repository_info") or {}
        profiles = {name: path for name, path in profiles_to_serve(True) if name not in cli.RESERVED_PROFILES}
        # Existing managed routes identify legacy projects until their next save stamps metadata.
        names = sorted(({name for name, path in profiles.items() if cli.is_project_profile(path)}
                        | {r["profile"] for r in routes}) - cli.RESERVED_PROFILES)
        rows = []
        for name in names:
            repos = []
            for route in routes:
                if route.get("profile") == name:
                    ident = route["chat_id"].split(":")[1]
                    repos.append({"id": ident, "name": info.get(ident, {}).get("name", f"Repository {ident}"),
                                  "url": info.get(ident, {}).get("url"), "enabled": route.get("enabled", True)})
            rows.append({"profile": name, "profile_type": "project", "available": name in profiles,
                         "description": read_profile_meta(profiles[name])["description"] if name in profiles else "",
                         "repositories": sorted(repos, key=lambda r: r["name"].casefold())})
        try:
            url, _ = connection(extra)
            configured = True
        except HTTPException:
            url, configured = "", False
        events = load_events(root)
        latest = {}
        open_count = 0
        for event in events:
            if event["status"] != "delivered":
                open_count += 1
            profile = event.get("profile")
            if profile and profile not in latest:
                latest[profile] = compact_event(event)
        for row in rows:
            row["last_event"] = latest.get(row["profile"])
        return {"projects": rows, "revision": revision, "url": url, "connection_configured": configured,
                "multiplex_enabled": GatewayConfig.from_dict(config).multiplex_profiles,
                "poll_interval": extra.get("poll_interval", 30), "transport": "polling",
                "open_count": open_count}


def inbox_path(root):
    folder = Path(root) / "gitlab"
    if not folder.is_dir():
        return None
    files = [path for path in folder.glob("*.sqlite3") if path.is_file()]
    if not files:
        return None
    return max(files, key=lambda path: path.stat().st_mtime)


def command_from(todo):
    body = todo.get("body")
    if todo.get("action_name") not in {"mentioned", "directly_addressed"} or not isinstance(body, str):
        return None
    match = re.fullmatch(r"\s*@\S+[ \t]+(/[a-z][a-z0-9-]*(?:[ \t]+[^\r\n]+)?)[ \t]*", body, re.I)
    return match[1].strip() if match else None


def event_status(completed, last_error):
    if completed:
        return "delivered"
    return "retrying" if last_error else "pending"


def compact_event(event):
    return {key: event[key] for key in ("id", "status", "created_at", "kind", "iid", "target_type", "repository")
            if key in event}


def public_event(ident, payload, completed, attempts, last_error, routes, info, delivery):
    todo = json.loads(payload)
    if not isinstance(todo, dict):
        raise ValueError("invalid to-do")
    project = todo.get("project") if isinstance(todo.get("project"), dict) else {}
    target = todo.get("target") if isinstance(todo.get("target"), dict) else {}
    author = todo.get("author") if isinstance(todo.get("author"), dict) else {}
    project_id = str(project.get("id") or "")
    if not re.fullmatch(r"[1-9][0-9]*", project_id):
        raise ValueError("invalid project")
    resource = {"Issue": "issues", "MergeRequest": "merge_requests"}.get(todo.get("target_type"))
    iid = str(target.get("iid") or "")
    repo = info.get(project_id) or {}
    name = repo.get("name") or project.get("path_with_namespace") or f"Repository {project_id}"
    if not isinstance(name, str) or not name.strip():
        name = f"Repository {project_id}"
    command = command_from(todo)
    action = todo.get("action_name")
    kind = command or ("assignment" if action == "assigned" else "mention")
    username = author.get("username") or author.get("id") or ""
    return {
        "id": str(ident),
        "created_at": str(todo.get("created_at") or "")[:40],
        "profile": routes.get(project_id),
        "repository": {"id": project_id, "name": name[:1000], "url": repo.get("url")},
        "action": action if action in {"mentioned", "directly_addressed", "assigned"} else None,
        "target_type": todo.get("target_type") if todo.get("target_type") in {"Issue", "MergeRequest"} else None,
        "iid": iid if re.fullmatch(r"[1-9][0-9]*", iid) else "",
        "title": str(target.get("title") or "")[:1000],
        "author": str(username)[:200],
        "body": str(todo.get("body") or "")[:20000],
        "status": event_status(completed, last_error),
        "attempts": int(attempts or 0),
        "last_error": last_error,
        "card": f"{project_id}:{resource}:{iid}" if resource and re.fullmatch(r"[1-9][0-9]*", iid) else None,
        "conversation": delivery.get("conversation") if isinstance(delivery, dict) else None,
        "discussion": delivery.get("discussion") if isinstance(delivery, dict) else None,
        "command": command,
        "kind": kind,
    }


def load_events(root):
    path = inbox_path(root)
    if path is None:
        return []
    config, extra, _ = settings(root)
    routes = {r["chat_id"].split(":")[1]: r["profile"]
              for r in cli.route_settings(config).get("profile_routes", []) if cli.managed_route(r)}
    info = extra.get("repository_info") or {}
    try:
        database = sqlite3.connect(path, timeout=2)
    except sqlite3.Error:
        return []
    try:
        rows = database.execute(
            "SELECT id, payload, completed, attempts, last_error FROM inbox ORDER BY id DESC").fetchall()
        deliveries = {}
        for ident, *_ in rows:
            row = database.execute("SELECT value FROM meta WHERE key = ?", (f"delivery:todo:{ident}",)).fetchone()
            if row:
                try:
                    deliveries[ident] = json.loads(row[0])
                except (TypeError, ValueError, json.JSONDecodeError):
                    continue
        events = []
        for ident, payload, completed, attempts, last_error in rows:
            try:
                events.append(public_event(ident, payload, completed, attempts, last_error, routes, info,
                                           deliveries.get(ident)))
            except (TypeError, ValueError, json.JSONDecodeError, KeyError):
                continue
        return events
    except sqlite3.Error:
        return []
    finally:
        database.close()


@router.get("/events")
def events(profile: str = Query("", max_length=64), status: str = Query("", max_length=20),
           q: str = Query("", max_length=200), page: int = Query(1, ge=1, le=10000)):
    with errors(), root_scope() as root:
        rows = load_events(root)
        needle = q.strip().casefold()
        filtered = []
        for event in rows:
            if profile and event.get("profile") != profile:
                continue
            if status == "open":
                if event["status"] == "delivered":
                    continue
            elif status and event["status"] != status:
                continue
            if needle:
                hay = " ".join([
                    event.get("profile") or "", event["repository"]["name"], event.get("title") or "",
                    event.get("author") or "", event.get("body") or "", event.get("iid") or "",
                    event.get("kind") or "",
                ]).casefold()
                if needle not in hay:
                    continue
            filtered.append(event)
        per_page = 50
        start = (page - 1) * per_page
        chunk = filtered[start:start + per_page]
        return {"events": chunk, "next_page": page + 1 if start + per_page < len(filtered) else None,
                "open_count": sum(1 for event in rows if event["status"] != "delivered")}


@router.get("/repositories")
async def repositories(q: str = Query("", max_length=200), page: int = Query(1, ge=1, le=10000)):
    with errors(), root_scope() as root:
        _, extra, _ = settings(root)
        items = await gitlab_get(extra, "projects", {"search": q, "page": page, "per_page": 50,
                                                    "order_by": "id", "sort": "asc", "archived": "false"})
        if not isinstance(items, list):
            raise HTTPException(502, "GitLab returned an invalid repository list")
        return {"repositories": [repository(item, extra) for item in items],
                "next_page": page + 1 if len(items) == 50 else None}


class Mapping(BaseModel):
    model_config = ConfigDict(extra="forbid")
    repositories: list[str] = Field(max_length=200)
    description: str | None = Field(default=None, max_length=1000)
    revision: str = Field(pattern=r"^[a-f0-9]{64}$")


def model_setup(path):
    """Expose only model display fields from the copied starter configuration.

    Native profile cloning preserves settings and reuses shared rotating OAuth logins.
    """
    try:
        from hermes_cli.config import read_user_config_raw, split_model_config_default
        model = read_user_config_raw(path / "config.yaml").get("model") or {}
        if isinstance(model, str):
            name, provider = split_model_config_default(model)
        else:
            name, provider = split_model_config_default(model.get("default") or model.get("model"))
            provider = str(model.get("provider") or provider or "").strip()
        return {"model": name or "", "provider": provider or "auto"}
    except (OSError, ValueError, AttributeError, yaml.YAMLError):
        return {"model": "", "provider": ""}


@router.post("/gateway/restart")
async def restart_gateway():
    with errors(), root_scope() as root:
        config, _, _ = settings(root)
        if not GatewayConfig.from_dict(config).multiplex_profiles:
            raise HTTPException(409, "Enable the default profile's multiplex gateway before restarting")
        from hermes_cli import web_server
        # A recent restart may already have read the OLD mapping. Respect the
        # native cooldown, then request a fresh restart for this saved config.
        recent = web_server._LAST_GATEWAY_RESTART
        if recent:
            delay = web_server.GATEWAY_RESTART_COOLDOWN_SECONDS - (time.monotonic() - recent[0])
            if delay > 0:
                await asyncio.sleep(delay + 0.05)
        from hermes_cli.web_server_gateway import _restart_gateway_after
        result = await asyncio.to_thread(_restart_gateway_after, "default",
            what="GitLab project registration", label="GitLab Projects")
        # Native errors can contain process paths or environment details.
        if not result.get("restart_started"):
            return {"restart_started": False}
        return {"restart_started": True, "restart_pid": result["restart_pid"]}


@router.get("/gateway/restart/status")
async def restart_status(pid: int = Query(ge=1)):
    from hermes_cli.web_routers.actions import get_action_status
    result = await get_action_status("gateway-restart", lines=1)
    # Another action may have replaced the shared native restart record.
    status = "unknown"
    if result.get("pid") == pid:
        if result["running"]:
            status = "running"
        elif result["exit_code"] is not None:
            status = "finished" if result["exit_code"] == 0 else "failed"
    return {"status": status}


@router.put("/projects/{profile}")
async def save_project(profile: str, mapping: Mapping):
    with errors(), root_scope() as root:
        _, extra, revision = settings(root)
        if mapping.revision != revision:
            raise HTTPException(409, "Configuration changed; refresh the project list before saving")
        ids = cli.ids(mapping.repositories) if mapping.repositories else set()
        info = {}
        # ponytail: sequential verification caps GitLab pressure; batch if onboarding hundreds of repos is slow.
        for ident in sorted(ids, key=int):
            row = repository(await gitlab_get(extra, f"projects/{ident}"), extra)
            if row["id"] != ident:
                raise HTTPException(502, "GitLab returned a different repository")
            info[ident] = row
        name, path, created = await asyncio.to_thread(cli.add_project, root, profile, mapping.repositories,
            mapping.description, replace=True, revision=mapping.revision, repository_info=info,
            require_project_profile=True)
        setup = model_setup(path)
        # Saving is authoritative even when the native restart cannot be started.
        try:
            restart = await restart_gateway()
        except Exception:
            restart = {"restart_started": False}
        return {"profile": name, "created": created, "model_setup": setup, **restart}


class DeleteMapping(BaseModel):
    model_config = ConfigDict(extra="forbid")
    revision: str = Field(pattern=r"^[a-f0-9]{64}$")
    confirmation: str = Field(min_length=1, max_length=64)


@router.delete("/projects/{profile}")
async def delete_project(profile: str, mapping: DeleteMapping):
    with errors(), root_scope() as root:
        name, required = await asyncio.to_thread(cli.remove_project_registration, root, profile,
            revision=mapping.revision, confirmation=mapping.confirmation)
        return {"profile": name, "profile_delete_required": required, "restart_required": True}
