---
name: close-worktree
description: Use for requested worktree removal and shutdown of its dedicated processes, preview tunnels or Docker dependencies.
metadata:
  hermes:
    tags: [worktrees, cleanup, docker, development]
---

# Close worktree

Nodes: `Working`, `Completed`, `Blocked`.
Shared contract: `$HERMES_HOME/SOUL.md`.
Invoke `/close-worktree <path>`; omit path only for one unambiguous conversation
checkout. Request authorizes normal cleanup, not unsaved-work loss, volume deletion
or shared shutdown.

## Target/creator check — `Working`, `Completed`, `Blocked`

Before any shutdown, match runtime `HERMES_SESSION_ID` with `creator_session_id` in
`codev-owner.json` under the target's `git rev-parse --absolute-git-dir`. Match profile,
clone, worktree, conversation and creation ID against saved runtime/trigger records:

```sh
python3 "$HERMES_HOME/../global-project/skills/gitlab-workflow/scripts/worktree.py" \
  --clone '<verified-clone>' --card '<recorded-conversation>' \
  --check-owner --creation-id '<recorded-creation-id>'
```

Missing/corrupt evidence, mismatches or missing session ID leave checkout/runtime
untouched. Report the recorded owner for routing to the original session; never
rewrite ownership or export another ID. Conversation reuse and merge events do not
transfer ownership. Legacy/non-Codev checkouts without evidence cannot auto-clean.
Preserve ownership outside the worktree before removal; Git deletes its admin directory.
Recheck immediately before removal for changed sessions/replaced checkouts.

Resolve with `git -C <clone> worktree list --porcelain`; match canonical path, Git
common directory, branch and conversation within this profile's `workspace/` clone's
`.worktrees/`. Reject symlink escapes, main clones, other profiles and unregistered
directories. Ambiguous targets require clarification. For an absent path/registration,
use only the matching saved closure record for this creator/creation ID and verified
live leftovers; old records cannot authorize reused PIDs, names or replacement
checkouts. Without evidence, report uncertain ownership, not successful closure.

## Unsaved data or live runtime — `Working`, `Completed`

Inspect staged/unstaged/untracked/ignored files and submodules using metadata without
secret contents. Preserve valuable changes, `.env`, uploads and local data outside
checkout under `$HERMES_HOME/backups/close-worktree/` (`0700`, secret files `0600`),
and verify recovery copies. Separate staged/unstaged changes in exports. Copies made
with active writers are provisional until refreshed consistently after shutdown.
Reproducible caches/builds need no archive. Keep branches/commits; anchor unique
detached commits to a recovery branch. Do not auto-commit/push/discard/delete branches.
Unpreservable data or active tasks/editors/builds/migrations/users block teardown.
Collect shutdown config while checkout exists; run cleanup from outside it.

Cross-check saved records with live evidence:

| Resource | Required evidence |
| --- | --- |
| App/worker/watcher/test | Managed handle or PID + start time, command, cwd |
| Tunnel/forward | Preview record + matching command/session and target service |
| Compose | Docker context, exact project/files, cwd labels and every container exclusively owned |
| Standalone container | Exact ID, ownership labels/creation, mounts and exclusive consumers |
| Restart/cleanup job | Exact owned job ID; shared schedulers stay running |

Use `docker compose ls --all --format json` and selected `docker inspect` fields.
A branch-like name, port or one mount alone is insufficient. Reconstruct missing
runtime details from live evidence; leave ambiguous/shared resources running.
Record retained named/anonymous volumes and mounts. Before container/file removal,
preserve valuable writable-layer or worktree bind-mount data with database-native
exports or a complete consistent snapshot after stopping writers; SQLite needs WAL
and other required state, not just a copied live main file. Verify recovery artifacts
outside checkout. External/shared volumes, networks and databases remain shared.

## Teardown/retry — `Working`, `Completed`, `Blocked`

1. Disable only owned restart/cleanup jobs. Use `tunnel-preview` for existing previews:
   restore settings without restarting this checkout's apps; cancel reconnect/restore
   jobs. Gracefully stop dedicated processes through their manager/handle. Revalidate
   PID identity before signalling, wait for exit and inspect failures. No global
   `pkill`, port-wide kills or uncertain escalation.
2. Stop writers/containers before final snapshots; verify preservation before container
   removal. For exclusive Compose stacks use the recorded context, project, ordered
   files and original env/profile flags:

   ```sh
   docker --context <verified-context> compose -p <verified-project> -f <absolute-compose-file> down
   ```

   Never derive teardown config from new preview values/current directory. Mixed/shared
   stacks cannot use project-wide `down`; stop only safe dedicated resources. Standalone
   containers use exact IDs and removal follows data preservation. Keep volumes/images/
   caches; no `--volumes`, `--rmi`, `--remove-orphans`, prune or Docker-wide shutdown.
3. Verify targeted runtime stopped and no cwd/open files/mounts still depend on this
   directory. A shared service using it blocks removal until relocated. Recheck files
   and refresh verified final backups after shutdown, including restored env/uploads/
   databases. Recheck creator gate, then normal Git removal:

   ```sh
   git -C <absolute-clone> worktree remove <absolute-worktree>
   ```

   Git refusal needs resolution, never automatic force/unlock/`rm -rf`. An absent
   directory does not authorize pruning unrelated registrations.
4. Confirm directory and registration gone, dedicated runtime stopped and observed
   shared services still running. Mark only matching runtime/preview records closed;
   retain knowledge, branches, backups and volumes. An inaccessible Docker daemon is
   not an empty one; failures keep checkout/records open for retry. Repeated invocation
   verifies closure without touching other worktrees.

Closure output: removed path, stopped resources, preserved data/shared resources,
and unresolved teardown steps.

References: [Git removal](https://git-scm.com/docs/git-worktree),
[Compose down](https://docs.docker.com/reference/cli/docker/compose/down/),
[Compose inventory](https://docs.docker.com/reference/cli/docker/compose/ls/).
