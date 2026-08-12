# Evidence Index

Live index of evidence artifacts classified as `MOVE_CANDIDATE_PENDING_APPROVAL` under
`docs/readiness/EVIDENCE_STORAGE_POLICY_2026_08_12.md` (Sprint 2), using that document's own
index-entry template. Established by Codebase De-Bloat Sprint 3 (2026-08-12).

**Current status (updated 2026-08-12): the 4 LOI/engagement-letter documents have moved** -- to a
local, gitignored folder on the same machine as this repo (`evidence-private/`, listed in
`.gitignore`, confirmed via `git check-ignore -v`). This satisfies the founder's chosen move-out
mechanism: local storage, external to git tracking. **The beta-feedback exports and rendered
screenshots below have not moved** -- unlike the LOI documents, these are *already tracked in git
history*, so moving them requires a different, more consequential action (removing already-
committed content from git tracking) that was deliberately not executed in this same pass -- see
the closeout doc for why. Update this file's `External location`/`Moved` fields (and only those
fields) once each remaining item's move executes -- do not re-derive the rest of each entry.

## Beta-feedback survey exports

### AXXESS Enterprise Beta Feedback (PII-masked).zip

- **Original path:** `Enterprise beta feedback - Batch 1 (30 responses)/AXXESS Enterprise Beta Feedback (PII-masked).zip`
- **Moved:** not yet
- **Description:** Raw enterprise-beta survey response export, 30 responses. Filename explicitly
  states PII-masked; not independently re-verified this sprint (out of scope -- the founder-labeled
  status was taken as given; only the sibling file below, which carried no such label, was
  independently investigated).
- **Size:** 14 MB
- **Classification reason:** Large (Evidence Storage Policy criterion 4), real customer/beta-user
  evidence, not something a diligence reviewer needs to open directly from the repo.
- **External location:** pending -- destination not yet chosen (see closeout doc)
- **Checksum:** not yet computed (compute at time of actual move, not before, so it reflects the
  exact bytes transferred)

### AXXESS by Triaxis Beta User Product Feedback Survey.zip

- **Original path:** `Enterprise beta feedback - Batch 1 (30 responses)/AXXESS by Triaxis Beta User Product Feedback Survey.zip`
- **Moved:** not yet
- **Description:** Raw product-survey response export, 21 individual response PDFs (`number_1.pdf`
  through `number_21.pdf`).
- **Size:** 4.8 MB
- **Classification reason:** Large, evidence, same as above -- **plus a resolved investigation**:
  this file was NOT labeled PII-masked, unlike its sibling, so Sprint 3 extracted and directly
  inspected 3 representative samples (first, 10th, and 21st/last response out of 21 total).
  **Finding: zero identifying information present.** Every sampled response contains only a serial
  number, a submission timestamp, a numeric NPS/rating score, checkbox feature selections, and a
  free-text improvement suggestion -- no name, email, phone number, organization, or any other
  respondent-identifying field appears anywhere in the form template. All 3 samples share the
  identical template structure (same survey tool, same fields), giving high confidence this holds
  across the full set of 21, though the remaining 18 were not individually opened. This file was
  effectively already safe -- the missing "PII-masked" label in its filename reflected inconsistent
  naming, not an actual gap in masking.
- **External location:** pending -- destination not yet chosen
- **Checksum:** not yet computed

### AXXESS Enterprise Beta Feedback-NPS Report.pdf

- **Original path:** `Enterprise beta feedback - Batch 1 (30 responses)/AXXESS Enterprise Beta Feedback-NPS Report.pdf`
- **Moved:** not yet
- **Description:** Rendered NPS summary report for the enterprise beta survey.
- **Size:** 152 KB
- **Classification reason:** Aggregate report derived from the survey data above; travels with it
  under the same policy for consistency, even though its own size is small.
- **External location:** pending
- **Checksum:** not yet computed

### AXXESS by Triaxis Beta User Product Feedback Survey-NPS Report.pdf

- **Original path:** `Enterprise beta feedback - Batch 1 (30 responses)/AXXESS by Triaxis Beta User Product Feedback Survey-NPS Report.pdf`
- **Moved:** not yet
- **Description:** Rendered NPS summary report for the product survey.
- **Size:** 1.5 MB
- **Classification reason:** Same as above.
- **External location:** pending
- **Checksum:** not yet computed

## Rendered survey-report screenshots (grouped entry)

- **Original path:** `docs/feedback-artifacts/rendered/*.png` (44 files -- see
  `docs/readiness/CODEBASE_DEBLOAT_SPRINT2_EVIDENCE_ARTIFACT_AUDIT_2026_08_12.md` for the full
  per-file list, or `git ls-files docs/feedback-artifacts/rendered/`)
- **Moved:** not yet
- **Description:** Rendered visual captures of the same underlying survey reports (enterprise
  "detailed" and "default" views, product "short"/"NPS" views). No generator script exists for
  these -- confirmed via `git grep` in Sprint 2 -- they are not build output and cannot be
  regenerated if lost. A sibling `docs/feedback-artifacts/extracted/*.txt` directory holds the same
  underlying text content (already counted in this repo's real text LOC), so the PNGs specifically
  are the visual/formatting record, not the only copy of the raw data.
- **Size:** ~8.5 MB combined (44 files)
- **Classification reason:** Large as a group, evidence, not something a diligence reviewer expects
  to click through individually from the repo (the aggregate NPS report PDFs above serve that
  purpose already).
- **External location:** pending -- likely moves as one archive/folder rather than 44 separate
  uploads, but that packaging decision is deferred to whoever executes the actual move
- **Checksum:** not yet computed (would need to be per-file or a combined archive checksum,
  decided at move time)

## LOI / engagement-letter source documents

Sprint 2 found these were cited by `docs/LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md`
but not present anywhere in this repository. The founder provided all 4 cited documents directly
during Sprint 3 (read in full, then discussed) -- **all 4 name real individuals, and 3 of the 4
contain unmasked personal contact information**. Per explicit founder decision (move-out mechanism:
same local machine as this repo, but never git-tracked), all 4 now live at
`evidence-private/loi-and-engagement-letters/` -- a directory listed in `.gitignore` (confirmed via
`git check-ignore -v` before and after placing the files there) so it can never be tracked via a
future `git add -A`. **This is the move -- it is complete for these 4 files.** Unlike the beta-
feedback exports and screenshots below (still git-tracked, still pending an actual move), these 4
were never in git history at all, so this local-but-ignored placement is their final state under
the current policy, not an interim step.

### LOI 1 -- Imprints Production

- **Original path:** N/A -- was never tracked in this repository
- **Moved:** 2026-08-12, to `evidence-private/loi-and-engagement-letters/LOI 1 Imprints Production.pdf`
- **Description:** Email LOI/beta-access expression of interest from Prajnyan Goswami, Proprietor,
  Imprints Production (Jorhat, Assam), dated 29 Jul 2026 (email timestamp). Corresponds to entry 2
  in `LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md`.
- **Size:** 176.9 KB
- **Classification reason:** Contains a personal email address (the sender's) and the founder's own
  personal email as recipient. Not masked. Per explicit founder decision this sprint: keep out of
  the public repo entirely.
- **External location:** `evidence-private/loi-and-engagement-letters/LOI 1 Imprints Production.pdf`
  (local, gitignored -- not "external" in the cloud-storage sense, but external to git tracking,
  which is the property this policy actually needs)
- **Checksum (SHA-256):** `782636061a2b94ba0df56b6fc38dec72388806a611c8484cfff5e1ad84dad169`

### LOI 2 -- Ekora Hive

- **Original path:** N/A -- was never tracked in this repository
- **Moved:** 2026-08-12, to `evidence-private/loi-and-engagement-letters/LOI 2 Ekora.pdf`
- **Description:** Email LOI/beta-access expression of interest from Diksha Rajkhowa, Proprietor,
  Ekora Hive, dated 29 Jul 2026 (email timestamp). Corresponds to entry 3 in
  `LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md`.
- **Size:** 179.3 KB
- **Classification reason:** Same as LOI 1 -- personal email addresses present, not masked.
- **External location:** `evidence-private/loi-and-engagement-letters/LOI 2 Ekora.pdf` (local,
  gitignored)
- **Checksum (SHA-256):** `3ddf7a0334e506c6a250ff871258cab4808f0a6e854853ad3a3bcdf3135bc3df`

### LOI 3 -- Mahanta & Sons Filling Station / Trimurti Blocks & Pavers / P. D. Wine Shop

- **Original path:** N/A -- was never tracked in this repository
- **Moved:** 2026-08-12, to `evidence-private/loi-and-engagement-letters/LOI 3 - 3 customers
  (Mahanta & Sons Filling Station, P D Wine Shops, Trimurti Blocks & Pavers.pdf`
- **Description:** Signed letter LOI from Pollob Mahanta, Proprietor, covering 3 affiliated
  businesses (Mahanta & Sons Filling Station, Trimurti Blocks & Pavers, P. D. Wine Shop), dated
  28 Jul 2026. Corresponds to entries 4-6 in
  `LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md`.
- **Size:** 134.9 KB
- **Classification reason:** Contains a handwritten signature, a personal email address, two
  personal cell phone numbers, and a full business address -- the most identifying of the 4
  documents provided. Not masked. Per explicit founder decision this sprint: keep out of the
  public repo entirely.
- **External location:** `evidence-private/loi-and-engagement-letters/LOI 3 - 3 customers (...)`.pdf
  (local, gitignored)
- **Checksum (SHA-256):** `9341afc530c973de2688b79157425b5ee29ceacd665e74334663ca90f43b9c9f`

### Sakura Law Chambers -- signed engagement letter

- **Original path:** N/A -- was never tracked in this repository
- **Moved:** 2026-08-12, to `evidence-private/loi-and-engagement-letters/Sakura signed engagement
  letter_signed.pdf`
- **Description:** Strategic Collaboration and Referral Agreement between Sakura Law Chambers and
  Triaxis Ventures Private Limited (non-exclusive referral/managed-delivery framework for
  legal/fundraising/investor-readiness/pitch-deck advisory services), dated 19.06.2026, digitally
  signed by the founder 24-06-2026 09:17 am. Corresponds to entry 1 in
  `LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md` and the full detailed record
  in `docs/LOIS_ENGAGEMENT_LETTERS_AND_STRATEGIC_PARTNERSHIPS.md`.
- **Size:** 283.5 KB
- **Classification reason:** Distinct risk profile from the 3 LOIs above -- contains no personal
  phone number, personal email, or personal home address for either party (unlike the LOIs). It
  does name a third party by name and professional title (Shradhanjali Sarma, Partner, Sakura Law
  Chambers) in a signed legal agreement. Per explicit founder decision, given the same consistent
  policy applied to the other 3: no signed document naming a third party goes into the public repo
  without that party's explicit consent, regardless of the specific risk level of the fields
  present. Kept out of the public repo entirely, same as the LOIs.
- **External location:** `evidence-private/loi-and-engagement-letters/Sakura signed engagement
  letter_signed.pdf` (local, gitignored)
- **Checksum (SHA-256):** `d0ca59baf2854a3e51dfe01a5ed3992dfa5282f759aa2c0cf610942e51d62da7`

## What this index does not do

It does not mean any artifact has actually left the repo or arrived anywhere external -- every
entry's `External location` is "pending." It does not claim the 18 unsampled product-survey
response PDFs were individually verified PII-free -- only that 3 representative samples across the
full range showed an identical, identity-free template structure. It does not claim any legal
conclusion about the Sakura agreement's own confidentiality terms -- only what fields the document
itself contains, reported factually.
