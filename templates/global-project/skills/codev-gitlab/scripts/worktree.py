"""Prepare a card checkout with native Git; never reset or delete existing work."""
import argparse
import fcntl
import os
from pathlib import Path
import re
import subprocess


def prepare(clone, card, start=None):
    if not re.fullmatch(r"[1-9][0-9]*:(issues|merge_requests):[1-9][0-9]*", card):
        raise ValueError("Use the conversation's repository:type:number identity")
    if not os.environ.get("HERMES_HOME"):
        raise ValueError("Set HERMES_HOME to the active project profile")
    workspace = Path(os.environ["HERMES_HOME"]).resolve() / "workspace"
    clone = Path(clone).resolve(strict=True)
    if workspace.is_symlink() or not clone.is_relative_to(workspace) or clone == workspace:
        raise ValueError("Clone must be inside the active profile's workspace")

    def git(*args, cwd=clone):
        # Capture stderr because remote/config error messages can contain credentials.
        result = subprocess.run(["git", "-C", str(cwd), *args], capture_output=True, text=True)
        if result.returncode:
            raise ValueError("Git could not prepare the checkout; verify the clone, ref and existing worktrees")
        return result.stdout.strip()

    common = Path(git("rev-parse", "--path-format=absolute", "--git-common-dir")).resolve()
    if (clone / ".git").is_symlink() or common != clone / ".git":
        raise ValueError("Use the main clone, with its Git directory inside this profile")
    if Path(git("rev-parse", "--show-toplevel")).resolve() != clone:
        raise ValueError("Use the clone root")
    parent = clone / ".worktrees"
    if parent.is_symlink():
        raise ValueError("The .worktrees directory must not be symlinked")
    target = parent / card.replace(":", "-")
    branch = "codev/" + target.name
    if (common / "codev-worktrees.lock").is_symlink() or (common / "info").is_symlink():
        raise ValueError("Git's worktree lock and info directory must not be symlinked")
    # ponytail: serialize preparation per clone; Git worktree edits remain independent.
    with (common / "codev-worktrees.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        if target.is_symlink():
            raise ValueError("The card worktree must not be symlinked")
        if target.exists():
            if (Path(git("rev-parse", "--show-toplevel", cwd=target)).resolve() != target
                    or Path(git("rev-parse", "--path-format=absolute", "--git-common-dir",
                                cwd=target)).resolve() != common):
                raise ValueError("The card path belongs to a different checkout")
            return target
        if not start or start.startswith("-"):
            raise ValueError("Supply --start with a verified base ref or commit for a new worktree")
        commit = git("rev-parse", "--verify", "--end-of-options", start + "^{commit}")
        parent.mkdir(exist_ok=True)
        exclude = common / "info/exclude"
        if exclude.is_symlink():
            raise ValueError("Git's local exclude file must not be symlinked")
        exclude.parent.mkdir(exist_ok=True)
        with exclude.open("a+") as stream:
            stream.seek(0)
            if "/.worktrees/" not in stream.read().splitlines():
                stream.write("\n/.worktrees/\n")
        # Git refuses branch conflicts; there is deliberately no --force or reset.
        git("worktree", "add", "-b", branch, str(target), commit)
        return target


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--clone", required=True)
    parser.add_argument("--card", required=True)
    parser.add_argument("--start")
    args = parser.parse_args()
    try:
        print(prepare(args.clone, args.card, args.start))
    except (OSError, ValueError) as error:
        parser.exit(1, f"Worktree setup failed: {error}\n")
