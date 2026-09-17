---
name: close-worktree
description: Use when the user invokes /close-worktree or asks to remove a worktree and shut down its dedicated application processes, preview tunnels or Docker dependencies. Does not delete a repository or stop shared infrastructure.
metadata:
  hermes:
    tags: [worktrees, cleanup, docker, development]
---

# Close worktree

Close the selected worktree and its dedicated runtime using native Git, Docker and
process controls. This shared skill runs in the active project profile; keep
`HERMES_HOME` unchanged. Installing the skill does not perform cleanup. A request
to close a worktree authorizes its normal cleanup, not discarding unsaved work,
deleting database volumes or stopping other projects.
Invoke `/close-worktree <worktree-path>`, or omit the path only when the current
conversation identifies exactly one worktree.

## Creator session gate

Before stopping any runtime, match the current runtime's `HERMES_SESSION_ID` to
the worktree's recorded `creator_session_id`. For Codev, read `codev-owner.json`
under the target's `git rev-parse --absolute-git-dir`; it is written by the creation
helper, not inferred from the branch name, MR author or current conversation.
Match its profile, clone, worktree, conversation and `creation_id` to the saved
runtime record and any cleanup trigger. Verify with the shared helper:

```sh
python3 "$HERMES_HOME/../global-project/skills/codev-gitlab/scripts/worktree.py" \
  --clone '<verified-clone>' --card '<recorded-conversation>' \
  --check-owner --creation-id '<recorded-creation-id>'
```

On mismatch, missing/corrupt record or missing runtime session ID, leave the worktree
and its runtime untouched. Report the recorded owner so the trigger can be routed
to that original session. Never rewrite ownership or export another session's ID
to make the check pass. A resumed original session can clean up; a new transcript
in the same conversation, or a session that merely reused the checkout, cannot.
Legacy/non-Codev worktrees without creator evidence are excluded from automatic
cleanup. A merge event is a cleanup request, not a transfer of ownership.

For an already removed worktree, use the matching saved closure record for this
same creator session and creation ID; inspect only its recorded runtime instances.
Preserve a copy of the ownership record outside the worktree before removing it,
because Git removes the administrative directory too. Re-run the gate immediately
before worktree removal to catch a replaced checkout or changed session.

## Identify the target and preserve work

1. Resolve the requested path or current conversation's worktree through
   `git -C <clone> worktree list --porcelain`. Match its canonical path, Git common
   directory, branch and conversation. For Codev, keep it under the active profile's
   `workspace/<repository-id>/.worktrees/`. If both the path and registration are
   already absent, use the saved closure record only after matching the requested
   path and repository identity. Verify its recorded runtime identities and handle
   proven dedicated leftovers with the runtime steps below, skipping checkout
   checks/removal. Return already closed only when cleanup is complete. Never act on
   reused PIDs/container names or a newly created worktree at the old path using an
   old record. Without a matching record, report the absent target and uncertain
   runtime ownership. For an existing target, reject a symlink escape, the main clone,
   another profile, or a directory that is not a registered linked worktree. If the
   request leaves several possible targets, ask which one before stopping anything.
2. Check staged/unstaged changes, untracked files, ignored files and submodule state.
   Inspect filenames/metadata without printing secret contents. A clean ordinary
   `git status` does not protect ignored `.env`, uploads or local database files.
   Preserve valuable local files outside the worktree in a private directory under
   `$HERMES_HOME/backups/close-worktree/` (`0700`, secret snapshots `0600`); verify
   copies before proceeding. Treat any copy made while writers are active as
   provisional; refresh it consistently after quiescing writers before deletion.
   Reproducible caches/build outputs need no archive.
   Keep the branch and commits; anchor unique detached-HEAD commits to a recovery
   branch before removal. If unsaved changes or local data cannot safely be
   preserved, report the exact paths and resolve that before shutdown. Do not
   auto-commit, push, discard changes or delete branches as part of closing.
3. Read setup/preview session records and check for an active task, editor operation,
   build, migration or another user still using the checkout. Resolve conflicting
   ownership before teardown. Collect the shutdown commands and compose files while
   the worktree still exists. Run cleanup from a directory outside the target.

## Establish runtime ownership

Use the recorded worktree path and live evidence together. Save the inventory and
cleanup outcome outside the target; keep credentials and full environment dumps out
of logs and knowledge.

| Runtime | Evidence required before stopping |
| --- | --- |
| App server, watcher, worker or test runner | Managed session handle, or PID plus start time, command and working directory matching this worktree |
| Pinggy tunnel or local port-forward | Preview record plus matching live command/session and target service; port number alone is insufficient |
| Docker Compose stack | Correct Docker context/endpoint, exact project name, compose file paths, working-directory labels and all live containers belonging exclusively to this worktree |
| Standalone container | Exact container ID, ownership labels or creation record, mounts and known consumers showing exclusive worktree use |
| Cleanup/restart job | Exact task/job identifier created for this worktree; shared schedulers remain running |

Use `docker compose ls --all --format json` and selected fields from `docker inspect`
to cross-check recorded IDs, Compose labels, bind mounts and networks. Inspect every
container in a candidate Compose project: a reused project name can include another
worktree. A name containing the branch name, matching port, or one matching bind mount
alone is not proof of exclusivity. If records are missing, reconstruct ownership
from live evidence; leave ambiguous/shared resources running and report them.

Record retained named/anonymous volume IDs and mount locations before containers
are removed. Data in a container's writable layer or a bind mount inside the
worktree will be lost on removal: preserve valuable data first; reproducible runtime
outputs can be discarded. Resolve uncertainty before removal. An
external volume/network or a database serving multiple worktrees remains shared
even when this worktree is one of its consumers.
For databases, use a database-native consistent export or stop writers and follow
the database's complete snapshot procedure. Copying a live SQLite main file alone
is insufficient; account for its WAL and other required state. Verify recovery
artifacts outside the worktree before deleting their original container/files.

## Stop dedicated runtime, then remove

1. Disable only this worktree's restart/cleanup jobs so they cannot recreate the
   runtime. If a preview exists, use `tunnel-preview` to close its tunnels and restore
   temporary settings. This is a teardown: restore files without restarting the
   worktree's apps, and cancel any pending preview restore/reconnect job.
2. Stop dedicated application processes gracefully through their owning terminal
   session or service manager, including owned workers/watchers. For a recorded PID,
   revalidate identity immediately before signalling; PIDs can be reused. Wait for
   exit and inspect failures. Avoid global `pkill`, killing everything on a port,
   or escalation against a process whose identity is uncertain.
3. Shut down Docker dependencies while their configuration is still available.
   If valuable data needs a filesystem snapshot, gracefully stop its writers and
   containers first, capture and verify the final data while the containers still
   exist, then remove them. Do not use `down` before this preservation is complete.
   For an exclusively owned Compose stack, use the exact recorded context, project
   name and ordered compose files, with any required original env-file/profile flags:

   ```sh
   docker --context <verified-context> compose -p <verified-project> -f <absolute-compose-file> down
   ```

   Substitute verified arguments; do not rely on the current directory's default
   project name or interpolate new preview values into the old teardown config.
   For standalone dedicated containers, stop their exact IDs; remove them only
   after checking data preservation. If a Compose project includes shared services,
   do not run project-wide `down`; stop only proven dedicated resources if safe.
   Keep volumes, images and build caches by default. Do not use `--volumes`,
   `--rmi`, `--remove-orphans`, global prune, or stop Docker itself.
4. Verify all targeted processes/containers/tunnels stopped and no remaining
   runtime is using the target through its working directory, open files or mounts.
   A shared service depending on this directory blocks removal until relocated;
   leaving it running is not sufficient. If shutdown or ownership is unresolved,
   keep the worktree and report the remaining blocker rather than a successful close.
5. After runtime shutdown, recheck tracked, staged, untracked and ignored files;
   refresh and verify final backups of valuable files changed since preflight,
   including restored `.env`, uploads and database state. Preserve staged and
   unstaged changes separately if exporting them. From the verified main clone run:

   ```sh
   git -C <absolute-clone> worktree remove <absolute-worktree>
   ```

   Use normal removal. If Git refuses because of changes, submodules or a lock,
   resolve that specific reason with the user; never silently retry with `--force`,
   unlock a worktree or fall back to `rm -rf`. A directory already absent is not
   permission to prune unrelated registrations; inspect the specific stale entry.

## Verify and report

Confirm the target directory and its Git worktree registration are gone, its
dedicated runtimes are stopped, and shared services inspected during discovery
remain running. Mark only this worktree's runtime/preview records closed. Keep
project knowledge, recovery branches, backups and retained volumes accessible.
Report the removed path, stopped resources, preserved shared resources/data and
any remaining work. Repeated invocation should report already closed/stopped state
without touching other worktrees or treating an inaccessible Docker daemon as empty.

References: [Git worktree removal](https://git-scm.com/docs/git-worktree),
[Compose down](https://docs.docker.com/reference/cli/docker/compose/down/),
[Compose inventory](https://docs.docker.com/reference/cli/docker/compose/ls/).
