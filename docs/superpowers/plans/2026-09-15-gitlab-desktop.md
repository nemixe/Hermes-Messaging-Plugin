# GitLab Desktop and Polling Implementation Plan

**Goal:** Manage GitLab repository/profile mappings below Kanban in Hermes Desktop,
and receive GitLab requests through outbound polling on the Mac Mini.

**Architecture:** A unified native Hermes plugin: `desktop/plugin.js` supplies the
page, `dashboard/plugin_api.py` exposes authenticated management routes, and the
Python platform adapter polls the bot's GitLab todos. Existing native profile
creation and multiplex routes remain authoritative. No Hermes core changes.

**Tech stack:** Hermes Desktop SDK/React, FastAPI, aiohttp, sqlite3, unittest.
**Spec:** User conversation and `PRODUCT.md`.

- [x] Replace webhook adapter and tests with paginated pending/done todo polling,
  persistent deduplication, native completion handling and protected profile routing.
- [x] Extend CLI's shared mapping operation to replace/remove a profile's routes,
  reject stale revisions and preserve profile knowledge; test real temporary profiles.
- [x] Add authenticated management API for mappings and GitLab repository search.
  Use root configuration on the selected backend; never return the PAT.
- [x] Ship a runtime Desktop page at `/gitlab-projects`, sidebar order 51 (Kanban 50).
  Reuse native controls for existing/new profile selection and repository registration.
- [x] Verify API, native plugin loading, UI interactions and polling, then package 0.3.0
  with updated installation instructions and explicit GitLab todo limitations.

## Verification

- 29 Python tests passed against temporary Hermes homes and loopback GitLab servers.
- Desktop interaction checks passed using native React controls and SDK exports.
- Sample-data browser preview checked at 1280×720 and 560×820, including the editor
  footer; narrow layout has no horizontal overflow.
- Independent review confirmed native busy/startup refusals stay retryable while
  completed agent execution and successful delivery acknowledge inbox items.
- Release ZIP contains nine runtime/documentation files; CRC and version checks pass.
- Real GitLab credentials and live Mac Mini deployment remain untested.
