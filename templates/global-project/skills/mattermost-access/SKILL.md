---
name: mattermost-access
description: Use to explore Mattermost threads, send an authorized notice to another thread, or request and handle a confidential DM.
metadata:
  hermes:
    tags: [mattermost, messaging, threads, dm, search]
---

# Mattermost access

Shared contract: `$HERMES_HOME/SOUL.md`. Hermes delivers the final response to the current routed Mattermost thread. Use this helper to explore other threads, notify a different authorized thread, or handle a confidential DM; `post` rejects replies to the current thread. The helper uses the default profile's bot `MATTERMOST_URL`/`MATTERMOST_TOKEN` in `.env` or `platforms.mattermost` in `config.yaml`. Loading this skill does not authorize a message.

Use `python3 "$HERMES_HOME/../global-project/skills/mattermost-access/scripts/access.py"` with the commands below. IDs come from trusted Mattermost metadata or same-server permalinks, not display names. Read only channels and threads relevant to the task. A forward or quoted reply is a pointer: follow its original post and thread when accessible, and keep the source context distinct from the forwarding comment.

## Read and explore

```sh
python3 "$HERMES_HOME/../global-project/skills/mattermost-access/scripts/access.py" thread --post '<post-id-or-permalink>'
python3 "$HERMES_HOME/../global-project/skills/mattermost-access/scripts/access.py" recent --channel '<channel-id>' --page 0
python3 "$HERMES_HOME/../global-project/skills/mattermost-access/scripts/access.py" search --channel '<channel-id>' --terms '"exact phrase" from:alice after:2026-09-01'
```

`thread` returns the root and replies in pages. `search` scopes results to the channel; use Mattermost's `from:`, `before:`, `after:`, `on:`, quoted phrase and exclusion filters, then open relevant results with `thread`. Page through results when needed. `recent` is for browsing without a search term. Search visibility and relevance still govern what to read.

## Notify

For an authorized cross-thread notice, read the source and destination threads, then post a short action and source permalink in the destination thread. Send one post per destination; avoid copying confidential content into a wider audience. Reply to the current thread only through the final response. For a reply to another thread, supply any post in that thread; the helper resolves its root and checks the channel.

```sh
python3 "$HERMES_HOME/../global-project/skills/mattermost-access/scripts/access.py" post --channel '<channel-id>' --root '<target-post-id>' --message '<action and source link>'
```

## Confidential DM handoff

For a requested secret, match the domain to a confirmed PIC in `memories/semantic/team.md` and verify the Mattermost account. If the PIC or identity is unclear, ask in the originating discussion. Choose a profile-local dest with private parent permissions. Name only the items and dest in the DM; keep values out of command arguments, logs and originating channel posts. The DM session writes it; the original work session reads it on a later turn. Acknowledge the DM request in the original thread through the final response, then end that turn. Do not poll or hold it open.

```sh
python3 "$HERMES_HOME/../global-project/skills/mattermost-access/scripts/access.py" request --user '<verified-username-or-id>' --dest '<profile-path>' --keys '<NAME,NAME>' --message 'Mohon kirim <items> di DM ini; saya simpan di <dest>. Setelah itu, balas di thread asal agar kerja lanjut.'
python3 "$HERMES_HOME/../global-project/skills/mattermost-access/scripts/access.py" pending --user '<current-mattermost-user-id>' --channel '<current-chat-id>'
```

Keep the returned request ID and dest. A reply needs a matching pending request. Write supplied material to its dest with file tools (`0600`; merge `.env`), then run `complete --id '<request-id>'`. Acknowledgement names the dest and asks for a reply in the original thread. The original session may use `status --id '<request-id>'` on a later turn.

Missing credentials belong on the default profile. A Cloudflare 1010/403 requires the Mattermost admin to allow this API client/host.
