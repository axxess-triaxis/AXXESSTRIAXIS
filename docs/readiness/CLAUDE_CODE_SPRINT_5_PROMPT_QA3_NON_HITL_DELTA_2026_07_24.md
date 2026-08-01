# Claude Code Prompt: Sprint 5 QA3 Closure, Non-HITL Delta Maximization and Release-Gate Preparation

You are working on **AXXESS TRIaxis** by **Triaxis Ventures Private Limited**.

Canonical workspace:

`C:\Users\Sudipta Sarmah\OneDrive - State Bank of India\Documents\AXXESS-TRIAXIS`

## Operating Model

Codex is product manager and prompt designer.  
Claude Code is engineer, coder, tester, and sprint executor.  
Sudipta Koushik Sarmah, Founder and Managing Director of Triaxis Ventures Private Limited, is the HITL authority.

The HITL is currently the only full-time founder/operator, without fallback. Reduce avoidable decision load, preserve auditability, and escalate only material decisions.

Serve the HITL in this order of precedence:

1. CTO and CPO.
2. CEO.
3. CFO and Head of Fundraising.
4. CMO and Head of Sales.

## Sprint Name

**Sprint 5: QA3 Closure, Non-HITL Delta Maximization and Release-Gate Preparation**

## Expected Delta

Original Sprint 5 projected delta: +10% to +15%.

Your goal is to exceed that projection where possible by closing every code-testable, non-HITL gap before the founder performs the post-Sprint-5 manual walkthrough.

Target practical delta:

- Enterprise Beta 1.0: push toward 88-92%.
- Single Tenancy: push toward 92-95%.
- Multi-Tenancy: push toward 78-85% without live HITL walkthrough; higher only if test harness can run safely.
- Live Workflow: push toward 82-90% through code/test/evidence before HITL proof.
- Security and Compliance: preserve or improve 74%+.
- QA3 Evidence Readiness: push to 95%+.
- Android/iOS: maximize engineering readiness, but do not claim store readiness until company credentials/D-U-N-S dependencies clear.

## Sprint Objective

Make Sprint 5 produce the largest possible non-HITL readiness delta by:

1. Deploying or preparing live deployment of Sprint 3-4 fixes.
2. Closing security/role ownership gaps.
3. Removing remaining dead ends and misleading live/demo states.
4. Either implementing or explicitly deferring Stakeholders/CRM and Department/Workspace live paths.
5. Preparing a precise QA3 manual walkthrough script for the HITL.
6. Attempting mobile build/release gates as far as company credential blockers allow.

Do not wait passively for HITL walkthroughs. Make the walkthrough more likely to pass.

## Required Documents To Read First

Read:

- `docs/readiness/HITL_OPERATING_CONTEXT_SPRINT_0_TO_PRESENT.md`
- `docs/readiness/CODEX_RECOMMENDATION_QA3_READINESS_PROGRAM.md`
- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md`
- `docs/readiness/FIVE_SPRINT_ROADMAP_TO_QA3.md`
- `docs/readiness/SPRINT_CHECKLISTS_TO_QA3.md`
- `docs/readiness/QA3_READINESS_KANBAN.md`
- `docs/readiness/PRE_SPRINT_5_GAP_STABILITY_KANBAN_REVIEW_2026_07_24.md`
- `docs/readiness/MOBILE_STORE_CREDENTIALS_AND_DUNS_DEPENDENCY_2026_07_24.md`
- Sprint 1, Sprint 2, Sprint 3, and Sprint 4 closeouts if present.
- `docs/readiness/POST_SPRINT_41_MANUAL_ORCHESTRATION_QA_TENANT_0_2026_07_24.md`

If any referenced file is missing, document that and continue.

## Non-Negotiables

Do not redesign the UI.  
Do not rewrite architecture.  
Do not remove working functionality.  
Do not weaken RLS, RBAC, tenant checks, or audit requirements.  
Do not mark live verification `Yes` from code-only evidence.  
Do not claim mobile store readiness while D-U-N-S/company credentials are pending.  
Do not fabricate walkthrough completion.  
Do not proceed to QA3; only prepare it.

## Priority 1: Production Deployment Currency

Production is currently one deploy behind.

Required:

1. Confirm current branch and commit.
2. Confirm production deployment alias/version if tooling allows.
3. Deploy or prepare deployment of Sprint 3 and Sprint 4 fixes using the repo's current deployment workflow.
4. If deployment cannot be performed due to missing token/session/CLI, document exact blocker and create a one-command HITL deployment instruction.
5. Verify that deployment does not depend on GitHub/GitLab as deployment mediator if CLI/API path is available.

Evidence required:

- Deployment URL or blocker.
- Commit hash.
- Deployment logs or command output summary.
- Whether live site is still behind.

## Priority 2: Fix Role/Ownership Gap on AI Review Retrieval

Known likely security gap:

`GET /api/ai/reviews` may allow any organization member to see every review in the tenant, rather than only reviews they own or are permitted to review.

Required:

1. Locate AI review API/repository path.
2. Audit role and ownership filters.
3. Enforce appropriate access rules:
   - Super Admin / Organization Admin can see tenant-level review queue.
   - Assigned reviewer can see assigned reviews.
   - Employee/Guest should not see all tenant reviews by default.
   - Department-scoped roles should respect department/document/workflow scope where existing schema allows.
4. Add tests for permitted and denied access.
5. Ensure denied access returns safe error or empty result, not raw stack/unauthorized text.
6. Add audit logging for sensitive denied access if architecture supports it.

Evidence required:

- Tests proving access boundaries.
- Files changed.
- Residual risk if schema cannot express full reviewer ownership.

## Priority 3: Hunt and Remove Remaining Demo/Fabricated Fallbacks in Live Tenant Mode

A recurring defect class has been identified: real tenants receive fabricated, demo, or overly-permissive fallback behavior instead of honest empty/restricted/provider-gated states.

Required:

Audit these modules:

- Dashboard
- AI Workspace
- Projects & Programs
- Tasks & Workflow
- Meetings & Decisions
- Knowledge Hub
- Documents & Files
- Analytics & Reports
- Social Alerts
- Stakeholders & CRM
- Approvals & Governance
- Audit Logs
- Product Analytics
- Organization Admin
- Integrations
- Settings
- Beta Readiness

For each module:

1. Determine whether it is live, provider-gated, demo-only, partially live, or intentionally empty.
2. Ensure live tenant mode does not show demo data as real tenant data.
3. Ensure investor/demo mode remains rich and separate.
4. Ensure labels are truthful.
5. Add or update tests for the most risky modules.

Evidence required:

- Module status table in closeout.
- Code/test evidence for fixes.
- Remaining known demo/live boundary risks.

## Priority 4: Stakeholders/CRM and Department/Workspace Scope Closure

Current state:

- Stakeholders/CRM has no live repository path.
- Department/Workspace administration has schema/RLS but zero application code reads/writes.

Sprint 5 must not leave these ambiguous.

Choose the highest-value safe path:

### Option A: Minimal Live Implementation

If scoped and feasible, implement minimal real paths:

- Add contact.
- List contacts.
- Tenant-scoped stakeholder repository.
- Audit event on contact creation.
- Minimal department/workspace create/list path.
- Safe empty states.
- Tests.

### Option B: Explicit Defer With Honest UI

If implementation is too large, make the UI and docs truthful:

- Remove or disable dead-end buttons.
- Show `Pilot configuration pending` or equivalent.
- Explain required setup.
- Ensure no control implies live mutation if it does not exist.
- Document as Sprint 6/QA3 finding.

Required:

- Make a clear product decision.
- Do not leave dead-end buttons.
- Do not overclaim.

Evidence required:

- Either live minimal creation proof or explicit defer state.
- Tests or manual verification notes.

## Priority 5: QA3 Manual Walkthrough Script and Evidence Matrix

Create a founder-ready QA3 walkthrough script that the HITL can run after Sprint 5.

Required file:

`docs/qa-artifacts/QA3_READINESS_2026_07_24/QA3_MANUAL_WALKTHROUGH_SCRIPT.md`

Include:

1. Preconditions.
2. URLs.
3. Test accounts needed.
4. Data to prepare.
5. Step-by-step walkthrough.
6. Expected result per step.
7. Pass/fail field.
8. Screenshot/evidence field.
9. Severity classification for failures.
10. Which actionables each step proves.

Minimum walkthrough sections:

- Investor preview route.
- Sign up.
- Login.
- Logout.
- Password reset.
- Tenant 0 access.
- Profile/settings.
- Document upload.
- Documents & Files ingestion.
- RAG question.
- AI Review Inbox approval.
- Create task from answer.
- Dashboard update.
- Audit log update.
- Timeline update.
- Two-tenant isolation.
- Invite user.
- Dashboard dedupe check.
- Analytics event check.
- Mobile readiness check.

## Priority 6: Mobile Build/Release Gate Attempt

Mobile cannot be fully released until company-owned credentials are ready.

However, engineering-side checks can still run.

Required:

1. Read `docs/readiness/MOBILE_STORE_CREDENTIALS_AND_DUNS_DEPENDENCY_2026_07_24.md`.
2. Attempt Android build/signing validation as far as available secrets allow.
3. Attempt iOS build/TestFlight validation as far as available credentials allow.
4. Do not release under individual founder account.
5. Do not mark `A-23` or `A-24` `Yes` unless actual signed artifact/release evidence exists.
6. Document exact blockers:
   - D-U-N-S pending.
   - Apple Developer company account pending.
   - Google Play Console company account pending.
   - Missing ASC/API keys.
   - Missing Android keystore or Play service account.

Evidence required:

- Build command results or blocker.
- Credential matrix update.
- Next action.

## Priority 7: Convert Code-Complete Blocked Items to Stronger Evidence Without HITL

For each currently blocked action:

- Identify whether non-HITL code/test evidence can raise confidence.
- Add tests where feasible.
- Do not mark as `Yes` unless live/user evidence exists.
- Raise confidence only when evidence improves.

Focus on:

- A-13 RAG answer with citations.
- A-15 AI Review Inbox approval.
- A-16 Approved AI output creates real work.
- A-17 Dashboard update after workflow.
- A-18 Audit log update.
- A-19 Timeline evidence.
- A-20 Dashboard dedupe.
- A-21 OAuth readiness.

## Required Verification

Run:

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```

Also run if present:

```bash
pnpm run supabase:verify
pnpm run test:rag
pnpm run test:security
pnpm run mobile:validate
```

If a command does not exist, document it.  
If a command fails, fix sprint-relevant failures or document blocker.

## Required Documentation Updates

Update:

- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md`
- `docs/readiness/FIVE_SPRINT_ROADMAP_TO_QA3.md`
- `docs/readiness/SPRINT_CHECKLISTS_TO_QA3.md`
- `docs/readiness/QA3_READINESS_KANBAN.md`
- `docs/readiness/PRE_SPRINT_5_GAP_STABILITY_KANBAN_REVIEW_2026_07_24.md`

Create:

- `docs/readiness/SPRINT_5_QA3_CLOSURE_NON_HITL_DELTA_CLOSEOUT_2026_07_24.md`
- `docs/qa-artifacts/QA3_READINESS_2026_07_24/QA3_MANUAL_WALKTHROUGH_SCRIPT.md`

Update if relevant:

- `docs/qa-artifacts/QA3_READINESS_2026_07_24/INDEX.md`
- Mobile release docs
- Integration docs
- Analytics docs
- Security docs

## Closeout Must Include

- Sprint objective.
- Files added.
- Files modified.
- Code changes by category.
- Tests run.
- Test results.
- Build result.
- Deployment status.
- Production alias status.
- Security/role ownership result.
- Demo/live fallback audit result.
- Stakeholders/CRM decision.
- Department/Workspace decision.
- Mobile build/release attempt result.
- QA3 walkthrough script status.
- Actionables moved to `Yes`.
- Actionables remaining `Blocked`.
- Confidence changes.
- Residual risks.
- Exact HITL actions required after Sprint 5.

## Git Requirements

After successful verification:

1. Review git status.
2. Commit with:

```bash
git commit -m "feat(readiness): maximize Sprint 5 QA3 closure and release gates"
```

3. Push to the current canonical remote/branch according to the repo workflow.
4. Do not force push.
5. If auth/push is blocked, document exact blocker and next action.

## Sprint 5 Exit Criteria

Sprint 5 is complete only if:

1. Production deployment is current or blocked with exact deployment command.
2. AI review role/ownership gap is fixed or explicitly proven not present.
3. Demo/live fallback audit is completed across core modules.
4. Stakeholders/CRM scope is either minimally live or explicitly deferred with honest UI.
5. Department/Workspace scope is either minimally live or explicitly deferred with honest UI.
6. QA3 manual walkthrough script exists.
7. Mobile build/release gates are attempted as far as company credentials allow.
8. Full verification suite is run and documented.
9. Actionables, roadmap, checklist, and Kanban are updated.
10. Sprint 5 closeout exists.
11. Remaining HITL actions are reduced to a precise checklist.

Do not claim QA3 passed.  
Do not claim Enterprise Beta 1.0.  
Prepare the founder to run the post-Sprint-5 manual walkthrough.

