"""Send Mattermost DMs with the default-profile messaging bot token."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
from urllib.parse import unquote
from urllib.request import Request


SCRIPT = (Path(__file__).parents[1] / "templates/global-project/skills"
          / "mattermost-dm/scripts/dm.py")
BOT_ID = "b" * 26
ALICE_ID = "a" * 26
CHANNEL_ID = "c" * 26
POST_ID = "p" * 26
TOKEN = "mm-bot-token-value"
GITLAB_TOKEN = "glpat-should-never-be-sent"


def load_dm():
    spec = importlib.util.spec_from_file_location("mattermost_dm", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class FakeResponse:
    def __init__(self, payload):
        self.payload = json.dumps(payload).encode()

    def read(self):
        return self.payload

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


class FakeMattermost:
    def __init__(self):
        self.calls = []
        self.me = {"id": BOT_ID, "username": "hermes-bot"}
        self.users = {
            BOT_ID: dict(self.me),
            ALICE_ID: {"id": ALICE_ID, "username": "alice", "email": "alice@example.invalid"},
        }
        self.by_username = {"alice": ALICE_ID, "hermes-bot": BOT_ID}
        self.by_email = {"alice@example.invalid": ALICE_ID}

    def __call__(self, method, path, payload=None):
        self.calls.append((method, path, payload))
        if method == "GET" and path == "users/me":
            return dict(self.me)
        if method == "GET" and path.startswith("users/"):
            rest = path[len("users/"):]
            if rest.startswith("email/"):
                user_id = self.by_email.get(unquote(rest.split("/", 1)[1]))
            elif rest.startswith("username/"):
                user_id = self.by_username.get(unquote(rest.split("/", 1)[1]))
            else:
                user_id = rest
            user = self.users.get(user_id)
            if not user:
                raise ValueError("Mattermost user not found")
            return dict(user)
        if method == "POST" and path == "channels/direct":
            return {"id": CHANNEL_ID}
        if method == "POST" and path == "posts":
            return {"id": POST_ID, "channel_id": payload["channel_id"]}
        raise ValueError(f"unexpected {method} {path}")


class MattermostDM(unittest.TestCase):
    def setUp(self):
        self.dm = load_dm()
        self.api = FakeMattermost()

    def write_env(self, directory, **values):
        Path(directory).joinpath(".env").write_text(
            "".join(f"{key}={value}\n" for key, value in values.items()))

    def send(self, user="alice", message="Mohon kirim secret lewat DM ini.", **kwargs):
        kwargs.setdefault("request", self.api)
        return self.dm.send_dm(user, message, **kwargs)

    def test_sends_dm_with_mattermost_token_from_default_messaging_env(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.write_env(root, GITLAB_TOKEN=GITLAB_TOKEN, GITLAB_URL="https://gitlab.example.invalid",
                           MATTERMOST_URL="https://mm.example.invalid", MATTERMOST_TOKEN=TOKEN)
            profile = root / "profiles" / "commerce"
            profile.mkdir(parents=True)
            result = self.send(environ={"HERMES_HOME": str(profile)}, home=str(root))
        self.assertEqual(result, {
            "ok": True, "user_id": ALICE_ID, "username": "alice",
            "channel_id": CHANNEL_ID, "post_id": POST_ID,
        })
        self.assertNotIn(TOKEN, json.dumps(result))
        self.assertEqual(self.api.calls[0], ("GET", "users/me", None))
        self.assertEqual(self.api.calls[1], ("GET", "users/username/alice", None))
        self.assertEqual(self.api.calls[2], ("POST", "channels/direct", [BOT_ID, ALICE_ID]))
        self.assertEqual(self.api.calls[3][1], "posts")
        self.assertEqual(self.api.calls[3][2]["channel_id"], CHANNEL_ID)
        self.assertEqual(self.api.calls[3][2]["message"], "Mohon kirim secret lewat DM ini.")

    def test_resolves_email_user_id_and_at_username(self):
        with tempfile.TemporaryDirectory() as directory:
            self.write_env(directory, MATTERMOST_URL="https://mm.example.invalid", MATTERMOST_TOKEN=TOKEN)
            self.send("@alice", home=directory)
            self.send("alice@example.invalid", home=directory)
            self.send(ALICE_ID, home=directory)
        paths = [path for _method, path, _payload in self.api.calls if path.startswith("users/") and path != "users/me"]
        self.assertEqual(paths, [
            "users/username/alice",
            "users/email/alice%40example.invalid",
            f"users/{ALICE_ID}",
        ])

    def test_injected_env_wins_and_project_profile_walks_up_to_default_home(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.write_env(root, MATTERMOST_URL="https://file.example.invalid", MATTERMOST_TOKEN="file-token")
            profile = root / "profiles" / "commerce"
            profile.mkdir(parents=True)
            environ = {
                "HERMES_HOME": str(profile),
                "MATTERMOST_URL": "https://mm.example.invalid",
                "MATTERMOST_TOKEN": TOKEN,
            }
            self.assertEqual(self.dm.messaging_home(environ), root)
            url, token, _allowed, home = self.dm.credentials(environ)
            self.assertEqual(home, root)
            self.assertEqual(url, "https://mm.example.invalid")
            self.assertEqual(token, TOKEN)

    def test_missing_mattermost_token_does_not_fall_back_to_gitlab_token(self):
        with tempfile.TemporaryDirectory() as directory:
            self.write_env(directory, GITLAB_TOKEN=GITLAB_TOKEN, GITLAB_URL="https://gitlab.example.invalid",
                           MATTERMOST_URL="https://mm.example.invalid")
            with self.assertRaises(ValueError) as raised:
                self.send(home=directory)
        self.assertIn("MATTERMOST_TOKEN", str(raised.exception))
        self.assertNotIn(GITLAB_TOKEN, str(raised.exception))
        self.assertEqual(self.api.calls, [])

    def test_allowlist_and_self_dm_and_empty_message(self):
        with tempfile.TemporaryDirectory() as directory:
            self.write_env(directory, MATTERMOST_URL="https://mm.example.invalid", MATTERMOST_TOKEN=TOKEN,
                           MATTERMOST_ALLOWED_USERS="zzzzzzzzzzzzzzzzzzzzzzzzzz")
            with self.assertRaisesRegex(ValueError, "MATTERMOST_ALLOWED_USERS"):
                self.send(home=directory)
            self.write_env(directory, MATTERMOST_URL="https://mm.example.invalid", MATTERMOST_TOKEN=TOKEN)
            with self.assertRaisesRegex(ValueError, "cannot DM itself"):
                self.send(BOT_ID, home=directory)
            with self.assertRaisesRegex(ValueError, "DM text"):
                self.send(message="   ", home=directory)

    def test_rejects_non_https_url(self):
        with tempfile.TemporaryDirectory() as directory:
            self.write_env(directory, MATTERMOST_URL="http://mm.example.invalid", MATTERMOST_TOKEN=TOKEN)
            with self.assertRaisesRegex(ValueError, "HTTPS"):
                self.send(home=directory)

    def test_http_authorization_uses_mattermost_token(self):
        responses = [
            FakeResponse({"id": BOT_ID, "username": "hermes-bot"}),
            FakeResponse({"id": ALICE_ID, "username": "alice"}),
            FakeResponse({"id": CHANNEL_ID}),
            FakeResponse({"id": POST_ID}),
        ]
        seen = []

        def urlopen(request, timeout=None):
            seen.append(request)
            return responses.pop(0)

        with tempfile.TemporaryDirectory() as directory:
            self.write_env(directory, GITLAB_TOKEN=GITLAB_TOKEN,
                           MATTERMOST_URL="https://mm.example.invalid", MATTERMOST_TOKEN=TOKEN)
            with patch.object(self.dm, "urlopen", urlopen):
                result = self.dm.send_dm("alice", "hello", home=directory)
        self.assertEqual(result["post_id"], POST_ID)
        self.assertEqual(len(seen), 4)
        for request in seen:
            self.assertIsInstance(request, Request)
            self.assertEqual(request.get_header("Authorization"), f"Bearer {TOKEN}")
            self.assertNotIn(GITLAB_TOKEN, request.get_header("Authorization"))
        self.assertEqual(seen[2].full_url, "https://mm.example.invalid/api/v4/channels/direct")

    def test_cli_hides_token_when_credentials_are_missing(self):
        with tempfile.TemporaryDirectory() as directory:
            self.write_env(directory, GITLAB_TOKEN=GITLAB_TOKEN, GITLAB_URL="https://gitlab.example.invalid")
            result = subprocess.run(
                [sys.executable, str(SCRIPT), "--user", "alice", "--message", "hello", "--home", directory],
                capture_output=True, text=True, env={**os.environ, "HERMES_HOME": directory})
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("MATTERMOST_TOKEN", result.stderr)
        self.assertNotIn(GITLAB_TOKEN, result.stderr)
        self.assertNotIn(GITLAB_TOKEN, result.stdout)
        self.assertNotIn(TOKEN, result.stderr + result.stdout)

    def test_request_waits_for_dm_reply_then_origin_session_continues(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            profile = root / "profiles" / "commerce"
            dest = profile / "workspace" / "42" / ".env"
            dest.parent.mkdir(parents=True)
            self.write_env(root, MATTERMOST_URL="https://mm.example.invalid", MATTERMOST_TOKEN=TOKEN)
            environ = {
                "HERMES_HOME": str(profile),
                "HERMES_SESSION_ID": "origin-session",
                "HERMES_SESSION_KEY": "agent:commerce:gitlab:group:42:issues:3",
            }
            requested = self.dm.request_dm(
                "alice", "Mohon balas di thread DM ini.", dest,
                "DATABASE_URL,API_KEY", environ=environ, home=str(root), request=self.api)
            self.assertTrue(requested["ok"])
            self.assertEqual(requested["status"], "pending")
            self.assertEqual(requested["user_id"], ALICE_ID)
            self.assertEqual(requested["channel_id"], CHANNEL_ID)
            self.assertEqual(requested["post_id"], POST_ID)
            self.assertEqual(requested["dest"], str(dest.resolve()))
            self.assertEqual(requested["keys"], ["DATABASE_URL", "API_KEY"])
            self.assertEqual(requested["origin_session_id"], "origin-session")
            self.assertNotIn("origin_session_key", requested)
            self.assertNotIn(TOKEN, json.dumps(requested))
            pending = self.dm.pending_dm(ALICE_ID, CHANNEL_ID, environ=environ, home=str(root))
            self.assertEqual(pending["id"], requested["id"])
            self.assertTrue(pending["pending"])
            self.assertEqual(
                self.dm.pending_dm(ALICE_ID, "z" * 26, environ=environ, home=str(root)),
                {"ok": True, "pending": False})
            waiting = self.dm.wait_dm(requested["id"], timeout=0.2, poll=0.05,
                                      environ=environ, home=str(root))
            self.assertEqual(waiting["status"], "pending")
            self.assertTrue(waiting.get("waited"))
            dest.write_text("DATABASE_URL=secret\n")
            completed = self.dm.complete_dm(requested["id"], environ=environ, home=str(root))
            self.assertEqual(completed["status"], "complete")
            finished = self.dm.wait_dm(requested["id"], timeout=0.2, poll=0.05,
                                       environ=environ, home=str(root))
            self.assertEqual(finished["status"], "complete")
            self.assertEqual(finished["origin_session_id"], "origin-session")
            self.assertNotIn("secret", json.dumps(finished))

    def test_new_request_supersedes_previous_pending_for_the_same_user(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            profile = root / "profiles" / "commerce"
            dest = profile / ".env"
            dest.parent.mkdir(parents=True)
            self.write_env(root, MATTERMOST_URL="https://mm.example.invalid", MATTERMOST_TOKEN=TOKEN)
            environ = {"HERMES_HOME": str(profile)}
            first = self.dm.request_dm("alice", "first", dest, environ=environ, home=str(root),
                                       request=self.api)
            second = self.dm.request_dm("alice", "second", dest, environ=environ, home=str(root),
                                        request=self.api)
            self.assertNotEqual(first["id"], second["id"])
            self.assertEqual(self.dm.pending_dm(ALICE_ID, environ=environ, home=str(root))["id"],
                             second["id"])
            self.assertEqual(self.dm.wait_dm(first["id"], timeout=0, environ=environ, home=str(root))["status"],
                             "superseded")

    def test_request_accepts_a_confidential_file_other_than_dotenv(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            profile = root / "profiles" / "commerce"
            dest = profile / "backups" / "mattermost-dm" / "id_rsa"
            dest.parent.mkdir(parents=True)
            self.write_env(root, MATTERMOST_URL="https://mm.example.invalid", MATTERMOST_TOKEN=TOKEN)
            requested = self.dm.request_dm(
                "alice", "Mohon kirim private key di thread DM ini.", dest, "deploy_key",
                environ={"HERMES_HOME": str(profile)}, home=str(root), request=self.api)
            self.assertEqual(requested["dest"], str(dest.resolve()))
            self.assertEqual(requested["keys"], ["deploy_key"])

    def test_rejects_destination_outside_the_profile(self):
        with tempfile.TemporaryDirectory() as directory, tempfile.TemporaryDirectory() as other:
            root = Path(directory)
            profile = root / "profiles" / "commerce"
            profile.mkdir(parents=True)
            self.write_env(root, MATTERMOST_URL="https://mm.example.invalid", MATTERMOST_TOKEN=TOKEN)
            outside = Path(other) / ".env"
            with self.assertRaisesRegex(ValueError, "inside"):
                self.dm.request_dm("alice", "hi", outside, environ={"HERMES_HOME": str(profile)},
                                   home=str(root), request=self.api)
            self.assertEqual(self.api.calls, [])


if __name__ == "__main__":
    unittest.main()
