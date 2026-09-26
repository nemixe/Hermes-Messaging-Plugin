# Architecture work

Use this workflow when a task changes component boundaries, repository responsibilities,
storage, API/event contracts, or deployment structure.

1. Read `memories/INDEX.md`, relevant topic pages, and the repository's instructions
   and design documents. Verify important claims against current code and GitLab records.
2. State the problem, constraints, affected repositories, and success criteria.
   Separate facts, assumptions, and open questions. Resolve consequential unknowns.
3. Start with existing components and native capabilities. Compare alternatives where
   a real tradeoff exists; avoid abstractions for hypothetical future requirements.
4. Describe responsibilities, data flow, contracts, compatibility, migration needs,
   failure handling, and tests. Include cross-repository rollout order when relevant.
5. Record an accepted decision in the repository's design document or ADR when
   appropriate. Save a concise memory summary and source link using `TAXONOMY.md`.
   Keep unapproved proposals labeled as proposals.
6. After implementation, reconcile architecture notes with the actual result and
   record meaningful validation evidence or unresolved limitations.

Finish with the recommended approach and its reason, affected repositories,
validation, and any decision still needed from the user.
