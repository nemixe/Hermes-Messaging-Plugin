---
name: mattermost-dm
description: Use for requested personal/confidential Mattermost DMs or a DM reply to a pending confidential request.
metadata:
  hermes:
    tags: [mattermost, messaging, dm]
---

# Mattermost DM

Nodes: `NeedsContext`, `AwaitingContext`, `Blocked`.
Shared contract: `$HERMES_HOME/SOUL.md`.

The DM session writes a named dest; the original work session reads it on a later
turn. No polling or holding the original turn open. The helper reads default-profile
`MATTERMOST_URL`/`MATTERMOST_TOKEN` from `.env`, or `platforms.mattermost.url/token`
from `config.yaml`.

## Confidential request — `NeedsContext`

Resolve recipient from trusted Mattermost user metadata or a user-named username.
Choose a profile-local dest (worktree `.env` or `$HERMES_HOME/memories/env.md`), with
private parent permissions. Substitute recipient, dest and item names:

```sh
python3 "$HERMES_HOME/../global-project/skills/mattermost-dm/scripts/dm.py" \
  request --user '<username-or-id>' --dest '<profile-path>' --keys '<NAME,NAME>' \
  --message 'Mohon kirim <items> di DM ini; saya simpan di <dest>. Setelah itu, balas di thread asal agar kerja lanjut.'
```

Keep the returned request ID and dest for handoff. On a later original-session turn,
read the dest; use helper `status --id '<request-id>'` if needed.

## Pending DM reply — `AwaitingContext`

```sh
python3 "$HERMES_HOME/../global-project/skills/mattermost-dm/scripts/dm.py" \
  pending --user '<current-mattermost-user-id>' --channel '<current-chat-id>'
```

Require a matching pending request for this DM. Write supplied material to its dest
with file tools (`0600`; merge `.env`), then run helper `complete --id '<request-id>'`.
This session only writes the dest; acknowledgement names it and requests a reply in
the original thread.

## Messaging access failure — `Blocked`

Missing credentials belong on the default profile. A Cloudflare 1010/403 requires
the Mattermost admin to allow this API client/host.
