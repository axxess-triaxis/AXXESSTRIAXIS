# Beta Feedback Evidence Reconciliation

Date: 2026-07-25
Governance source: `docs/FOUNDER_EXECUTION_EVIDENCE_GOVERNANCE.md`
Trigger: founder request, 2026-07-25 -- *"when we documented 1600+ data points on beta; it as only
the beta surveys from 35 surveyed... Should we not revise our 'beta feedback points' estimate
drastically..."*, followed by a founder clarification -- *"1200+ points was from 23 surveyed. 10
user surveys I added later."*

## Purpose

This document traces the "1,200+ actionable feedback points" claim to its exact source, checks it
against the founder's own recollection, and reports what the repository can and cannot verify.
Per this program's evidence-chain discipline, the correction below is derived from repo artifacts,
not from re-estimating the founder's recollection upward or downward without a source.

## 1. Where "1,200+" actually comes from

The figure is computed in `Enterprise beta feedback - Batch 1 (30 responses)/Enterprise_Beta_Feedback_Batch_1.md`,
section 2.1 ("Definition: actionable surveyed data points"):

- **1,236 raw / 1,112 deduplicated instrument-weighted actionable data points**
- Base: **30 submitted survey records / 28 unique answer sets** after removing 2 duplicates --
  **20 unique product-feedback respondents, 8 unique enterprise-feedback respondents** (7 clearly
  external to the founding team).
- The source document's own words: *"This metric demonstrates the depth of the instruments, not
  the size of the user base... It should never be presented as 1,112 users, usage events, or
  independent market validations."*

This is echoed in `Enterprise beta feedback - Batch 1 (30 responses)/BETA_FEEDBACK_SPRINT_1-3_ITERATION_REPORT.md`
line 22-24, which already carries the same caveat.

**`docs/SPRINT_41_QA2_MILESTONE_2026_07_22.md`** (lines 24 and 160) is the one place that states the
figure *without* that caveat -- as a flat "30-respondent enterprise beta with 1,200+ actionable
feedback points." That is the specific claim this reconciliation corrects (see Section 4).

## 2. Checking the founder's recollection against repo evidence

The founder's clarification states the 1,200+ figure was based on 23 surveyed respondents, with 10
more added later. The repository does contain a genuine, separate 23-respondent document:

- `Enterprise beta feedback - Batch 1 (30 responses)/BETA_0.5_0.7_FEEDBACK_ANALYSIS_2026_07_23.md`
  (committed 2026-07-23) -- **23 total responses**: Beta 0.5 = 15 (responses 1-15), Beta 0.7 = 8
  (responses 16-23). Combined NPS 82.61.

However, **this 23-response document contains no "actionable data points" count at all** -- it has
no instrument-depth metric, no 1,200+, no 1,112+, nothing of that shape. The only document in this
repository that computes and states an actionable-data-point figure is `Enterprise_Beta_Feedback_Batch_1.md`,
and it explicitly bases that figure on the **30-submitted / 28-deduplicated** batch (20 product + 8
enterprise respondents) -- not 23.

Respondent-count progression across the two dated documents (both real, both in-repo):

| Document | Date | Product-feedback respondents | Enterprise-feedback respondents | Total |
|---|---|---:|---:|---:|
| `BETA_0.5_0.7_FEEDBACK_ANALYSIS_2026_07_23.md` | 2026-07-23 | 15 | 8 | 23 |
| `Enterprise_Beta_Feedback_Batch_1.md` | (30-response batch) | 20 | 8 | 28 unique / 30 raw |

The enterprise-feedback count (8) is identical in both -- only the product-feedback survey grew, by
5 net unique respondents (7 raw submissions minus 2 duplicates). This is consistent with the
founder's account that more surveys were added after the 23-respondent cut, though the verified
delta is 5-7, not exactly 10.

**Conclusion:** the "1,200+" / "1,112+" figure is correctly sourced to the fuller 30-raw/28-dedup
batch, not the 23-respondent batch. The founder's recollection that 1,200+ traces to 23 respondents
does not match what the source document itself states -- flagging this discrepancy rather than
silently adopting either number, per governance Rule 2 (do not invent missing evidence) and Rule 4
(tag founder-recalled figures that don't match a source artifact).

**"1,600+" data points** (founder's first message) has **no matching artifact anywhere in this
repository** -- not in either beta-feedback document, not in any readiness doc. Tagged
`Founder-stated, source artifact needed`.

## 3. The other two units the founder asked about -- kept separate, not blended

Per governance Rule 1 and Rule 6, these are different evidence types and are not summed into one
number:

| Claim | Verified against | Result |
|---|---|---|
| "7,000+ word analysis of the 35 surveyed beta users" | `wc -w` on `Enterprise_Beta_Feedback_Batch_1.md` | **Verified, exceeds claim: 7,784 words.** ("35 surveyed" itself is already tracked as Partial against the verified 28-30 in `docs/UNSUPPORTED_OR_PARTIAL_CLAIMS.md`.) |
| "35-40k words of founder product walkthrough over 5-6 attempts" | `wc -w` across the identifiable walkthrough-documentation cluster: `docs/TENANT_0_ONBOARDING_FINDINGS_2026_07_22.md` (6,442), `docs/readiness/TENANT_0_ONBOARDING_ATTEMPTS_2026_07_24.md` (1,958), `docs/readiness/POST_SPRINT_41_MANUAL_ORCHESTRATION_QA_TENANT_0_2026_07_24.md` (2,509), `docs/readiness/GOLDEN_PATH_COMPLETION_KANBAN_2026_07_25.md` (908) | **Partial, not directly verifiable as stated.** These 4 files total 11,817 words, but they are Claude-authored documentation *derived from* founder walkthrough sessions (chat-based, not committed as a raw transcript), not a word count of the founder's own typed/spoken input. No single committed artifact contains "35-40k words of founder walkthrough" as a raw transcript. Tagged `Founder-stated, source artifact needed`. |

## 4. What changes in the canonical evidence files

- `docs/SPRINT_41_QA2_MILESTONE_2026_07_22.md`: historical sprint milestone content is left as-is
  (per this program's practice of not rewriting dated closeout snapshots); this document is the
  correction record, cross-referenced from the ledgers below.
- `docs/MARKET_TO_PRODUCT_EVIDENCE_LEDGER.md`: "Beta feedback" row annotated to note the 1,200+
  figure is an instrument-depth metric from the 28-30 batch, not a 23-respondent figure, with a
  link to this document.
- `docs/UNSUPPORTED_OR_PARTIAL_CLAIMS.md`: "35+ beta feedback items documented" row extended with
  the 1,200+/1,600+ reconciliation and the two new `Founder-stated, source artifact needed` tags.
- `docs/FOUNDER_EXECUTION_EVIDENCE_INDEX.md`: "Beta feedback items" row annotated with the same
  cross-reference.

## Rule

No figure in this document should be revised without adding or citing a source artifact, per
`docs/FOUNDER_EXECUTION_EVIDENCE_GOVERNANCE.md`.
