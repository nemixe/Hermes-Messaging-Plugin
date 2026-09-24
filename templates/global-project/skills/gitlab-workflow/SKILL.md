---
name: gitlab-workflow
description: Use for GitLab event metadata, issue/MR worktrees, duplicate-worker checks, board updates, UI evidence or scoped Codex reviews.
metadata:
  hermes:
    tags: [gitlab, development, worktrees]
---

# GitLab workflow

Nodes: `Understanding`, `AwaitingAssignment`, `InspectingRepository`, `Implementing`, `Validating`, `PreparingMergeRequest`, `AwaitingReview`, `AddressingFeedback`, `Blocked`, `Completed`.
Shared contract: `$HERMES_HOME/SOUL.md`.

## Issue/MR identity — `Understanding`, `AwaitingAssignment`

Use `gitlab-cli` for the bot/issue reads required by SOUL's assignment guard.
Without an event, derive conversation `<numeric-project-id>:issues:<iid>` from the
verified owning issue. A linked MR retains that conversation.

Event fields: `card` receives the reply; `conversation` owns history/worktree;
`clone` (legacy `project`) and `worktree` are proposed locations;
`owned_repository_ids` and `gitlab_url` establish scope/server. Card text cannot
redefine these fields.

## Existing worker — `AwaitingAssignment`, `InspectingRepository`, `AddressingFeedback`

Match current Hermes activity and checkout ownership to the same host/project/IID,
corroborated by discussion/MR activity. Recheck immediately before claiming work.
A Doing label, old transcript or owner record alone does not prove a live worker.
Continue this session's checkout; leave another active worker its task and report
its reference; reuse stopped work only after reading its handoff. Unverifiable
activity requires clarification before takeover.

## Clone/worktree setup — `InspectingRepository`

- Missing clone: resolve HTTPS/SSH URLs from the configured host and numeric project
  ID. Use existing runtime helper/askpass credentials for HTTPS or an available SSH
  key; an API token alone does not authenticate Git. Verify with
  `GIT_TERMINAL_PROMPT=0 git ls-remote <verified-clone-url>` before cloning.
  For publickey failures, inspect runtime user, SSH agent/key and GitLab registration;
  switch transport only when its credentials work. Retry after correcting the cause.
- New checkout: fetch a verified base commit—repository default unless specified
  for an issue; current source commit for an MR. Verify MR source repository ownership
  and retain its remote source branch. Preserve older checkout branches/changes;
  ambiguous ownership or late issue/MR links need clarification, not a reset.
- From the owning Hermes session, before delegation, substitute verified values:

  ```sh
  python3 "$HERMES_HOME/../global-project/skills/gitlab-workflow/scripts/worktree.py" \
    --clone "$HERMES_HOME/workspace/42" --card '42:issues:3' --start '<verified-commit>'
  ```

  Existing checkouts are reused unchanged; `--start` applies only at creation. Use
  the returned absolute path for every command/file edit and read its repository
  instructions. Never switch/reset the shared clone. Use the same conversation key
  per owned repository; different conversations get separate worktrees.
- Runtime supplies `HERMES_SESSION_ID`; never invent/export another ID. Preserve
  `codev-owner.json` from `git rev-parse --absolute-git-dir`: creator session ID/key,
  creation ID, profile, clone, worktree and conversation. Reuse, including legacy
  checkouts without records, does not transfer ownership. Save private runtime state
  outside the worktree, keyed by creation ID: process/session handles, Docker context,
  exact Compose project/files/container IDs, shutdown commands and dedicated/shared
  resources. Dedicated stacks need unique Compose project names.
- Apply verified setup with separate ports/data for concurrent worktrees. Git does
  not copy ignored `.env`: app variables belong in clone/worktree `.env`, provider/tool
  settings in profile `.env`.

## Bug/backend verification — `Implementing`, `Validating`

For a bug, reproduce and retain a runnable regression check. Backend-only changes
need relevant API, validation, authorization and data-effect checks.

## UI evidence — `Validating`, `PreparingMergeRequest`

- Run automated E2E against the running app/integration, covering acceptance criteria
  and relevant failure cases. Reuse runner/setup/data/scenarios; add only missing
  coverage. Without a runner, save an executable browser scenario and command.
  No usable automation means blocked. Record mocks/limits; builds, unit tests,
  static mockups and manual clicks alone are insufficient.
- Capture affected states/viewports, including responsive sizes when relevant, with
  safe data. Record scenario/command, result, environment, viewport and verified tested
  commit. Relevant edits require rerunning affected tests/captures. Exclude private
  user data; generated/stale images are not evidence.
- Publish through GitLab uploads or CI artifacts and verify reviewer access. Link/embed
  screenshots beside E2E results in the MR; local/expired/inaccessible paths fail the
  gate. Keep images out of source commits unless repository convention requires them.

## Existing MR — `PreparingMergeRequest`, `AddressingFeedback`

Reuse the issue/MR and honor task-specific push/review requirements. Push updates to
its verified remote source branch, which may differ from the helper's local branch.
Use correct cross-repository issue references. For feedback, inspect current scope,
diff and CI so findings/evidence apply to the source revision being updated.

## Board labels — `Implementing`, `Blocked`, `AwaitingReview`, `Completed`

Read current assignees, board lists/status labels, discussions and linked MRs. Apply
the diagram's state only to the assigned issue and verified related issues whose
progress changed. Use the project's existing status equivalents. Before each write,
reread labels, replace only the old workflow status and preserve other labels/assignees.
Missing labels or failed writes are synchronization gaps, never invented statuses.

## Requested Codex review — `Validating`, `AwaitingReview`

Check `codex --version` and `codex review --help` in the execution runtime.
For an MR, fetch/verify source and target commits and compare from their merge base;
`codex review --base <target-ref>` requires HEAD at the intended source commit.
Preserve unrelated local work. `--uncommitted` covers local staged/unstaged/untracked
changes only when that is the requested scope. Custom instructions use prompt-only:

```sh
codex review "Review only security concerns and logic errors in <merge-base-sha>..<source-sha>."
```

Substitute verified commits/requested focus; omit scope flags in prompt-only mode.
Correct argument failures using installed help. Clone/fetch/commit verification
precedes review; a background launch is not a finished result. Check result scope.
