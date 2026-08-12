# Evidence Index

Live index of evidence artifacts classified as `MOVE_CANDIDATE_PENDING_APPROVAL` under
`docs/readiness/EVIDENCE_STORAGE_POLICY_2026_08_12.md` (Sprint 2), using that document's own
index-entry template. Established by Codebase De-Bloat Sprint 3 (2026-08-12).

**Current status: no artifact listed here has actually moved anywhere.** Every `External location`
field below reads "pending" -- this document exists so each artifact's existence, description, and
classification reasoning are recorded in one place *before* the physical move happens, per Sprint
2's own policy. Update this file's `External location` field (and only that field) once a
destination is chosen and the actual upload happens -- do not re-derive the rest of each entry.

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
but not present anywhere in this repository. The founder provided 3 of the 4 cited documents
directly during Sprint 3 (read in full, then discussed) -- **all 3 are confirmed to contain
unmasked personal contact information** and, per explicit founder decision, **were never copied
into this repository at any point, even temporarily**. They remain wherever the founder currently
holds them (outside this repo) until an external storage destination is chosen.

### LOI 1 -- Imprints Production

- **Original path:** N/A -- never in this repository; founder-provided file currently outside repo
- **Moved:** N/A (never present to move)
- **Description:** Email LOI/beta-access expression of interest from Prajnyan Goswami, Proprietor,
  Imprints Production (Jorhat, Assam), dated 29 Jul 2026 (email timestamp). Corresponds to entry 2
  in `LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md`.
- **Size:** 176.9 KB
- **Classification reason:** Contains a personal email address (the sender's) and the founder's own
  personal email as recipient. Not masked. Per explicit founder decision this sprint: keep out of
  the public repo entirely.
- **External location:** pending -- currently held by the founder outside this repository
- **Checksum:** not computed (this session never wrote the file's bytes anywhere in the repo working
  tree, so no checksum was generated from a repo-adjacent copy)

### LOI 2 -- Ekora Hive

- **Original path:** N/A -- never in this repository
- **Moved:** N/A
- **Description:** Email LOI/beta-access expression of interest from Diksha Rajkhowa, Proprietor,
  Ekora Hive, dated 29 Jul 2026 (email timestamp). Corresponds to entry 3 in
  `LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md`.
- **Size:** 179.3 KB
- **Classification reason:** Same as LOI 1 -- personal email addresses present, not masked.
- **External location:** pending
- **Checksum:** not computed

### LOI 3 -- Mahanta & Sons Filling Station / Trimurti Blocks & Pavers / P. D. Wine Shop

- **Original path:** N/A -- never in this repository
- **Moved:** N/A
- **Description:** Signed letter LOI from Pollob Mahanta, Proprietor, covering 3 affiliated
  businesses (Mahanta & Sons Filling Station, Trimurti Blocks & Pavers, P. D. Wine Shop), dated
  28 Jul 2026. Corresponds to entries 4-6 in
  `LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md`.
- **Size:** 134.9 KB
- **Classification reason:** Contains a handwritten signature, a personal email address, two
  personal cell phone numbers, and a full business address -- the most identifying of the 3
  documents provided. Not masked. Per explicit founder decision this sprint: keep out of the
  public repo entirely.
- **External location:** pending
- **Checksum:** not computed

### Sakura Law Chambers -- signed engagement letter

- **Status:** still not located this sprint. Not provided by the founder this session; remains an
  open sourcing question. Cited in `LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md`
  entry 1 and `docs/LOIS_ENGAGEMENT_LETTERS_AND_STRATEGIC_PARTNERSHIPS.md`. Not indexed here since
  neither its content nor its exact current location is confirmed.

## What this index does not do

It does not mean any artifact has actually left the repo or arrived anywhere external -- every
entry's `External location` is "pending." It does not claim the 18 unsampled product-survey
response PDFs were individually verified PII-free -- only that 3 representative samples across the
full range showed an identical, identity-free template structure. It does not claim the Sakura
engagement letter's status is resolved -- it remains unlocated.
