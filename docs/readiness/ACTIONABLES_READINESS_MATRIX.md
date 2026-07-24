# AXXESS QA3 Readiness Actionables Matrix

Date created: 2026-07-23  
Program: Five-sprint QA3 Readiness Execution Program  
Closure threshold: 80% confidence minimum  
Status vocabulary: `No`, `Yes`, `Blocked`, `Deferred`

## Operating Rules

Every actionable must be reviewed after every sprint.

An actionable can be marked `Yes` only if all of the following are true:

- Implementation exists.
- Verification evidence exists.
- The relevant user journey works or the external blocker is documented.
- Documentation is updated.
- Confidence is at least 80%.

If implementation exists but live proof does not, status remains `No`.

## Actionables

| ID | Actionable | Readiness State | Sprint Target | Required Evidence | Status | Confidence | Last Updated |
|---|---|---|---:|---|---|---:|---|
| A-01 | Deploy latest verified build to production | Enterprise Beta | 1, 5 | Production URL reflects latest intended commit; deployment logs clean | Yes | 95% | 2026-07-23 |
| A-02 | Verify create-account success state | Single Tenancy | 1 | User sees clear confirmation after signup | No | 40% | 2026-07-24 |
| A-03 | Verify live login flow | Single Tenancy | 1 | Existing user can log in on production | Yes | 95% | 2026-07-24 |
| A-04 | Verify logout flow | Single Tenancy | 1 | Session ends cleanly and protected routes block access | Yes | 95% | 2026-07-24 |
| A-05 | Verify password reset flow | Single Tenancy | 1 | Reset email and password update work | Blocked | 65% (code) | 2026-07-23 |
| A-06 | Verify Tenant 0 organization provisioning | Enterprise Beta | 1 | Triaxis Ventures tenant created live | Yes | 95% | 2026-07-24 |
| A-07 | Verify profile creation and editing | Enterprise Beta | 1 | Name, role, department, and avatar placeholder persist | No | 55% | 2026-07-24 |
| A-08 | Verify user invitation flow | Enterprise Beta | 3 | Invited user receives invite and joins tenant | Blocked | 75% (code) | 2026-07-24 |
| A-09 | Verify role assignment | Enterprise Beta | 1, 3 | Admin assigns role and UI respects it | Yes | 92% | 2026-07-24 |
| A-10 | Run two-tenant isolation harness against real DB | Multi-Tenancy | 3 | Test output proves tenant separation | Blocked | 70% (code + static RLS review) | 2026-07-24 |
| A-11 | Manually verify two-tenant UI isolation | Multi-Tenancy | 3 | Tenant A cannot see Tenant B data in UI | Blocked | 65% (code) | 2026-07-24 |
| A-12 | Verify document upload or import | Live Workflow | 2 | File uploads, stores, indexes, and appears in UI | Yes | 90% | 2026-07-24 |
| A-13 | Verify RAG answer with citations | Live Workflow | 2 | User asks a question and receives cited answer | Blocked | 75% (code) | 2026-07-24 |
| A-14 | Verify permission-aware retrieval | Security and Compliance | 3 | Restricted documents are not retrieved by unauthorized roles | Blocked | 80% (code) | 2026-07-24 |
| A-15 | Verify AI Review Inbox approval | Live Workflow | 2 | AI answer can be approved, rejected, or edited | Blocked | 75% (code) | 2026-07-24 |
| A-16 | Verify approved AI output creates real work | Live Workflow | 2 | Task, project, approval, or stakeholder note created | Blocked | 80% (code) | 2026-07-24 |
| A-17 | Verify dashboard updates after workflow | Enterprise Beta | 2 | Dashboard reflects new activity or work item | Blocked | 65% (code) | 2026-07-24 |
| A-18 | Verify audit log updates after workflow | Security and Compliance | 2, 3, 4 | Audit event exists with actor, action, time, and source | Blocked | 88% (code) | 2026-07-24 |
| A-19 | Verify timeline evidence updates | Live Workflow | 2, 4 | Timeline shows source, AI answer, human decision, action, and audit event | Blocked | 80% (code) | 2026-07-24 |
| A-20 | Verify dashboard request deduplication | Enterprise Beta | 4 | No duplicate dashboard API/request behavior | No | 0% | 2026-07-23 |
| A-21 | Verify Gmail/Microsoft OAuth readiness | Integrations | 4 | Provider config exists and login path tested or documented blocker exists | No | 0% | 2026-07-23 |
| A-22 | Verify analytics event minimum | Analytics | 4, 5 | Mixpanel/PostHog capture required event set | No | 0% | 2026-07-23 |
| A-23 | Verify Android signed build path | Android Beta | 5 | Signed AAB/APK generated and artifact retained | Blocked | 60% (code) | 2026-07-24 |
| A-24 | Verify iOS build/TestFlight path | iOS Beta | 5 | Build succeeds or external credential/review blocker is documented | Blocked | 30% (code) | 2026-07-24 |
| A-25 | Produce QA3-ready evidence package | Enterprise Beta | 4, 5 | Docs, screenshots, logs, tests, and known risks bundled | No | 0% | 2026-07-23 |

## Sprint Logging Template

Use this section after each sprint.

### Sprint N Update

- Date:
- Executor:
- HITL reviewer:
- Actionables targeted:
- Actionables closed:
- Actionables blocked:
- Actionables still `No`:
- Evidence links:
- Confidence summary:
- Readiness delta achieved:
- Notes:

### Sprint 1 Update: Tenant 0 Production Activation

- Date: 2026-07-23
- Executor: Claude Code
- HITL reviewer: Pending (Sudipta Koushik Sarmah)
- Actionables targeted: A-01, A-02, A-03, A-04, A-05, A-06, A-07, A-09
- Actionables closed (`Yes`): A-01
- Actionables blocked (`Blocked`): A-02, A-03, A-04, A-05, A-06, A-07, A-09 -- every one requires a real, credentialed action (sign up, log in, edit a profile, complete onboarding) that Claude Code's own operating constraints prohibit it from performing on the HITL's behalf, even via a non-interactive script. Each is backed by deployed, tested code and non-credentialed live evidence (see closeout); none is blocked by a missing implementation.
- Actionables still `No`: none of the 8 targeted (A-08 remains `No`, unchanged -- out of Sprint 1 scope, targeted for Sprint 3)
- Evidence links: `docs/readiness/SPRINT_1_TENANT_0_PRODUCTION_ACTIVATION_CLOSEOUT.md`; commit `59d1fe0`; deployment `dpl_Dd4z3d7kACCVioeSKFgYZeHx89Uo`
- Confidence summary: A-01 95%; A-02/A-03/A-06 70%; A-04 75%; A-05 65%; A-07 80%; A-09 60% -- all code-level confidence, not live-proof confidence, since live proof is the named blocker for every `Blocked` item
- Readiness delta achieved: engineering-side delta is real and deployed (see closeout Section on readiness movement); the founder-facing delta of actually *being* Tenant 0 requires one HITL walkthrough, not yet performed
- Notes: the single highest-leverage next action for the whole QA3 program is a ~15-30 minute HITL walkthrough (sign up -> confirm email -> sign in -> complete onboarding -> edit profile), since it would very likely close 6 of the 7 `Blocked` items in one pass

### Sprint 1 Update (Continued): HITL Walkthrough Completed

- Date: 2026-07-24
- Executor: HITL walkthrough (Sudipta Koushik Sarmah), documented by Claude Code
- HITL reviewer: Self (walkthrough performed directly)
- Actionables re-reviewed with new live evidence: A-02, A-03, A-04, A-06, A-07, A-09, plus A-12 (Sprint 2-scoped, incidentally exercised)
- Actionables closed (`Yes`) this update: A-03, A-04, A-06, A-09, A-12 -- **A-06 (Tenant 0 organization provisioning) is the program's headline result: the first successful live tenant provisioning in this program's entire history.**
- Actionables downgraded from `Blocked` to `No`: A-02 (create-account success state) -- the walkthrough produced a confirmed defect (no visible success feedback on a real signup), not merely an untested item; this is now an engineering task, not a HITL-blocked one. A-07 (profile creation/editing) -- the top-right avatar/profile menu does not navigate anywhere; the separate sidebar Settings entry (confirmed to reach genuinely working, persisted profile editing in this sprint's code audit) was not tested this walkthrough.
- Actionables still `Blocked`: A-05 (password reset) -- not exercised this walkthrough.
- Evidence links: `docs/TENANT_0_ONBOARDING_FINDINGS_2026_07_22.md` "Attempt 4 Log (2026-07-24)"; `docs/readiness/SPRINT_1_TENANT_0_PRODUCTION_ACTIVATION_CLOSEOUT.md` Addendum
- Confidence summary: A-03/A-04/A-06 95%; A-09 90%; A-12 90%; A-02 40% (confirmed defect); A-07 55% (mixed -- persistence confirmed by code, entry point confirmed broken)
- Readiness delta achieved: substantial and now partly live-measured rather than estimated -- Enterprise Beta 1.0 and Single Tenancy readiness both move meaningfully upward; see closeout Addendum for the full picture
- New defects found during the walkthrough, outside the 8 targeted actionables (documented in `docs/TENANT_0_ONBOARDING_FINDINGS_2026_07_22.md`, not yet fixed): meeting creation fails; Stakeholders "Add Contact" fails; Documents & Files "Index document" fails; ZIP/MP4 uploads unsupported in Knowledge Hub; feedback form shows the wrong beta version number (0.6, should be 0.7); nearly the entire admin surface beyond Pilot Command Center/Support Ops/Mobile Release is non-functional placeholder scaffolding; **Investor Preview's "Continue to workspace" is broken (user-flagged as high priority); the root domain lands on a stale, dead-end authenticated-looking page (user-flagged as high priority).**
- Notes: Sprint 1 is substantially advanced but not yet formally closeable under the program's own closure rule -- A-02 is neither `Yes` nor a properly-`Blocked`-on-external-dependency item, it is a confirmed defect awaiting a fix. Recommended immediate next actions, in order: (1) fix A-02's create-account success-state defect, (2) investigate and fix the two investor-preview/root-domain dead ends the HITL flagged as high priority, (3) fix the broken profile-menu entry point and re-test A-07, (4) HITL tests password reset (A-05) once convenient.

### Sprint 2 Update: Live Golden Path Execution

- Date: 2026-07-24
- Executor: Claude Code
- HITL reviewer: Pending (Sudipta Koushik Sarmah)
- Actionables targeted: A-12, A-13, A-15, A-16, A-17, A-18, A-19
- Actionables closed (`Yes`): A-12 (unchanged, closed ahead of schedule in the Sprint 1 continuation)
- Actionables blocked (`Blocked`): A-13, A-15, A-16, A-17, A-18, A-19 -- all six trace back to one gap, not six separate ones: a real, previously-undiscovered architectural disconnect between two independently complete AI-review pipelines (`ai_output_audit`, written by the AI Workspace's own chat, and `ai_operation_reviews`, read by the dedicated Review Inbox page -- nothing ever bridged them). Fixed with a single, minimal insert in `answerTenantQuestion()`. Every one of the six is now code-complete and unit-tested but not yet live-verified, since that requires a real authenticated session Claude Code cannot establish.
- Actionables still `No`: none of the 7 targeted
- Evidence links: `docs/readiness/SPRINT_2_LIVE_GOLDEN_PATH_EXECUTION_CLOSEOUT_2026_07_24.md`; commit (see this doc's own git log once pushed)
- Confidence summary: A-12 90%; A-16 80%; A-18 85%; A-19 80%; A-13/A-15 75%; A-17 65% -- all code-level confidence, live proof is the named blocker for every `Blocked` item
- Readiness delta achieved: the golden path went from "impossible to complete regardless of who tries it" (no bridge existed) to "code-complete, pending one live walkthrough" -- a qualitatively larger move than the confidence percentages alone suggest
- Notes: A-23/A-24 (Android/iOS store release) are re-classified this update from `No` to `Blocked`, incorporating `docs/readiness/MOBILE_STORE_CREDENTIALS_AND_DUNS_DEPENDENCY_2026_07_24.md` -- Triaxis Ventures' D-U-N-S Number application (submitted 2026-07-13 to Dun & Bradstreet India, reference `DR071320262903910840`, typical turnaround up to ~30 days) is a real, named, dated external blocker on company-owned Apple/Google developer credentials, distinct from and in addition to the credential-completeness gaps found in the earlier readiness analysis. This is a deliberate governance decision (release under the company identity, not the founder's individual account), not an engineering gap -- confidence reflects that the underlying build/signing engineering can and does continue in parallel.

### Sprint 3 Update: Two-Tenant Isolation and Permission Proof

- Date: 2026-07-24
- Executor: Claude Code
- HITL reviewer: Pending (Sudipta Koushik Sarmah)
- Actionables targeted: A-08, A-09, A-10, A-11, A-14, A-18 (plus A-06, A-12, A-13, A-17, A-19 reviewed for carryover)
- **Core finding**: a real, previously-unfound tenant-isolation defect -- "Super Admin" is a self-selectable role at onboarding (anyone provisioning a new tenant can pick it for themselves; see `packages/shared/src/index.ts` `axxessBetaRoles`), not a cross-tenant platform-operator role. Multiple app-layer functions (`canManageOrganization` in `src/security/rbac.ts`; `organizationIdForMutation`/`betaFeedbackMutation`/`invitationsRepository.create` in `src/repositories/supabaseEnterpriseRepositories.ts`; `scopeOrganizationId` in `src/repositories/workflowActionRepositories.ts`) trusted a client-supplied `organizationId` whenever the acting session's role was "Super Admin," letting a self-granted Super Admin invite users into, or write projects/tasks/documents/etc. under, an arbitrary organization by naming its id. **This was not exploitable against the live production database**: every affected table's Postgres RLS policy independently and correctly enforces `has_any_role(target_organization_id, ...)`/`is_org_member(target_organization_id)`, which checks real per-organization membership rows, not the client-supplied value or a global role claim -- confirmed by direct reading of `supabase/migrations/20260702165736_initial_enterprise_schema.sql` and `20260703025318_sprint6_server_auth_repositories.sql`. It was, however, a genuine defense-in-depth violation (the app layer should never have trusted client-supplied tenant claims in the first place, per `docs/SECURITY_ARCHITECTURE.md`'s own operational rule) and a landmine: it depended entirely on every current and future affected table's RLS being correct, with no independent application-layer backstop. Fixed by removing every cross-org bypass; every mutation now always uses the acting session's own `organizationId`, regardless of role or request-body content. A pre-existing test (`supabaseEnterpriseRepositories.test.ts`, `"honors an explicit organizationId on create only for Super Admin scopes"`) had asserted the vulnerable behavior directly -- flipped to assert the corrected behavior, plus new regression tests added for `rbac.ts`, `invitationsRepository.create`, and the resource-route audit log.
- Two additional concrete gaps fixed: (1) invitation acceptance (`src/app/api/invitations/accept/route.ts`) never verified the accepting user's email matched the invited email -- any authenticated user holding a leaked/forwarded invite token could join the inviting org with the invited role; now checked before any membership row is written. (2) `PATCH /api/repositories/users` (role/department/status changes) sent a notification but wrote no audit log -- now writes `user.access_updated` with the changed fields, closing a real WS7 gap.
- Permission-aware RAG (A-14): added a regression test proving `retrieveInstitutionalContext` excludes `classification: "restricted"` documents for a non-elevated role (`governedRag.test.ts`), and confirmed by direct read that the live path (`src/services/rag/tenantRagWorkflow.ts`) imports and uses the exact same `canRetrieveDocument` function -- this is not a parallel/untested implementation.
- Actionables closed (`Yes`): none newly closed this sprint (A-09 stays `Yes`, confidence raised from 90% to 92% given the new role-change audit evidence).
- Actionables blocked (`Blocked`): A-08, A-10, A-11, A-14 (newly blocked this sprint, all on the same class of blocker: a real second live tenant and/or a non-production Supabase project Claude Code cannot create or credential itself -- creating accounts and handling credentials are both outside Claude Code's own operating constraints); A-13, A-17, A-18, A-19 remain `Blocked` (Sprint 2 carryover, unchanged -- see gate check below).
- Actionables still `No`: none of the 6 targeted.
- Sprint 2 carryover gate: re-checked against `docs/readiness/SPRINT_2_LIVE_GOLDEN_PATH_EXECUTION_CLOSEOUT_2026_07_24.md` -- no evidence the HITL golden-path walkthrough has occurred yet, so A-13/A-15/A-16/A-17/A-18/A-19 remain exactly where Sprint 2 left them. Not expanded this sprint except where they intersect tenant isolation directly (A-18's audit-evidence scope, broadened as described above).
- Evidence links: `docs/readiness/SPRINT_3_TWO_TENANT_ISOLATION_PERMISSION_PROOF_CLOSEOUT_2026_07_24.md`; `src/security/rbac.test.ts`; `src/repositories/supabaseEnterpriseRepositories.test.ts`; `src/services/rag/governedRag.test.ts`; `src/app/api/invitations/accept/route.test.ts`; `src/app/api/repositories/[resource]/route.test.ts`
- Confidence summary: A-09 92%; A-18 88%; A-14 80%; A-08 75%; A-10 70% (code + static RLS review, no harness run); A-11 65% -- every `Blocked` item's confidence reflects code-level and (for A-10/A-14) direct RLS-policy-source review, not a live multi-tenant run
- Readiness delta achieved: the sprint's real deliverable is a closed, evidenced, defense-in-depth security gap (not merely incremental verification progress) -- Security and Compliance and Multi-Tenancy readiness both move meaningfully, even though most targeted actionables remain `Blocked` pending a live two-tenant walkthrough
- Notes: A-10 (isolation harness against a real DB) could not be run this sprint -- this checkout has no Docker daemon available (`docker info` fails, so `supabase start` is unavailable) and no linked/branch Supabase project (`supabase/.temp/project-ref` does not exist, and no `SUPABASE_ACCESS_TOKEN` is present in this environment); the only Supabase credentials reachable via `vercel env ls` are the live production project's, which now holds real Tenant 0 data and must never be the target of `scripts/verify-two-tenant-isolation.mjs` (its own header comment: "Never run this against a real production project with real tenant data"). Recommended HITL next action: either enable a local Docker daemon for this checkout, or provision a dedicated Supabase branch/staging project and share its URL/anon key/service-role key, so the harness (already written, never run) can execute for real.

