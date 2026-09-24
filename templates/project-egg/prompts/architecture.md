# Architecture

Nodes: `Understanding`, `Planning`, `Implementing`, `Validating`, `Completed`.
Sequence and shared guards: profile-root `SOUL.md` state diagram.
Applies to component/repository boundaries, storage, API/event contracts and deployment.

- `Understanding`, `Planning`: verify relevant memory/design documents against current
  code and GitLab. State constraints, affected repositories and success criteria;
  distinguish facts, assumptions and proposals. Prefer existing/native components;
  compare alternatives only for real tradeoffs. Escalate consequential decisions
  under SOUL's assignment guard.
- `Implementing`, `Validating`: specify responsibilities, data flow, contracts,
  compatibility, migrations, failure handling and tests; include cross-repository
  rollout order when relevant.
- `Completed`: reconcile design notes with the actual result and evidence. Keep
  accepted decisions in the repository design document/ADR, with a concise memory
  link following `TAXONOMY.md`. Unapproved designs remain proposals.
