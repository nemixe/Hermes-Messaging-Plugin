"""Prepare a card checkout with native Git; never reset or delete existing work."""
import argparse
import fcntl
import json
import os
from pathlib import Path
import re
import subprocess
import uuid


def prepare(clone, card, start=None, *, branch_type=None, check_owner=False, creation_id=None):
    if not re.fullmatch(r"[1-9][0-9]*:(issues|merge_requests):[1-9][0-9]*", card):
        raise ValueError("Use the conversation's repository:type:number identity")
    if not os.environ.get("HERMES_HOME"):
        raise ValueError("Set HERMES_HOME to the active project profile")
    workspace = Path(os.environ["HERMES_HOME"]).resolve() / "workspace"
    session = os.environ.get("HERMES_SESSION_ID", "")
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

    def ownership_path():
        admin = Path(git("rev-parse", "--absolute-git-dir", cwd=target))
        record = admin / "codev-owner.json"
        if (admin.parent != common / "worktrees" or any(p.is_symlink() for p in
                (target / ".git", admin.parent, admin, record))):
            raise ValueError("Invalid or symlinked worktree ownership path")
        return record

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
            if check_owner:
                record = ownership_path()
                owner = json.loads(record.read_text()) if record.is_file() else None
                expected = {"creator_session_id": session, "profile_home": str(workspace.parent),
                            "clone": str(clone), "worktree": str(target), "conversation": card}
                if (not session or not isinstance(owner, dict)
                        or any(owner.get(key) != value for key, value in expected.items())
                        or (creation_id is not None and owner.get("creation_id") != creation_id)
                        or not re.fullmatch(r"[0-9a-f]{32}", str(owner.get("creation_id", "")))):
                    raise ValueError("Cleanup requires a matching recorded creator session; ownership is missing or different")
            return target
        if check_owner:
            raise ValueError("No existing worktree to check; nothing was created")
        if not session or len(session) > 512 or any(c.isspace() for c in session):
            raise ValueError("Worktree creation requires the runtime's HERMES_SESSION_ID")
        if not start or start.startswith("-"):
            raise ValueError("Supply --start with a verified base ref or commit for a new worktree")
        if branch_type not in ("feature", "fix", "chore"):
            raise ValueError("Supply --branch-type feature, fix, or chore for a new worktree")
        branch = f"{branch_type}/{target.name}"
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
        owner = {"creation_id": uuid.uuid4().hex, "creator_session_id": session,
                 "creator_session_key": os.environ.get("HERMES_SESSION_KEY", ""),
                 "profile_home": str(workspace.parent), "conversation": card, "clone": str(clone),
                 "worktree": str(target), "branch": branch, "start_commit": commit}
        # Exclusive creation: a failed/partial record never grants cleanup ownership.
        with os.fdopen(os.open(ownership_path(), os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), "w") as stream:
            json.dump(owner, stream)
            stream.flush()
            os.fsync(stream.fileno())
        return target


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--clone", required=True)
    parser.add_argument("--card", required=True)
    parser.add_argument("--start")
    parser.add_argument("--branch-type", choices=("feature", "fix", "chore"))
    parser.add_argument("--check-owner", action="store_true",
                        help="Only verify that this existing worktree was created by the current Hermes session")
    parser.add_argument("--creation-id", help="With --check-owner, require this worktree creation instance")
    args = parser.parse_args()
    try:
        if args.creation_id and not args.check_owner:
            raise ValueError("--creation-id requires --check-owner")
        print(prepare(args.clone, args.card, args.start, branch_type=args.branch_type,
                      check_owner=args.check_owner, creation_id=args.creation_id))
    except (OSError, ValueError) as error:
        parser.exit(1, f"Worktree setup failed: {error}\n")
