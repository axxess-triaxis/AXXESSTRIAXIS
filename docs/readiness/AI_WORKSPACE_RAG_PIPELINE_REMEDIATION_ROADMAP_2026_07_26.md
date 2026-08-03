# AI Workspace / RAG Pipeline Remediation Roadmap

Date created: 2026-07-26  
Source analysis: `docs/readiness/AI_WORKSPACE_RAG_PIPELINE_GAP_ANALYSIS_2026_07_26.md`  
Objective: Convert the governed RAG pipeline from mechanically promising but answer-quality-unproven into a credible real-document workflow.

## Target Outcome

After remediation, a real Tenant 0 user should be able to:

1. Upload a document in Knowledge Hub.
2. Select that uploaded document for governed indexing.
3. Remove/archive stale placeholder indexed content.
4. Ask a question about the real document.
5. Receive a cited answer reflecting the document content.
6. Send the answer into AI Review Inbox.
7. Approve/create work from that answer.
8. Preserve audit/timeline evidence.

## Sprint Structure

This roadmap should run in two tightly scoped sprints.

## Sprint RAG-1: Source Integrity and Knowledge Hub-to-Index Path

**Status: Closed.** See `docs/readiness/RAG_REMEDIATION_SPRINT_1_SOURCE_INTEGRITY_CLOSEOUT_2026_07_26.md` and `AI_WORKSPACE_RAG_PIPELINE_REMEDIATION_CHECKLIST_2026_07_26.md` for full evidence. Per this sprint's own non-negotiables, RAG-2 has not been started.

Goal:

Fix the source integrity problem first.

### Actionables

| ID | Action | Acceptance Criteria |
|---|---|---|
| RAG1-01 | Locate indexed stale `Pitch deck` / `Tenant 0 dummy data` record | Exact source identified |
| RAG1-02 | Remove, archive, or clearly exclude stale placeholder from live RAG retrieval | Live retrieval no longer uses stale dummy content |
| RAG1-03 | Add Knowledge Hub document selection for indexing | User can select an uploaded Knowledge Hub document for governed indexing |
| RAG1-04 | Keep indexing HITL-triggered | No automatic bulk-indexing of every upload |
| RAG1-05 | Preserve tenant and permission metadata | Indexed chunks retain organization/department/visibility context |
| RAG1-06 | Add tests for Knowledge Hub to indexing path | Tests cover document selection and metadata propagation |

### Exit Criteria

RAG-1 closes only if:

- Stale placeholder is removed/excluded.
- A real uploaded Knowledge Hub document can be selected for indexing.
- Indexing preserves tenant/permission metadata.
- Tests and build pass.

## Sprint RAG-2: Answer Quality, Review Flow, and Navigation Fixes

**Status: Closed, with one item explicitly not claimed resolved.** See `docs/readiness/RAG_REMEDIATION_SPRINT_2_ANSWER_QUALITY_CLOSEOUT_2026_07_26.md`. Confidence explainability (A-56), review-to-work fidelity (A-63), and the A-64/A-59 navigation bugs are done. A-55/A-13 (real document answer quality, live-confirmed) remain not-yet-provable from this environment -- see the closeout's required HITL retest steps.

Goal:

Prove whether answer quality is fixed once real content is indexed, then address navigation/workflow correctness.

### Actionables

| ID | Action | Acceptance Criteria |
|---|---|---|
| RAG2-01 | Re-run real document query after RAG-1 | Answer reflects real document content or generator gap is proven |
| RAG2-02 | Investigate answer generation path | Determine whether generation synthesizes chunks or templates query |
| RAG2-03 | Document confidence score computation | Confidence source becomes explainable to user/reviewer |
| RAG2-04 | Verify AI Review Inbox carries answer content into task/approval | Created work item includes answer/context/citation where expected |
| RAG2-05 | Fix `Ask AI Workspace` misroute | Routes to AI Workspace |
| RAG2-06 | Fix `Review Approval Queue` misroute | Routes to correct approval/review queue |
| RAG2-07 | Check escalate-to-CRM visible flow | CRM path either works or is honestly deferred |
| RAG2-08 | Fix feedback notification requirement | `Send Feedback` notification path to `[FEEDBACK_ROUTING_EMAIL_MASKED]` configured or blocker documented |

### Exit Criteria

RAG-2 closes only if:

- A real document query produces a credible cited answer, or the precise generator blocker is documented.
- Misrouted navigation is fixed.
- Review-to-work content carryover is verified.
- Confidence computation is documented.
- Tests and build pass.

## Lower-Priority Follow-Ups

| ID | Item | Reason |
|---|---|---|
| A-58 | CRM fake Influence/Engagement defaults | Misleading but not core RAG blocker |
| A-60 | Approvals `Export Report` dead button | Low urgency |
| A-57 | CRM escalation visible flow | Important, but after source/answer quality |

## Success Criteria

This remediation program is successful only if:

- `A-61` is closed or substantially resolved.
- `A-62` is closed.
- `A-55` is reclassified based on real diagnostic evidence.
- `A-13` can move closer to `Yes` because the answer content quality is proven or the remaining blocker is specific.

## Sprint RAG-3: Workflow Polish, Feedback Routing and Pilot-Ready RAG Evidence

**Status: Closed.** Added 2026-07-26 to pick up this roadmap's own "Lower-Priority Follow-Ups" (A-58, A-60, A-57) plus A-65, and to package a final pilot-ready evidence summary. See `docs/readiness/RAG_REMEDIATION_SPRINT_3_WORKFLOW_POLISH_CLOSEOUT_2026_07_26.md` and `docs/readiness/RAG_REMEDIATION_FINAL_EVIDENCE_PACKAGE_2026_07_26.md`.

Goal:

Convert the pipeline from "technically improved" into "pilot-reviewable" -- close the AI Review Inbox-to-CRM visibility gap, stop fabricating relationship intelligence on new contacts, make Approvals Export Report real, route beta feedback toward `[FEEDBACK_ROUTING_EMAIL_MASKED]`, and reconfirm A-55/A-56/A-61/A-62/A-63 after Sprints 1-2.

### Actionables

| ID | Action | Acceptance Criteria |
|---|---|---|
| RAG3-01 | Fix A-57 AI Review Inbox to CRM handoff | Approved "Create Stakeholder Note" review is visible in Stakeholders & CRM |
| RAG3-02 | Fix A-58 fake CRM auto-population | Live contact creation no longer fabricates Influence/Engagement |
| RAG3-03 | Fix A-60 Approvals Export Report | Real tenant-scoped export with audit event, or honestly disabled |
| RAG3-04 | Fix A-65 feedback routing | Feedback routed/configured toward `[FEEDBACK_ROUTING_EMAIL_MASKED]`, never silently dropped |
| RAG3-05 | Package final RAG remediation evidence | A-55 through A-65 status table with evidence chain and HITL validation script |

### Exit Criteria

RAG-3 closes only if:

- AI Review Inbox to CRM handoff is real or honestly scoped.
- CRM contact creation no longer creates fake live-tenant intelligence.
- Approvals Export Report is real or honestly disabled.
- Feedback is persisted and routed/configured toward `[FEEDBACK_ROUTING_EMAIL_MASKED]`.
- A final RAG remediation evidence package exists.
- Tests and build pass.

