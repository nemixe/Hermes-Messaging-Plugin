"""Exercise real Git credential requests against a local GitLab API."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote

import yaml


class GitCredentials(unittest.TestCase):
    def test_live_pat_scope_rotation_revocation_and_worktree_inheritance(self):
        script = Path(__file__).parents[1] / 'git_credentials.py'
        self.assertTrue(script.exists(), 'The shared credential helper is missing')
        spec = importlib.util.spec_from_file_location('credential_test', script)
        helper = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(helper)
        with tempfile.TemporaryDirectory(prefix="git credentials '") as directory:
            root = Path(directory)
            profile = root / 'profiles/commerce'
            profile.mkdir(parents=True)
            (profile / 'config.yaml').write_text('{}')
            (profile / '.env').write_text('GITLAB_TOKEN=wrong-profile-token\n')
            seen = []
            class GitLab(BaseHTTPRequestHandler):
                def do_GET(self):
                    seen.append((self.path, self.headers.get('PRIVATE-TOKEN')))
                    path = unquote(self.path)
                    if 'redirect' in path:
                        self.send_response(302)
                        self.send_header('Location', '/stolen'); self.end_headers(); return
                    if self.headers.get('PRIVATE-TOKEN') not in ('first-token', 'rotated-token', 'yaml-token'):
                        self.send_response(401); self.end_headers(); return
                    item = {'id': 42 if path.endswith(('team/app', '/42')) else 43,
                            'path_with_namespace': 'team/app' if path.endswith(('team/app', '/42')) else 'other/app'}
                    self.send_response(200); self.end_headers()
                    self.wfile.write(json.dumps(item).encode())
                def log_message(self, *args):
                    pass
            server = ThreadingHTTPServer(('127.0.0.1', 0), GitLab)
            self.addCleanup(server.server_close); self.addCleanup(server.shutdown)
            threading.Thread(target=server.serve_forever, daemon=True).start()
            url = f'http://127.0.0.1:{server.server_port}/gitlab'
            config = {'gateway': {'multiplex_profiles': True, 'profile_routes': [
                {'name': 'hermes-gitlab-repo-42', 'platform': 'gitlab', 'chat_id': 'repo:42', 'profile': 'commerce'}]},
                'platforms': {'gitlab': {'extra': {'url': url, 'projects': ['42'], 'token': 'yaml-token',
                                                  'repository_info': {'42': {'name': 'team/app'}}}}}}
            (root / 'config.yaml').write_text(yaml.safe_dump(config))
            (root / '.env').write_text('GITLAB_TOKEN=first-token\n')
            helper.configure(root, 'commerce')
            clone = profile / 'workspace/42'
            self.assertTrue((clone / '.git').is_dir())
            env = {**os.environ, 'GIT_CONFIG_GLOBAL': os.devnull, 'GIT_CONFIG_NOSYSTEM': '1',
                   'GIT_TERMINAL_PROMPT': '0', 'GITLAB_TOKEN': 'inherited-wrong-token', 'HERMES_HOME': str(profile)}
            def git(*args, cwd=clone, input=None):
                return subprocess.run(['git', '-C', str(cwd), *args], input=input, text=True,
                                      capture_output=True, env=env, timeout=20)
            def credential(path='gitlab/team/app.git', host=f'127.0.0.1:{server.server_port}', cwd=clone):
                return git('credential', 'fill', cwd=cwd, input=f'protocol=http\nhost={host}\npath={path}\n\n')
            first = credential()
            self.assertEqual(first.returncode, 0, first.stderr)
            self.assertIn('password=first-token', first.stdout)
            self.assertNotIn('first-token', (clone / '.git/config').read_text())
            self.assertFalse((profile / '.git-credentials').exists())
            (root / '.env').write_text('GITLAB_TOKEN=rotated-token\n')
            self.assertIn('password=rotated-token', credential().stdout)
            (root / '.env').write_text('')
            self.assertIn('password=yaml-token', credential().stdout)
            for path, host in [('gitlab/other/app.git', f'127.0.0.1:{server.server_port}'),
                               ('gitlab/team/app.git', 'example.invalid'), ('gitlab/../team/app.git', f'127.0.0.1:{server.server_port}'),
                               ('gitlab/redirect.git', f'127.0.0.1:{server.server_port}')]:
                result = credential(path, host)
                self.assertNotEqual(result.returncode, 0)
                self.assertNotIn('password=', result.stdout)
            self.assertFalse(any(path == '/stolen' for path, _ in seen))
            git('config', 'user.name', 'Test'); git('config', 'user.email', 'test@example.invalid')
            self.assertEqual(git('commit', '--allow-empty', '-m', 'Fixture').returncode, 0)
            worktree = clone / '.worktrees/42-issues-1'
            self.assertEqual(git('worktree', 'add', '-b', 'card-test', str(worktree)).returncode, 0)
            self.assertIn('password=yaml-token', credential(cwd=worktree).stdout)
            (worktree / 'keep.txt').write_text('unfinished work')
            helper.configure(root, 'commerce')
            self.assertEqual((worktree / 'keep.txt').read_text(), 'unfinished work')
            config['gateway']['profile_routes'][0]['profile'] = 'another-project'
            (root / 'config.yaml').write_text(yaml.safe_dump(config))
            self.assertNotEqual(credential(cwd=worktree).returncode, 0)
            config['gateway']['profile_routes'][0]['profile'] = 'commerce'
            (root / 'config.yaml').write_text(yaml.safe_dump(config))
            (root / '.env').write_text('GITLAB_TOKEN=expired-token\n')
            expired = credential()
            self.assertNotEqual(expired.returncode, 0)
            self.assertNotIn('expired-token', expired.stderr)
            # The helper never stores credentials supplied by Git.
            for action in ('approve', 'reject'):
                git('credential', action, input=f'url={url}/team/app.git\nusername=oauth2\npassword=do-not-store\n\n')
            self.assertFalse((profile / '.git-credentials').exists())
