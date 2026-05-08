# Agent Documentation Maintenance Rules

This file defines mandatory documentation behavior for agent-driven changes.

## Required On Every Substantive Code Change
When changing behavior, architecture, data flow, file structure, or public development workflow:

1. Update relevant docs in `docs/`:
   - `introduction.md` for onboarding/usage/scope changes.
   - `design.md` for architecture/module/data-flow changes.
2. Append one new entry to `docs/changes.md`.

## `docs/changes.md` Entry Format
Use this structure for each entry:

```md
## YYYY-MM-DD - Short title
- Scope: <feature/refactor/fix/docs/build>
- Files: `<path1>`, `<path2>`, ...
- Summary: <what changed and why>
- Follow-ups: <optional pending work or `none`>
```

## Guardrails
- Do not rewrite historical entries except to correct factual errors.
- Keep entries concise and factual.
- If a change is purely cosmetic and has no behavior/design impact, changelog updates are optional.
