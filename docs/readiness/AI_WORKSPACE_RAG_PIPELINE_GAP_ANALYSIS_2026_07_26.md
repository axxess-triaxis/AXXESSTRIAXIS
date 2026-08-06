# AI Workspace / RAG Pipeline Gap Analysis

Date documented: 2026-07-26  
Walkthrough date: 2026-07-25  
Source: Live HITL walkthrough of AI Workspace, AI Review Inbox, Knowledge Hub, Documents & Files, Tasks & Workflow, Stakeholders & CRM, Approvals & Governance, Social Alerts, Analytics & Reports, and Settings on production  
Scope: AI Workspace, governed RAG, Knowledge Hub indexing, AI Review Inbox, review-to-work workflows, and related navigation/configuration gaps  
Status: Evidence log and remediation analysis only. No code changed by this document.

**2026-08-06 status note:** this document is left as-is below, frozen at its original 2026-07-26
state, as the evidence record of what the live walkthrough found. The central finding below --
"RAG answer quality is not yet confirmed working" (A-55/A-61/A-62) -- was subsequently addressed by
RAG Remediation Sprints 1-3 (`RAG_REMEDIATION_SPRINT_1_SOURCE_INTEGRITY_CLOSEOUT_2026_07_26.md`,
`RAG_REMEDIATION_SPRINT_2_ANSWER_QUALITY_CLOSEOUT_2026_07_26.md`,
`RAG_REMEDIATION_SPRINT_3_WORKFLOW_POLISH_CLOSEOUT_2026_07_26.md`), which fixed the stale-document
source-integrity issue, proved the answer generator is not a stub (real embeddings), and made
confidence explainable. Per `docs/MARKET_TO_PRODUCT_EVIDENCE_LEDGER.md`'s own status on this same
finding: "Code shipped and unit-tested across all three sprints ... live production re-query,
CRM-visibility confirmation, export confirmation, and email-delivery confirmation by the HITL not
yet performed in this environment" -- i.e. code-level remediation is verified, a fresh live-production
re-walkthrough confirming it from the founder's side has not been logged in this repository as of
this note.

## Why This Matters

The AI Review Inbox and governed RAG pipeline are the core differentiators of AXXESS TRIaxis.

The product positioning is governance-native, human-in-the-loop institutional AI. This walkthrough is therefore materially important because it exercised the full AI/RAG/review workflow on a real tenant with real uploaded documents, rather than only through isolated code review or demo data.

The finding is mixed and precise:

- Governance mechanics are real and working in important places.
- Answer quality is not yet confirmed working.
- The likely cause is not necessarily fake answer generation; it may be that the RAG system is faithfully answering from a stale placeholder indexed document.

This distinction matters. It changes the fix sequence.

## What Is Verified Working

These capabilities should not be re-investigated unless later regressions appear.

| Capability | Evidence |
|---|---|
| AI Review Inbox 5-option HITL decision workflow | Real `Create Task` plus `Approve and Create` on a real pending review produced a real task visible in Tasks & Workflow, with real audit trail `Audit 26d722e1`, actor Super Admin, and real timestamps in the Review-to-work timeline |
| Five workflow-destination options route to their own workspaces | `Create Task`, `Create approval request`, `Create Project Update`, `Create Stakeholder note`, and `Create meeting follow up` each route to distinct workspaces with their own workflows |
| Honest zero-confidence state for unanswerable query | Query `Hi` produced 0% confidence and `No authorized institutional source matched this question`; founder explicitly called this accurate |
| Task completion UI | Ticking a task marks it `Completed` with strikethrough; task detail view shows status, priority, assignee, and due-date fields |
| Knowledge Hub upload | Three real PDFs uploaded successfully: Triaxis Ventures Readme 2, Beta Feedback Default Report, and Triaxis Ventures pitch deck |
| Social Alerts provider-gating | Founder explicitly confirmed provider gating is fine for now |
| Analytics & Reports honest placeholder | Founder explicitly confirmed this is fine for now |

## Central Finding

The central problem is **RAG answer quality is not yet confirmed working**.

Three actionables describe one connected chain:

- `A-61`: No practical way to select an already-uploaded Knowledge Hub document for indexing in Documents & Files.
- `A-62`: A stale placeholder document remains in the live RAG index.
- `A-55`: RAG answers return a templated/dummy-pattern response.

These should be treated as one root-cause chain, not three unrelated bugs.

## Root-Cause Chain

### Step 1: Real document upload happened in Knowledge Hub

The founder uploaded a real 30-page pitch deck to Knowledge Hub.

However, that uploaded document did not appear as a selectable candidate for indexing in Documents & Files.

Current indexing path:

- A paste-only `governable text` box.

Problem:

- Pasting a 30-page pitch deck is not a realistic workflow.

Founder-specified fix:

- Add a HITL-triggered option to select from an already-uploaded Knowledge Hub document for indexing.
- Do not automatically bulk-index every upload.

### Step 2: Only stale placeholder content was actually indexed

Because Knowledge Hub documents cannot be selected for indexing, the only indexed governed-retrieval document appears to be a stale `Pitch deck` entry from 2026-07-24.

Its content is placeholder text:

> Tenant 0 dummy data

Founder judgement:

> Redundant, supposed to go.

### Step 3: RAG answers reflect the stale indexed source

During the walkthrough, RAG answers followed this pattern:

> Based on the authorized tenant sources, Tenant 0 dummy data. The strongest evidence relates to [echoed query keywords].

This could mean:

1. The RAG retrieval/citation mechanism is working correctly but only has a dummy indexed source available; or
2. The answer generator is templated and does not truly synthesize from indexed content.

This document does **not** assert which hypothesis is correct.

## Diagnostic Recommendation

Recommended first diagnostic sequence:

1. Remove or archive the stale placeholder indexed entry (`A-62`).
2. Index the real pitch deck through whatever path exists today, even if the paste-text route is inconvenient.
3. Re-run the same `Summarize [document]` query.
4. Compare the answer.

Expected interpretation:

- If the answer changes and reflects real pitch-deck content, `A-55` is primarily an indexing/source-content problem.
- If the answer remains templated/dummy-pattern despite real indexed content, `A-55` is an answer-generation problem.

If the first outcome occurs, `A-61` becomes the highest-priority fix.

## New Actionables From This Walkthrough

| ID | Summary | Priority |
|---|---|---|
| A-55 | RAG answers return templated/dummy-pattern text | High |
| A-56 | Confidence score computation is an opaque black box | Medium |
| A-57 | AI Review Inbox escalate-to-CRM path does not visibly flow | Medium |
| A-58 | CRM `Create Contact` auto-populates fake Influence/Engagement | Low-Medium |
| A-59 | `Review Approval Queue` routes to the wrong screen | Medium |
| A-60 | `Export Report` in Approvals & Governance is a dead button | Low |
| A-61 | No way to select a Knowledge Hub document for indexing except pasting full text | High |
| A-62 | Stale placeholder document remains in live RAG index | High |
| A-63 | Unclear if `Create Task/Approval from Answer` carries the answer content | Medium |
| A-64 | `Ask AI Workspace` routes to Tasks & Workflow, not AI Workspace | Medium |
| A-65 | `Send Feedback` should notify `[FEEDBACK_ROUTING_EMAIL_MASKED]` | Medium |

## Reconfirmed Earlier Actionables

These were reconfirmed in the same-day second pass and are already tracked.

| ID | Finding |
|---|---|
| A-08 | Invitation emails still not delivered; now blocks Tenant 0 to Tenant 0.5 cross-tenant testing |
| A-28 | Organization tab still shows investor-demo dataset on Tenant 0 real Settings |
| A-29 | Security tab's six `Configure` buttons still dead-end |
| A-30 | Permission Matrix still discloses all six roles' full capability schema to any viewer |
| A-31 | AI Configuration tab still fully static/placeholder |
| A-13 | RAG answer with citations remains blocked: citation/confidence/review UI mechanics are real, but answer-content quality remains unresolved |

## Sequencing Recommendation

Recommended order:

1. `A-62`: Remove stale placeholder indexed document.
2. `A-61`: Build Knowledge Hub document selection for indexing.
3. `A-55`: Re-test answer quality after real document indexing.
4. `A-08`: Fix invitation email delivery because it blocks cross-tenant testing.
5. `A-64` and `A-59`: Fix small navigation misroutes.
6. `A-56`, `A-57`, `A-58`, `A-60`, `A-63`, `A-65`: Investigate or fix after the core RAG source chain is corrected.

## What This Document Does Not Claim

This document does not claim:

- That RAG answer generation is fake.
- That the retrieval/citation mechanism is broken.
- That the AI Review Inbox is broken.
- That the review-to-work workflow is broken.
- That the product has achieved Enterprise Beta 1.0 readiness.

This document claims only:

- The governance/review mechanics are materially working.
- RAG answer quality is not yet proven.
- The stale indexed placeholder and missing Knowledge Hub-to-index selection path are the most likely immediate blockers.

## Evidence Sources

All findings are sourced from the HITL's reported production walkthrough on 2026-07-25 and the corresponding actionables in:

- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md`
- `docs/readiness/QA3_READINESS_KANBAN.md`
- `docs/readiness/GOLDEN_PATH_COMPLETION_KANBAN_2026_07_25.md`

This document adds synthesis and sequencing only. It does not add new factual claims beyond that walkthrough evidence.

