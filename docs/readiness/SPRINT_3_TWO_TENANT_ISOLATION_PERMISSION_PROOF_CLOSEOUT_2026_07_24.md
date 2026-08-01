# Sprint 3 Closeout: Two-Tenant Isolation and Permission Proof

Date: 2026-07-24
Program: Five-Sprint QA3 Readiness Execution Program
Executor: Claude Code
Product manager / prompt designer: Codex
HITL authority: Sudipta Koushik Sarmah, Founder and Managing Director, Triaxis Ventures Private Limited

## Sprint Objective

Prove that AXXESS is safe for more than one organization: two tenants can exist simultaneously with no visible, API-level, repository-level, or RAG-level data leakage.

## Result Summary

**Sprint 3 is not closed. Its real deliverable is a closed, evidenced defense-in-depth security gap, not the six targeted actionables** (which mostly remain `Blocked` pending a live two-tenant walkthrough and a non-production Supabase environment, neither of which Claude Code can create for itself). The required tenant-model audit (Workstream 1) found a genuine cross-tenant authorization defect in the application layer -- not exploitable against the live database, because Postgres RLS independently and correctly enforces the tenant boundary, but a real defense-in-depth violation and a landmine. It is now fixed, with regression tests that assert the corrected behavior. Two smaller, concrete gaps in the invitation and role-assignment flows were also found and fixed.

## The Core Finding: "Super Admin" Was Trusted As A Cross-Tenant Authority

`packages/shared/src/index.ts`'s `axxessBetaRoles` lists `"Super Admin"` as one of the roles any self-serve user can select for themselves while completing onboarding for a brand-new tenant -- there is no gate on who may claim it, and `src/auth/provisioning.ts`'s `provisionTenantForUser` trusts the selected role verbatim (only validating it is a known role name). This means "Super Admin" is, by design, a **self-selectable per-tenant role**, not a cross-tenant platform-operator role -- there is no such role anywhere in this codebase.

Despite that, several application-layer functions treated a "Super Admin" scope as authorized to act on an **arbitrary organization id supplied by the caller**:

- `canManageOrganization` (`src/security/rbac.ts`) returned `true` for any `organizationId` whenever `user.role === "Super Admin"`, regardless of `user.organizationId`. This function gates `POST /api/invitations`, where `organizationId` is read directly from the request body (falling back to the session's own org only if omitted).
- `organizationIdForMutation` (`src/repositories/supabaseEnterpriseRepositories.ts`) and `scopeOrganizationId` (`src/repositories/workflowActionRepositories.ts`) let a "Super Admin" scope's mutation calls (projects, tasks, documents, document versions/categories/tags/permissions, knowledge articles, meetings, notifications, approval requests, stakeholder notes, project updates) use a client-supplied `input.organizationId` instead of the acting session's own organization -- 16 call sites combined.
- `betaFeedbackMutation` had the identical pattern for beta feedback records.
- `invitationsRepository.create` didn't even have the Super-Admin-gated version of this pattern -- it always wrote `input.organizationId` verbatim, for any role, relying entirely on its one caller (`POST /api/invitations`) to have already checked `canManageOrganization`.

Put together: **a brand-new, self-serve tenant creator who selected "Super Admin" during their own onboarding could invite a user into, or write a project/task/document/etc. under, any other organization in the system, simply by naming its id.**

### Why This Was Not Exploitable In Production

Every one of these code paths writes through the acting user's own Supabase access token (`Authorization: Bearer <user JWT>`), not a service-role key -- confirmed by reading `supabaseRest`'s call sites (`accessToken: scope.accessToken`). That means every insert/update is still subject to real Postgres Row Level Security. Reading the actual migration SQL directly (not assuming):

- `public.is_org_member(target_organization_id)` (`supabase/migrations/20260702165736_initial_enterprise_schema.sql:269-283`) checks for a real row in `organization_members` matching `organization_id = target_organization_id AND user_id = auth.uid() AND status = 'active'`.
- `public.has_any_role(target_organization_id, allowed_roles)` (same file, lines 288-300) checks for a real row in `user_roles` joined to `roles` matching `organization_id = target_organization_id AND user_id = auth.uid() AND role.name = any(allowed_roles)`.
- Every RLS policy gating `projects`, `tasks`, `documents`, `meetings`, `invitations`, etc. (including `invitations_admin_insert`, `20260703025318_sprint6_server_auth_repositories.sql:234-237`) uses one of these two functions, keyed on the **target** organization id in the row being written, not on the caller's role in isolation.

A self-granted "Super Admin" from Tenant A has an `organization_members`/`user_roles` row scoped only to Tenant A -- created once, at onboarding, and never duplicated into any other tenant. When the application layer let them attempt a write naming Tenant B's id, RLS would independently reject it, because `is_org_member(tenant_b_id)`/`has_any_role(tenant_b_id, ...)` both evaluate against Tenant A's user having no membership row in Tenant B. **The database was the real authority here, and it was correctly scoped.**

### Why It Still Had To Be Fixed

- It is a direct violation of `docs/SECURITY_ARCHITECTURE.md`'s own stated operational rule: "Application code must not make authorization decisions using mutable user metadata... Role and tenant claims must come from trusted database records." The app layer was making exactly this mistake -- trusting a client-supplied `organizationId` combined with a self-selected role.
- It is a landmine, not a safe design: it depended on every current *and future* affected table's RLS policy being correct, with zero independent backstop at the application layer. Any RLS policy that regressed, was misapplied to a new table, or was missing entirely would have made this instantly exploitable -- and nothing in the application code would have noticed or blocked it.
- **A pre-existing unit test had directly encoded and asserted the vulnerable behavior as the intended design**: `supabaseEnterpriseRepositories.test.ts`'s `"honors an explicit organizationId on create only for Super Admin scopes"` constructed a `Super Admin` scope, passed `organizationId: "org_platform_target"` in the create input, and asserted the request body sent to Supabase contained `"org_platform_target"` -- i.e., it was testing for, and passing on, the exact cross-tenant write this sprint identifies as a defect. This is strong evidence the pattern was a deliberate (if mistaken) design choice, not an accidental typo, which is why a full sprint-level writeup and fix -- not a one-line patch -- is warranted.
- No legitimate feature in this codebase actually needs cross-tenant write authority. A repo-wide search confirmed there is no distinct "platform super admin" concept, no admin-console flow, and no internal-ops tooling that relies on this bypass -- every real caller of every affected function already passes its own tenant's data.

### The Fix

Every one of the bypasses above was removed. Mutations now always use the acting session's own `scope.organizationId`, regardless of role or any `organizationId` present in the request body or input object:

- `src/security/rbac.ts` -- `canManageOrganization` and `assertOrganizationAccess` now require `user.organizationId === organizationId` unconditionally, with the admin-role check applied on top.
- `src/repositories/supabaseEnterpriseRepositories.ts` -- `organizationIdForMutation` and `betaFeedbackMutation`'s bypass removed; `invitationsRepository.create` now writes `scope.organizationId` instead of `input.organizationId` (closing the one call site that had no Super-Admin gate at all, for defense-in-depth beyond the route-level fix).
- `src/repositories/workflowActionRepositories.ts` -- `scopeOrganizationId` bypass removed (and the now-fully-unused helper function and its `EntityId` import deleted, rather than left as dead unused-parameter code).
- The vulnerable-behavior test in `supabaseEnterpriseRepositories.test.ts` was flipped to `"ignores a spoofed organizationId on create for a Super Admin scope too (cross-tenant write blocked)"`, asserting the corrected behavior.

No RLS policy was touched or weakened -- this is purely an application-layer hardening, consistent with the sprint's own non-negotiable ("Do not weaken Row Level Security").

## Two More Concrete Gaps Found And Fixed

1. **Invitation acceptance trusted the token holder's identity, not the invited identity.** `src/app/api/invitations/accept/route.ts` looked up an invitation solely by its hashed token and then provisioned membership/role rows for `session.user.id` using the invitation's `organization_id`/`role` -- without ever checking that `session.user.email` matched `invitation.email`. Any authenticated AXXESS user (in any tenant) who obtained a forwarded, logged, or otherwise leaked invite token could accept it and join the inviting organization with the invited role. Fixed: the route now returns `403` with a clear message if the signed-in user's email doesn't match the invited email, checked before any write to `profiles`/`users`/`organization_members`/`user_roles`.
2. **Role/department/status changes wrote a notification but no audit log.** `PATCH /api/repositories/users` (the live role-assignment path) already notified the affected user of an access change, but never recorded the change in `audit_logs` -- a direct gap against this sprint's own required audit event list ("Role/department change"). Fixed: the route now writes a `user.access_updated` audit log with the changed fields whenever a role, department, or status change is applied.

## Permission-Aware RAG (A-14)

`src/services/rag/governedRag.ts`'s `canRetrieveDocument` already correctly excludes cross-tenant documents, private documents without an explicit grant, and `classification: "restricted"` documents for non-elevated roles -- confirmed by direct read and by existing tests (`governedRag.test.ts`). What was missing was a test proving the negative case explicitly required by this sprint ("Ask a question as a restricted/guest user. Confirm restricted documents are not retrieved.") -- added this sprint. Also confirmed by direct read that `src/services/rag/tenantRagWorkflow.ts` (the live path wired to the AI Workspace chat and the Sprint 2 Review Inbox bridge) imports and calls this exact same function -- it is not a parallel, untested implementation.

## Files Changed

- `src/security/rbac.ts` -- `canManageOrganization`/`assertOrganizationAccess` hardened (core fix).
- `src/repositories/supabaseEnterpriseRepositories.ts` -- `organizationIdForMutation`/`betaFeedbackMutation`/`invitationsRepository.create` hardened.
- `src/repositories/workflowActionRepositories.ts` -- `scopeOrganizationId` bypass and unused `EntityId` import removed.
- `src/app/api/invitations/accept/route.ts` -- invited-email identity check added.
- `src/app/api/repositories/[resource]/route.ts` -- `user.access_updated` audit log added to the users PATCH handler.
- `docs/SECURITY_ARCHITECTURE.md` -- corrected an overclaim that `src/security/tenantGuard.ts` is an active enforcement layer (it is defined correctly but not called by any route or repository; the tenant-model audit found this during Workstream 1).
- `src/security/rbac.test.ts` -- new tests for the hardened `canManageOrganization`/`assertOrganizationAccess`.
- `src/repositories/supabaseEnterpriseRepositories.test.ts` -- flipped the pre-existing vulnerable-behavior test; added a new invitation cross-tenant-create test.
- `src/services/rag/governedRag.test.ts` -- new restricted-document/non-elevated-role exclusion test.
- `src/app/api/invitations/accept/route.test.ts` (new) -- covers the identity-binding fix.
- `src/app/api/repositories/[resource]/route.test.ts` -- new test for the role-change audit log.

No architecture was rewritten, no UI was redesigned, no RLS policy was modified, and no working functionality was removed.

## Sprint 2 Carryover Gate

Checked against `docs/readiness/SPRINT_2_LIVE_GOLDEN_PATH_EXECUTION_CLOSEOUT_2026_07_24.md` and `docs/readiness/ACTIONABLES_READINESS_MATRIX.md`'s Sprint 2 Update: no evidence exists that the HITL golden-path walkthrough (upload -> ask -> review -> approve -> create work -> dashboard/audit/timeline) has occurred since Sprint 2 closed. A-13, A-15, A-16, A-17, A-18, A-19 remain exactly where Sprint 2 left them. Per this sprint's own instruction ("do not expand it unless it directly affects tenant isolation or permission proof"), these were not re-investigated beyond A-18's audit-evidence scope, which this sprint's role-change fix directly broadens.

## Actionables

**Targeted:** A-08, A-09, A-10, A-11, A-14, A-18.
**Also updated (evidence produced):** A-09 (confidence raised with new audit evidence).

**Closed (`Yes`):** none newly closed. A-09 remains `Yes` (already closed at onboarding-time scope in Sprint 1), confidence raised 90% -> 92%.

**Blocked:** A-08, A-10, A-11, A-14 -- newly blocked this sprint, all sharing one class of blocker: a real second live tenant and/or a non-production Supabase environment, neither of which Claude Code can create or credential for itself (account creation and third-party credential handling are both outside its own operating constraints, not merely inconvenient). A-18 remains `Blocked` (Sprint 2's live-session dependency unchanged), confidence raised 85% -> 88% given this sprint's new audit-evidence write point.

**Still `No`:** none of the 6 targeted.

## Confidence Score Per Actionable

| Actionable | Status | Confidence | Basis |
|---|---|---:|---|
| A-08 User invitation flow | Blocked | 75% (code) | Tenant-binding hardened (repository no longer trusts client `organizationId`); identity-binding gap on accept fixed and tested. Never exercised with two real accounts. |
| A-09 Role assignment | Yes | 92% | Live-confirmed at onboarding time (Sprint 1); post-onboarding path (`PATCH /api/repositories/users`) hardened against the cross-tenant bug and now writes audit evidence. |
| A-10 Isolation harness against real DB | Blocked | 70% (code + static RLS review) | Harness (`scripts/verify-two-tenant-isolation.mjs`) written since Sprint 5, still never executed -- no Docker daemon, no linked/branch Supabase project, and the only reachable credentials are the live production project's, which must never be the harness's target. Confidence reflects direct reading of the actual RLS policies it would exercise, not a run. |
| A-11 Manual two-tenant UI isolation | Blocked | 65% (code) | UI data hooks (`useLiveWorkspaceMetrics` and others) confirmed to derive `TenantScope` only from the authenticated session, never from client-supplied state; no live two-tenant browser session available. |
| A-14 Permission-aware retrieval | Blocked | 80% (code) | `canRetrieveDocument` unit-tested for cross-tenant, private-without-grant, and (new this sprint) restricted-classification-non-elevated-role exclusion; confirmed shared with the live RAG path. Never exercised with a real two-tenant query. |
| A-18 Audit log updates after workflow | Blocked | 88% (code) | Sprint 2's write points unchanged; this sprint added `user.access_updated` for role/department/status changes, broadening real audit coverage. Live-session dependency (Sprint 2) unchanged. |

No actionable was marked `Yes` on code confidence alone where live proof was required and unavailable, consistent with this program's evidentiary discipline.

## Tenant Model Audit Summary (Workstream 1)

A dedicated audit pass covered every module expected to be tenant-scoped: organizations, users/profiles, roles/permissions, departments/workspaces, programs/projects/tasks, documents (and versions/categories/tags/permissions/activity), knowledge articles, RAG chunks/indexes, AI conversations, AI review items, meetings, stakeholders, approvals, notifications, audit logs, workflow timeline events, and analytics/dashboard metrics. Full detail lives in this closeout's evidence trail; the headline findings:

- **The core cross-tenant authorization gap** described above -- the sprint's primary fix.
- **`src/security/tenantGuard.ts` is correct but dead code** -- defined, unit-tested in isolation, but called by no route or repository in the running application. `docs/SECURITY_ARCHITECTURE.md` previously listed it as an active enforcement layer; corrected this sprint to describe what's actually enforcing tenant isolation today (repository-layer `organization_id` scoping plus RLS).
- **Departments and workspaces have real schema and real RLS but zero application code** reading or writing them -- not a leak (nothing exposes them), but a capability gap worth a deliberate decision (build the repository layer, or remove the unused tables) rather than leaving untested RLS-only tables as a latent liability.
- **A vestigial `tenant_id` mirror column** exists on `organizations` and 10 child tables (`programs`, `projects`, `tasks`, `meetings`, `stakeholders`, `documents`, `notifications`, `audit_logs`, `beta_feedback`, `knowledge_articles`), trigger-defaulted from `organization_id`/`id`, referenced by no RLS policy and no application code. Currently harmless (nothing ever diverges it from `organization_id`) but a real footgun for any future code path that bypasses the existing repositories.
- **`GET /api/ai/reviews` has no role check** -- any authenticated org member can see every AI review in the tenant, not just their own, even though direct RLS access to `ai_operation_reviews` would be row-restricted. Same-tenant exposure only (not a cross-tenant leak); not fixed this sprint, flagged for a future pass.
- **`listWorkflowTimeline`'s empty-tenant fallback** (`src/services/workflows/liveTenantWorkflow.ts`) shows fabricated timeline content, correctly tagged with the real tenant's own organization id, whenever a genuinely-empty tenant's real query returns zero rows -- the same bug class the pre-existing `DEMO_DATA_LEAKAGE_AUDIT.md` fixed elsewhere (dashboard, AI review inbox) but did not reach here. Not a cross-tenant leak (content is org-tagged correctly), but a data-fidelity gap; not fixed this sprint, flagged for a future pass.
- Every genuinely tenant-owned table with a real repository and RLS policy (organizations, users/profiles, programs/projects/tasks, documents and its satellite tables, knowledge articles, RAG chunks, AI review items, meetings, notifications, audit logs, workflow timeline events) was confirmed correctly scoped by both the repository layer and RLS, with the one exception (the cross-tenant bypass) fixed this sprint.

## Two-Tenant Test Setup

No second real, live tenant could be created this sprint -- creating accounts is outside Claude Code's own operating constraints, with no exception for internal testing purposes. Two-tenant proof was instead exercised at the fixture/unit-test level, which the sprint prompt explicitly allows as a fallback ("If only mock/local repositories are available, test repository-level tenant filters and document what remains unproven"):

- `supabaseEnterpriseRepositories.test.ts` uses a base fixture scope (`org_public_safety`) plus attacker-controlled target ids (`org_someone_elses_tenant`, `org_platform_target`) across both the pre-existing `projects` cross-tenant test and this sprint's new `invitations` cross-tenant test.
- `governedRag.test.ts` uses two distinct organization fixtures (`org_1`, `org_2`) for its cross-tenant document-exclusion test (pre-existing, re-confirmed) and this sprint's new restricted-role exclusion test.

What remains unproven by this approach and requires a live second tenant or a non-production Supabase environment: real RLS enforcement under real PostgREST requests (A-10), real UI-level isolation across two authenticated browser sessions (A-11), and a real end-to-end invitation send/accept cycle between two real accounts (A-08).

## RLS / Repository Isolation Results

Confirmed by direct reading of `supabase/migrations/20260702165736_initial_enterprise_schema.sql` and `20260703025318_sprint6_server_auth_repositories.sql` (not assumed from documentation):

- `public.is_org_member(target_organization_id)` and `public.has_any_role(target_organization_id, allowed_roles)` both key strictly on real `organization_members`/`user_roles` rows for the **target** organization id in the row being accessed -- not on the caller's role in isolation, and not on any client-supplied claim.
- Every RLS policy on `projects`, `tasks`, `stakeholders`, `documents`, `meetings`, `decisions`, `risks`, `teams`, `programs`, `invitations`, `organization_members`, `roles`, `user_roles` uses one of these two functions. The one intentionally permissive policy found repo-wide (`permissions_authenticated_select`, `using (true)`) is on a global, non-tenant-scoped static permission catalog with no `organization_id` column at all -- confirmed safe and previously documented in `docs/SUPABASE_CLI.md`.
- The application-layer bypass this sprint fixed would, if RLS were ever misconfigured on any current or future table, have been the only thing standing between a self-granted "Super Admin" and a real cross-tenant write. It no longer is a factor either way.

## RAG Permission Results

See "Permission-Aware RAG (A-14)" above. Cross-tenant exclusion, private-document-without-grant exclusion, and restricted-classification-non-elevated-role exclusion are all unit-tested against the exact function (`canRetrieveDocument`) used by the live retrieval path.

## Invitation / Role Results

See "Two More Concrete Gaps Found And Fixed" above. Invitation creation is now tenant-bound at both the route layer (unchanged, pre-existing `canManageOrganization` check) and the repository layer (new this sprint). Acceptance now binds to the invited identity, not just the token. Role assignment (`PATCH /api/repositories/users`) is RBAC-gated (`Super Admin`/`Organization Admin` only, via `canWriteResource`) and now writes audit evidence. Revoked/expired invites are already rejected (`expires_at` check, pre-existing). Department/workspace context on invitations is not modeled by the current `invitations` table schema (`organization_id`/`email`/`role`/`token_hash`/`expires_at`/`status` only) -- not a gap introduced or found this sprint, simply not a field this schema carries; noted for a future sprint if department-scoped invitations become a requirement.

## Audit Evidence Summary

| Event | Status | Evidence |
|---|---|---|
| Invite created | Already present | `src/app/api/invitations/route.ts` writes `user.invited` |
| Invite accepted | Already present | `src/app/api/invitations/accept/route.ts` writes `invitation.accepted` |
| Role/department/status change | **Fixed this sprint** | `src/app/api/repositories/[resource]/route.ts` now writes `user.access_updated` |
| Tenant-bound document uploaded | Already present | `recordResourceCreateEvidence` (`[resource]/route.ts`) covers `documents` |
| Permission-restricted RAG query | Already present (Sprint 2) | `answerTenantQuestion()` writes `ai_output_audit`/`rag.answer.generated` |
| Cross-tenant access denial | Not directly logged | RLS rejections do not currently produce an application-level audit row; flagged as a future enhancement, not fixed this sprint (would require catching and logging PostgREST 403s specifically, out of this sprint's smallest-safe-change scope) |

## Tests Run And Results

```
pnpm run typecheck    -> clean
pnpm run lint         -> clean, zero warnings
pnpm run test         -> 123 files / 409 tests passing (up from 122/399 at Sprint 2 close)
pnpm run build        -> succeeded (Next.js 16.2.10, Turbopack, 116 routes)
pnpm run supabase:verify -> passed (27 migrations, 100 tables, 100 RLS-protected; one pre-existing, documented-benign `using (true)` warning on the non-tenant `permissions` catalog table, unchanged)
```

Targeted new/updated test runs (all passing before the full-suite run above):

```
pnpm exec vitest run src/security/rbac.test.ts src/repositories/supabaseEnterpriseRepositories.test.ts src/app/api/invitations
  -> 4 test files, 27 tests passing

pnpm exec vitest run src/services/rag/governedRag.test.ts
  -> 1 test file, 5 tests passing

pnpm exec vitest run "src/app/api/repositories/[resource]/route.test.ts"
  -> 1 test file, 10 tests passing
```

New tests: `rbac.test.ts` (4 new tests for `canManageOrganization`/`assertOrganizationAccess`), `supabaseEnterpriseRepositories.test.ts` (1 pre-existing test flipped from vulnerable- to corrected-behavior, 1 new test for the invitations repository), `governedRag.test.ts` (1 new restricted-role exclusion test), `invitations/accept/route.test.ts` (new file, 3 tests), `[resource]/route.test.ts` (1 new test for the role-change audit log).

## Live / Manual Verification Notes

**Performed:** every RLS-enforcement claim in this closeout was verified by directly reading the actual `create policy`/`create function` SQL in the checked-in migrations -- not assumed from prior documentation, not inferred from application code alone. The tenant-model audit itself (Workstream 1) was a full read-through of the repository layer, the security module, and every relevant migration.

**Not performed, and cannot be performed by Claude Code:** live two-tenant browser verification (A-11), a live invitation send/accept cycle between two real accounts (A-08), and an actual execution of `scripts/verify-two-tenant-isolation.mjs` against a real database (A-10). The first two require creating or using real accounts, which is outside Claude Code's own operating constraints without exception. The third requires either a local Docker daemon (unavailable in this environment: `docker info` fails) or a linked, non-production Supabase project (this checkout has no `supabase/.temp/project-ref` and no `SUPABASE_ACCESS_TOKEN`; the only Supabase credentials reachable via `vercel env ls` belong to the live production project, which now holds real Tenant 0 data and must never be this harness's target per its own header comment).

## Remaining Risks

- **A-08/A-10/A-11/A-14 all remain live-unproven.** The application-layer fix and its RLS-backed reasoning are sound, but a real two-tenant, two-account walkthrough is the only thing that converts "code-correct" into "verified."
- **The isolation harness (`scripts/verify-two-tenant-isolation.mjs`) has never once been executed**, in this sprint or any prior one, since it was written in Sprint 5. Its continued existence should not be mistaken for isolation having been verified.
- **`GET /api/ai/reviews`'s missing role check** and **`listWorkflowTimeline`'s empty-tenant fabricated-content fallback** are both real, found-this-sprint gaps, left unfixed by deliberate scope discipline (same-tenant-only exposure, not cross-tenant) -- worth a future sprint's attention.
- **Cross-tenant access denials are not independently audit-logged** at the application layer -- RLS silently rejects them at the database level, which is correct for security but produces no dedicated forensic trail beyond Supabase's own logs.
- **The vestigial `tenant_id` columns** remain dead schema; low risk today, but a real hazard for any future code path that writes around the existing repositories.

## Recommended Sprint 4 Readiness

**Do not begin Sprint 4 yet**, per this sprint's own instruction ("Do not proceed to Sprint 4"). Two independent HITL actions would unblock most of what remains: (1) a live two-tenant walkthrough (a second real account, self-signed-up or invited, used to exercise A-08/A-11/A-14 in the browser); (2) either enabling a local Docker daemon on this machine or provisioning a dedicated Supabase branch/staging project and sharing its credentials, so the long-written, never-run isolation harness can finally execute for A-10. Sprint 2's own outstanding golden-path walkthrough remains the other highest-leverage action pending, independent of Sprint 3.

## HITL Decision Required

1. **Two-tenant live walkthrough**: create or designate a second real AXXESS account, and either (a) have Tenant 0 invite it and confirm acceptance, or (b) have it self-sign-up as a second tenant -- then confirm neither tenant can see the other's projects/tasks/documents/AI reviews/audit logs in the UI.
2. **Isolation-harness environment**: either enable Docker locally for this checkout, or provision a dedicated non-production Supabase project (branch or separate staging project) and share its URL/anon key/service-role key, so `scripts/verify-two-tenant-isolation.mjs` can run for the first time since it was written in Sprint 5. This harness must never be pointed at the live production project.
3. No other founder decision (product, business, legal) is required to close Sprint 3 -- both blockers above are environment/account-provisioning actions, not judgment calls.
