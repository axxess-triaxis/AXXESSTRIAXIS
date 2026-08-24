# Execution Queue — Post-2026-08-01

## Purpose

This is the parent tracker for all remaining founder-led defects and partial items as of 2026-08-01. It exists to provide a single, authoritative execution queue that links each open or partial item to a swimlane, defines acceptance criteria, specifies ordering, and states the sign-off requirements for closure.

This document closes GitHub issue [axxess-triaxis/AXXESSTRIAXIS#160].

Related documents:

```text
docs/FOUNDER_BUG_CLOSURE_LEDGER_2026_08_01.md   (full 65-item founder-reviewed ledger, all dispositions)
```

---

## Overall Acceptance Criteria (Parent)

- [ ] Child issues exist for each swimlane item and are linked as sub-issues.
- [ ] P0 exposure items have a mitigation plan and a permanent fix plan.
- [ ] SMTP path has one validated production delivery pipeline and a test matrix covering all five symptoms (A-05, A-08, A-35, A-65, A-74).
- [ ] Infra key rotation issue (A-67) includes rotation proof and post-rotation health checks.
- [ ] Partial items (A-41, #58, #62) include explicit HITL sign-off evidence.
- [ ] Parent closes only when all children are closed with verification evidence.

---

## Swimlane 1 — P0 Live Exposure

These items are real, currently-live defects. They are not documentation gaps.

### A-30: Role-permission schema visible to all viewers on live (urgent)

| Field | Detail |
|---|---|
| **Severity** | P0 |
| **Status** | Open — unresolved on live |
| **Root cause** | Role-scoped view logic fixed in repo 07-28 but fix is not reflected on live |
| **Fix scope** | Confirm role-scoped rendering is deployed to production; verify with viewer-role session that schema is hidden |
| **Acceptance criteria** | A viewer-role session cannot see the full 6-role permission schema; verified with screen recording or HITL sign-off |
| **Closure evidence required** | Production deployment confirmation + founder HITL sign-off |

### A-29: Security tab "Configure" buttons dead

| Field | Detail |
|---|---|
| **Severity** | P1 |
| **Status** | Open — buttons are `disabled` with no plan to re-enable |
| **Root cause** | Security configuration UI is not implemented; buttons were made honestly `disabled` 07-28 as a temporary state |
| **Fix scope** | Either implement the configuration flow behind each button, or document the intended timeline for implementation and add a clear "coming soon" state visible to users |
| **Acceptance criteria** | No dead button exists without either functional behaviour or an explicit, user-facing "coming soon" label |
| **Closure evidence required** | Founder decision on timeline + either code change or copy change verified in production |

---

## Swimlane 2 — SMTP Dependency Epic

Single root cause, multiple symptoms. These are **not** five independent defects — they share one unresolved infrastructure dependency. Closing the SMTP delivery path closes all five.

### Shared Root Cause

No validated, production-tested SMTP delivery pipeline exists. The provider was switched on 07-29 (after A-02's HITL verification), and none of the following have been retested against the current provider.

### Items in This Epic

| ID | Symptom | Prior status |
|---|---|---|
| A-05 | Password reset email never arrives | Code-only, 65% confidence |
| A-08 | Invitation emails arrive ~50% of the time | ~50% resolved; SMTP trigger/delivery chain remains |
| A-35 | "Submit Feedback" has no destination inbox | Still not routing to mail |
| A-65 | Feedback-to-inbox delivery unconfirmed | Unconfirmed |
| A-74 | Password recovery broken post-provider-switch | Blocked by provider switch |

### Acceptance Criteria for This Epic

- [ ] SMTP provider (Resend, Elastic Mail, or equivalent) is configured and confirmed active in the production environment.
- [ ] End-to-end delivery is verified for each of the five symptoms: password reset, invitation, feedback routing, feedback-to-inbox, and password recovery.
- [ ] Test matrix exists with at least one recorded send + delivery confirmation per symptom.
- [ ] A-02 (signup success confirmation) is also retested post-provider-change and signed off.

### Closure Evidence Required

- Production SMTP provider configuration reference (no secrets in repo)
- Delivery log or screenshot for each symptom
- Founder HITL sign-off on at least one full send-to-inbox flow per symptom

---

## Swimlane 3 — Infra Action

### A-67: Production service-role key invalid JWT; requires rotation and redeploy validation

| Field | Detail |
|---|---|
| **Severity** | P1 |
| **Status** | Open — no rotation evidence found in repo |
| **Root cause** | Service-role key is invalid (expired or misconfigured JWT) in the production environment |
| **Fix scope** | Rotate the service-role key in Supabase, update the corresponding secret in Vercel/deployment environment, and redeploy |
| **Acceptance criteria** | (1) New key is active. (2) All API routes that depend on the service-role key return non-401 responses. (3) Post-rotation health check passes. |
| **Closure evidence required** | Rotation confirmation (key reference only, no secret value in repo) + health-check output + deployment ID |

---

## Swimlane 4 — Partials / Sign-off Pending

### A-41: Golden Path routing (90%)

| Field | Detail |
|---|---|
| **Status** | Partial — 90% complete |
| **What remains** | A full HITL walk-through of every Golden Path step, confirming green-tick on each stage |
| **Acceptance criteria** | Founder completes end-to-end Golden Path in production; every step shows a green completion indicator; screen recording or written HITL sign-off is recorded |
| **Closure evidence required** | Founder HITL sign-off with explicit green-tick confirmation per step |

### #58 / A-72: Golden Path checklist auto-ticking (50%)

| Field | Detail |
|---|---|
| **Status** | Partial — 50% complete |
| **What remains** | Auto-tick logic for the remaining checklist steps needs implementation and integration test coverage |
| **Acceptance criteria** | Each Golden Path step auto-ticks when the corresponding action is completed by a real tenant user; verified in integration test and in a live session |
| **Closure evidence required** | Code + integration test passing + founder HITL confirmation of auto-tick in production |

### #62 / A-71: OpenAI/RAG synthesized-answer live walkthrough (80%)

| Field | Detail |
|---|---|
| **Status** | Partial — 80% complete |
| **What remains** | Full live HITL walkthrough of the synthesized-answer flow from document ingestion through cited answer display has not been recorded |
| **Acceptance criteria** | Founder (or designated tester) uploads a document, asks a question, receives a cited synthesized answer, and confirms the output is accurate and traceable to the source |
| **Closure evidence required** | Founder HITL sign-off with specific question, cited answer, and source document reference |

### A-02: Signup success confirmation retest post-SMTP-provider-change

| Field | Detail |
|---|---|
| **Status** | Pending retest |
| **What remains** | A-02 was verified live 07-25, but the SMTP provider was changed 07-29; the confirmation email flow needs a fresh end-to-end test under the current provider |
| **Acceptance criteria** | New user signup triggers a confirmation email that arrives within a reasonable time; confirmed in production with the current SMTP provider |
| **Closure evidence required** | Delivery confirmation + founder HITL sign-off post-provider-change |

---

## Ordering and Dependencies

```
SMTP Epic (Swimlane 2)
  └── Must be completed before A-02 retest can close
  └── Unblocks A-05, A-08, A-35, A-65, A-74

A-67 key rotation (Swimlane 3)
  └── Independent; can be executed in parallel with SMTP Epic

A-30 live exposure (Swimlane 1)
  └── P0 — should be addressed first or in parallel with A-67
  └── Independent of SMTP

A-29 (Swimlane 1)
  └── Can follow A-30; lower urgency

Partials (Swimlane 4)
  └── A-41 and #62 can proceed independently
  └── #58 auto-tick logic can proceed in parallel
  └── A-02 retest depends on SMTP Epic completion
```

---

## Evidence and Closure Standard

Each child item must include:

1. **Root cause** — what was broken and why
2. **Fix scope** — what changed (code, config, copy, or process)
3. **Test/verification steps** — how to confirm the fix works
4. **Production verification notes** — what was observed on live
5. **Closure statement** — explicitly states whether evidence is repo-verified, founder-confirmed, or both, and references the specific evidence (commit hash, deployment ID, HITL sign-off date)

Founder attestation and independently-verified repo evidence are both real evidence, but not the same kind. The closure statement must specify which type is cited.

---

## Sign-off Requirements

| Swimlane | Who signs off | Evidence type |
|---|---|---|
| P0 Live Exposure | Founder (HITL) | Production session verification |
| SMTP Dependency Epic | Founder (HITL) + repo evidence | Delivery logs + deployment config reference |
| Infra Key Rotation | Repo evidence | Rotation confirmation + health-check output |
| Partials | Founder (HITL) | Per-step sign-off as described above |

**Parent issue closes only when all children are closed with the above verification evidence recorded.**
