---
name: codev-handoff
description: Use when preparing a GitLab issue or Codev assignment from any surface, including Mattermost implementation handoff and requests to create an issue without starting work.
metadata:
  hermes:
    tags: [gitlab, mattermost, handoff]
---

# Codev handoff

Use this skill to prepare an issue or assignment before implementation on any
surface. Questions, explanations and read-only investigation need no assignment.

Done when the requested issue operation is verified and the originating surface
has its link. For a create-only request, preserve existing assignees or omit
assignees on a new issue; do not assign Codev. For an authorized implementation
handoff, verify this profile's bot is an assignee. The GitLab assignment session
carries implementation; creating an issue alone does not start coding.

## Confirm

1. Read `$HERMES_HOME/PROJECT.yaml`. Resolve the target repository from that
   inventory. If several mapped repositories could own the work, Ask which one.
2. If the user already named an issue IID or URL in a mapped repository, reuse
   it. Otherwise search that repository's open issues for the same request and
   reuse a match instead of creating a duplicate.
3. Confirm only the requested operation: repository, proposed title/summary for
   creation, and whether assignment is requested. For an implementation handoff,
   state that assignment starts the GitLab coding session. Wait for confirmation
   unless those details and the operation are already explicitly authorized.
   A create-only request never implies assignment. An explicit assignment of a
   resolved existing issue needs no repeated confirmation.

## Create and assign

Use `gitlab-cli` following SOUL's **Skill loading** rule. Take the host from
the configured `gitlab_url`. Substitute verified values; keep secrets out of
the issue body, command arguments and Mattermost replies.

1. Read the bot identity from `glab api --hostname <configured-host> user`.
2. For a new issue, use the command below. Include `assignee_ids[]` only for an
   authorized assignment; omit it for create-only. If create-only reuses a matching
   issue, return its verified link without changing its assignees or starting work.

```bash
glab api --hostname <configured-host> -X POST "projects/<owned-project-id>/issues" \
  -f title='<confirmed-title>' \
  -f description='<confirmed-description>' \
  -F "assignee_ids[]=<bot-user-id>"
```

For an authorized assignment of an existing issue, GET current `assignee_ids`
first. If the bot is already assigned, do not repeat the PUT or start a parallel
worker; inspect existing activity. For a stopped session, ask an authorized user
to post a fresh mention of the verified bot username on the issue; do not send a
self-mention, which the adapter ignores.
Otherwise PUT that list plus the bot:

```bash
glab api --hostname <configured-host> -X PUT \
  "projects/<owned-project-id>/issues/<issue-iid>" \
  -F "assignee_ids[]=<existing-id>" \
  -F "assignee_ids[]=<bot-user-id>"
```

3. Verify the issue URL, IID and requested assignment state. If an authorized
   assignment is missing, reread once and correct a recoverable failure; otherwise
   report the blocker instead of repeatedly writing or claiming handoff succeeded.

The description includes the original request, requester, and any
confirmed acceptance criteria.

## After handoff

Reply on the originating surface with the verified issue link and whether Codev
was assigned. Assignment can start a GitLab worker; leave implementation with that
session rather than racing it from Desktop/TUI/CLI. For create-only, state that
no assignment was made. For an existing stopped task, return the issue link and
ask the authorized user to mention the bot there; report it as awaiting that
trigger, not resumed. Unchanged assignment and board movement do not reliably
trigger a new turn.
