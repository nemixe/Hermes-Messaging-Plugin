---
name: tunnel-preview
description: Use for a requested temporary Pinggy preview, separate public service URLs, reconnect, or preview shutdown and environment restoration.
metadata:
  hermes:
    tags: [preview, tunnel, development]
---

# Tunnel preview

Nodes: `Validating`, `AwaitingReview`, `Blocked`, `Completed`.
Shared contract: `$HERMES_HOME/SOUL.md`.
Close requests go directly to restoration.

## Requested preview — `Validating`, `AwaitingReview`

Inspect actual app commands, environment consumers/precedence and setup notes; use
`gitlab-workflow`'s verified checkout. Identify requested HTTP services, health paths
and dependencies. Verify listener PID/process and HTTP response from the SSH runtime
(`lsof -nP -iTCP -sTCP:LISTEN` or Linux `ss -ltnp`). Use actual bound ports, including
auto-selected fallbacks and container host-published ports, not config defaults.
Run SSH in the network namespace that reaches them; use existing/authorized forwarding.
Exclude databases, caches, admin consoles and unrelated listeners. Preserve loopback
binding when sufficient, authentication and development data; a server exposing
secrets/directory listings needs a supported safe preview mode.

Before changing anything, save private state in `$HERMES_HOME/backups/tunnel-preview/`
(directory `0700`, files `0600`): services, worktrees, ports, process/session handles,
touched files/keys, original values/absence, latest applied values, prior running
state and restart/restore commands. Preserve the original baseline across reconnects.
Separate concurrent previews' checkout/config/ports; verify ownership/health before
reuse.

For each service, start its documented command and a managed persistent SSH session
(replace the example port):

```sh
ssh -p 443 -R0:localhost:8080 qr@free.pinggy.io
```

Keep host-key verification enabled, omit `-N`, and send neither secrets nor SSH agent
forwarding. Resolve interactive prompts through terminal input without global SSH
changes. Save actual output's HTTPS URL with service/port/process; a PID/QR is not
reachability evidence. Obtain every required URL before configuring dependents.
If any required tunnel fails, stop this attempt's tunnels and restore changes.

## Public app configuration — `Validating`

Trace each setting to its consumer; use only supported settings:

| Consumer | Temporary setting |
| --- | --- |
| Public app/assets/redirects | Service HTTPS URL plus required path |
| Browser API | API HTTPS URL plus existing API path |
| Server API/database/cache | Existing internal address unless public routing is required |
| Hosts/CORS/CSRF | Exact tunnel host/origin in framework syntax |
| Browser WebSocket/HMR | Tunnel host, `wss`, public port `443` |
| Auth callbacks/cookies | Public callback path, host-only cookies where supported, HTTPS flags |

Prefer process overrides or supported ignored env overrides. Back up existing files;
change only identified keys, preserving unrelated settings/comments. Never bulk-replace
localhost, expose server secrets to browser variables, or disable auth/CSRF/host
validation; exact origins, never wildcard. Restart affected services and rebuild
compiled frontend env values while tunnels remain running. Recheck ports after
restart; retarget changed ports, capture new URLs and update dependents. External
callback registration needs its own authorization. For cross-site cookie limitations,
use an existing same-origin proxy or report the limitation without weakening auth.

Verify expected public health responses, not Pinggy screening pages. Exercise an
API-backed flow in the public frontend and inspect network/console for localhost,
mixed content, CORS, cookies, redirects and WebSockets. Curl alone cannot verify
browser behavior; disclose unavailable browser/authenticated coverage. Preview output:
service URLs, verified flows, expiry and exact stop/restore command. Keep active preview
processes running; ephemeral URLs and handles stay in private state.

## Expiry/reconnect — `AwaitingReview`, `Blocked`

Record start/expiry; free tunnels have a 60-minute limit and new URLs on reconnect.
Use an available supervisor/bounded cleanup job on exit/expiry; otherwise give manual
cleanup without promising automatic restoration. Reconnect repeats URL propagation,
restart/build and verification, never indefinite retries or stale dependent URLs.

## Close/failure restoration — `Validating`, `AwaitingReview`, `Completed`, `Blocked`

1. Match private state to selected session/worktree and live identities; resolve
   ambiguous targets. Disable only its restart/reconnect/cleanup jobs, stop verified
   SSH handles and preserve other previews/shared resources. Exited tunnels still
   need settings restored.
2. Compare each changed setting to its latest session-applied value. Restore the
   original or remove an originally absent key only when it still matches; include
   process overrides and authorized external-provider changes. Remove a created
   override file only without newer edits. Preserve newer user edits/comments and
   report conflicts by path/key, never value. Recover missing baselines from verified
   backups or report the gap; never guess or replace an entire `.env` blindly.
3. Restore pre-preview service state: restart previously running apps with original
   settings; stop only preview-created processes. Rebuild compiled frontend settings.
   During `close-worktree`, restore files without restarting its apps. Preserve shared
   Docker services.
4. Verify tunnel exit and loss of public app access; for normal close, check original
   endpoints and an API-backed browser flow, including redirects/HMR as applicable.
   Distinguish restored configuration from unavailable runtime/browser verification.
   Mark closed only after required cleanup succeeds; retain backups/conflicts for
   retry. Repeated close verifies state without new tunnels or unrelated restarts.

Closure output: tunnel IDs, restored key names, local URLs/state and restore conflicts.

References: [SSH/QR](https://pinggy.io/docs/usages/),
[HTTP tunnels](https://pinggy.io/docs/http_tunnels/), [expiry](https://pinggy.io/help/).
