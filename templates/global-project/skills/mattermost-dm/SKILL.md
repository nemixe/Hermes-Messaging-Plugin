---
name: mattermost-dm
description: Open a personal Mattermost DM that asks for confidential material and names the dest file the separate DM session will write. Use when the user asks to chat personally, send secrets, tokens, keys, env, or other private values, or a Mattermost DM arrives for a pending confidential request.
metadata:
  hermes:
    tags: [mattermost, messaging, dm]
---

# Mattermost DM

The original thread is the work session. The Mattermost DM is a **separate**
session that copies confidential material into a dest file inside this profile.
The original session reads that file on a later turn. Do not wait, poll, or
hold the original turn open.

Credentials are the default profile's Mattermost messaging settings:
`MATTERMOST_URL` and `MATTERMOST_TOKEN` in `.env`, or `platforms.mattermost`
`url`/`token` in `config.yaml`.

Helper:

```sh
python3 "$HERMES_HOME/../global-project/skills/mattermost-dm/scripts/dm.py"
```

The helper reads `MATTERMOST_TOKEN` itself. Keep tokens and secret values out of
command arguments, logs, and originating channel posts. Follow SOUL's
**Secrets in private messages**.

## Request from the original thread

Done when the DM has been sent, the dest path is named in that DM, and this
thread has one note that work continues after the dest file exists.

1. Resolve the recipient from trusted session metadata (Mattermost `user_id`)
   or a username the user named. Choose a dest file inside this profile, for
   example `$HERMES_HOME/memories/env.md`, the worktree `.env`, or another
   `0600` path. Create parent directories if needed.
2. Send the personal chat. The message names the items and the dest path
   (never values), in Bahasa Indonesia:

```text
Mohon kirim <items> di thread DM ini.
Nilainya akan saya simpan di `<dest>`.
Setelah terkirim di sini, balas di thread asal supaya kerja lanjut.
```

```sh
python3 "$HERMES_HOME/../global-project/skills/mattermost-dm/scripts/dm.py" \
  request --user '<username-or-id>' --dest '<profile-path>' \
  --keys '<NAME,NAME>' --message '<text above with dest filled in>'
```

3. On this original thread, say that the request is in DM and that you will
   read `<dest>` on the next turn here. End the turn. Independent work that
   does not need those values may continue.

On a later original-thread turn, read `<dest>` (and `status --id` if needed).
If the file has the requested items, continue. If it is still missing, one
blocker: finish in the DM, then reply here.

```sh
python3 "$HERMES_HOME/../global-project/skills/mattermost-dm/scripts/dm.py" \
  status --id '<id-from-request>'
```

## Collect on a Mattermost DM reply

This session only writes the dest file. Done when `dest` has the supplied
material, `complete` has run, and the DM acks the dest path.

```sh
python3 "$HERMES_HOME/../global-project/skills/mattermost-dm/scripts/dm.py" \
  pending --user '<current-mattermost-user-id>' --channel '<current-chat-id>'
```

Write into `dest` with file tools (`0600`; merge a `.env` and preserve
unrelated entries). Then:

```sh
python3 "$HERMES_HOME/../global-project/skills/mattermost-dm/scripts/dm.py" \
  complete --id '<id-from-pending>'
```

`pending` must match this DM. Report only item names and the dest path. Ask
them to reply on the original thread. If credentials are missing, set
`MATTERMOST_URL` and `MATTERMOST_TOKEN` on the default profile. A Cloudflare
1010/403 means the server blocked this API client; ask the Mattermost admin
to allow it from this host.
