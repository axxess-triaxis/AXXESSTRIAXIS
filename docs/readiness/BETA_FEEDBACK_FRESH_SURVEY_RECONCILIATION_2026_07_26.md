# Beta Feedback Fresh Survey Reconciliation (2026-07-26)

Date: 2026-07-26
Governance source: `CLAUDE.md`'s evidence-chain discipline; same method as
`BETA_FEEDBACK_EVIDENCE_RECONCILIATION_2026_07_25.md`, applied to a newer, separate data drop.
Trigger: founder supplied eight fresh survey export files directly in-session (zips of individual
response PDFs, two dashboard `.pptx` decks, four NPS report PDFs) to ground the
`QA3_EXECUTIVE_SUMMARY_2026_07_26.md`'s commercial-evidence section in real data rather than
recalled figures.

## Purpose

Trace exactly what these eight files contain, report only what could be independently verified from
them, and be explicit about what could not be opened in this environment and why -- per this
program's Rule 2 (do not invent missing evidence) and Rule 5 (cite exact source).

## Source Files (As Provided, 2026-07-26)

| File | Type | Size / pages |
|---|---|---|
| `AXXESS Enterprise Beta Feedback (1).zip` | 10 individual response PDFs (named respondents) | 16.6 MB total |
| `AXXESS by Triaxis Beta User Product Feedback Survey (1).zip` | 24 individual response PDFs (numbered, unnamed) | 6.1 MB total |
| `AXXESS Enterprise Beta Feedback-dashboard (1).pptx` | Aggregate dashboard, 33 slides | -- |
| `AXXESS by Triaxis Beta User Product Feedback Survey-dashboard (1).pptx` | Aggregate dashboard, 7 slides | -- |
| `AXXESS Enterprise Beta Feedback-NPS Report (1).pdf` | Overall + regional NPS summary | 1 page, 102 KB |
| `AXXESS Enterprise Beta Feedback -- Africa-NPS Report.pdf` | Africa-segment NPS detail | 30 pages, 2.9 MB |
| `AXXESS Enterprise Beta Feedback -- Asia-NPS Report.pdf` | Asia-segment NPS detail | 45 pages, 4.3 MB |
| `AXXESS by Triaxis Beta User Product Feedback Survey-NPS Report (3).pdf` | NPS summary for the product survey | 13 pages, 1.2 MB |

Founder-stated framing of these two surveys (not independently re-derivable from the aggregate
dashboards, which show totals only, not a per-response beta-version tag): the 24-response "short
set" (Product Feedback Survey) has its first 15 responses from Beta 0.5 and the next 9 from Beta
0.7; the 10-response "detailed set" (Enterprise Beta Feedback) has its first 8 from Beta 0.5 and the
last 2 from Beta 0.7. **Tagged as founder-stated, source artifact needed** -- confirming this would
require opening the individual response PDFs in submission order and checking each one's date/
version field, which was not done for this reconciliation.

## Tooling Limitation, Stated Plainly

This environment has no `pdftoppm`/Poppler page-rendering and no Python interpreter (only a Windows
Store stub). The four multi-page/multi-report PDFs above could not be rendered page-by-page through
the normal PDF-reading path, and `pdftotext` returned no text at all from the ones tested --
confirming their content is chart images, not a text layer. **Worked around by unzipping the two
`.pptx` files directly** (a `.pptx` is a zip of XML plus embedded PNGs) and reading each chart's
underlying PNG image directly. This recovered the aggregate figures below in full for both
dashboards. It did **not** recover: the Africa/Asia-specific detailed breakdowns beyond the one
overall NPS-by-region table (see below), the Product Feedback Survey's own NPS report narrative, or
any content from the 34 individual response PDFs inside the two zips (not opened -- the aggregate
dashboards were sufficient for the figures needed here and opening 34 separate PDFs was judged not
worth the context cost for this reconciliation's purpose).

## Verified Findings

### AXXESS Enterprise Beta Feedback (n=10, dashboard last updated 21 Jul 2026)

| Metric | Result | Source |
|---|---|---|
| NPS (0-10 "recommend to a peer or colleague") | **90** overall | `...NPS Report (1).pdf`, p.1 |
| NPS by region | Asia (n=8): 87.5; Africa (n=2): 100 | Same |
| Score distribution | 10 -> 6 responses, 9 -> 3, 8 -> 1, nothing below 8 | Dashboard slide 29 chart |
| "Would your organization pilot AXXESS?" | Immediately: 1; within 3 months: 2; within 6 months: 3; needs more features first: 3; not suitable: 1 | Dashboard slide 21 chart |
| Expected annual budget | <$100: 0; $100-500: 3; $500-1,000: 0; $1,000-5,000: 1; $5,000+: 4; enterprise custom quote: 2 -- **7 of 10 (70%) named a figure at or above $1,000/year** | Dashboard slide 22 chart |
| "How disappointed if AXXESS disappeared" | 7 in the top ("Ve[ry disappointed]") bucket, 1 in the second ("S[omewhat]"), 2 in a third bucket whose exact label was truncated in the rendered chart and not otherwise recoverable in this pass | Dashboard slide 17 chart -- **exact label of the 2-response bucket is unverified, tagged accordingly** |

### AXXESS by Triaxis Beta User Product Feedback Survey (n=24, dashboard last updated 25 Jul 2026)

| Metric | Result | Source |
|---|---|---|
| Recommend-likelihood (1-10 scale -- note: this survey uses a 1-10 scale, not the standard 0-10 NPS scale, so no NPS figure is computed for it here) | 10 ("Extremely likely"): 21; 8: 1; 7: 1; 6: 1; nothing below 6 | Dashboard slide 2 chart |
| "How disappointed if AXXESS were no longer available" (1-10) | 10: 14; 9: 2; 8: 4; 4: 1; 3: 2; 2: 1; nothing at 1, 5, 6, or 7 -- top-3 band (8-10) = 20 of 24 (83%) | Dashboard slide 3 chart |

## Relationship to the Prior "1,200+ / 1,600+" Reconciliation

`BETA_FEEDBACK_EVIDENCE_RECONCILIATION_2026_07_25.md` traced a different, earlier-dated batch (the
30-submitted/28-unique "`Enterprise_Beta_Feedback_Batch_1.md`" document). This is a **separate, more
recent data drop** -- different file names, different dates (21/25 Jul vs. the earlier batch's
own dates), and no stated dedup relationship between the two. **Not assumed to be the same
respondents or additive to the earlier batch's totals** unless the founder confirms otherwise.

**One coincidental cross-check:** 10 + 24 = 34 raw responses across these two files, which matches
the "34 beta submissions" figure that appeared in an earlier externally-produced readiness table
this program's own review process flagged for verification. This reconciliation confirms that
specific number is directionally real (as the raw count of these two exports) -- but "1,600+
feedback data points" and "32 unique respondents" from that same table still do not trace to
anything in either this batch or the earlier one, and should continue to not be repeated as verified
figures.

## What Remains Unverified

- The exact wording of the Enterprise survey's third disappointment-question bucket (2 responses).
- Whether the Beta 0.5/0.7 response-ordering the founder described matches the actual per-response
  data (would require opening individual response PDFs in order).
- Any respondent overlap between this batch and the earlier 30-response batch.
- Full content of the Africa/Asia regional detail reports and the Product Feedback Survey's own NPS
  report narrative (rendering blocked by this environment's missing PDF tooling, as noted above).
