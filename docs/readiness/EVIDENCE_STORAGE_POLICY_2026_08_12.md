# Evidence Storage Policy

Standing governance document, established by Codebase De-Bloat Sprint 2 (2026-08-12). Companion to
`docs/readiness/REPO_HYGIENE_AND_BLOAT_GUARDRAILS.md` (Sprint 1's code/bloat governance doc) --
that doc covers source code and generated-artifact hygiene; this one covers a different class of
tracked content: real evidence binaries (survey exports, screenshots, decks, signed documents).
Sourced from the full classification in
`docs/readiness/CODEBASE_DEBLOAT_SPRINT2_EVIDENCE_ARTIFACT_AUDIT_2026_08_12.md`.

**This is a policy proposal, not an executed migration. No file has been moved under this policy
yet -- see the closeout doc for exactly what remains a founder decision.**

## Why this exists

This repository is public. It also carries this program's own evidence-chain discipline (per
`CLAUDE.md`'s standing Evidence Chain rule) -- every material claim should trace to a checkable
artifact. Those two facts are in tension for privacy-sensitive evidence specifically: a signed LOI,
a raw survey export, or a customer's feedback screenshot is exactly the kind of artifact this
program's own discipline wants preserved and traceable, but a public git repository is not
automatically the right place for it if it contains anything privacy-sensitive. This policy exists
to resolve that tension with a rule, not a one-off judgment call each time a new evidence artifact
shows up.

## Classification criteria

Apply these in order to any new evidence-shaped binary or document before deciding where it lives:

1. **Is it read directly by build or serve tooling at a fixed path?** (e.g., a Capacitor icon, a
   static web asset) -> `KEEP_CORE`. Never a storage-policy question; it's product code by another
   name. Moving it requires a code change, which is a different kind of decision entirely.
2. **Is it evidence** (survey data, feedback, signed documents, decks, screenshots of real
   customer/user activity)? Continue to 3.
3. **Does it contain, or plausibly contain, personal data about a named individual who is not the
   founder or a public company** (a customer, a survey respondent, a beta user)? If yes and it's not
   explicitly, verifiably PII-masked -> presumptively `MOVE_CANDIDATE`, do not assume "probably
   fine" from a filename alone.
4. **Is it large** (a rough guide, not a hard rule: single file over ~1 MB, or a directory of many
   files totaling over ~5 MB) **and not something a diligence reviewer would expect to click open
   directly from the repo** (a pitch deck is; 48 individual survey-report screenshots are not) ->
   `MOVE_CANDIDATE`.
5. **Otherwise** -> `KEEP_EVIDENCE`. Small, not privacy-sensitive, or the kind of single well-known
   artifact (a pitch deck) that belongs directly in-repo for discoverability.

This mirrors, and does not replace, this sprint's own non-negotiable: nothing in category 2-5 is
ever *deleted* without explicit founder/HITL approval, regardless of which bucket it lands in --
`MOVE_CANDIDATE` means "candidate to relocate," never "candidate to delete."

## Move-out-of-repo mechanism -- three options, founder decision required

None of these is decided by this document. Presented so the actual decision (in the closeout's
"Founder/HITL decisions needed" section) has real options to choose from, not an abstract question.

### Option A -- Git LFS

Keeps files git-tracked (same clone/checkout workflow everyone already uses) but stores the actual
blob content outside the normal git object history, fetched on demand. Lowest workflow friction for
anyone already using git. **Real cost**: this repository has never used LFS before (confirmed --
no `.gitattributes` LFS filter exists today); introducing it means a one-time setup, a new tool
dependency for anyone cloning the repo who wants the actual file content, and LFS storage/bandwidth
quotas that vary by git host and aren't necessarily free at scale. Does not, by itself, solve the
privacy question -- LFS-tracked content in a public repo is still publicly fetchable unless the LFS
storage itself is access-controlled separately, which not every git host supports uniformly.

### Option B -- External private storage + in-repo index entry (recommended)

The file moves to a private location the founder already controls (a cloud drive, a private storage
bucket -- the specific location is the founder's to name, not this document's). The repo keeps a
small index entry in its place: filename, one-line description, date, original size, and either a
link to the private location or a content checksum (or both) so the artifact's existence and
provenance stay traceable in-repo even though the bytes don't. **This already matches how this
program's own signed-LOI evidence is handled today** -- `docs/LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md`
cites `Sakura signed engagement letter_signed.pdf` etc. by name as a "Source File" without the PDF
itself being tracked in-repo (see the audit doc's own finding on this). Option B is that same
pattern, made explicit and applied consistently, rather than left as an implicit, undocumented
convention only some evidence follows.

### Option C -- Leave as-is, tracked in git

A conscious choice to accept the current bloat/privacy tradeoff rather than change anything. Valid
for `KEEP_EVIDENCE`-classified items (the pitch deck) by default; would need explicit founder
sign-off to apply to a `MOVE_CANDIDATE` item, since that overrides this policy's own classification
criteria for that specific artifact.

**This document recommends Option B** for the two `MOVE_CANDIDATE` groups named in the audit doc
(beta-feedback exports, rendered screenshots) -- it requires no new tooling, extends a pattern this
program already uses elsewhere, and directly addresses the privacy question (the bytes leave the
public repo entirely) in a way Option A alone does not. The specific private-storage destination is
not decided here.

## What would move under this policy, if Option B is approved

| Group | Files | Size | Current classification |
|---|---:|---:|---|
| Beta-feedback survey exports | 4 | ~20.5 MB | `MOVE_CANDIDATE_PENDING_APPROVAL` |
| Rendered survey-report screenshots | 44 | ~8.5 MB | `MOVE_CANDIDATE_PENDING_APPROVAL` |
| **Total** | **48** | **~29 MB** | |

The pitch deck (5.4 MB, `KEEP_EVIDENCE`) and all 5 product-critical assets (~7.1 MB, `KEEP_CORE`)
are not proposed to move under this policy -- see the audit doc's per-group reasoning.

## Index-entry template (for any future evidence artifact moved under Option B)

```markdown
### <Artifact name>

- **Original path:** `<repo-relative path before move>`
- **Moved:** <date>
- **Description:** <one line, what it is and why it matters>
- **Size:** <original size>
- **Classification reason:** <which criterion from "Classification criteria" above triggered the move>
- **External location:** <link, or "private -- ask founder" if the link itself shouldn't be public>
- **Checksum:** `<sha256 of the original file, for integrity verification if ever retrieved>`
```

Applying this template consistently means a future reviewer (or a future de-bloat sprint) can
always find out what used to be here and why, without needing tribal knowledge of this specific
sprint's reasoning.

## What this policy does not do

It does not move any file (see the closeout doc). It does not choose a specific external storage
destination (a founder decision). It does not retroactively fix the missing-LOI-PDFs finding (the
audit doc's own separate, more consequential finding) -- that is a sourcing question, not a storage-
mechanism question, and this policy only governs where evidence lives once it exists somewhere
findable in the first place.
