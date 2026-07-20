# Data hygiene note — raw enterprise survey responses

This note documents a privacy-policy conflict discovered in this folder, the investigation
that followed, and the remediation applied. It supersedes the initial note written on
2026-07-20 (which recorded a straight removal, since superseded by masking below).

## 1. What was uploaded, and why it conflicted with this repo's own stated policy

At the same time `Enterprise_Beta_Feedback_Batch_1.md` was added to this repository, an
archive named `AXXESS Enterprise Beta Feedback.zip` was committed alongside it, containing
the 9 raw per-respondent enterprise-survey PDFs exported directly from the survey tool.

That archive's filenames included respondents' real full names (e.g.
`number_1_ananya_singhal.pdf`), and each PDF's first page contained the respondent's full
name, organization, job title/designation, country, state/province, and (for most
respondents) email address.

This directly contradicted the publication policy stated in
`Enterprise_Beta_Feedback_Batch_1.md` itself (section 3.4, "Privacy and publication
policy"): *"Do not commit raw response PDFs or respondent emails to a public repository...
Store raw responses in an access-controlled research directory or encrypted data room."*
Since this repository is public, the raw archive was a live PII exposure from the moment it
was pushed.

## 2. Investigation

Before taking any action, each file type in this folder was individually inspected to
determine which ones actually carried PII, rather than removing everything indiscriminately:

- `AXXESS Enterprise Beta Feedback.zip` (9 files) — **confirmed PII**: real names in
  filenames; each PDF page 1 contains full name, organization, job title, country,
  state/province, and (usually) email address.
- `AXXESS by Triaxis Beta User Product Feedback Survey.zip` (21 files) — **confirmed clean**.
  Filenames are anonymous serial numbers. Sample inspection confirmed the underlying
  6-question product-survey instrument never collects name/email/organization, unlike the
  34-question enterprise instrument.
- `AXXESS Enterprise Beta Feedback-NPS Report.pdf` and
  `AXXESS by Triaxis Beta User Product Feedback Survey-NPS Report.pdf` — **confirmed clean**.
  Aggregate NPS/geography charts only, no per-respondent identifying data.
- `Enterprise_Beta_Feedback_Batch_1.md` — the aggregate analysis report, anonymized by design.

Technical note: the raw survey PDFs are rasterized (page-image) exports with no embedded
text layer — confirmed via `mupdf` structured-text extraction returning zero text blocks on
every page. This meant PII could not be found or removed via ordinary text search; it had to
be located by OCR (`tesseract.js`) and blacked out at the pixel level, then re-verified by
re-running OCR against the result to confirm no residual PII text remained recognizable.

## 3. Remediation timeline

1. **2026-07-20, initial response:** `AXXESS Enterprise Beta Feedback.zip` was removed
   (`git rm`) as an immediate hygiene fix, since no PII-masking capability was available yet
   at that point in the session. This left the folder PII-free but lost the raw enterprise
   evidence archive entirely.
2. **2026-07-20, follow-up:** a proper redaction pipeline was built (`mupdf` + OCR-based field
   detection + pixel-level blackout of only the PII fields, applied per respondent, each
   result independently re-verified by OCR to confirm zero leakage). All 9 raw PDFs were
   reprocessed and the masked set was reinstated as
   `AXXESS Enterprise Beta Feedback (PII-masked).zip`, replacing the fully-removed version.

## 4. What is masked vs. preserved in the reinstated archive

Per respondent, the following fields are blacked out (pixel-redacted, not merely covered —
verified unrecoverable by OCR): **full name, organization, job title/designation, country,
state/province, email address** (where present; a small number of respondents left this
field as "NA" and had nothing to redact there).

Everything else is preserved exactly as submitted, since it carries the evidentiary value
this data exists for: industry category, years of experience, every rating/matrix score,
every multiple-choice answer, and every qualitative free-text response (use case, biggest
problem, feature requests, roadmap opportunities, etc.).

## 5. Residual risk — please read before treating this as fully closed

`AXXESS Enterprise Beta Feedback.zip` (the fully unmasked original) was committed and pushed
to this **public** repository before this remediation, in commit `1a774a2`. Removing/replacing
it in later commits does **not** purge it from git history — the original raw files remain
fetchable via that commit until history is rewritten and force-pushed. That is a separate,
more disruptive action (requires re-sync for any other clone, including Codex's) and has
**not** been performed. If full removal from history is wanted, it needs to be requested and
scheduled explicitly.

## 6. Files in this folder after remediation

- `Enterprise_Beta_Feedback_Batch_1.md` — aggregate analysis report
- `AXXESS Enterprise Beta Feedback-NPS Report.pdf` — aggregate NPS by geography, no PII
- `AXXESS by Triaxis Beta User Product Feedback Survey-NPS Report.pdf` — aggregate NPS charts, no PII
- `AXXESS by Triaxis Beta User Product Feedback Survey.zip` — raw product-survey PDFs, verified anonymous
- `AXXESS Enterprise Beta Feedback (PII-masked).zip` — raw enterprise-survey PDFs with only the PII fields redacted
- `DATA_HYGIENE_NOTE.md` — this file
