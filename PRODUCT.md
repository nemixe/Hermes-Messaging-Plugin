# GitLab Projects

## Register

product

## Users and purpose

Hermes operators manage a shared GitLab bot. One project maps to
one Hermes profile, with several GitLab repositories sharing that profile's knowledge.
Hermes Desktop is the management surface; the selected backend owns configuration.

## Design principles

- Reuse Hermes Desktop's existing sidebar, controls, typography and theme tokens.
- Show registered repositories next to their owning profile in a registry table; open detail only after a row is selected.
- Show GitLab-triggered Hermes sessions as Sessions — globally or for one project — with cost, related project, and session detail on select.
- The plugin bundles project-egg; new profiles copy its current prompts, skills, SOUL and configuration through native profile cloning.
- Save and activate restarts the shared gateway; show model setup and restart outcomes separately.
- Preserve profile knowledge when removing a repository mapping.
- Require the exact profile name before permanently deleting a whole project and its profile.
- Use labeled controls, keyboard navigation and visible error recovery.

## Personality and anti-references

Calm, direct, practical. Follow the existing Hermes Desktop design system;
avoid decorative dashboards, nested cards and a separate visual identity.
