# Codebase De-Bloat Sprint 2 -- Evidence Artifact Audit (2026-08-12)

Sprint 2 of the Codebase De-Bloat initiative, following
`docs/readiness/CODEBASE_DEBLOAT_SPRINT1_CLOSEOUT_2026_08_11.md` (PR #223, merged). Sprint 1 found
the repo's apparent LOC bloat was 51.7% a binary-file miscounting artifact; this sprint reviews the
57 tracked binary files that caused that miscounting and classifies each one, plus surfaces one
evidence-completeness gap found along the way. **This is a classification pass. No file was moved
or deleted this pass -- see `EVIDENCE_STORAGE_POLICY_2026_08_12.md` for the proposed policy and
`CODEBASE_DEBLOAT_SPRINT2_CLOSEOUT_2026_08_12.md` for what remains a founder decision.**

**Update (2026-08-12, Sprint 3): partially resolved.** The founder provided 3 of the 4 LOI/
engagement-letter documents this audit found missing (`LOI 1 Imprints Production.pdf`, `LOI 2
Ekora.pdf`, `LOI 3 - 3 customers (...).pdf` -- covering all 5 LOI customers). Read in full: none
are PII-masked (personal phone numbers, personal emails, a signature, a business address are
present). Per explicit founder decision, they were never copied into this repository -- see
`docs/readiness/EVIDENCE_INDEX_2026_08_12.md` for their indexed entries (external location
pending). The Sakura Law Chambers engagement letter remains unlocated. Separately, Sprint 3 also
resolved this doc's open PII question on `AXXESS by Triaxis Beta User Product Feedback Survey.zip`
(the file not labeled PII-masked, unlike its sibling) -- direct inspection of 3 representative
samples found zero identifying fields; the survey tool's own template never collected respondent
identity. Full detail in the Evidence Index.

## Baseline (recomputed this session)

```
node scripts/repo-size-audit.mjs
```
- Tracked files: 1,403 (1,346 text, 57 binary, 0 unreadable-as-text)
- Real text LOC: 163,800
- Binary file storage: 43.9 MB across 57 files

Unchanged in shape from Sprint 1's own baseline (163,116 -> 163,800 is normal drift from commits
landing between the two sprints, not a new finding).

## Required reading (per this sprint's own spec)

- `docs/readiness/CODEBASE_DEBLOAT_AUDIT_AND_DELETION_PLAN_2026_08_11.md` -- read, Sprint 1's own findings, cited above.
- `docs/readiness/CODEBASE_DEBLOAT_KANBAN_2026_08_11.md` -- read.
- `docs/readiness/CODEBASE_DEBLOAT_CHECKLIST_2026_08_11.md` -- read.
- `docs/readiness/REPO_HYGIENE_AND_BLOAT_GUARDRAILS.md` -- read.
- `docs/readiness/CODEBASE_DEBLOAT_SPRINT1_CLOSEOUT_2026_08_11.md` -- read.
- `docs/LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md` -- read; this is where
  the missing-LOI-PDFs finding below came from.
- `docs/readiness/TOP_LEVEL_READINESS_AND_GTM_SNAPSHOT_2026_07_31.md` -- read; establishes what the
  commercial-evidence artifacts (LOIs, pilot feedback) actually support (Market/GTM Readiness rows).

All 7 required-reading files exist and were read in full or to sufficient depth; none missing.

## Note on this sprint's own prompt

This sprint's prompt was received truncated twice (identical cutoff both times) after the Phase 1
baseline-recompute commands -- Phase 2 onward and any required-output-doc list were never received.
Per explicit founder direction, this plan (and its 3 output docs) were designed from the stated
Objective/Non-Negotiables/Required Reading rather than a guessed continuation. Flagged here so the
gap is visible in the evidence trail, not silently smoothed over.

## Full classification of all 57 tracked binary files

Classification vocabulary (defined fully in `EVIDENCE_STORAGE_POLICY_2026_08_12.md`):
- `KEEP_CORE` -- product-critical, read directly by build/serve tooling, never moves.
- `KEEP_EVIDENCE` -- real evidence artifact; recommended to stay in-repo regardless of the policy
  chosen (small, not privacy-sensitive, or the kind of artifact a diligence reviewer expects in-repo).
- `MOVE_CANDIDATE_PENDING_APPROVAL` -- real evidence artifact; large and/or privacy-sensitive;
  candidate to move under the new storage policy, but not moved this pass, pending founder approval
  of both the mechanism and the destination.

### Group 1 -- Product-critical build/serve assets (5 files, ~7.1 MB) -- `KEEP_CORE`

| File | Size | Why it can never move |
|---|---:|---|
| `apps/mobile-capacitor/resources/icon.png` | 1.5 MB | Capacitor's build tooling (`cap sync`/`cap build`) reads this exact path directly to generate every platform-specific app icon size. Moving it breaks the mobile build. |
| `apps/mobile-capacitor/resources/splash.png` | 1.5 MB | Same mechanism, splash screen generation. |
| `public/branding/axxess-logo.png` | 1.5 MB | Served directly by Next.js as a static asset at a fixed URL; referenced by the live app's UI. |
| `public/branding/axxess-triaxis-logo.png` | 1.1 MB | Same. |
| `public/triaxis-cover.png` | 1.5 MB | Same. |

These 5 files are explicitly protected by this sprint's own non-negotiable ("do not change product
behavior") -- moving any of them out of their exact current path would require a code change to
repoint the build/serve tooling, which is out of this sprint's scope and not requested.

### Group 2 -- Beta-feedback survey exports (4 files, ~20.5 MB) -- `MOVE_CANDIDATE_PENDING_APPROVAL`

All under `Enterprise beta feedback - Batch 1 (30 responses)/`, committed 2026-07-20:

| File | Size | Content |
|---|---:|---|
| `AXXESS Enterprise Beta Feedback (PII-masked).zip` | 14 MB | Raw enterprise-survey response export, explicitly labeled PII-masked |
| `AXXESS by Triaxis Beta User Product Feedback Survey.zip` | 4.8 MB | Raw product-survey response export -- **not labeled PII-masked**, unlike the file above |
| `AXXESS Enterprise Beta Feedback-NPS Report.pdf` | 152 KB | Rendered NPS report |
| `AXXESS by Triaxis Beta User Product Feedback Survey-NPS Report.pdf` | 1.5 MB | Rendered NPS report |

This is the group Sprint 1 already flagged (its audit doc, Section 7/16) as the sprint's most
important repo-hygiene/privacy question. Confirmed again this pass: **this repository is public**,
and one of the two ZIP exports is not labeled PII-masked the way its sibling is -- worth the founder
confirming directly whether that second export actually contains any PII, not assuming from the
naming convention alone. Real evidence, large, and the clearest `MOVE_CANDIDATE`.

### Group 3 -- Rendered survey-report screenshots (44 files, ~8.5 MB) -- `MOVE_CANDIDATE_PENDING_APPROVAL`

All under `docs/feedback-artifacts/rendered/*.png` (individual file list omitted here for length --
see `node scripts/repo-large-files.mjs` output or `git ls-files docs/feedback-artifacts/rendered/`
for the full 44-file list; sizes range 36 KB-664 KB each).

**Confirmed via `git grep` across the whole tracked tree: no generator script exists anywhere in
this repo for these files.** They are not build output and cannot be regenerated -- they are the
only visual/formatting capture of these survey reports as originally rendered by whatever tool
produced them. A sibling directory, `docs/feedback-artifacts/extracted/*.txt` (8 files), holds
plain-text extractions of the same underlying survey data -- already counted in this repo's real
text LOC, and a genuine partial backup of the *content* (though not the visual formatting) if the
PNGs were ever lost. This partial redundancy is worth noting: it means the PNGs, if moved out,
would not leave the repo with zero record of this evidence -- the text extracts would remain.

### Group 4 -- Pitch deck (1 file, 5.4 MB) -- `KEEP_EVIDENCE`

`docs/pitch-deck/Triaxis_Ventures_Pitch_Deck_2026-07-23.pdf`. Explicitly named in this sprint's own
non-negotiables as protected from size-based removal ("do not remove pitch decks... merely because
they are large"). Recommended to stay in-repo under the proposed policy too (see policy doc's
reasoning) -- it is a single, well-organized, non-privacy-sensitive file that a diligence reviewer
would expect to find directly in-repo, and 5.4 MB in one file is not, on its own, a meaningful bloat
problem the way 29 MB across 48 files of raw survey data is.

## Finding: the actual signed LOI/engagement-letter PDFs are not in this repository at all

`docs/LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md`'s own "Source File"
column cites 4 distinct source documents by filename:

- `Sakura signed engagement letter_signed.pdf`
- `LOI 1 Imprints Production.pdf`
- `LOI 2 Ekora.pdf`
- `LOI 3 - 3 customers (...).pdf`

**None of these appear anywhere in this repository's tracked file list.** Confirmed via `git grep`/
`git ls-files` search across the entire tracked tree: only two markdown files reference these
filenames by name (`LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md` and
`LOIS_ENGAGEMENT_LETTERS_AND_STRATEGIC_PARTNERSHIPS.md`) -- the source PDFs themselves are absent.

This is not a binary-file classification question (there is no file here to classify) -- it is a
distinct, arguably more consequential finding: **the company's own core commercial-traction
evidence (5 signed LOIs, 1 referral agreement -- the primary evidence cited in this program's own
Market Readiness and GTM Readiness scoring, per `TOP_LEVEL_READINESS_AND_GTM_SNAPSHOT_2026_07_31.md`)
may exist only outside any durable, repo-adjacent record** -- e.g., in email or a personal device/
drive not backed up anywhere this audit can see. If that is the case, it is a real single-point-of-
failure risk for this program's own evidence-chain discipline, independent of repo-size concerns.
Named explicitly as the top founder/HITL decision in this sprint's closeout -- not resolved here,
since this audit cannot itself determine where these files currently live.

## What this audit does not claim

This audit does not claim any file has been moved, deleted, or made safer this pass -- it is a
classification only. It does not claim the missing-LOI-PDFs finding means the evidence itself is
lost -- only that it is not present in this repository, which is a different, narrower claim. It
does not claim the 29 MB of `MOVE_CANDIDATE` binaries are definitely leaving the repo -- that
depends entirely on the founder decision named in the closeout doc.
