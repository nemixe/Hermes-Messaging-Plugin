---
name: tunnel-preview
description: Use when the user requests a temporary public preview through Pinggy, needs separate public URLs for application services, or says close tunnel, stop preview, or refresh a preview and restore its environment.
metadata:
  hermes:
    tags: [preview, tunnel, development]
---

# Tunnel preview

Expose the requested application's web/API services through Pinggy and temporarily
configure the app to work through their public HTTPS URLs. This skill is shared in
`global-project`; keep `HERMES_HOME`, worktrees, environment files and preview state
in the active project profile. Creating/installing this skill does not start tunnels.
For `close tunnel`, `stop preview`, or `/tunnel-preview close <session-or-worktree>`,
go directly to **Close tunnel and restore**; do not start new tunnels.

## Discover and prepare

1. Read the project's repository/setup knowledge and inspect its actual start
   commands, environment variable usages and configuration precedence. For GitLab
   repository work, use the `codev-gitlab` skill's verified worktree. Identify each
   requested HTTP service, health path and dependencies. Read its startup output
   and inspect listening sockets (`lsof -nP -iTCP -sTCP:LISTEN` or `ss -ltnp` on
   Linux). Match the listener's PID/process to the intended service and confirm
   its HTTP response. Configuration files alone do not prove which port is bound:
   if a dev server falls back from 3000 to 3001, tunnel 3001. Use one tunnel per
   service; `8080` below is only an example, never a default for an unknown port. Databases,
   caches, management consoles and unrelated listeners are outside an app preview.
2. Run SSH on the host/network namespace where `localhost:<port>` reaches that
   service. For containers, use an existing published local port or approved local
   forwarding. Use the host-published port, not the container-internal port. Check
   the local response and service identity from the SSH runtime before exposing it;
   resolve a missing or ambiguous listener rather than guessing a port.
   Keep loopback binding when sufficient; preserve the application's authentication
   and use development data. Avoid exposing a development server that serves secrets
   or directory listings; use the project's supported preview mode instead.
3. Before changes, create a private session directory under the active profile's
   `backups/tunnel-preview/` (directory mode `0700`, state/backups `0600`). Record
   service names, worktrees, ports, owned process/session handles, touched files and
   keys, their original state including absent keys/files, the latest session-applied
   values, each service's pre-preview running/stopped state, and restart/restore
   commands. Preserve the original baseline across
   reconnects; update only the session-applied values for comparison during cleanup.
   Keep secret-bearing snapshots on disk, never in chat or shared skills. Reuse an
   existing preview only after verifying its ownership and health. Concurrent
   previews must have separate worktrees/configuration and ports.

## Open tunnels

Start each service using its documented command, then run one persistent terminal
session/process per service, substituting its verified local port:

```sh
ssh -p 443 -R0:localhost:8080 qr@free.pinggy.io
```

Keep SSH attached to the terminal tool's managed background session so output and
shutdown remain accessible. `qr` requests a terminal QR code; do not add `-N`, which
Pinggy discourages. Keep host-key verification enabled; do not pass project secrets
or forward your SSH agent to Pinggy. If SSH needs interaction, use the terminal's
input facility and resolve the actual prompt without changing global SSH settings.

Capture the HTTPS URL from each process's actual output and save the service →
port → URL → process mapping. A running PID or QR code alone does not prove the
service is reachable. Obtain all required URLs before updating their dependents.
If opening a required tunnel fails, stop the tunnels created for this attempt and
restore any changes instead of reporting a working multi-service preview.

## Adapt the environment for this session

Trace each setting to its consumer before editing it. Apply only settings the app
actually supports; these are roles, not prescribed variable names:

| Setting role | Temporary value |
| --- | --- |
| Public application URL, asset origin, redirects | That service's HTTPS tunnel URL, retaining required path prefixes |
| Browser-facing API URL | The API's HTTPS tunnel URL and its existing API path |
| Server-to-server API, database, cache connection | Keep its existing internal address unless the code requires public routing |
| Allowed hosts, CORS, CSRF trusted origins | Exact tunnel hostname/origin in the syntax the framework expects |
| Browser WebSocket/HMR endpoint, when used | Correct tunnel hostname, `wss` and public port `443` |
| Authentication callback/base URL, cookies | Correct public callback path; host-only cookies where supported and HTTPS-compatible flags |

Prefer process-scoped overrides or the framework's supported ignored environment
override file. If an existing `.env` or config must change, back it up first and
modify only the identified keys. Keep comments and unrelated settings intact; never
bulk-replace every `localhost`, dump the environment, or put server secrets in
browser-exposed variables. Keep credentials, auth checks, CSRF and host validation
enabled; use exact allowed origins rather than `*`.

Restart affected services with those settings; rebuild frontend assets if their
public variables are compiled in. Keep tunnel processes running while restarting
the local apps. Recheck listeners after each restart: if a service changes port,
retarget its tunnel, capture the new public URL and update dependents again.
If external OAuth/provider callback registration is also needed,
report that dependency and use the task's authorization for any external changes;
changing an `.env` alone cannot register a callback. Cross-site cookie restrictions
can still block separate frontend/API domains: use the app's existing same-origin
proxy when available, or report the limitation instead of disabling auth protections.

## Verify and hand off

Check each public health route for the expected application response, not merely
an HTTP 200 from Pinggy's browser screening page. Open the frontend through its
public URL and exercise an API-backed flow. Inspect browser network/console output
for localhost requests, mixed content, CORS, failed cookies, redirects and WebSockets
when applicable. A curl success alone does not verify browser CORS or authentication.
State explicitly if browser or authenticated-flow verification is unavailable.

Return the working service URLs, verified flows, expiry expectation and the exact
session stop/restore procedure. Keep the processes alive after delivering an active
preview. Save reusable commands and variable names in the project's workflow
knowledge; keep ephemeral URLs and process handles in the private session state.

## Expiry and reconnect

Pinggy's free tunnels currently expire after 60 minutes and receive a new URL on
reconnect. Record start time and this limit. Use the runtime's existing supervisor
or bounded cleanup job to restore the preview when its tunnels exit or expire;
if unavailable, clearly provide manual cleanup and do not promise automatic restore.
On reconnect, capture new URLs, update every affected consumer, restart/rebuild and
verify again. Do not leave dependents using old URLs or retry indefinitely.

## Close tunnel and restore

Use this flow for an explicit close request, failed setup or expiry cleanup.

1. Match the selected session/worktree to its private state and live process
   identities. If several previews match, resolve the target before stopping any.
   Disable only its restart/reconnect/cleanup jobs, then terminate its verified SSH
   tunnel handles. Preserve other previews and shared services. If the tunnels have
   already exited, continue with restoration; tunnel exit does not restore settings.
2. Compare each touched setting with the recorded latest session-applied value.
   When it still matches, restore its original value, or remove the key if it was
   originally absent. Undo process-level overrides as well as file edits. Restore
   the original application/API/asset URLs, allowed hosts, CORS/CSRF origins,
   callbacks, cookie flags and WebSocket/HMR settings wherever this session changed
   them. For authorized external provider edits, undo only this session's changes.
   Remove a session-created override file only if it contains no newer user edits.
3. Preserve newer edits and unrelated keys/comments. Report conflicts by path/key
   without exposing values; never replace a whole `.env` blindly. If the baseline
   is missing or corrupt, recover verified originals from backups or report the
   missing restoration data. Do not guess original values or claim full restoration.
4. Return services to their pre-preview state: restart previously running services
   with original settings, and stop only preview-created processes that were not
   running before. Rebuild assets when changed public environment variables were
   compiled into the frontend; restoring `.env` alone does not undo a built bundle.
   During `close-worktree` teardown, restore configuration without restarting that
   worktree's services. Leave shared Docker dependencies alone.
5. Verify the selected tunnel processes are gone and the public URLs no longer
   reach the app. For a normal preview close, check original local endpoints and an
   API-backed browser flow, including redirects and HMR where used. Distinguish
   configuration restoration from runtime/browser verification when tools are
   unavailable. Mark the session closed only after required cleanup succeeds;
   keep backups and record any conflicts or pending restore steps for retry.

Report which tunnels closed, which setting names were restored, the resulting local
service URLs/state, and any unresolved conflicts. Repeated close requests should
verify already-restored state without restarting unrelated processes or creating a
new tunnel.

References: [SSH usage and QR](https://pinggy.io/docs/usages/),
[HTTP tunnels](https://pinggy.io/docs/http_tunnels/),
[free tunnel expiry](https://pinggy.io/help/).
