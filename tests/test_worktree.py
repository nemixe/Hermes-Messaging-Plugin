"""Run the bundled worktree helper against disposable, real Git repositories."""
import os
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


SCRIPT = (Path(__file__).parents[1] / "templates/global-project/skills"
          / "codev-gitlab/scripts/worktree.py")


class CardWorktree(unittest.TestCase):
    def test_cards_reuse_isolated_checkouts_without_losing_edits_or_crossing_profiles(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            clone = root / "workspace/42"
            clone.mkdir(parents=True)
            env = {**os.environ, "HERMES_HOME": str(root), "HERMES_SESSION_ID": "creator-session",
                   "HERMES_SESSION_KEY": "gitlab:42:issues:3", "GIT_CONFIG_GLOBAL": os.devnull,
                   "GIT_CONFIG_NOSYSTEM": "1"}

            def git(*args, cwd=clone):
                return subprocess.check_output(["git", "-C", str(cwd), *args], env=env, text=True).strip()

            git("init", "-q")
            git("-c", "user.name=Test", "-c", "user.email=test@example.invalid",
                "commit", "--allow-empty", "-qm", "Initial")
            initial = git("rev-parse", "HEAD")

            def prepare(card, path=clone, *extra):
                return subprocess.run([sys.executable, str(SCRIPT), "--clone", str(path),
                                       "--card", card, "--start", initial, *extra],
                                      env=env, text=True, capture_output=True)

            first = prepare("42:issues:3")
            self.assertEqual(first.returncode, 0, first.stderr)
            worktree = Path(first.stdout.strip())
            self.assertEqual(worktree, clone / ".worktrees/42-issues-3")
            owner_path = Path(git("rev-parse", "--absolute-git-dir", cwd=worktree)) / "codev-owner.json"
            owner = json.loads(owner_path.read_text())
            self.assertEqual(owner["creator_session_id"], "creator-session")
            self.assertEqual(owner["conversation"], "42:issues:3")
            self.assertEqual(owner["worktree"], str(worktree))
            self.assertEqual(owner_path.stat().st_mode & 0o777, 0o600)
            self.assertEqual(prepare("42:issues:3", clone, "--check-owner").returncode, 0)
            self.assertEqual(prepare("42:issues:3", clone, "--check-owner", "--creation-id",
                                     owner["creation_id"]).returncode, 0)
            self.assertNotEqual(prepare("42:issues:3", clone, "--check-owner", "--creation-id",
                                        "0" * 32).returncode, 0)
            env["HERMES_SESSION_ID"] = "another-session"
            self.assertEqual(prepare("42:issues:3").returncode, 0, "Reuse does not transfer ownership")
            self.assertEqual(json.loads(owner_path.read_text()), owner)
            self.assertNotEqual(prepare("42:issues:3", clone, "--check-owner").returncode, 0)
            env["HERMES_SESSION_ID"] = "creator-session"
            saved_owner = owner_path.read_text()
            owner_path.write_text("{broken")
            self.assertNotEqual(prepare("42:issues:3", clone, "--check-owner").returncode, 0)
            owner_path.unlink()
            foreign_owner = root / "foreign-owner.json"
            foreign_owner.write_text(saved_owner)
            owner_path.symlink_to(foreign_owner)
            self.assertNotEqual(prepare("42:issues:3", clone, "--check-owner").returncode, 0)
            self.assertEqual(foreign_owner.read_text(), saved_owner)
            owner_path.unlink()
            self.assertEqual(prepare("42:issues:3").returncode, 0)
            self.assertFalse(owner_path.exists(), "Legacy reuse must not claim creator ownership")
            self.assertNotEqual(prepare("42:issues:3", clone, "--check-owner").returncode, 0)
            owner_path.write_text(saved_owner)
            self.assertNotEqual(prepare("42:issues:99", clone, "--check-owner").returncode, 0)
            self.assertFalse((clone / ".worktrees/42-issues-99").exists())
            env["HERMES_SESSION_ID"] = ""
            self.assertNotEqual(prepare("42:issues:98").returncode, 0)
            self.assertFalse((clone / ".worktrees/42-issues-98").exists())
            env["HERMES_SESSION_ID"] = "creator-session"
            (worktree / "draft.txt").write_text("Keep this draft")
            again = prepare("42:issues:3")
            self.assertEqual(again.returncode, 0, again.stderr)
            self.assertEqual(again.stdout, first.stdout)
            self.assertEqual((worktree / "draft.txt").read_text(), "Keep this draft")
            for card in ("42:merge_requests:3", "43:issues:3"):
                result = prepare(card)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertNotEqual(result.stdout, first.stdout)
                self.assertFalse((Path(result.stdout.strip()) / "draft.txt").exists())
            self.assertEqual(git("rev-parse", "HEAD"), initial)
            self.assertEqual(git("status", "--porcelain"), "")
            # Two prepares racing for one Card converge on one native worktree.
            commands = [subprocess.Popen([sys.executable, str(SCRIPT), "--clone", str(clone),
                                         "--card", "42:issues:4", "--start", initial],
                                        env={**env, "HERMES_SESSION_ID": f"racing-session-{index}"},
                                        text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                        for index in range(2)]
            outputs = [process.communicate(timeout=10) for process in commands]
            self.assertEqual([process.returncode for process in commands], [0, 0], outputs)
            self.assertEqual(outputs[0][0], outputs[1][0])
            race_admin = Path(git("rev-parse", "--absolute-git-dir", cwd=outputs[0][0].strip()))
            self.assertIn(json.loads((race_admin / "codev-owner.json").read_text())["creator_session_id"],
                          {"racing-session-0", "racing-session-1"})
            # An occupied path or pre-existing branch must not be replaced.
            occupied = clone / ".worktrees/42-issues-7"
            occupied.mkdir()
            (occupied / "keep.txt").write_text("Keep this")
            self.assertNotEqual(prepare("42:issues:7").returncode, 0)
            self.assertEqual((occupied / "keep.txt").read_text(), "Keep this")
            git("branch", "codev/42-issues-8", initial)
            self.assertNotEqual(prepare("42:issues:8").returncode, 0)
            self.assertEqual(git("rev-parse", "codev/42-issues-8"), initial)
            for card, path in (("../../escape", clone), ("42:issues:3", root),
                               ("42:issues:3", worktree)):
                self.assertNotEqual(prepare(card, path).returncode, 0)
            # A symlink must not smuggle a different profile into this workspace.
            (clone / ".worktrees/42-issues-99").symlink_to(root, target_is_directory=True)
            self.assertNotEqual(prepare("42:issues:99").returncode, 0)
            (root / "workspace/escape").symlink_to(root, target_is_directory=True)
            self.assertNotEqual(prepare("42:issues:3", root / "workspace/escape").returncode, 0)


if __name__ == "__main__":
    unittest.main()
