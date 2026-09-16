"""Real Hermes API mounting/auth, temporary profiles and a loopback GitLab."""
import contextlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import importlib
import json
import os
from pathlib import Path
import tempfile
import threading
import time
import unittest
from unittest.mock import patch
from types import SimpleNamespace

from fastapi.testclient import TestClient
import yaml


class DesktopAPI(unittest.TestCase):
    def test_authenticated_mapping_and_repository_flow(self):
        with tempfile.TemporaryDirectory() as directory, contextlib.ExitStack() as stack:
            root = Path(directory)
            stack.enter_context(patch.dict(os.environ, {"HERMES_HOME": directory,
                "GATEWAY_MULTIPLEX_PROFILES": "", "GITLAB_URL": "", "GITLAB_TOKEN": ""}))
            for name in ("seed_profile_skills", "_notify_multiplexer", "_maybe_register_gateway_service"):
                stack.enter_context(patch("hermes_cli.profiles." + name))
            for name in ("_cleanup_gateway_service", "_maybe_unregister_gateway_service", "_stop_profile_backends"):
                stack.enter_context(patch("hermes_cli.profiles." + name))
            stack.enter_context(patch("hermes_cli.profiles._check_gateway_running", return_value=False))
            stack.enter_context(patch("hermes_cli.profiles._get_wrapper_dir", return_value=root / "bin"))
            calls = []

            class GitLab(BaseHTTPRequestHandler):
                def do_GET(self):
                    calls.append((self.path, self.headers.get("PRIVATE-TOKEN")))
                    row = {"id": 42, "path_with_namespace": "team/payments"}
                    data = [row] if self.path.startswith("/api/v4/projects?") else row
                    if self.path.startswith("/api/v4/projects/404"):
                        self.send_response(404)
                    else:
                        self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps(data).encode())

                def log_message(self, *args):
                    pass

            server = ThreadingHTTPServer(("127.0.0.1", 0), GitLab)
            threading.Thread(target=server.serve_forever, daemon=True).start()
            stack.callback(server.server_close)
            stack.callback(server.shutdown)
            url = f"http://127.0.0.1:{server.server_port}"
            (root / ".env").write_text("GITLAB_TOKEN=test-bot-pat\n")
            config = {"plugins": {"enabled": ["hermes-gitlab"]}, "gateway": {"multiplex_profiles": True},
                      "model": {"default": "gpt-5.6-terra", "provider": "openai-codex"},
                      "platforms": {"gitlab": {"extra": {"url": url, "allowed_users": [7]}}}}
            config_path = root / "config.yaml"
            config_path.write_text(yaml.safe_dump(config))
            personal = root / "profiles" / "personal"
            personal.mkdir(parents=True)
            (personal / "config.yaml").write_text("{}")
            (personal / "profile.yaml").write_text("description: Personal assistant\ndisplay_name: My assistant\n")
            # Native root login fallback must work without duplicating OAuth tokens.
            auth_path = root / "auth.json"
            auth_path.write_text(json.dumps({"version": 1, "providers": {}, "credential_pool": {
                "openai-codex": [{"id": "test-login", "access_token": "fixture-access", "refresh_token": "fixture-refresh"}]}}))
            auth_before = auth_path.read_bytes()
            (root / "plugins").mkdir()
            (root / "plugins" / "hermes-gitlab").symlink_to(Path(__file__).parents[1] / "hermes-gitlab", target_is_directory=True)

            # Exercise native discovery, import, namespace mounting, token middleware,
            # and the live enabled-plugin gate, not a test-only FastAPI router.
            host = importlib.import_module("hermes_cli.web_server")
            restart = stack.enter_context(patch.object(host, "_spawn_gateway_restart",
                return_value=(SimpleNamespace(pid=12345), False)))
            client = TestClient(host.app)
            stack.callback(client.close)
            base = "/api/plugins/hermes-gitlab"
            self.assertEqual(client.get(base + "/projects").status_code, 401)
            self.assertEqual(client.put(base + "/projects/commerce", json={}).status_code, 401)
            self.assertEqual(client.request("DELETE", base + "/projects/commerce", json={}).status_code, 401)
            self.assertEqual(client.post(base + "/gateway/restart").status_code, 401)
            client.headers["Authorization"] = "Bearer " + host._SESSION_TOKEN
            response = client.get(base + "/projects")
            self.assertEqual(response.status_code, 200, response.text)
            state = response.json()
            self.assertEqual(state["projects"], [], "Unmarked personal profiles are not GitLab projects")
            response = client.request("DELETE", base + "/projects/personal", json={
                "revision": state["revision"], "confirmation": "personal"})
            self.assertEqual(response.status_code, 409)
            response = client.put(base + "/projects/personal", json={"repositories": [], "revision": state["revision"]})
            self.assertEqual(response.status_code, 409, "New project must not silently adopt an unrelated profile")
            self.assertTrue(personal.is_dir())
            self.assertTrue(state["connection_configured"])
            self.assertEqual(state["transport"], "polling")
            self.assertNotIn("test-bot-pat", response.text)
            # A Desktop backend may have been launched in another profile. A
            # missing default PAT must not fall back to that process's credentials.
            (root / ".env").write_text("")
            with patch.dict(os.environ, {"GITLAB_TOKEN": "other-profile-token"}):
                self.assertFalse(client.get(base + "/projects").json()["connection_configured"])
                self.assertEqual(client.get(base + "/repositories").status_code, 409)
            (root / ".env").write_text("GITLAB_TOKEN=test-bot-pat\n")
            response = client.get(base + "/repositories?q=pay&page=1")
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(response.json()["repositories"][0]["name"], "team/payments")
            self.assertEqual(calls[-1][1], "test-bot-pat")
            body = {"repositories": ["42"], "revision": state["revision"], "description": "Commerce knowledge"}
            response = client.put(base + "/projects/commerce", json=body)
            self.assertEqual(response.status_code, 200, response.text)
            self.assertTrue(response.json()["created"])
            self.assertTrue(response.json()["restart_started"])
            self.assertEqual(response.json()["model_setup"],
                             {"model": "gpt-5.6-terra", "provider": "openai-codex"})
            restart.assert_called_once_with("default")
            profile = root / "profiles" / "commerce"
            self.assertTrue((profile / "config.yaml").exists())
            self.assertEqual(yaml.safe_load((profile / "config.yaml").read_text())["model"], config["model"])
            self.assertNotIn("test-bot-pat", (profile / ".env").read_text())
            from hermes_constants import set_hermes_home_override, reset_hermes_home_override
            from hermes_cli.auth import read_credential_pool
            home = set_hermes_home_override(profile)
            try:
                self.assertEqual(read_credential_pool("openai-codex")[0]["id"], "test-login")
            finally:
                reset_hermes_home_override(home)
            self.assertEqual(auth_path.read_bytes(), auth_before)
            self.assertFalse((profile / "auth.json").exists())
            self.assertNotIn("fixture-access", response.text)
            self.assertNotIn("fixture-refresh", response.text)
            self.assertEqual(client.put(base + "/projects/commerce", json=body).status_code, 409)
            state = client.get(base + "/projects").json()
            self.assertEqual([p["profile"] for p in state["projects"]], ["commerce"])
            self.assertEqual(state["projects"][0]["profile_type"], "project")
            self.assertIs(yaml.safe_load((profile / "profile.yaml").read_text())["hermes_gitlab_project"], True)
            self.assertEqual(state["projects"][0]["repositories"][0]["name"], "team/payments")
            self.assertEqual(state["projects"][0]["description"], "Commerce knowledge")
            response = client.put(base + "/projects/finance", json={**body, "revision": state["revision"]})
            self.assertEqual(response.status_code, 409, response.text)
            self.assertFalse((root / "profiles" / "finance").exists())
            response = client.put(base + "/projects/bad-access", json={**body, "repositories": ["404"], "revision": state["revision"]})
            self.assertEqual(response.status_code, 502)
            self.assertFalse((root / "profiles" / "bad-access").exists())
            self.assertEqual(restart.call_count, 1, "Failed saves must not restart the gateway")
            # A restart failure must not turn a successful registration into a failed save.
            # Existing per-project model settings must also survive a registration edit.
            (profile / "config.yaml").write_text("model:\n  default: local-model\n  provider: custom\n")
            metadata = yaml.safe_load((profile / "profile.yaml").read_text())
            metadata.pop("hermes_gitlab_project")
            (profile / "profile.yaml").write_text(yaml.safe_dump(metadata))
            self.assertEqual([p["profile"] for p in client.get(base + "/projects").json()["projects"]], ["commerce"],
                             "Managed legacy registrations remain visible before their next save")
            restart.side_effect = RuntimeError("Sensitive process detail must not reach the page")
            response = client.put(base + "/projects/commerce", json={"repositories": [], "revision": state["revision"]})
            self.assertEqual(response.status_code, 200, response.text)
            self.assertFalse(response.json()["restart_started"])
            self.assertNotIn("Sensitive process", response.text)
            self.assertEqual(response.json()["model_setup"], {"model": "local-model", "provider": "custom"})
            self.assertTrue((profile / "config.yaml").exists())
            self.assertEqual(client.get(base + "/projects").json()["projects"][0]["repositories"], [])
            restart.side_effect = None
            self.assertTrue(client.post(base + "/gateway/restart").json()["restart_started"])
            started = time.monotonic()
            def after_cooldown(profile):
                self.assertEqual(profile, "default")
                self.assertGreaterEqual(time.monotonic() - started, 0.05)
                return SimpleNamespace(pid=12345), False
            with patch.object(host, "_LAST_GATEWAY_RESTART", (started, SimpleNamespace(pid=1), ())), \
                    patch.object(host, "GATEWAY_RESTART_COOLDOWN_SECONDS", 0.05):
                restart.side_effect = after_cooldown
                self.assertTrue(client.post(base + "/gateway/restart").json()["restart_started"])
            restart.side_effect = None
            with patch("hermes_cli.web_routers.actions.get_action_status", return_value={
                    "running": False, "exit_code": 1, "pid": 12345, "lines": ["private log"]}):
                self.assertEqual(client.get(base + "/gateway/restart/status?pid=12345").json(), {"status": "failed"})
                self.assertEqual(client.get(base + "/gateway/restart/status?pid=54321").json(), {"status": "unknown"})
            state = client.get(base + "/projects").json()
            response = client.put(base + "/projects/commerce", json={**body, "revision": state["revision"]})
            self.assertEqual(response.status_code, 200, response.text)
            state = client.get(base + "/projects").json()
            delete_body = {"confirmation": "commerce", "revision": state["revision"]}
            before = config_path.read_bytes()
            for name, data in (("default", {**delete_body, "confirmation": "default"}),
                               ("commerce", {**delete_body, "confirmation": "wrong"}),
                               ("commerce", {**delete_body, "revision": "0" * 64})):
                response = client.request("DELETE", base + "/projects/" + name, json=data)
                self.assertEqual(response.status_code, 409, response.text)
                self.assertEqual(config_path.read_bytes(), before)
                self.assertTrue(profile.is_dir())
            request_count = len(calls)
            response = client.request("DELETE", base + "/projects/commerce", json=delete_body)
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(response.json(), {"profile": "commerce", "profile_delete_required": True,
                                              "restart_required": True})
            self.assertEqual(len(calls), request_count, "Deleting a local project must not mutate GitLab")
            self.assertTrue(profile.is_dir(), "Native Desktop must retire profile processes before deletion")
            self.assertEqual(client.get(base + "/projects").json()["projects"][0]["repositories"], [])
            # Same native endpoint used by Desktop's deleteProfile SDK. Only the
            # temporary profile is removed; process/service effects are mocked above.
            response = client.delete("/api/profiles/commerce")
            self.assertEqual(response.status_code, 200, response.text)
            self.assertFalse(profile.exists())
            self.assertEqual(client.get(base + "/projects").json()["projects"], [])
            saved = yaml.safe_load(config_path.read_text())
            saved.pop("model")
            config_path.write_text(yaml.safe_dump(saved))
            state = client.get(base + "/projects").json()
            response = client.put(base + "/projects/no-model", json={"repositories": [], "revision": state["revision"]})
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(response.json()["model_setup"]["model"], "gpt-5.6-terra",
                             "Projects use the installed egg snapshot, not later default settings")
            (root / "profiles" / "project-egg" / "config.yaml").write_text("{}")
            state = client.get(base + "/projects").json()
            self.assertNotIn("project-egg", [p["profile"] for p in state["projects"]])
            response = client.put(base + "/projects/empty-model", json={"repositories": [], "revision": state["revision"]})
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(response.json()["model_setup"]["model"], "")
            self.assertTrue(response.json()["restart_started"], "Model setup and restart are separate outcomes")
            saved = yaml.safe_load(config_path.read_text())
            saved["plugins"]["disabled"] = ["hermes-gitlab"]
            config_path.write_text(yaml.safe_dump(saved))
            self.assertEqual(client.get(base + "/projects").status_code, 404)
            self.assertEqual(client.request("DELETE", base + "/projects/commerce", json=delete_body).status_code, 404)


if __name__ == "__main__":
    unittest.main()
