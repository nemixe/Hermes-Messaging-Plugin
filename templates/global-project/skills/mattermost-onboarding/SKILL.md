---
name: mattermost-onboarding
description: Use on the first project conversation after Mattermost connects, when project PM/BE/FE/QA ownership changes, or when Codev needs to choose whom to mention for a blocker, decision, review, or testing.
metadata:
  hermes:
    tags: [mattermost, onboarding, team, mentions]
---

# Mattermost onboarding

Build a reusable project team map so Codev can ask the right person for the
specific case. This shared skill keeps all team facts inside the active
`HERMES_HOME`, never in `global-project` or another project's profile.
Connection alone does not execute a skill: start on the first routed project
conversation or an explicit onboarding request. Installation sends no messages.

## Discover and save the team

1. Read `PROJECT.yaml`, `memories/INDEX.md`, and any existing
   `memories/semantic/team.md`. Resolve the Mattermost server, team and channel
   from trusted session metadata or verified routing configuration. A GitLab
   mapping alone does not identify a Mattermost channel. If the current profile
   or channel's project is ambiguous, ask for that mapping before saving a roster.
2. Use available authenticated Mattermost reads to inspect the relevant channel's
   purpose, pinned team/ownership notes and member profiles; follow linked project
   ownership documents and relevant recent discussions only as needed. Reuse the
   existing connection, without exposing tokens. If these reads are unavailable,
   ask the requester for the roster and mark identity verification pending.
   Do not scan unrelated channels or private DMs to infer people's roles.
3. Collect **all known PM, BE, FE and QA members**, allowing multiple people per
   role and multiple roles per person. Record domain/repository ownership and the
   primary contact or backup only when stated. Administrative permissions,
   channel membership, commit counts and frequent replies are not proof of a
   project responsibility. Explicit team assignments and requester confirmation
   establish responsibilities; other signals remain candidates. Conflicting
   sources stay unresolved until clarified.
4. Resolve each person to a stable Mattermost user ID and current username on the
   configured server. Display names alone are ambiguous. Track role evidence
   separately from account verification. Keep any GitLab identity separate and
   verify its host/user ID/username before using it there; matching handles across
   platforms are not evidence of the same person.
5. Ask one compact Bahasa Indonesia question for missing roles, ambiguous owners
   or conflicting evidence, for example: "PM dan QA sudah tercatat. Siapa saja
   BE/FE untuk proyek ini? Mohon @username, area/repo yang ditangani, dan PIC
   utama jika ada." Save partial results; mark every missing role as unknown or
   explicitly not staffed. Continue unrelated work. Reuse an unanswered request
   rather than asking the whole roster again each turn.
6. Save `memories/semantic/team.md` following `TAXONOMY.md` and link it from
   `memories/INDEX.md`. Include the server/team/channel scope and one row per
   person/responsibility with: role, display name, Mattermost ID and username,
   domain/repository IDs, primary/backup if known, role evidence/source and date,
   account verification date, and verified GitLab identity if available. Use
   `unknown` for absent facts. Keep pending candidates distinct from confirmed
   owners. Record roster gaps and the source of any pending question under
   `Current`, evidence links under `Sources`, and changes under `History`.

Done when verified facts and gaps are saved and indexed, and the requester has a
concise role summary plus any missing information needed. Report partial
onboarding honestly; do not label every role complete while people remain unknown.
Store only work identities/responsibilities and source links, not full chat logs,
personal details or credentials. Reread before updating; preserve unrelated facts.

## Choose mentions for later work

Read the saved team map before a responsibility-based Ask, review request or
handoff. Match the case's domain/repository first, then the role:

| Case | Relevant responsibility |
| --- | --- |
| Scope, priority, business rules, acceptance criteria or product decision | PM |
| API, data model, database, service logic or backend integration | BE owner of that component |
| UI, browser behavior, frontend state or consuming an API | FE owner of that component |
| Reproduction, test cases, regression, test evidence or verification | QA owner of that area |
| API contract affecting both clients and service | Relevant BE and FE owners |
| Bug with unclear cause | QA for reproduction; add a technical owner once evidence identifies the component |

Use explicit project responsibilities over this default table. Mention the
smallest set of people who have a concrete action: several owners only when each
is needed. PM is not automatically copied on technical work, and QA is not
automatically the release approver. A role does not grant merge/deploy authority.
If several people match and no primary is known, ask the requester or confirmed
project lead to choose; never pick whoever was most active. Use a backup only
when their coverage applies.

Before posting, verify the chosen account is still active, its current username
and its access to the destination when that can be checked. Changed ownership,
conflicting evidence or a different server/channel requires refreshing the
affected entry, not repeating all onboarding. If identity, responsibility or
destination remains uncertain, ask the requester without a speculative mention.
Never use `@all`, `@channel` or `@here` as a fallback.

Use the destination platform's verified handle. A Mattermost handle must not be
inserted as a GitLab mention unless that GitLab account was separately verified.
If no GitLab identity is known, ask for it in the originating discussion; do not
silently switch to Mattermost or DM someone. Follow SOUL's messaging rules and
existing authorization: this skill selects recipients; it does not authorize
unsolicited DMs, cross-channel posts, assignment changes or repeated reminders.

An authorized Ask names the person, linked issue/MR, observed problem, exact
decision/action needed and what resumes afterward. For example, with a verified
BE owner: "@username, di <issue> respons API belum memuat field status. Mohon
konfirmasi kontraknya agar implementasi FE bisa dilanjutkan." A completion only
mentions QA when a testing handoff is actually needed. On GitLab, remind the
recipient to mention Codev in their reply so the poller receives it.
