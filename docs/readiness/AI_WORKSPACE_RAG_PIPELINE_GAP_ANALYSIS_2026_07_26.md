# AI Workspace / RAG Pipeline -- Gap Analysis

Date: 2026-07-26 (documenting a live HITL walkthrough conducted 2026-07-25)
Source: full HITL live walkthrough of AI Workspace, AI Review Inbox, Knowledge Hub, Documents &
Files, Tasks & Workflow, Stakeholders & CRM, Approvals & Governance, Social Alerts, Analytics &
Reports, and Settings (Organization/Security/Integrations/Users/Permissions/AI Configuration) on
production, 2026-07-25. Findings recorded verbatim where quoted, not paraphrased into a softer claim,
matching this program's standing practice (see `docs/readiness/GOLDEN_PATH_COMPLETION_KANBAN_2026_07_25.md`
for the prior walkthrough using the same discipline). New actionables logged as A-55 through A-65 in
`docs/readiness/ACTIONABLES_READINESS_MATRIX.md` and `docs/readiness/QA3_READINESS_KANBAN.md`; this
document is a purpose-built synthesis over that same evidence, not a separate source of truth.
**No code has been changed as part of this walkthrough or this document -- log only.**

## Why This Matters

The AI Review Inbox and governed RAG pipeline are the core differentiator this program has staked
the product on -- "governance-native, human-in-the-loop" AI, per `README.md`'s own opening line. This
walkthrough is the first time a HITL has exercised the full pipeline end to end on a real tenant with
real uploaded documents, rather than in isolated code review or against demo data. The result is
genuinely mixed: the **governance mechanics** (citations, confidence display, human-review gating,
the 5-way decision workflow, audit trail) are confirmed real and working. The **answer quality**
(does the AI actually read and summarize the real document you uploaded) is not yet confirmed working,
and the walkthrough surfaced a specific, plausible root cause rather than leaving it a mystery.

## What's Verified Working (Do Not Re-Investigate)

| Capability | Evidence |
|---|---|
| AI Review Inbox 5-option HITL decision workflow | Real: "Create Task" + "Approve and Create" on a real pending review produced a real task, visible in Tasks & Workflow, with a real audit trail (`Audit 26d722e1`, actor `Super Admin`, real timestamps) in the Review-to-work timeline |
| 5 workflow-destination options each route to their own real workspace | "Create Task," "Create approval request," "Create Project Update," "Create Stakeholder note," "Create meeting follow up" -- HITL's own words: "Fantastic workflow as each 5 options leads to 5 different workspaces with each having their own workflows" |
| Honest zero-confidence state for an unanswerable query | Query "Hi" correctly produced 0% confidence, "No authorized institutional source matched this question." HITL's own words: "The 0% confidence is great and accurate" |
| Task completion UI | Ticking a task correctly marks it "Completed" with a strikethrough, task detail view shows real status/priority/assignee/due-date fields |
| Knowledge Hub upload | 3 real PDFs uploaded successfully (Triaxis Ventures Readme 2, Beta Feedback Default Report, Triaxis Ventures pitch deck) |
| Social Alerts provider-gating | Founder explicitly confirmed this is fine as-is: "Fine for now as provider gating is for later addressal" |
| Analytics & Reports honest placeholder | Founder explicitly confirmed: "fine for now" |

## The Central Finding: RAG Answer Quality, Not Yet Confirmed Working

Three actionables (A-55, A-61, A-62) describe one connected problem, not three independent bugs.
Stating the chain plainly:

1. **A-61**: the founder uploaded a real 30-page pitch deck to Knowledge Hub, but it never appeared
   as a selectable candidate for indexing on Documents & Files -- the only indexing input available
   is a "paste governable text" box, impractical for a real document of that length. The founder's
   own proposed fix is specific: add a HITL-triggered "select from an already-uploaded Knowledge Hub
   document" option, explicitly **not** automatic bulk-indexing of every upload.
2. **A-62**: because of (1), the only document actually indexed for governed retrieval is a stale
   "Pitch deck" entry from a day earlier (Jul 24), whose content is literally placeholder text
   ("Tenant 0 dummy data"). The founder flagged this entry itself as "redundant, supposed to go."
3. **A-55**: every RAG query in this walkthrough returned answer text following the same pattern --
   "Based on the authorized tenant sources, Tenant 0 dummy data. The strongest evidence relates to
   [echoed query keywords]." This is consistent with the RAG pipeline correctly citing its only
   available source (the stale placeholder from (2)) -- in which case the citation/retrieval
   mechanism itself may be working exactly as designed, and the "dummy"-looking answers are an
   honest reflection of dummy indexed content, not a sign that answer generation is faked.

**What this analysis does not do:** assert which of the two hypotheses in A-55 is correct. That
requires a code-level read of the answer-generation path (does it call a real model/local synthesis
step against the indexed chunks, or does it template-fill from the query alone regardless of indexed
content?) before scoping a fix. Recommended first step for whoever picks up A-55: remove the stale
entry (A-62), index the real pitch deck through whatever indexing path exists today (even the
inconvenient "paste text" one, as a diagnostic), and re-run the same "Summarize [document]" query --
if the answer changes to reflect real pitch-deck content, A-55's root cause is confirmed as (1) from
the two hypotheses in the actionable, not the response generator itself, and A-61 becomes the real
priority.

## Full Actionable List From This Walkthrough

**New (11):**

| ID | One-line summary | Priority signal |
|---|---|---|
| A-55 | RAG answers return templated/dummy-pattern text | High -- core product mechanic |
| A-56 | Confidence score computation is an opaque "black box" | Medium -- trust/UX |
| A-57 | AI Review Inbox escalate-to-CRM path doesn't visibly flow | Medium -- workflow correctness |
| A-58 | CRM "Create Contact" auto-populates fake Influence/Engagement | Low-Medium -- cosmetic but misleading |
| A-59 | "Review Approval Queue" routes to the wrong screen | Medium -- navigation |
| A-60 | "Export Report" (Approvals & Governance) is a dead button | Low |
| A-61 | No way to select a Knowledge Hub document for indexing except pasting its full text | High -- blocks realistic document use |
| A-62 | Stale placeholder document remains in the live RAG index | High -- directly explains A-55's symptom |
| A-63 | Unclear if "Create Task/Approval from Answer" carries the answer's content | Medium -- needs investigation before judging |
| A-64 | "Ask AI Workspace" routes to Tasks & Workflow, not AI Workspace | Medium -- navigation |
| A-65 | "Send Feedback" should notify triaxisgrp@gmail.com | Medium -- founder-specified requirement, needs config check |

**Re-confirmed from earlier walkthroughs (same-day, second pass -- already tracked, not new):**

| ID | Finding |
|---|---|
| A-08 | Invitation emails still not delivered -- 2 more real invitations sent, neither arrived. Founder has elevated urgency: this now blocks planned Tenant 0 -> Tenant 0.5 cross-tenant testing |
| A-28 | Organization tab still shows the investor-demo dataset (North East Health Mission) on Tenant 0's real Settings |
| A-29 | Security tab's 6 "Configure" buttons still dead ends |
| A-30 | Permission Matrix still discloses all 6 roles' full capability schema to any viewer |
| A-31 | AI Configuration tab still fully static/placeholder |
| -- | Integrations tab error (already logged in a prior session, re-confirmed, no new ID needed) |

**A-13 (Verify RAG answer with citations) evidence updated, status unchanged (`Blocked`):** the
citation/confidence/human-review UI mechanics are now confirmed real; the answer-content quality
gap (A-55) is the reason this stays `Blocked` rather than moving to `Yes`.

## Sequencing Recommendation

1. **A-62 then A-61** -- removing the stale placeholder and building a real Knowledge-Hub-to-index
   path is very likely the fastest way to get a true read on A-55, per the analysis above.
2. **A-55** -- re-assess once (1) is done; may resolve on its own, or may reveal a genuine
   answer-generation gap requiring separate work.
3. **A-08** -- independent, founder-elevated priority (blocks cross-tenant testing).
4. **A-64, A-59** -- small navigation fixes, same family as the ED-1 mis-routed-link fixes already
   closed this session.
5. **A-56, A-57, A-58, A-60, A-63, A-65** -- lower urgency or need-investigation items, sequence
   after the above once the founder authorizes work to begin.

## Evidence

All findings sourced from the HITL's own reported walkthrough, 2026-07-25, recorded verbatim (not
paraphrased into a softer claim) in `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` (A-08, A-13,
A-28 through A-31, A-55 through A-65) and `docs/readiness/QA3_READINESS_KANBAN.md`. This document
adds no new claims beyond that evidence -- it re-sequences it into a connected root-cause analysis
for one specific area (the AI Workspace/RAG pipeline) rather than a flat actionable list.
