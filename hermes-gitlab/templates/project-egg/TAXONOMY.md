# Project knowledge architecture

Keep durable knowledge that helps development continue across sessions, issues,
merge requests, and repositories. All paths below are relative to the **active
Hermes profile**. Keep each project's knowledge within its own profile.

Code, versioned repository documentation, and GitLab records are authoritative for
implementation, team decisions, and work status. Memory stores concise understanding,
evidence, and links to those sources. Verify important claims before relying on them.

## Structure

Use Hermes's existing `memories/` directory. Create topic pages when useful knowledge
exists; this tree describes their homes, not a checklist of empty files.

```text
TAXONOMY.md                         Knowledge organization and maintenance rules
prompts/architecture.md             Workflow for architecture tasks
memories/
  MEMORY.md                        Small startup summary and navigation pointers
  USER.md                          Optional, stable collaboration preferences
  INDEX.md                         Topic map and repository identities
  semantic/
    project.md                     Purpose, domain vocabulary, scope, constraints
    architecture.md                Cross-repository design and contracts
    repositories/<project-id>.md   Repository role, entry points, verified commands
    decisions/<id>-<slug>.md        Decision summary or link to a repository ADR
    workflows/<slug>.md            Reusable development, release, debugging procedures
  episodic/
    YYYY-MM-DD.md                  Dated evidence, discoveries, useful handoffs
```

**Semantic** means current knowledge organized by subject. **Episodic** means dated
observations: what happened, what was checked, and what remained uncertain.
Use numeric GitLab project IDs for repository filenames; record the current namespace,
URL, and checkout location inside the page so repository renames preserve identity.

## Choosing a home

- **Project:** product boundaries, domain terms, requirements, and stable constraints.
  Split a domain topic out only when the overview becomes difficult to use.
- **Architecture:** component responsibilities, dependencies, data flow, API/event
  contracts, compatibility requirements, and design limitations.
- **Repository:** role, important paths, build/test commands, local conventions,
  and the commit or version against which those facts were checked.
- **Decisions:** context, alternatives, choice, rationale, consequences, and status.
  Prefer a versioned architecture decision record (ADR) for team decisions; memory
  then stores a short summary and link instead of a second full record.
- **Workflows:** verified procedures and recurring lessons. Improve the relevant
  procedure rather than creating a separate page for every incident. Keep recurring
  setup knowledge here, shared across worktrees: clone/auth prerequisites, dependency
  installation, `.env` locations and variable names, migrations/seed data, build/test,
  start/stop commands, separate ports/data for concurrent instances, health checks,
  and the URL and procedure for user access. Record verified steps and limitations;
  never save secret values or temporary access tokens.
- **Episodes:** consequential observations, useful failed approaches, validation
  results, or handoff context. Link the issue/MR and commit. Keep task status and
  checklists in GitLab rather than maintaining a second task tracker.

Exclude personal dossiers, browser UI trivia, incidental chatter, credentials,
full transcripts, raw logs, and generated output. Link to large source records.

## Retrieval

Start with the startup pointers and `memories/INDEX.md`; read only relevant topics.
Follow their sources or search the relevant repository/issue when the index has no
answer. Check scope, status, and verification date: a proposal is not an accepted
decision, and an observation is not an established fact.

Normal retrieval does not require rereading this taxonomy. Consult it when saving
knowledge, changing the structure, or resolving conflicting notes. Hermes's native
memory tool handles `MEMORY.md` and `USER.md`; other pages need available file tools.
If those tools are unavailable, report that the notes were not saved.

## Write workflow

1. Keep information only if it will help a future development task.
2. Search existing titles, repository IDs, and source links before creating a page.
   Give each fact one primary home; link to it from other topics.
3. Append uncertain or event-like information to an episode. Promote it to a semantic
   page after strong evidence or repeated observations establish it. Not every episode
   needs promotion.
4. Preserve the previous conclusion and the reason for a change in `History`, then
   update `Current` and its evidence. Label unresolved disagreements explicitly.
5. Update the index when a page is added, moved, or superseded. Refresh startup
   summaries only for changes that matter across many future tasks.

Reread shared pages before editing. Use supported locking/atomic writes and reconcile
concurrent changes instead of overwriting them. Confirm successful writes before
claiming knowledge was saved.

## Page formats

Semantic pages use frontmatter with `title`, `scope`, `status`, and `verified_at`, then:

- **Current:** concise conclusions, applicable versions, and open uncertainty.
- **Sources:** repository paths with commits, GitLab links, or episodic file paths.
- **History:** dated changes, reasons, and evidence.

Use `verified_at: null` until a source has been checked. Distinguish `proposed`,
`current`, and `superseded`. Accepted decisions retain their original rationale;
a replacement links to the decision it supersedes.

Episode entries contain a timestamp with timezone, repository and issue/MR identity,
brief observation or outcome, evidence, and an optional next step. Append corrections
as dated entries rather than rewriting the historical record.

## Long-term maintenance

Keep `MEMORY.md` and `USER.md` within Hermes's configured character limits. Use a few
high-value rules and pointers, not a journal; detailed facts belong in topic pages.
These summaries support startup but do not replace the underlying evidence.

When touching a topic, refresh stale claims and broken links. At milestones or
handoffs, condense repeated lessons, supersede obsolete decisions, and remove stale
index shortcuts while retaining evidence needed to explain important decisions.
Do not automatically delete history or invent a recurring cleanup job.

Add a category only when repeated real examples have no clear home. Update these
rules and the index together when the structure changes.
