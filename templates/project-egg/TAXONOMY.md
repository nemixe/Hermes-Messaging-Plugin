# Project knowledge

Nodes: `Understanding`, `InspectingRepository`, `Planning`, `Working`, `Completed`.
Workflow and scope: profile-root `SOUL.md` state diagram. Paths belong to the active
Hermes profile. Code, versioned repository docs and GitLab are authoritative; memory
holds concise understanding, evidence and links, not a second task tracker.

## `Understanding`, `InspectingRepository` — retrieve

Start with `PROJECT.yaml` for current ownership, then `memories/INDEX.md` and relevant
topics. Missing pages trigger discovery under SOUL, not a request for the user to
supply repository context. Check sources, scope, status and verification date before
relying on claims. Normal retrieval needs no reread of this taxonomy.

## `Planning`, `Working`, `Completed` — choose one home

Create pages only when useful knowledge exists. Give each fact one primary home;
link rather than copy it elsewhere.

| Path | Content |
| --- | --- |
| `PROJECT.yaml` | Plugin-generated inventory; edit repository mappings to change it. |
| `memories/MEMORY.md`, `USER.md` | Small startup summary/navigation and optional stable collaboration preferences; respect Hermes character limits. |
| `memories/INDEX.md` | Topic map and repository identities. |
| `memories/semantic/project.md` | Product boundaries, domain terms, requirements, constraints; split topics only when unwieldy. |
| `memories/semantic/team.md` | Work identities, PM/BE/FE/QA ownership, role evidence, platform verification dates and gaps; use `mattermost-onboarding`. |
| `memories/semantic/architecture.md` | Cross-repository responsibilities, dependencies, data flow, contracts, compatibility and limits. |
| `memories/semantic/repositories/<project-id>.md` | Role, entry points, commands, conventions, verified revision; numeric GitLab ID keeps identity through renames. Record current namespace/URL/checkout inside. |
| `memories/semantic/decisions/<id>-<slug>.md` | Context, alternatives, decision, rationale, consequences/status; prefer summary/link to repository ADR. |
| `memories/semantic/workflows/<slug>.md` | Verified reusable procedures: runtime/clone/auth prerequisites without secrets, setup, variable names/locations, migrations/seed, build/test/start/stop, concurrency ports/data, health and user-access steps/limits. |
| `memories/episodic/YYYY-MM-DD.md` | Dated consequential observations, useful failures, validation/handoffs, issue/MR and commit links. |

Exclude credentials/tokens, personal dossiers, UI trivia, incidental chat, full
transcripts, raw logs and generated output; link large records. Ephemeral runtime
handles/URLs and secret-bearing files belong in private runtime/dest state, not topics.

## `Working`, `Completed` — update and verify

Write only new useful knowledge or verified corrections; otherwise leave memory
unchanged. Search existing titles, IDs and sources before creating a page. Uncertain
observations belong in episodes; promote only with strong evidence or repeated
verification. Failed attempts remain labeled, not established procedures.

Reread shared pages, use supported locking/atomic writes and reconcile concurrent
changes. Keep prior conclusions/reasons in `History`, update only changed `Current`
facts/evidence and make disagreements explicit. Index additions/moves/replacements;
refresh startup summaries only for facts relevant across tasks. Verify writes before
claiming persistence. Native memory tools handle `MEMORY.md`/`USER.md`; other pages
need file tools. Report unavailable persistence honestly.

Semantic frontmatter: `title`, `scope`, `status` (`proposed`, `current`, `superseded`),
`verified_at` (null until checked). Sections: `Current` (conclusions, versions, unknowns),
`Sources` (paths/commits, GitLab or episode links), `History` (dated changes/reasons).
Superseding decisions link their predecessors and preserve accepted rationale.

Episode entries: timestamp/timezone, repository/issue/MR identity, observation/outcome,
evidence and optional next step. Append dated corrections; preserve historical entries.

Refresh stale claims/links when touching a topic. At milestones/handoffs, condense
repeated lessons and retire stale index shortcuts while keeping underlying evidence.
Do not auto-delete history or schedule cleanup. Add categories only for repeated
unhoused material, updating taxonomy and index together.
