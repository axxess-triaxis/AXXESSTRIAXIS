# Five-Sprint Roadmap to QA3

Date created: 2026-07-23  
Purpose: Convert AXXESS into a live, tenant-proven, workflow-proven Enterprise Beta 1.0 candidate.

## Program Objective

Move AXXESS through five readiness sprints ending in a QA3 milestone. Each sprint must create measurable readiness movement and must update the actionables, roadmap, checklist, and Kanban documents.

## Sprint 1: Tenant 0 Production Activation

Expected delta: +15% to +20%

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

### Deliverables

- Production deployment verified.
- Tenant 0 created or verified.
- Founder/admin can create account, log in, log out, reset password, edit profile, and access protected workspaces.
- Role assignment verified.
- Sprint 1 closeout document created.

### Exit Criteria

Sprint 1 is closed only if Triaxis Ventures can sign up/sign in to its tenant, manage a basic user profile, and access protected workspaces without backend errors.

### Sprint 1 Status (2026-07-23, updated 2026-07-24)

**Still not closed, but the central blocker is resolved.** The HITL performed the requested walkthrough on 2026-07-24: **Tenant 0 provisioning succeeded live** -- the first successful provisioning event in this program's history -- along with live-verified login, logout, and role assignment. What remains: A-02 (create-account success state) surfaced a confirmed defect needing a fix, not a HITL action; A-05 (password reset) and A-07 (profile editing, via a broken menu entry point) still lack live proof. The HITL also flagged two new, high-priority defects during the walkthrough -- a broken Investor Preview and a stale, dead-end root-domain landing page -- both explicitly investor-facing concerns. See `docs/readiness/SPRINT_1_TENANT_0_PRODUCTION_ACTIVATION_CLOSEOUT.md` (including its 2026-07-24 Addendum) for full evidence. Recommended: fix A-02 and the two investor-facing defects before starting Sprint 2.

## Sprint 2: Live Golden Path Execution

Expected delta: +15% to +20%

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

### Deliverables

- Document upload/import verified.
- RAG answer with citations verified.
- Review Inbox approval path verified.
- Approved AI output creates a real task, project update, approval, or stakeholder note.
- Dashboard, audit log, and timeline update from the workflow.
- Sprint 2 closeout document created.

### Exit Criteria

Sprint 2 is closed only if a real user can complete:

Document upload -> ask AXXESS -> review cited answer -> approve -> create work -> see dashboard/audit/timeline update.

## Sprint 3: Two-Tenant Isolation and Permission Proof

Expected delta: +15% to +20%

### Objective

Prove that AXXESS is safe for more than one organization.

### Target Actionables

- A-08 Verify user invitation flow.
- A-09 Verify role assignment.
- A-10 Run two-tenant isolation harness against real DB.
- A-11 Manually verify two-tenant UI isolation.
- A-14 Verify permission-aware retrieval.
- A-18 Verify audit log updates after workflow.

### Deliverables

- Tenant A and Tenant B exist.
- UI proves no cross-tenant leakage.
- RAG proves permission-aware and tenant-aware retrieval.
- User invitation and role-based access verified.
- Isolation harness run against real DB or blocked with evidence.
- Sprint 3 closeout document created.

### Exit Criteria

Sprint 3 is closed only if two tenants can exist simultaneously with no visible, API-level, or RAG-level data leakage.

## Sprint 4: Integrations, Analytics, and Operational Evidence

Expected delta: +12% to +18%

### Objective

Move AXXESS from product-functional to operator-visible.

### Target Actionables

- A-18 Verify audit log updates after workflow.
- A-19 Verify timeline evidence updates.
- A-20 Verify dashboard request deduplication.
- A-21 Verify Gmail/Microsoft OAuth readiness.
- A-22 Verify analytics event minimum.
- A-25 Produce QA3-ready evidence package.

### Deliverables

- Dashboard duplicate request issue verified fixed.
- Gmail/Microsoft OAuth readiness verified or blocked with exact provider requirement.
- Mixpanel/PostHog event taxonomy and capture proof created.
- Audit and timeline evidence expanded beyond a single module.
- QA3 evidence package structure created.
- Sprint 4 closeout document created.

### Exit Criteria

Sprint 4 is closed only if analytics, integration readiness, audit evidence, and operational monitoring are visible enough for serious pilot review.

## Sprint 5: Mobile Readiness, Release Gates, and QA3 Preparation

Expected delta: +10% to +15%

### Objective

Prepare the product for QA3 and validate mobile release readiness.

### Target Actionables

- A-01 Deploy latest verified build to production.
- A-22 Verify analytics event minimum.
- A-23 Verify Android signed build path.
- A-24 Verify iOS build/TestFlight path.
- A-25 Produce QA3-ready evidence package.

### Deliverables

- Android signed build path verified or blocked with exact missing credential.
- iOS build/TestFlight path verified or blocked with exact Apple dependency.
- Mobile analytics readiness documented.
- Production deployment current.
- QA3 evidence package completed.
- All A-01 to A-25 actionables reviewed.
- Sprint 5 closeout document created.

### Exit Criteria

Sprint 5 is closed only if all Sprint 5 checklist items are `Yes` or explicitly `Blocked`, all A-01 to A-25 actionables are reviewed, and QA3 evidence is ready.

## Mandatory QA3 Reminder

If Sprint 5 closes under the above criteria, immediately conduct:

**QA3: Exhaustive Beta Readiness Audit**

QA3 must be treated as a formal milestone before claiming Enterprise Beta 1.0 market readiness.

