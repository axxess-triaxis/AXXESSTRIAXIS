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
| A-02 | Verify create-account success state | Single Tenancy | 1 | User sees clear confirmation after signup | Blocked | 70% (code) | 2026-07-23 |
| A-03 | Verify live login flow | Single Tenancy | 1 | Existing user can log in on production | Blocked | 70% (code) | 2026-07-23 |
| A-04 | Verify logout flow | Single Tenancy | 1 | Session ends cleanly and protected routes block access | Blocked | 75% (code) | 2026-07-23 |
| A-05 | Verify password reset flow | Single Tenancy | 1 | Reset email and password update work | Blocked | 65% (code) | 2026-07-23 |
| A-06 | Verify Tenant 0 organization provisioning | Enterprise Beta | 1 | Triaxis Ventures tenant created live | Blocked | 70% (code) | 2026-07-23 |
| A-07 | Verify profile creation and editing | Enterprise Beta | 1 | Name, role, department, and avatar placeholder persist | Blocked | 80% (code) | 2026-07-23 |
| A-08 | Verify user invitation flow | Enterprise Beta | 3 | Invited user receives invite and joins tenant | No | 0% | 2026-07-23 |
| A-09 | Verify role assignment | Enterprise Beta | 1, 3 | Admin assigns role and UI respects it | Blocked | 60% (code) | 2026-07-23 |
| A-10 | Run two-tenant isolation harness against real DB | Multi-Tenancy | 3 | Test output proves tenant separation | No | 0% | 2026-07-23 |
| A-11 | Manually verify two-tenant UI isolation | Multi-Tenancy | 3 | Tenant A cannot see Tenant B data in UI | No | 0% | 2026-07-23 |
| A-12 | Verify document upload or import | Live Workflow | 2 | File uploads, stores, indexes, and appears in UI | No | 0% | 2026-07-23 |
| A-13 | Verify RAG answer with citations | Live Workflow | 2 | User asks a question and receives cited answer | No | 0% | 2026-07-23 |
| A-14 | Verify permission-aware retrieval | Security and Compliance | 3 | Restricted documents are not retrieved by unauthorized roles | No | 0% | 2026-07-23 |
| A-15 | Verify AI Review Inbox approval | Live Workflow | 2 | AI answer can be approved, rejected, or edited | No | 0% | 2026-07-23 |
| A-16 | Verify approved AI output creates real work | Live Workflow | 2 | Task, project, approval, or stakeholder note created | No | 0% | 2026-07-23 |
| A-17 | Verify dashboard updates after workflow | Enterprise Beta | 2 | Dashboard reflects new activity or work item | No | 0% | 2026-07-23 |
| A-18 | Verify audit log updates after workflow | Security and Compliance | 2, 3, 4 | Audit event exists with actor, action, time, and source | No | 0% | 2026-07-23 |
| A-19 | Verify timeline evidence updates | Live Workflow | 2, 4 | Timeline shows source, AI answer, human decision, action, and audit event | No | 0% | 2026-07-23 |
| A-20 | Verify dashboard request deduplication | Enterprise Beta | 4 | No duplicate dashboard API/request behavior | No | 0% | 2026-07-23 |
| A-21 | Verify Gmail/Microsoft OAuth readiness | Integrations | 4 | Provider config exists and login path tested or documented blocker exists | No | 0% | 2026-07-23 |
| A-22 | Verify analytics event minimum | Analytics | 4, 5 | Mixpanel/PostHog capture required event set | No | 0% | 2026-07-23 |
| A-23 | Verify Android signed build path | Android Beta | 5 | Signed AAB/APK generated and artifact retained | No | 0% | 2026-07-23 |
| A-24 | Verify iOS build/TestFlight path | iOS Beta | 5 | Build succeeds or external credential/review blocker is documented | No | 0% | 2026-07-23 |
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

