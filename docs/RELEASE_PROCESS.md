# Release Process

AXXESS uses feature branches, conventional commits, and pull requests into `main`.

## Sprint 8 Release Candidate

Branch:

```bash
feature/TRI-sprint-8-beta-analytics
```

Release:

```text
v0.6.0-beta - Beta Analytics & Pilot Readiness
```

## Pre-PR Checks

Run:

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
pnpm run test:e2e -- --list
```

Seeded E2E tests require:

```bash
E2E_RUN_SEEDED=true
```

## Deployment Checks

- Vercel preview deploy is available.
- Supabase migrations are applied to the target beta project.
- Admin can open `/admin/beta-readiness`.
- Guest users cannot open admin beta pages.
- Feedback submission succeeds.
- Analytics runs in mock mode unless Mixpanel has been approved.

## PR Notes

The PR description should include summary, related Linear issue, features added, tests run, security/privacy notes, Vercel preview link, and known limitations.
