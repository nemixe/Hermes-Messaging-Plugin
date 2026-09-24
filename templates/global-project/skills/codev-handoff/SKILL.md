---
name: codev-handoff
description: Use for GitLab issue creation/reuse or authorized bot assignment, including create-only requests.
metadata:
  hermes:
    tags: [gitlab, mattermost, handoff]
---

# Codev handoff

Nodes: `Planning`, `AwaitingAssignment`.
Shared contract: `$HERMES_HOME/SOUL.md`. API transport: `gitlab-cli`.

## New or duplicate issue — `Planning`

Reuse a named issue; otherwise search the mapped repository's open issues for the
same request. Confirm repository/title/summary/assignment only where not explicitly
authorized. Include request, requester and confirmed acceptance criteria.

```sh
glab api --hostname <configured-host> -X POST 'projects/<owned-project-id>/issues' \
  -f title='<confirmed-title>' -f description='<confirmed-description>'
```

Create-only: omit assignees on a new issue; reuse preserves existing assignees.

## Authorized assignment — `AwaitingAssignment`

Get bot ID from `glab api --hostname <configured-host> user`.
For a new issue, add `-F 'assignee_ids[]=<bot-user-id>'` to creation.
For an existing issue, GET current assignees first. If already assigned, use
`gitlab-workflow`'s existing-worker check instead of another PUT. Otherwise PUT the
full existing list plus the bot to `projects/<owned-project-id>/issues/<iid>`, one
`-F 'assignee_ids[]=<id>'` per ID.

Check resulting URL, IID and requested assignment state. For a missing authorized
assignment, reread once and repair a recoverable failure; avoid repeated writes.

Output for either case: verified issue URL and requested assignment state.

## Mattermost continuation — `AwaitingAssignment`

For a current Mattermost mention, resolve exactly one issue from an issue link,
a verified MR relation, or a scoped search of relevant Mattermost threads and GitLab
issues. If the match is uncertain, ask in the current thread before queueing. Read
planning, refinement and follow-up context with concise `[RM1](<thread-url>)` and
`[RG](<issue-url>)` links. Check the issue's current assignment and existing worker.
Once the bot owns the assigned issue, queue this current mention:

```sh
hermes -p default gitlab continue --issue '<numeric-project-id>:issues:<iid>'
```

The command verifies the live Mattermost mention, user, channel, profile route and
GitLab assignment, then stores one restart-safe handoff. Report the queue result in
the current thread and stop there. The issue's GitLab session performs the work and
reports completion or a blocker to the issue and original Mattermost thread.
