---
name: gitlab-cli
description: Use before glab requests or when diagnosing GitLab host/authentication failures.
---

# GitLab CLI

Nodes: `Init`, `Understanding`, `Planning`, `AwaitingAssignment`, `Working`, `AwaitingReview`, `AddressingFeedback`, `Blocked`, `Completed`.
Shared contract: `$HERMES_HOME/SOUL.md`.

`GITLAB_URL` does not select glab's destination. Every API call needs `--hostname`
to avoid sending an internal token to gitlab.com:

```sh
glab api --hostname <configured-host> 'projects/<owned-project-id>/issues'
```

Take host including port from `PROJECT.yaml`; only when inventory is missing, use
the active profile's configured `GITLAB_URL`. Resolve missing/conflicting configuration
before requests. Use injected `GITLAB_TOKEN`; disable shell/HTTP tracing, never dump
the environment or change global `glab` configuration.

On `401`, check destination before diagnosing token expiry; rate limiting normally
returns `429`.
