---
name: mattermost-dm
description: Open a personal Mattermost DM to collect confidential material, then continue the original thread's session when the user replies in that DM. Use when the user asks to chat personally, send secrets, tokens, keys, env, or other private values, or a Mattermost DM arrives for a pending confidential request.
metadata:
  hermes:
    tags: [mattermost, messaging, dm]
---

# Mattermost DM

The original thread stays the work session. The Mattermost DM is the private
reply thread for confidential material. Credentials are `MATTERMOST_URL` and
`MATTERMOST_TOKEN` from the default profile `.env` (the same messaging config
file as `GITLAB_URL` / `GITLAB_TOKEN`).

Helper:

```sh
python3 "$HERMES_HOME/../global-project/skills/mattermost-dm/scripts/dm.py"
```

The helper reads `MATTERMOST_TOKEN` itself. Keep tokens and secret values out of
command arguments, logs, and originating channel posts. Follow SOUL's
**Secrets in private messages** for what counts as confidential and how to
persist it.

## Request from the original thread

Done when the helper's `wait` result is `complete` and the destination file has
the requested confidential material, or when wait returns `pending` and the
original thread has a blocker telling the user to finish in the DM then reply
here.

1. Resolve the recipient from trusted session metadata (Mattermost `user_id`)
   or a username the user named. Resolve a destination file inside this profile
   (worktree/profile `.env` for variables, or another `0600` file for other
   secrets).
2. Start the personal chat and keep this session:

```sh
python3 "$HERMES_HOME/../global-project/skills/mattermost-dm/scripts/dm.py" \
  request --user '<username-or-id>' --dest '<profile-path>' \
  --keys '<NAME,NAME>' --message '<ask them to reply in that DM thread>'
python3 "$HERMES_HOME/../global-project/skills/mattermost-dm/scripts/dm.py" \
  wait --id '<id-from-request>'
```

Ask them, in Bahasa Indonesia, to reply in the DM thread Codev just opened.
Name the items and destination path, never values. Keep working in this
session after `wait` returns `complete`. If it is still `pending`, post one
blocker on this original thread.

## Collect on a Mattermost DM reply

Done when the destination file has the supplied confidential material,
`complete` has run, and the DM has a short ack that work continues in the
original thread.

This turn writes that material and acks the DM so the original session can
continue. Read the pending request first, write into its `dest` with file
tools (`0600`; merge a `.env` and preserve unrelated entries), then mark it
complete:

```sh
python3 "$HERMES_HOME/../global-project/skills/mattermost-dm/scripts/dm.py" \
  pending --user '<current-mattermost-user-id>' --channel '<current-chat-id>'
python3 "$HERMES_HOME/../global-project/skills/mattermost-dm/scripts/dm.py" \
  complete --id '<id-from-pending>'
```

`pending` must match this DM. Report only item names. If the helper reports
missing Mattermost credentials, add `MATTERMOST_URL` and `MATTERMOST_TOKEN`
to the default profile `.env`.
