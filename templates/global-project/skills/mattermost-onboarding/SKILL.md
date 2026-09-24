---
name: mattermost-onboarding
description: Use on first routed Mattermost contact without a team map, changed PM/BE/FE/QA ownership, or choosing a responsible person for a blocker, decision, review or test handoff.
metadata:
  hermes:
    tags: [mattermost, onboarding, team, mentions]
---

# Mattermost onboarding

Nodes: `Init`, `NeedsContext`, `Blocked`, `AwaitingReview`.
Shared contract: `$HERMES_HOME/SOUL.md`.

## Missing/changed roster — `Init`

Read `memories/semantic/team.md`. Verify Mattermost
server/team/channel through trusted metadata or routing; a GitLab mapping alone
cannot identify a channel. Resolve scope ambiguity before saving a roster.

Inspect relevant channel purpose, pins, member profiles and linked ownership
sources using existing authenticated access. Without access, request the roster
and mark identity verification pending. Do not scan unrelated channels/private DMs.

Collect all known PM/BE/FE/QA members, including multiple roles/owners and stated
domain/repository, primary/backup coverage. Explicit assignments/requester
confirmation establish responsibility; permissions, membership, commit counts and
activity do not. Keep conflicting evidence unresolved.

Verify stable Mattermost IDs/current usernames separately from role evidence;
display names are ambiguous. GitLab identities need independent host/ID/username
verification; matching handles do not establish identity across platforms.

Roster schema in `memories/semantic/team.md` (format/storage: `TAXONOMY.md`):
Record server/team/channel, role, display name, platform IDs/usernames, domain/repo
IDs, stated primary/backup, role evidence/date and account verification date.
Use `unknown` for gaps; separate candidates from confirmed owners and retain partial
results. `Current` holds roster gaps and pending questions.

## Responsibility-based mention — `NeedsContext`, `Blocked`, `AwaitingReview`

Match saved domain/repository ownership first, then responsibility:

| Decision/action | Contact |
| --- | --- |
| Scope, priority, business rules, acceptance | PM |
| API, service logic, database, backend integration | BE owner |
| UI, browser/state, API consumption | FE owner |
| Reproduction, regression, test evidence | QA owner |
| Shared API contract | Relevant BE and FE owners |
| Unknown bug cause | QA for reproduction; technical owner once identified |

Explicit project responsibilities override the table. Choose the smallest set with
concrete actions; multiple matches without a primary need requester/lead resolution.
Use backups only within stated coverage. PM need not join every technical question;
QA is not automatically the release approver.

Before an authorized post, verify account activity/current handle and destination
access where checkable. Refresh only changed entries. Uncertain identity/ownership
means ask without speculative mentions; never fall back to `@all`, `@channel`, `@here`.
Use separately verified GitLab handles on GitLab; a missing identity requires
clarification in the originating discussion, not a speculative cross-platform mention.
