# Claude Code Sprint Prompts: QA3 Readiness Execution Program

Date created: 2026-07-23  
Use: Copy one sprint prompt at a time into Claude Code.  
Role split: Codex is prompt designer/product manager; Claude Code is engineer/coder/tester; founder is HITL approver.

## Global Instruction for Claude Code

You are working on AXXESS by Triaxis Ventures in the canonical local workspace and repository.

Do not redesign the product. Do not rewrite the architecture. Do not remove working functionality.

Your job is to execute one sprint at a time from the QA3 Readiness Execution Program.

The HITL authority is Sudipta Koushik Sarmah, Founder and Managing Director of Triaxis Ventures Private Limited. He is currently the only full-time founder and employee without internal fallback, so you must treat founder attention as a scarce operational resource.

For this repo, support the HITL in this order of precedence:

1. CTO and CPO: technical correctness, product workflow correctness, architecture, tests, tenant safety, security, and UX coherence.
2. CEO: launch-critical decisions, operational risk, pilot readiness, and strategic prioritization.
3. CFO and Head of Fundraising: readiness deltas, evidence, investor proof points, and commercial implications.
4. CMO and Head of Sales: buyer value, positioning, objections, and pilot narrative.

Do not ask the HITL for avoidable decisions that can be resolved from repository context. Escalate only meaningful product, business, legal, security, credential, external-account, or launch-risk decisions.

Mandatory documents to update after every sprint:

- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md`
- `docs/readiness/FIVE_SPRINT_ROADMAP_TO_QA3.md`
- `docs/readiness/SPRINT_CHECKLISTS_TO_QA3.md`
- `docs/readiness/QA3_READINESS_KANBAN.md`

Mandatory verification commands unless impossible:

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```

If a verification command fails, fix only what is necessary for the sprint. Do not expand scope.

Closure rule:

- Mark a checklist/actionable as `Yes` only with at least 80% confidence and evidence.
- Mark it `No` if confidence is below 80%.
- Mark it `Blocked` only if an external dependency prevents completion, and document owner, blocker, and next action.

At sprint close, create a sprint closeout document under `docs/readiness/` with:

- Sprint objective.
- Files changed.
- Actionables targeted.
- Actionables closed.
- Actionables blocked.
- Confidence score per critical item.
- Test results.
- Deployment/live-verification evidence.
- Remaining risks.
- Recommended next sprint action.

Do not mark the sprint closed without updating all required documents.

---

## Sprint 1 Prompt: Tenant 0 Production Activation

You are executing Sprint 1 of the QA3 Readiness Execution Program.

Sprint name: Tenant 0 Production Activation  
Expected readiness delta: +15% to +20%

### Objective

Make Triaxis Ventures Pvt Ltd usable as the first real tenant.

### Target Actionables

- A-01 Deploy latest verified build to production.
- A-02 Verify create-account success state.
- A-03 Verify live login flow.
- A-04 Verify logout flow.
- A-05 Verify password reset flow.
- A-06 Verify Tenant 0 organization provisioning.
- A-07 Verify profile creation and editing.
- A-09 Verify role assignment.

### Required Work

1. Audit current auth, onboarding, profile, tenant creation, and role-assignment implementation.
2. Fix only issues that block Tenant 0 onboarding.
3. Ensure create-account UX has a visible success state.
4. Ensure login, logout, session persistence, and protected routes work.
5. Ensure password reset path is reachable and verifiable.
6. Ensure Triaxis Ventures Pvt Ltd can exist as Tenant 0.
7. Ensure an admin profile can be created/edited.
8. Ensure role assignment works and the UI respects role state.
9. Remove raw technical error copy from these flows.
10. Capture live or local verification evidence.

### Verification

Run:

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```

Add focused tests if needed for auth, onboarding, protected routes, profile, and role assignment.

### Required Documentation Updates

Update:

- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md`
- `docs/readiness/FIVE_SPRINT_ROADMAP_TO_QA3.md`
- `docs/readiness/SPRINT_CHECKLISTS_TO_QA3.md`
- `docs/readiness/QA3_READINESS_KANBAN.md`

Create:

- `docs/readiness/SPRINT_1_TENANT_0_PRODUCTION_ACTIVATION_CLOSEOUT.md`

### Exit Criteria

Sprint 1 is closed only if Triaxis Ventures can sign up/sign in to its tenant, manage a basic user profile, and access protected workspaces without backend errors.

---

## Sprint 2 Prompt: Live Golden Path Execution

You are executing Sprint 2 of the QA3 Readiness Execution Program.

Sprint name: Live Golden Path Execution  
Expected readiness delta: +15% to +20%

### Objective

Prove one complete institutional workflow from knowledge ingestion to governed action.

### Target Actionables

- A-12 Verify document upload or import.
- A-13 Verify RAG answer with citations.
- A-15 Verify AI Review Inbox approval.
- A-16 Verify approved AI output creates real work.
- A-17 Verify dashboard updates after workflow.
- A-18 Verify audit log updates after workflow.
- A-19 Verify timeline evidence updates.

### Required Work

1. Audit document upload/import, knowledge ingestion, RAG, AI Review Inbox, task/project/approval creation, dashboard updates, audit logs, and timelines.
2. Ensure a tenant user can upload or import a real document.
3. Ensure the document is available for tenant-scoped knowledge retrieval.
4. Ensure AXXESS can answer a document-grounded question with citations.
5. Ensure sources used are visible.
6. Ensure an answer enters AI Review Inbox.
7. Ensure reviewer can approve, reject, or edit the answer.
8. Ensure approved output can create a task, project update, approval request, stakeholder note, or meeting follow-up.
9. Ensure dashboard updates after the workflow.
10. Ensure audit log and timeline evidence update.

### Verification

Run:

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```

Add or update focused tests for document ingestion, RAG citations, review approval, work creation, audit log, and timeline updates.

### Required Documentation Updates

Update:

- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md`
- `docs/readiness/FIVE_SPRINT_ROADMAP_TO_QA3.md`
- `docs/readiness/SPRINT_CHECKLISTS_TO_QA3.md`
- `docs/readiness/QA3_READINESS_KANBAN.md`

Create:

- `docs/readiness/SPRINT_2_LIVE_GOLDEN_PATH_EXECUTION_CLOSEOUT.md`

### Exit Criteria

Sprint 2 is closed only if a real user can complete:

Document upload -> ask AXXESS -> review cited answer -> approve -> create work -> see dashboard, audit log, and timeline update.

---

## Sprint 3 Prompt: Two-Tenant Isolation and Permission Proof

You are executing Sprint 3 of the QA3 Readiness Execution Program.

Sprint name: Two-Tenant Isolation and Permission Proof  
Expected readiness delta: +15% to +20%

### Objective

Prove that AXXESS is safe for more than one organization.

### Target Actionables

- A-08 Verify user invitation flow.
- A-09 Verify role assignment.
- A-10 Run two-tenant isolation harness against real DB.
- A-11 Manually verify two-tenant UI isolation.
- A-14 Verify permission-aware retrieval.
- A-18 Verify audit log updates after workflow.

### Required Work

1. Audit tenancy, RLS, tenant-scoped repositories, API session handling, invitation flow, and permission-aware RAG.
2. Create or verify Tenant A and Tenant B.
3. Verify Tenant A cannot see Tenant B projects, documents, tasks, approvals, dashboards, timelines, audit logs, or AI results.
4. Run the two-tenant isolation harness against a real DB where available.
5. If a real DB is not available, document the blocker and preserve the harness for the next live run.
6. Verify user invitation flow.
7. Verify role-specific access for admin, manager, employee, and guest.
8. Verify unauthorized states show safe user-facing copy.
9. Verify permission-aware retrieval blocks restricted documents.
10. Write audit events for permission-sensitive actions where missing.

### Verification

Run:

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```

Add or update tests for tenant isolation, role permissions, invitation flow, and permission-aware retrieval.

### Required Documentation Updates

Update:

- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md`
- `docs/readiness/FIVE_SPRINT_ROADMAP_TO_QA3.md`
- `docs/readiness/SPRINT_CHECKLISTS_TO_QA3.md`
- `docs/readiness/QA3_READINESS_KANBAN.md`

Create:

- `docs/readiness/SPRINT_3_TWO_TENANT_ISOLATION_PERMISSION_PROOF_CLOSEOUT.md`

### Exit Criteria

Sprint 3 is closed only if two tenants can exist simultaneously with no visible, API-level, or RAG-level data leakage.

---

## Sprint 4 Prompt: Integrations, Analytics, and Operational Evidence

You are executing Sprint 4 of the QA3 Readiness Execution Program.

Sprint name: Integrations, Analytics, and Operational Evidence  
Expected readiness delta: +12% to +18%

### Objective

Move AXXESS from product-functional to operator-visible.

### Target Actionables

- A-18 Verify audit log updates after workflow.
- A-19 Verify timeline evidence updates.
- A-20 Verify dashboard request deduplication.
- A-21 Verify Gmail/Microsoft OAuth readiness.
- A-22 Verify analytics event minimum.
- A-25 Produce QA3-ready evidence package.

### Required Work

1. Audit integrations, analytics, audit exports, timelines, dashboard data fetching, and QA evidence structure.
2. Verify or fix dashboard request deduplication.
3. Verify Gmail OAuth app readiness or document exact missing provider requirements.
4. Verify Microsoft OAuth app readiness or document exact missing provider requirements.
5. Verify selected-message import path or document exact blocker.
6. Define and verify at least 15 core analytics events across onboarding, auth, document ingestion, RAG, review, work creation, dashboard, audit, and integration actions.
7. Verify Mixpanel capture where configured.
8. Verify PostHog capture where configured.
9. Expand audit/timeline evidence beyond projects where missing.
10. Create QA3 evidence package structure.

### Verification

Run:

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```

Add or update tests for analytics events, dashboard request deduplication, integration status states, audit export, and timeline evidence.

### Required Documentation Updates

Update:

- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md`
- `docs/readiness/FIVE_SPRINT_ROADMAP_TO_QA3.md`
- `docs/readiness/SPRINT_CHECKLISTS_TO_QA3.md`
- `docs/readiness/QA3_READINESS_KANBAN.md`

Create:

- `docs/readiness/SPRINT_4_INTEGRATIONS_ANALYTICS_OPERATIONAL_EVIDENCE_CLOSEOUT.md`

### Exit Criteria

Sprint 4 is closed only if analytics, integration readiness, audit evidence, and operational monitoring are visible enough for serious pilot review.

---

## Sprint 5 Prompt: Mobile Readiness, Release Gates, and QA3 Preparation

You are executing Sprint 5 of the QA3 Readiness Execution Program.

Sprint name: Mobile Readiness, Release Gates, and QA3 Preparation  
Expected readiness delta: +10% to +15%

### Objective

Prepare the product for QA3 and validate mobile release readiness.

### Target Actionables

- A-01 Deploy latest verified build to production.
- A-22 Verify analytics event minimum.
- A-23 Verify Android signed build path.
- A-24 Verify iOS build/TestFlight path.
- A-25 Produce QA3-ready evidence package.

### Required Work

1. Audit Android build, signing, store-readiness, release notes, and artifact generation.
2. Verify Android signed build path or document exact missing credential/blocker.
3. Audit iOS build, signing, TestFlight, App Store Connect setup, and Apple credential requirements.
4. Verify iOS build/TestFlight path or document exact missing Apple credential/review blocker.
5. Verify mobile analytics plan and event taxonomy.
6. Confirm production deployment is current.
7. Complete QA3 evidence package.
8. Review all A-01 to A-25 actionables and update status/confidence.
9. Prepare QA3 trigger notice for founder HITL approval.

### Verification

Run:

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```

Run relevant mobile validation/build commands where possible and document exact results.

### Required Documentation Updates

Update:

- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md`
- `docs/readiness/FIVE_SPRINT_ROADMAP_TO_QA3.md`
- `docs/readiness/SPRINT_CHECKLISTS_TO_QA3.md`
- `docs/readiness/QA3_READINESS_KANBAN.md`

Create:

- `docs/readiness/SPRINT_5_MOBILE_RELEASE_GATES_QA3_PREPARATION_CLOSEOUT.md`

### Exit Criteria

Sprint 5 is closed only if all Sprint 5 checklist items are `Yes` or explicitly `Blocked`, all A-01 to A-25 actionables are reviewed, and QA3 evidence is ready.

If Sprint 5 closes, explicitly notify the founder:

**QA3 is now mandatory. Conduct QA3: Exhaustive Beta Readiness Audit before claiming Enterprise Beta 1.0 market readiness.**
