# Playwright

Playwright is the browser E2E layer.

## Run

```bash
pnpm run test:e2e
```

## Covered Areas

Existing tests cover auth, projects, tasks, notifications, meetings, audit logs, user admin, Knowledge Hub, and beta workflows.

Sprint 13 adds route coverage targets for:

- Sign-up
- Login
- Onboarding
- Organization creation
- Admin route guard
- Prompt approval
- Account deletion initiation

## Reports

HTML report path:

```text
playwright-report
```

GitHub Actions and Bitrise upload this path as an artifact where supported.
