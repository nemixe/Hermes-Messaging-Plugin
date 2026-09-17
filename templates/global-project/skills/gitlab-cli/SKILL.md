---
name: gitlab-cli
description: Use glab against this profile's GitLab server from any platform, including Mattermost; diagnose authentication failures caused by a wrong destination host.
---

# GitLab CLI

`GITLAB_URL` does not select glab's default host. Always supply `--hostname`
to `glab api`; otherwise an internal token may be sent to gitlab.com.

Read `gitlab_url` and the owned repository IDs from `$HERMES_HOME/PROJECT.yaml`.
If the inventory is missing, use the active profile's configured `GITLAB_URL`.
Take the host (including any port) from that URL, not a URL pasted into chat.
If it is unavailable or conflicts with the profile configuration, resolve that
before making a request. Do not guess the host or use another profile's credentials.

For `https://gitlab.dot.co.id`, the correct format is:

```bash
glab api --hostname gitlab.dot.co.id user
glab api --hostname gitlab.dot.co.id 'projects/<owned-project-id>/issues'
```

Replace `<owned-project-id>` with an ID from this profile's inventory (for example,
`594` only if mapped here). For other servers, replace the hostname accordingly.
Use the existing injected `GITLAB_TOKEN`. Never print tokens, dump the environment,
pass tokens as command arguments, or enable shell/HTTP tracing. Do not change
global glab configuration. If glab or credentials are missing, report the missing
capability and follow SOUL's **Secrets in private messages** for credential delivery.

On `401`, check the destination host before diagnosing authentication; it does
not prove the token expired. Rate limiting normally returns `429`. Keep the
explicit hostname on subsequent requests too.
