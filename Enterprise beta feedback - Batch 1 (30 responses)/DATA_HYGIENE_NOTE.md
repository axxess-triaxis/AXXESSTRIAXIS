# Data hygiene note

**Date:** 2026-07-20
**Action:** Removed `AXXESS Enterprise Beta Feedback.zip` from this folder.

## Why

That archive contained the 9 raw per-respondent enterprise-survey PDFs, each including the
respondent's full name, organization, job title, industry, country, and state/province. This
directly contradicts the publication policy stated in `Enterprise_Beta_Feedback_Batch_1.md`
(section 3.4, "Privacy and publication policy"): *"Do not commit raw response PDFs or
respondent emails to a public repository."*

## What remains and why it's safe

- `Enterprise_Beta_Feedback_Batch_1.md` — the aggregate analysis report. Anonymized by design.
- `AXXESS Enterprise Beta Feedback-NPS Report.pdf` — aggregate NPS by geography only (no names).
- `AXXESS by Triaxis Beta User Product Feedback Survey-NPS Report.pdf` — aggregate NPS charts only (no names).
- `AXXESS by Triaxis Beta User Product Feedback Survey.zip` — raw per-respondent product-survey
  PDFs, verified anonymous (serial number + answers only; the 6-question product instrument
  never collected name/email/org, unlike the 34-question enterprise instrument).

## Residual risk

Removing the file from the current tree does **not** purge it from git history. Since this
repository was public at the time the file was committed, the raw PDFs may remain fetchable via
the original commit (`1a774a2`) until the history is rewritten and force-pushed. That is a
separate, more disruptive action (requires a force-push and re-sync for any other clone) and
has not been performed as part of this change.
