# Claude Code Prompt: Sprint 1 Correction From Tenant 0 HITL Attempt

You are working on AXXESS TRIaxis by Triaxis Ventures Private Limited.

Canonical workspace:

`C:\Users\Sudipta Sarmah\OneDrive - State Bank of India\Documents\AXXESS-TRIAXIS`

## Operating Model

Codex is product manager and prompt designer.  
Claude Code is engineer, coder, tester, and sprint executor.  
Sudipta Koushik Sarmah is the HITL authority.

The HITL has now performed live Tenant 0 onboarding attempts on `https://beta.triaxisventures.com`. The result is that Tenant 0 is partially functional but Sprint 1 cannot be considered closed.

Your job is to correct Sprint 1 blockers only.

Do not proceed to Sprint 2.  
Do not redesign the app.  
Do not rewrite architecture.  
Do not remove working functionality.  
Do not add broad new product surface area.

## Required Reading

Read these documents first:

- `docs/readiness/HITL_OPERATING_CONTEXT_SPRINT_0_TO_PRESENT.md`
- `docs/readiness/CODEX_RECOMMENDATION_QA3_READINESS_PROGRAM.md`
- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md`
- `docs/readiness/FIVE_SPRINT_ROADMAP_TO_QA3.md`
- `docs/readiness/SPRINT_CHECKLISTS_TO_QA3.md`
- `docs/readiness/QA3_READINESS_KANBAN.md`
- `docs/readiness/TENANT_0_ONBOARDING_ATTEMPTS_2026_07_24.md`

## Sprint Correction Objective

Make the Tenant 0 and investor-preview entry paths reliable enough that Sprint 1 can be re-tested by the HITL.

## P0 Blockers To Fix

### P0-01: Investor Preview Route Broken

Current observed behavior:

- `https://beta.triaxisventures.com` routes to `https://beta.triaxisventures.com/auth?next=%2Fdashboard`.
- It shows a stale signed-in/investor-preview state.
- It shows `Ananya Rao is authenticated`.
- It shows `Continue to workspace`.
- `Continue to workspace` does not work.

Required behavior:

- Investor preview route must land cleanly.
- `Continue to workspace` must work.
- If demo login is intended, it must enter the investor preview workspace without stale/broken state.
- If no session exists, the route must provide a clear investor-preview or sign-in path.
- No stale user such as `Ananya Rao` should appear unless it is intentionally part of a working investor preview.
- No dead button should remain.

### P0-02: Create Account Has No Visible Success State

Current observed behavior:

- `Create account` sends a Supabase email but shows no visible UI reaction.

Required behavior:

- User sees a clear success state after account creation.
- Copy should explain that verification email has been sent.
- User should know whether to check email, sign in, or continue onboarding.
- Duplicate attempts should be discouraged.

### P0-03: Provision Tenant Raw Unauthorized

Current observed behavior:

- `Provision tenant` can produce raw `unauthorized`.
- A later authenticated attempt succeeds.

Required behavior:

- No raw `unauthorized` appears in the user-facing flow.
- If email verification, sign-in, session refresh, or permission state is required, explain it clearly.
- Route user to the correct next action.
- Preserve security boundaries.

## P1 Fixes If Low-Risk And Sprint-Scoped

Fix these if they are localized and do not expand the sprint:

1. Add supporting text for the four security/beta notices:
   - Terms of Service
   - Privacy Policy
   - AI Usage Notice
   - Beta Disclaimer
2. Formalize required notices.
3. Prevent ambiguous progression if required notices are incomplete.
4. Change feedback beta version from `0.6` to `0.7`.
5. Make user profile menu route to a basic profile screen if existing architecture supports it.

If any P1 item requires large new architecture, document it as Sprint 2/3 backlog instead of implementing it now.

## Do Not Fix In This Sprint Unless Trivial

The HITL also observed the following issues. Do not make these the main sprint scope:

- Meetings save failure.
- Documents & Files indexing failure.
- Stakeholders Add Contact failure.
- Analytics not live.
- Social Alerts not live.
- Approvals mostly placeholder.
- ZIP upload support.
- Full RAG/provider credential integration.
- Feedback email delivery path.

These are important but belong to later sprints unless a tiny fix is obvious and safe.

## Tests To Add Or Update

Add focused tests for:

- Auth create-account success state.
- Investor preview route behavior.
- Continue-to-workspace behavior.
- Provision tenant unauthorized handling.
- Required notice validation.
- Feedback beta version if changed.

If Playwright or browser-level coverage already exists, add/extend route-level tests where practical.

## Verification Commands

Run:

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```

If any command fails, fix only sprint-relevant issues or document the exact blocker.

## Documentation Updates Required

Update:

- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md`
- `docs/readiness/FIVE_SPRINT_ROADMAP_TO_QA3.md`
- `docs/readiness/SPRINT_CHECKLISTS_TO_QA3.md`
- `docs/readiness/QA3_READINESS_KANBAN.md`

Create:

- `docs/readiness/SPRINT_1_CORRECTION_TENANT_0_ONBOARDING_CLOSEOUT_2026_07_24.md`

Closeout must include:

- Files changed.
- P0 blockers fixed.
- P1 items fixed or deferred.
- Tests run.
- Test results.
- Build result.
- Production deployment status.
- HITL retest instructions.
- Confidence score per Sprint 1 actionable.
- Exact remaining blockers.

## Actionable Status Guidance

Do not mark Sprint 1 closed unless:

- A-01 has deployment evidence or is explicitly blocked.
- A-02 create-account success state is fixed and verified.
- A-03 login is verified.
- A-04 logout is verified.
- A-05 password reset path is verified or explicitly blocked.
- A-06 Tenant 0 provisioning is verified without raw unauthorized.
- A-07 profile path is verified or explicitly blocked.
- A-09 role assignment is verified or explicitly blocked.
- Investor preview route works.

Every `Yes` requires at least 80% confidence and evidence.

## Git Requirements

After successful verification:

1. Review git status.
2. Commit with:

```bash
git commit -m "fix(readiness): stabilize tenant 0 onboarding and investor preview"
```

3. Push according to the current canonical repo workflow.
4. Do not force push.
5. If auth/push is blocked, document exact blocker and next action.

## Final Output Required

Return:

- Branch.
- Commit hash.
- Files added.
- Files modified.
- P0 blockers fixed.
- P1 fixes included.
- Tests run.
- Test results.
- Build result.
- Deployment status.
- HITL retest path.
- Remaining risks.
- Whether Sprint 1 can be retested.

