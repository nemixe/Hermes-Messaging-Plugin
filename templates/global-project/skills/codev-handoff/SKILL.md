---
name: codev-handoff
description: On a Mattermost-triggered session, turn implementation, code generation, or task-doer work into a confirmed GitLab issue assigned to this profile's Codev bot. Use when Mattermost asks to implement, code, fix, or spawn a coding task.
metadata:
  hermes:
    tags: [gitlab, mattermost, handoff]
---

# Codev handoff

Use this skill when the current turn originated on Mattermost and the request
needs implementation, code changes, a coding subagent, or a task-doer.
Questions, explanations, and read-only investigation stay on Mattermost.

Done when a mapped GitLab issue exists, this profile's Codev bot is an
assignee, and Mattermost has the verified issue link. The GitLab assignment
session carries implementation.

## Confirm

1. Read `$HERMES_HOME/PROJECT.yaml`. Resolve the target repository from that
   inventory. If several mapped repositories could own the work, Ask which one.
2. If the user already named an issue IID or URL in a mapped repository, reuse
   it. Otherwise search that repository's open issues for the same request and
   reuse a match instead of creating a duplicate.
3. End the Mattermost turn with one confirmation: repository name and ID,
   proposed title, short summary, and that assigning this profile's Codev bot
   starts the GitLab coding session. Wait for an explicit yes. If the user
   already named the repository and title and asked to create and assign, skip
   this wait.

## Create and assign

Load `gitlab-cli` with `skill_view` before any `glab` call. Take the host from
the configured `gitlab_url`. Substitute verified values; keep secrets out of
the issue body, command arguments and Mattermost replies.

1. Read the bot identity from `glab api --hostname <configured-host> user`.
2. Create the issue, or update the reused issue, with the bot as assignee:

```bash
glab api --hostname <configured-host> -X POST "projects/<owned-project-id>/issues" \
  -f title='<confirmed-title>' \
  -f description='<confirmed-description>' \
  -F "assignee_ids[]=<bot-user-id>"
```

For an existing issue, GET current `assignee_ids` first and PUT that list plus
the bot:

```bash
glab api --hostname <configured-host> -X PUT \
  "projects/<owned-project-id>/issues/<issue-iid>" \
  -F "assignee_ids[]=<existing-id>" \
  -F "assignee_ids[]=<bot-user-id>"
```

3. If the response assignees omit the bot, repeat the PUT. Verify the issue
   URL, IID, and that the bot is an assignee before reporting the handoff.

The description includes the original Mattermost request, requester, and any
confirmed acceptance criteria.

## After handoff

Reply on Mattermost with the verified issue link. The poller starts Codev from
that assignment. This Mattermost session's completion is that link.
