# Test Suite Inventory

Governed by: `docs/readiness/TEST_GOVERNANCE.md`. Created 2026-08-17, to turn "291 test files exist"
into a discoverable structure rather than an undifferentiated count.

| Suite | Path | Covers | When required |
|---|---|---|---|
| Invitation email service | `src/services/email/invitationEmail.test.ts` | Resend send/failure handling, from-address resolution | Any change to `src/services/email/invitationEmail.ts` |
| Product Analytics section | `src/features/product-analytics/ProductAnalyticsSection.test.tsx` | Real-data Activation Funnel + Most Used Modules rendering, demo-mode fallback, empty states | Any change to `src/features/product-analytics/ProductAnalyticsSection.tsx` |
| Module usage events route | `src/app/api/module-usage-events/route.test.ts` | Tenant-scoped module-usage tracking API (auth, validation, admin-gated GET) | Any change to `src/app/api/module-usage-events/route.ts` |
| Pilot readiness events route | `src/app/api/pilot-readiness-events/route.test.ts` | Tenant-scoped pilot readiness funnel events API | Any change to `src/app/api/pilot-readiness-events/route.ts` |
| RAG query route | `src/app/api/rag/query/route.test.ts` | RAG query endpoint request/response typing and auth | Any change to `src/app/api/rag/query/route.ts` |
| RLS suites (`security/*Rls.test.ts`) | `src/security/*Rls.test.ts` (e.g. `sprint16PilotReadinessRls.test.ts`, `sprint8BetaFeedbackRls.test.ts`) | Row-level-security policy assertions per feature area | Any migration touching RLS policies on the covered tables |
| Sprint 27 golden path (Playwright) | `tests/e2e/sprint27-golden-path.spec.ts` | Live tenant workflow: dashboard -> review inbox -> import -> task evidence | Any change to `/ai-workspace/review-inbox` or the dashboard-to-task flow (currently has a documented pre-existing flake at the `page.goto("/ai-workspace/review-inbox")` step -- see `docs/readiness/FAILED_OR_TIMED_OUT_CHECKS.md`) |
| Sprint 29 pilot acceptance (Playwright) | `tests/e2e/sprint29-pilot-acceptance.spec.ts` | Pilot acceptance + live-ops handoff evidence in the command center | Any change to pilot acceptance or command-center handoff UI |

## Full inventory

This table lists the suites most relevant to this session's active work plus the highest-traffic
categories (RLS, e2e golden paths). It is not an exhaustive enumeration of all 291 Vitest files and 14
Playwright specs -- run `git ls-files | grep -E '\.test\.(ts|tsx)$'` for the complete raw list, or
`git ls-files | grep -E 'tests/e2e/.*\.spec\.ts$'` for the complete Playwright list. Add a row here when a
suite becomes a recurring reference point in closeouts (per `docs/readiness/TEST_GOVERNANCE.md`'s
required-gates table), rather than trying to pre-populate all 305 files at once.
