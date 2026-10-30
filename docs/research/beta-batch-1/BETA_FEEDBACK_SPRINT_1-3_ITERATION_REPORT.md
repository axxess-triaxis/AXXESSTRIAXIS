# Beta User Feedback (n=30, 1,112+ Actionable Data Points) — Product Iteration Sprint 1–3 (Overall Sprint 33–35)

**Source evidence:** `AXXESS by Triaxis Beta User Product Feedback Survey-NPS Report.pdf`, transcribed
in full at `Enterprise_Beta_Feedback_Batch_1.md` (already committed). Study window 7–20 July 2026.
**Purpose:** a single, issue-by-issue ledger tracing every finding in that report to what was
actually shipped across Sprint 1 (overall Sprint 33), Sprint 2 (Sprint 34), and Sprint 3
(Sprint 35) — and, just as importantly, what was **not** addressed and why.
**Companion documents:** `SWOT_Analysis_Batch_1.md` (the intermediate synthesis), `PRE_DEMO_ACTIONABLES.md`
(the 20-item backlog derived from the SWOT), `SPRINT_ROADMAP_PRE_DEMO.md` (sequencing),
`ITERATION_PROGRESS.md` (the append-only build log with full audit trails), and
`PRODUCT_ITERATION_I_CLOSEOUT.md` (the process/merge-status close-out). This document is the
evidence-to-resolution ledger; those documents are the implementation record.

---

## 1. What was measured

- **30 submitted survey records → 28 unique answer sets** after removing 2 clear duplicates (report
  §3.2). **20 unique product-feedback respondents, 8 unique enterprise-feedback respondents** (7
  clearly external to the founding team).
- **NPS:** 80.0 product / 87.5 enterprise / ~85.7 external-enterprise / 82.1 combined (report §2, §6).
- **Survey depth:** 1,236 raw / **1,112 deduplicated instrument-weighted actionable data points**
  (report §2.1) — a measure of instrument depth, not user count or independent validations. This
  is the "1,200+ points" / "1,112+" referenced in this document's title.
- **The central diagnostic finding (report §7.4):** all 3 non-promoters in the product survey
  selected both *slow or unreliable performance* and *unclear product value or use cases* — while
  still naming AI Workspace/model routing as a most-valuable capability. The failure mode was never
  rejection of the product category; it was insufficient reliability and insufficiently clear
  translation from capability to job-to-be-done. This single finding is the reason Sprint 1 exists
  and why it was sequenced first.

## 2. How the 20-actionable backlog traces back to this evidence

`SWOT_Analysis_Batch_1.md` synthesized this report into a SWOT; `PRE_DEMO_ACTIONABLES.md` derived
20 immediately-executable items from it, each tagged to a specific report finding — none are
speculative additions (see that file's own closing section for the full evidence map). This
document goes one level deeper: it starts from the report's own two ranked lists (§7.3 issues
reducing usefulness, §10.1 priority framework) and traces each ranked item forward to its Sprint
1–3 resolution, not the other way around, so nothing in the original report is silently dropped
from view.

## 3. Issue-by-issue resolution ledger (report §7.3, ranked by respondent selection)

| Rank | Issue (report §7.3) | Selections | Share (n=20) | Sprint item(s) | Resolution status |
|---:|---|---:|---:|---|---|
| 1 | Limited integrations | 9 | 45% | A13, A14, A15 | **Substantially addressed.** 2 real, working OAuth connectors shipped (Slack, Calendly) — see §5. Just as important: the underlying catalogue previously implied ~20 working integrations existed (`demoConnector: true` on every entry); A15 corrected that to show only what's genuinely usable. This closes both halves of the original complaint — too few real integrations, and a UI that overstated how many existed. |
| 2 (tie) | AI output quality | 8 | 40% | A4 | **Partially addressed.** Every AI answer now carries a genuine, retrieval-derived rationale and citation count (not a decorative label) — directly answers the report's explainability half of this finding. **Not addressed:** the report's own P0 success criterion for this item was an evaluation suite and reduced critical-error rate (§10.1) — no systematic AI-output evaluation harness was built this iteration. Explainability shipped; measured quality improvement did not. |
| 2 (tie) | Features feel incomplete | 8 | 40% | A3, A7, A18 + 3-round demo-data-leakage hygiene pass | **Substantially addressed, with an important caveat.** The seeded-workspace/3-path onboarding trio makes 3 modules (knowledge/AI, projects/tasks, meetings) genuinely completable end-to-end with real data, not fabricated content. Separately, a 3-round audit (`DEMO_DATA_LEAKAGE_AUDIT.md`) found and fixed systemic fake-data-shown-as-real bugs that would have made *every* module look inconsistently "complete" to different tenants. **Not addressed:** Approvals, Stakeholders/CRM, and Analytics/OKRs have **no live repository at all** — they were made honest (demo-gated) but not made real. "Feels incomplete" is fixed for 3 modules; it is still structurally true for 3 others. |
| 4 | Too many steps or approvals | 7 | 35% | A6 | **Partially addressed.** Bulk-approve for low-risk AI reviews ships, with audit logging preserved per item. **Scope limit, stated honestly:** this addresses one specific workflow (the AI Review Inbox), not workflow friction generally — the report's own success criterion ("reduce steps in top workflow by ≥30%, measure completion rate") was not instrumented or measured against a baseline. |
| 5 (tie) | Unclear product value or use cases | 6 | 30% | A1, A7, A19 | **Substantially addressed.** This is one of the two findings behind every non-promoter response (§7.4) and got the most direct product-level attention: Golden Path made opt-in rather than a forced 8-step checklist (A1), 3 outcome-first onboarding paths replacing one generic flow (A7), and reliability-expectation copy during AI generation (A19). **Not measured:** the report's own success criterion (median first-value time <10 minutes, ≥70% onboarding completion) has no analytics dashboard built to verify it — the mechanisms shipped, the outcome is unmeasured. |
| 5 (tie) | Slow or unreliable performance | 6 | 30% | A5, A19 | **Perception-level mitigation only — the weakest resolution in this ledger, and this is the single most important honest gap in the whole iteration.** A5 adds a 20-second timeout with retry and a loading indicator; A19 adds "usually takes 5-8 seconds" expectation-setting copy. Neither changes actual backend latency or reliability. The report's own P0 success criterion — "≥99.5% successful core actions; documented latency targets; error telemetry live" — was **not attempted this iteration.** This is the other half of the finding behind every non-promoter response, and it remains the least-closed P0 item in this entire ledger. |
| 7 | Difficult onboarding or setup | 4 | 20% | A1, A18, A7 | **Substantially addressed.** Fewer required setup decisions before first AI interaction (A18 — found the backend already treated department/workspace as optional; the frontend was the only thing enforcing them), plus A1/A7 above. |
| 8 | Security or trust concerns | 3 | 15% | *(none)* | **Not addressed this iteration.** No security-documentation or trust-signal work was scoped into Sprint 1–3. This is a genuine, unaddressed gap, not an oversight buried in a footnote. |
| 9 (tie) | Mobile experience | 2 | 10% | *(none)* | **Not addressed.** The report's own P1 item ("release approval-first mobile companion") was correctly sequenced after core web reliability per the report's own guidance ("do not treat mobile as a substitute for web reliability") — but no mobile work happened in Sprint 1–3 regardless. |
| 9 (tie) | User interface or navigation | 2 | 10% | *(incidental only)* | **Not addressed as a dedicated item.** Various UI touches happened as side effects of other work (empty states in A8, role-appropriate landing pages in A20), but no item targeted navigation/UI friction directly. |
| 9 (tie) | Other | 2 | 10% | n/a | Not a specific, actionable signal. |

**Quantified summary of §7.3's 11 ranked issues:** **6 substantially addressed** (limited
integrations, features feel incomplete, unclear value, difficult onboarding, and partial credit on
AI output quality and workflow steps), **1 addressed at the perception layer only, not the root
cause** (slow/unreliable performance — arguably the most consequential gap, since it's one of the
two findings behind every non-promoter response), and **4 not addressed at all** (security/trust,
mobile, UI/navigation, and the non-specific "other" bucket).

## 4. The P0/P1/P2 priority framework (report §10.1) — traced item by item

The report's own priority framework is the most direct blueprint for this iteration. Tracing it
exactly as written:

| Priority | Workstream (report §10.1) | Report's success criterion | What shipped | Criterion actually met? |
|---|---|---|---|---|
| P0 | Reliability and performance | ≥99.5% core-action success; documented latency targets; error telemetry live | A5 (timeout/retry UX), A19 (expectation-setting copy) | **No.** Perception-layer only; no telemetry, no latency targets, no measured success rate. |
| P0 | Use-case clarity and onboarding | Median first-value <10 min; ≥70% onboarding completion | A1, A7, A18, A3 | **Mechanisms shipped; not measured.** No analytics dashboard exists to confirm the time/completion targets. |
| P0 | AI-output quality and explainability | Evaluation suite; answer provenance; visible rationale; reduced critical-error rate | A4 (rationale + citations) | **Partially.** Provenance/rationale shipped; no evaluation suite, no measured error-rate reduction. |
| P0 | Workflow simplification | Reduce steps in top workflow by ≥30%; measure completion rate | A6 (bulk-approve, one workflow only) | **Partially, unmeasured.** Scoped to the AI Review Inbox only, not "the top workflow" broadly, and no before/after step-count or completion-rate measurement was taken. |
| P1 | Core integrations | Deliver 2–3 integrations tied to pilot workflows, not a generic catalogue | A13, A14, A15 | **Yes**, closely matching the letter of the criterion — exactly 2 new integrations (Slack, Calendly), plus correcting a catalogue that had overstated availability of ~20. |
| P1 | Complete highest-value workflows | Three end-to-end workflows work without dead ends | A3, A7, A18 (3 seeded paths) | **Built; not verified.** The 3 paths exist and are built on real repositories, but **no live browser walkthrough has ever confirmed the full path → completion sequence works without a dead end** — this is the single largest carried-forward verification gap across Sprint 2 and Sprint 3 (see `PRODUCT_ITERATION_I_CLOSEOUT.md` §8-9). |
| P1 | Pilot templates | Four scoped pilot templates and baseline metrics | A3's 3 seeded paths (knowledge/AI, workflow/tasks, meetings) | **3 of 4, and none formalized as a "pilot template" artifact.** The report's implied 4th template (stakeholder/CRM/governance) was deliberately not built because Stakeholders/Approvals have no live repository — see the Sprint 2 audit trail. No baseline metrics were captured for any of the 3. |
| P1 | Mobile companion | Approval/task updates/notifications reliably on mobile | *(none)* | **Not attempted.** |
| P2 | Offline and multilingual | Validate with pilot requirements before building | *(none)* | **Correctly not attempted** — matches the report's own explicit sequencing guidance. |
| P2 | Vertical modules | Configurable templates, not separate codebases | *(none)* | **Correctly not attempted** — matches the report's own explicit "do not" guidance (§10.2). |
| P2 | Agentic automation | Bounded agents with approval, logs, rollback | *(none)* | **Correctly not attempted** — the report itself flags this as needing stronger review/control foundations first, which this iteration did not build out either. |

**Quantified summary of the P0/P1/P2 framework:** of the **4 P0 items**, none were fully closed
against the report's own stated success criteria — all 4 shipped a real, shippable mitigation, but
every one of them lacks the measurement/instrumentation half of its criterion. Of the **4 P1
items**, 1 was closed cleanly (core integrations), 2 shipped but remain unverified or partial
(complete workflows, pilot templates), and 1 was not attempted (mobile). All **3 P2 items** were
correctly left untouched, matching the report's own explicit sequencing advice not to build them
yet.

## 5. Sprint 1 (overall Sprint 33) — Stop the bleeding: onboarding friction and trust signals

Directly targets the report's central diagnostic finding (§7.4): every non-promoter cited both
unreliable performance and unclear value. All 7 items merged to `main`.

| ID | Shipped | Traces to |
|---|---|---|
| A1 | Golden Path made opt-in (was an unskippable 8-step checklist) | §7.6 "usability... reduce friction"; §7.4 non-promoter clarity gap |
| A2 | Blocked/locked steps explain themselves inline | Same as A1 |
| A8 | Empty states with a CTA on every major page | §7.3 "features feel incomplete" |
| A5 | Loading/timeout/retry states on long AI operations | §7.3 "slow or unreliable performance" (perception layer) |
| A19 | "Usually takes 5-8 seconds" expectation-setting copy | Same as A5 |
| A20 | Role-appropriate default landing pages (Employees no longer land on a mostly-locked Executive view) | §7.3 "difficult onboarding" |
| A12 | Feedback surfaced at the moment of workflow completion, not just a floating button | §18 "no telemetry linkage" limitation |

Full detail and audit trail: `ITERATION_PROGRESS.md`, 2026-07-20 entries.

## 6. Sprint 2 (overall Sprint 34) — Value clarity, AI trust, and feedback instrumentation

| ID | Shipped | Traces to |
|---|---|---|
| A3, A7, A18 | Seeded sample workspace + 3 outcome-first onboarding paths + fewer required setup fields | §7.3 "features feel incomplete", "difficult onboarding"; report §10.1 P1 "complete highest-value workflows" |
| A4 | AI answer rationale + citation count | §7.3 "AI output quality" (40%); report §10.1 P0 explainability |
| A6 | Bulk-approve for low-risk AI reviews | §7.3 "too many steps or approvals" (35%) |
| A9 | In-context 1-click micro-survey | §18 "no telemetry linkage between ratings and use" — this is a direct fix for a named limitation in the original report, not an actionable derived from a percentage |
| A11 | Wired the report's own §13.2 funnel events (`rag_query_submitted`, `ai_answer_reviewed`, `workflow_action_completed`) | Report §13, "Product analytics specification" — this section of the report is reproduced almost verbatim as the acceptance criterion for A11 |

**Also in this window:** the 3-round demo-data-leakage audit (`DEMO_DATA_LEAKAGE_AUDIT.md`),
triggered by a separate explicit instruction (not from the survey report itself) that beta must
contain zero content from the investor-demo build. This closes a category of "features feel
incomplete/inconsistent" risk the survey respondents could plausibly have been reacting to, even
though it wasn't named as its own line item in the report.

Full detail: `ITERATION_PROGRESS.md`, 2026-07-20/2026-07-21 entries.

## 7. Sprint 3 (overall Sprint 35) — Visible integrations, retention signals, demo readiness

| ID | Shipped | Traces to |
|---|---|---|
| A15 | Corrected the integrations catalogue from ~20 falsely "available" connectors down to what's real | §7.3 "limited integrations" (45%, the single most-selected issue) |
| A13, A14 | Slack and Calendly quick-connect | Same as A15; §8.6 "CRM and stakeholder coordination" / messaging use cases named by enterprise respondents |
| A10 | Post-demo satisfaction capture (PR #152, not yet merged) | §18 "no telemetry linkage" — a second, more specific instrumentation fix beyond A9 |
| A16 | "What's New" panel (PR #152, not yet merged) | Not a direct survey finding — a retention mechanism informed by the report's own framing that behavioral evidence, not more positive surveys, is the real next milestone (§6.3, §17) |
| A17 | Completion celebration (PR #152, not yet merged) | Report §9.1's "loop" framing — AXXESS differentiates when intelligence converts into accountable action, not just a chat answer; a visible completion signal reinforces that loop is real |

Full detail: `ITERATION_PROGRESS.md`, 2026-07-21 entries; merge status per PR in
`PRODUCT_ITERATION_I_CLOSEOUT.md` §5-6.

## 8. Qualitative themes (report §7.6) — traced separately, since these are free-text, not ranked selections

| Theme | Sprint item | Status |
|---|---|---|
| Output consistency and explainability | A4 | Explainability shipped; consistency (an evaluation/regression suite) not built |
| Integrations and custom workflows | A13, A14, A15 | Integrations shipped; "customized workflows" (a workflow builder) not attempted |
| Mobile availability | *(none)* | Not addressed |
| Value communication | A1, A7 | Addressed |
| Usability / reduce friction | A1, A2, A6, A8 | Addressed |
| Automation and structure (workflow templates) | A3 (partial) | The 3 seeded paths are the closest analogue to "packaged workflow templates," but they are onboarding scaffolding, not a general-purpose template system |

## 9. The report's own experiment backlog (§12) — none of these were actually run as experiments

The report proposed 10 hypothesis-driven experiments (B1-EXP-01 through B1-EXP-10), each with a
method, a primary metric, and a decision rule. **This iteration shipped the treatment side of
several of these experiments (the product change), but ran none of them as an actual instrumented
experiment against a control or a decision rule:**

- B1-EXP-02 (role-specific onboarding), B1-EXP-03 (AI provenance increases trust), and B1-EXP-07
  (templates outperform blank-slate) all have their treatment shipped (A7, A4, A3 respectively) but
  no measurement was taken against the metric each experiment specifies (first-value completion
  time, acceptance/override rate, setup-time reduction).
- B1-EXP-01 (reliability is the main blocker), B1-EXP-04 (integration usage lift), B1-EXP-05 (review
  as a retention driver), B1-EXP-06 (programme ops as a wedge), B1-EXP-08 (mobile for approvals),
  B1-EXP-09 (vertical modules as templates), and B1-EXP-10 (promoter integration requests convert to
  use) have **no shipped treatment and no measurement** — they remain exactly where the report left
  them.

This is a genuine, structural gap: the report explicitly warned against collecting "more 9s and
10s" and called for converting stated enthusiasm into observed behavior (§6.3). **No behavioral
telemetry has been reviewed and no experiment decision rule has been evaluated as part of this
iteration** — A11 wired the *events* the report's analytics spec (§13) calls for, but nothing has
yet consumed them to answer any of the 10 experiment hypotheses.

## 10. What this iteration does not claim

Consistent with the source report's own §16.2 ("unsupported claims") and this document's evidence
discipline: nothing in Sprint 1–3 establishes product-market fit, retention, reliability at the
report's stated P0 threshold, a completed evaluation suite, procurement conversion, or a resolved
security/trust posture. What Sprint 1–3 establishes is that **6 of the report's 11 ranked usefulness
issues have a substantially shipped fix**, the report's own P0/P1 priority framework was followed in
sequence (not cherry-picked), and every gap left open is named here rather than implied closed.

## 11. Consolidated "what remains" — combining this ledger with the process close-out

See `PRODUCT_ITERATION_I_CLOSEOUT.md` §8-10 for the process-level remaining-work list (merge PR
#152, the Capacitor version mismatch, etc.). From this evidence ledger specifically, the highest-
value remaining items, in the report's own priority order, are:

1. **Real reliability instrumentation** (P0, report's own top-ranked item, still the least-closed
   gap in this entire iteration — perception-layer fixes only).
2. **The live browser walkthrough of A3/A7/A18** — without it, "3 complete end-to-end workflows"
   (P1) is an engineering claim, not a verified one.
3. **An AI-output evaluation suite** (P0, explainability shipped, quality-measurement did not).
4. **Security/trust documentation** (15% of respondents, zero Sprint 1-3 attention).
5. **Running any of the 10 named experiments** against their stated decision rules, now that A11
   has wired the events needed to do so.
6. Everything the report itself said not to build yet (mobile, vertical modules, offline/
   multilingual, agentic automation) — correctly still untouched, not a gap.
