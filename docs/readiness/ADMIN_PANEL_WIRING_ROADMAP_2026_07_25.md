# Admin Panel Wiring: Pass 1 Closeout + Passes 2-5 Roadmap

Date: 2026-07-25
Program: Post-QA3, live-beta hardening

## What Prompted This

Reported live at `https://triaxis-www-frontend-import.vercel.app/admin/invitations`: "still just placeholder." Direct code investigation of `src/features/admin/EnterpriseAdminPage.tsx` confirmed this was systemic, not a one-off: it is a single generic template driving 19 admin panel IDs, and for 16 of them the "Admin actions" buttons had **zero `onClick` handlers** -- pure dead placeholder UI, with a self-admitted disclaimer baked into the page itself ("This admin surface is wired for Sprint 22 and Sprint 23 enterprise readiness... before autonomous workflow execution is enabled").

Two panel IDs -- `organization` and `audit-logs` -- turned out to be non-issues: their actual routes (`src/app/admin/organization/page.tsx`, `src/app/admin/audit-logs/page.tsx`) render the real `WorkspacePage` SPA sections, not `EnterpriseAdminPage`, so those `panelContent` entries and their dead buttons are unreachable dead code in production, not a live gap.

That left **14 genuine gaps**. A research pass (Explore agent) and a design pass (Plan agent), both verified by direct reads of source and Supabase migrations, found effort varies enormously per panel -- from "wire a real, already-tested API" to "build a table, RLS, repository, route, and UI from nothing." The founder confirmed (2026-07-25): build the 6 lowest-risk, same-day panels now (Pass 1), and record the rest as a documented roadmap rather than attempting all 14 in one sitting.

## Pass 1 -- Closed 2026-07-25

| Panel | What changed | Backend used |
|---|---|---|
| `model-policy` | Real onClick handlers: routing preview (POST), provider allowlist (GET), usage ledger (GET, extended to include `ai_usage_ledger` rows) | `src/app/api/ai/model-policy/route.ts` (already real; GET extended) |
| `plugin-runtime` | Real onClick handlers: scope review, approve/revoke connector action, with a plugin picker | `src/app/api/plugins/runtime/route.ts` (already real, unmodified) |
| `execution-runs` | Real onClick handlers: dry-run job creation, sandbox policy review, Kubernetes spec inspection | `src/app/api/execution/jobs/route.ts` (already real, unmodified) |
| `ai-governance` | Repointed from an unbuilt `ai_output_audit` concept (no application code anywhere) to the real, tested AI Review Inbox (`ai_operation_reviews`) -- inline pending-review list with approve/reject | `src/services/ai/reviewInbox.ts` + `src/app/api/ai/reviews/route.ts` (already real, unmodified) |
| `roles` | Redirected `/admin/roles` to `/settings` -- discovered `SettingsSection.tsx` already has real, tested role-assignment UI gated to Super Admin/Organization Admin. No new component built, avoiding a second, competing role-management surface (the ground-truth research explicitly flagged this as a correctness risk to avoid) | Existing `PATCH /api/repositories/users` (unmodified) |
| `invitations` | Redirected `/admin/invitations` to `/settings` -- same discovery for invite-user UI. Added the one real gap that UI had: **revoke** (`invitationsRepository.update`, `PATCH /api/repositories/invitations`, `invitation.revoked` audit log, Revoke button in the Pending Invitations list) | New: `invitationConfig.toUpdate`, `invitationsRepository.update`, `canWriteResource`/audit-log additions to the generic resource route |

**Architecture:** extracted the interactive block into `src/features/admin/AdminActionsPanel.tsx` (a new Client Component, one sub-component per wired panel to satisfy React's Rules of Hooks -- `EnterpriseAdminPage.tsx` itself must stay a Server Component, since it computes preview snapshots server-side). New shared `src/hooks/useAdminAction.ts` hook. The "Beta readiness note" disclaimer is now conditional on whether the panel is actually wired, so it no longer sits under genuinely working buttons.

**Verified:**
- `pnpm run typecheck`: pass, 0 errors (commit `ed51942`)
- `pnpm --dir apps/mobile run typecheck`: pass, 0 errors
- `pnpm run lint`: pass, 0 warnings
- `pnpm run test`: **500/500 passing** across 133 files (51 new/changed cases across 8 files for this pass)
- `pnpm run build`: pass, clean production build
- Deployed: `vercel deploy --prod` against `triaxis-www-frontend-import`, `dpl_GtwQWmY3WD1QAKZ9DFq6yLCwvKhG`, READY, aliased to `landing.triaxisventures.com`
- Live-verified (unauthenticated, curl): `/admin/invitations` and `/admin/roles` correctly redirect through `/auth?next=...` (protected-route gate, expected) rather than showing a placeholder; `www`/`landing` root/`investor` root all regression-checked unaffected

**What remains partial:** the 6 wired panels' actual button behavior when clicked by a real, signed-in Organization Admin has **not** been live-verified -- `/admin/*` is authentication-gated, so curl cannot reach past the login redirect. This is the same evidentiary gap this program has for every other authenticated-session action (see `docs/readiness/ACTIONABLES_READINESS_MATRIX.md`'s `Blocked` rows A-13 through A-19). Code-level verification (typecheck/lint/test/build, all green) is complete; live HITL click-through is the remaining step.

**Manual verification checklist for HITL:**
1. Sign in as Organization Admin on `landing.triaxisventures.com`.
2. Visit `/admin/model-policy`: click all three buttons, confirm each returns real data (not silence) and a status message appears.
3. Visit `/admin/plugin-runtime`: pick a plugin, click all three buttons, confirm real decisions render.
4. Visit `/admin/execution-runs`: click all three buttons, confirm a job/policy/spec renders.
5. Visit `/admin/ai-governance`: confirm it shows pending AI reviews (or an honest "none pending" message, not a placeholder) and that approve/reject work.
6. Visit `/admin/roles` and `/admin/invitations`: confirm both redirect to `/settings` and land on real, working UI.
7. On `/settings`, send a test invitation, then click "Revoke" on it -- confirm it disappears from Pending Invitations and a `invitation.revoked` row appears in Audit Logs.

## Roadmap -- Passes 2-5 (Not Yet Built)

**Pass 2 -- `privacy` (stub rewrite, no migration needed).** `src/app/api/privacy/export-request/route.ts` is a 12-line stub that ignores both `src/privacy/privacyEngine.ts` (real, tested `maskPii`/`buildPrivacyExecutionPlan`) and the `privacy_requests` table (RLS already exists, confirmed via direct migration read). Rewrite the route to create a real row, call the engine, store/return the plan, audit-log it. Add `privacy_requests` to the generic resource route. Needs a dedicated component (multi-step: request -> plan -> approval -> completion).

**Pass 3 -- `workspaces`, `departments`, `compliance`, `usage-limits` (one shared additive migration).** All four fit the existing generic CRUD route (`src/app/api/repositories/[resource]/route.ts`) by adding a `ResourceName` + repository config each -- RLS already covers all of them (confirmed via direct migration read, not assumed). One small migration needed first: a `status` column on `workspaces` and `departments` (for archive), optionally `manager_user_id` on `departments` if that action stays in scope. `compliance` and `usage-limits` have **zero seed rows** today -- flag empty-state UX as a product decision before building their panels. `usage-limits`'s "Escalate limit warning" isn't a row mutation -- give it its own small bespoke route rather than overloading the generic route's CRUD contract. All four need dedicated table-shaped components.

**Pass 4 -- `prompt-approvals` (I/O boundary re-plumb).** `src/services/aiGovernance/promptRegistry.ts` has real, tested approve/select logic (`promptRegistry.test.ts`) but operates on an in-memory array, not the existing `prompt_registry`/`prompt_versions` tables (RLS already exists for both). Needs a repository + new route adapting the pure logic's I/O boundary to real rows, preserving the existing test coverage. Bigger than Pass 3's items -- its own unit of work.

**Pass 5 -- `backups` (genuine new feature, own scoping conversation first).** Nothing exists -- no table, service, repository, or route, confirmed by exhaustive search. Every other panel in this codebase records *evidence of an operational activity* rather than performing infra ops from a Next.js route (see `mobile-release`, `pilot-command-center`) -- recommend the same pattern here (record backup/restore-drill evidence, not perform real backup operations), but this needs confirmation before building, not an assumption. If confirmed: new `backup_runs` migration mirroring `202607090001_sprint12_security_compliance_foundation.sql`'s RLS/trigger style, new service mirroring `mobileStoreLaunch.ts`'s snapshot-builder shape, new repository, new route mirroring `src/app/api/admin/mobile-release/route.ts`, new component mirroring `MobileStoreLaunchConsole.tsx`. Comparable in size to a full past sprint workstream -- do not fold into any other pass.

## Exact File/Commit State

- Commit `ed51942` on `canonical/sprint-1-35-unified-gitlab`: Pass 1 implementation (19 files changed).
- Deployment `dpl_GtwQWmY3WD1QAKZ9DFq6yLCwvKhG`, production, `triaxis-www-frontend-import`.
- This document, tracking commit: see the closeout commit immediately following this file's addition.
