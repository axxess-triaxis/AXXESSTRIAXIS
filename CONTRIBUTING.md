# Contributing

Thanks for helping build AXXESS by Triaxis Ventures.

AXXESS is an enterprise product surface, so contributions should be careful, focused, and easy to review. Preserve existing functionality and visual language unless a task explicitly asks for a product or design change.

## Development Principles

- Preserve the established AXXESS UI language unless a design change is approved.
- Keep business logic outside route/page components when practical.
- Depend on service and repository interfaces rather than concrete implementations.
- Treat tenant isolation, RBAC, auditability, and data retention as product requirements.
- Prefer small, typed, testable changes over broad rewrites.
- Keep documentation current when behavior, setup, or deployment expectations change.

## Local Setup

```bash
pnpm install
pnpm run dev
```

Open `http://localhost:3000/dashboard`.

## Required Checks

Run the full verification suite before opening a pull request:

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```

The convenience command below runs the same checks in sequence:

```bash
pnpm run ci
```

## Branching

Use short, focused branch names:

```text
feat/supabase-auth-shell
fix/dashboard-route-guard
docs/deployment-runbook
```

## Commit Style

Use concise, descriptive commits. Conventional Commit-style prefixes are preferred:

```text
feat(routing): add organization-protected route metadata
fix(dashboard): preserve KPI spacing during refactor
docs(security): document secret handling
```

## Pull Requests

Pull requests should include:

- Clear summary of what changed and why.
- Linked issue or decision record when available.
- Screenshots or screen recordings for UI changes.
- Notes on RBAC, tenant, environment, or migration impact.
- Confirmation that required checks passed locally.

## Practice Standards

Contributors and AI agents follow the standing rules in `CLAUDE.md`, including the "Paxel 9.5 Practice
Standards" (summary in `docs/readiness/GOVERNANCE_RULES.md`):

- State acceptance criteria before starting, and plan first.
- Start a bug fix with a regression test that fails.
- Close every error you hit, or record it with an ID and owner.
- When retrying, say what failed, what you think caused it, and what success looks like.
- Do not call a deploy done until a live check against the deployed SHA is recorded.
- Record an outcome, or a dated review, for each decision.

## Security-sensitive Changes

Do not include real credentials, tenant data, production exports, API keys, or private certificates in commits. Use `.env.local` for local secrets and managed deployment secrets in hosted environments.
