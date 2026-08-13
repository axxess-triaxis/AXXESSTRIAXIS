# Codebase De-Bloat Sprint 3 -- Closeout (2026-08-12)

Branch `docs/codebase-debloat-sprint-3-evidence-index`, off `main` post-PR-#225-merge. Not yet
merged as of this closeout. Follow-up to Sprint 2 (PR #225).

**Update (2026-08-12, same day): the multi-sprint Codebase De-Bloat initiative (Sprints 1-3) is
now concluded.** After the 4 LOI/engagement-letter documents were located, reviewed, and moved to
`evidence-private/` (gitignored, not git-tracked -- see Evidence Index), one open item remained:
whether to remove the 48 already-git-tracked beta-feedback exports and rendered screenshots
(~29 MB) from this repository's git *history*, which a simple file deletion cannot do -- only a
history rewrite (`git filter-repo`/BFG) purges committed blobs, and history rewriting was an
explicit non-negotiable of this initiative, requiring its own separate authorization given its
destructive, force-push-requiring nature. This was surfaced as an open HITL item in PR #226, not
resolved either way. **Founder's explicit decision: no rewrite. The 48 files remain git-tracked as
a final, accepted state.** This is not a deferral -- it is the initiative's terminal state on this
question. See the Decision Ledger below.

**No bytes actually left this repository, and none arrived in external storage, this pass either.**
Sprint 3's real output is a populated, accurate evidence index and three resolved investigations
(a PII-status question and full resolution of the missing-LOI/engagement-letter finding, across
2 rounds within this same sprint) -- not a completed migration.

## Operation

Execute against Sprint 2's 4 named founder decisions, now that all 4 have been answered: build the
evidence index, resolve the ambiguous ZIP's PII status, and record the 4 LOI/engagement-letter
documents the founder provided directly -- without ever writing their content into this public
repository.

## Objectives

1. Investigate the real contents of `AXXESS by Triaxis Beta User Product Feedback Survey.zip`
   (the beta-feedback export not labeled PII-masked, unlike its sibling) to resolve whether it
   actually contains PII, rather than assume either way.
2. Build a real, populated `docs/readiness/EVIDENCE_INDEX_2026_08_12.md` covering every
   `MOVE_CANDIDATE` item identified so far, using Sprint 2's own index-entry template.
3. Record the 4 LOI/engagement-letter documents the founder provided this session (3 LOIs, then
   the Sakura engagement letter in a follow-up round), without physically adding their content to
   this repository.
4. Update Sprint 2's audit doc with a dated note reflecting what's now resolved.

## Constraints

Same non-negotiables as Sprint 2, plus one specific to this session: **none of the 4 LOI/
engagement-letter PDFs the founder provided are ever written into this repository at any point, in
any commit, even temporarily** -- confirmed by only ever using the Read tool on their original
Downloads-folder location, never Write/Edit to place their content or a copy into this repo's
working tree.

## Tasks executed

1. **Extracted and inspected `AXXESS by Triaxis Beta User Product Feedback Survey.zip`** -- to the
   session scratchpad only, never into the repo, and deleted immediately after inspection. The ZIP
   contains 21 individual response PDFs with no extractable text layer (confirmed via `pdftotext`
   producing empty output on all 21) -- scanned/image-based exports from the survey tool. Directly
   read (visually inspected) 3 representative samples: response #1, #10 (middle), and #21 (last).
   **Finding: zero identifying fields in any of the 3 samples** -- only a serial number, submission
   timestamp, numeric NPS/rating scores, checkbox feature selections, and free-text comments. All 3
   share an identical template structure, giving high confidence the finding holds across all 21,
   though the remaining 18 were not individually opened -- stated honestly as a sampling result, not
   a 100%-verified claim.
2. **`docs/readiness/EVIDENCE_INDEX_2026_08_12.md` written** -- real entries for all 4 beta-feedback
   exports (PII finding from step 1 folded in), the 44 rendered screenshots (one grouped entry), and
   the 3 LOI documents (see below). Every entry's `External location` field reads "pending" --
   consistent with the fact that no destination has been chosen and nothing has moved.
3. **3 LOI PDFs read in full** (`LOI 1 Imprints Production.pdf`, `LOI 2 Ekora.pdf`, `LOI 3 - 3
   customers (...).pdf`, covering all 5 LOI customers named in
   `docs/LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md`) -- confirmed **none
   are PII-masked** despite the founder's initial statement that they were; this was surfaced
   directly to the founder before any further action, with the specific unmasked fields named
   (personal phone numbers, personal emails including the founder's own, a handwritten signature,
   a business address). **Founder's explicit decision after seeing this: keep all 3 out of the
   public repo entirely.**
4. **The Sakura Law Chambers engagement letter subsequently provided and read in full** -- a
   distinct, lower-risk document: no personal phone/email/home address for either party, but a
   signed legal agreement naming a third party (a law-firm partner) by name and professional title.
   Reported factually rather than assumed safe from the lower risk profile alone. **Founder's
   explicit decision, applying the same policy consistently: same treatment as the 3 LOIs -- keep
   out of the public repo.** All 4 documents indexed in `EVIDENCE_INDEX_2026_08_12.md` with
   `External location: pending -- currently held by the founder outside this repository`; none of
   their actual bytes were ever written anywhere in this repo's working tree at any point.
5. **`docs/readiness/CODEBASE_DEBLOAT_SPRINT2_EVIDENCE_ARTIFACT_AUDIT_2026_08_12.md` updated** --
   appended a dated note (not a rewrite) reflecting all resolutions above.

## Tasks that did not clear

1. ~~No file actually moved to external storage.~~ **Superseded.** The founder subsequently named
   the destination (same local drive as the repo, `evidence-private/`, gitignored) and the 4 LOI/
   engagement-letter documents were actually moved there in this same branch -- see
   `EVIDENCE_INDEX_2026_08_12.md` for real `Moved`/`External location`/checksum values, and the
   commit `6d0f8f0` ("chore(repo): execute the evidence move for the 4 LOI/engagement-letter docs").
   The 44 beta-feedback/screenshot files did **not** move, and per the founder's final decision
   below, will not move -- see item 3.
2. **Only 3 of 21 product-survey response PDFs were individually inspected.** The PII-free finding
   is a high-confidence sampling result, not an exhaustive 21-of-21 verification -- stated as such
   in both the index and this closeout, not inflated to a stronger claim than the evidence supports.
   Still open; not urgent (see Actionables).
3. **The 48 already-git-tracked beta-feedback exports and rendered screenshots (~29 MB) remain in
   this repository, both on disk and in git history.** This is now a **final, accepted state**, not
   an unresolved task -- the founder explicitly decided against the only mechanism that would
   change it (a git history rewrite), closing this item rather than leaving it pending. See the
   Decision Ledger below.
4. **No checksum computed for the 44 rendered screenshots or the 4 beta-feedback export files**, since
   none of them moved. (The 4 LOI/engagement-letter documents, which did move, each have a real
   SHA-256 checksum recorded in the index.)

## What claim is still unsupported

No claim is made that the 18 unsampled product-survey responses are definitely PII-free -- only
that 3 representative samples across the full range showed an identical, identity-free template.
No legal conclusion is drawn about the Sakura agreement's own confidentiality terms -- only its
literal field content is reported. No claim is made that any evidence artifact has left this
repository or arrived anywhere external.

## Verification

```
node scripts/repo-size-audit.mjs      -> LOC/binary counts unchanged (confirmed: no files added to or removed from git tracking this sprint)
node scripts/repo-bloat-guard.mjs     -> passes, 0 violations
git status / git ls-files             -> confirms none of the 4 LOI/engagement-letter PDFs ever appear as untracked/added files in this repo's working tree at any point
git diff --check                      -> clean on the new/updated docs
```

No typecheck/lint/test/build run -- zero `.ts`/`.tsx`/config files touched this sprint (2 new docs,
1 updated doc, all markdown).

## Exact files changed

```
docs/readiness/EVIDENCE_INDEX_2026_08_12.md                              (new, later updated in-branch with the Sakura entry)
docs/readiness/CODEBASE_DEBLOAT_SPRINT2_EVIDENCE_ARTIFACT_AUDIT_2026_08_12.md  (updated -- appended note, not rewritten)
docs/readiness/CODEBASE_DEBLOAT_SPRINT3_CLOSEOUT_2026_08_12.md            (new, this file)
```

Zero files added under `Enterprise beta feedback - Batch 1 (30 responses)/`, `docs/pitch-deck/`, or
any location that would carry any of the 4 LOI/engagement-letter PDFs' content into this repository.

## Decision Ledger (CLAUDE.md standing rule -- this closeout carries a product-boundary decision)

```
Decision: End the Codebase De-Bloat initiative (Sprints 1-3) without rewriting git history.
Why: The 48 beta-feedback/screenshot files (~29 MB) are already committed to this repo's git
  history. Removing them from the current tree would not shrink the public repo -- only a history
  rewrite (git filter-repo / BFG, requiring a force-push) actually purges committed blobs, and that
  action was an explicit non-negotiable of this initiative from Sprint 1 onward, requiring its own
  separate authorization given its destructive, shared-history-altering nature. The founder was
  asked and declined.
What changed: Nothing in the public repo's tracked file set. The 4 LOI/engagement-letter documents
  (a separate, never-tracked category) were moved to `evidence-private/` (gitignored) in this same
  branch -- that part of the initiative did execute. The 48 beta-feedback/screenshot files are
  untouched: still tracked, still in history, unchanged since Sprint 1's baseline.
Architecture boundary: No history-rewrite tooling (git filter-repo, BFG) was introduced or run
  against this repository. `evidence-private/` established as the durable local-only (gitignored)
  home for future evidence that must never enter git tracking, per `EVIDENCE_STORAGE_POLICY_2026_08_12.md`.
Product boundary: This repository's git history retains 100% of its beta-feedback survey exports
  and rendered screenshots, going forward, as a permanent characteristic of this repo rather than a
  temporary state pending a future rewrite. Any future decision to rewrite history is a new,
  separately-authorized decision, not a resumption of this one.
Verification: `git log --all --oneline -- "Enterprise beta feedback - Batch 1 (30 responses)/*"` and
  `git log --all --oneline -- "docs/feedback-artifacts/rendered/*"` both show the original 2026-07-20
  commits unchanged and present in `main`'s ancestry (checked via `gh pr view 226` showing PR #226
  still open against `main`, no rewrite commits in this branch's history).
Outcome: Codebase De-Bloat initiative (Sprints 1-3) concluded. Guardrail scripts
  (`repo:size:audit`/`repo:large-files`/`repo:bloat:guard`) remain in place going forward as the
  ongoing measurement/enforcement mechanism for *new* bloat, per Sprint 1. The 29 MB of already-
  tracked evidence binaries is accepted as this repo's permanent baseline, not flagged again as a
  pending cleanup item in future sprints.
Follow-up: None scheduled. If the founder later wants to revisit history rewriting, that is a new
  decision requiring the same five-part Production/destructive-action justification this repo's
  CLAUDE.md already requires for comparable irreversible actions (explicit reason, named
  gate/constraint being overridden, accepted risk stated, rollback condition, post-action
  verification) -- not an assumption that this closeout's "no" can be silently revisited.
```

## Actionables / follow-up

1. ~~Founder decision, still the single remaining blocker: name the external storage destination.~~
   **Resolved.** Destination named (`evidence-private/`, local, gitignored) and the move for all 4
   LOI/engagement-letter documents executed in this branch (commit `6d0f8f0`).
2. **Closed, not deferred**: whether to remove the 48 beta-feedback/screenshot files from git
   history. Founder decision: no rewrite. See Decision Ledger above. Not carried forward as an open
   item in any future sprint.
3. If ever needed at higher confidence, inspect the remaining 18 product-survey response PDFs
   individually rather than relying on the 3-sample finding -- not urgent given the consistent
   template structure observed, but named as the honest gap it is. The only actionable item this
   closeout leaves genuinely open.

## Outcome

Evidence index built and populated with real entries. One real PII investigation resolved (the
ambiguous ZIP is safe). The evidence-completeness gap Sprint 2 found (all 4 cited LOI/engagement-
letter documents missing from the repo) is fully resolved: all 4 located, reviewed in full, and
actually moved to a local gitignored folder (`evidence-private/`) with real checksums recorded --
not merely indexed as pending. The 48 already-git-tracked beta-feedback/screenshot files remain in
this repository, in both working tree and history, as a **final, founder-accepted state** -- not an
open question. **The Codebase De-Bloat initiative (Sprints 1-3) is concluded.** Remaining
open items going forward are ordinary repo hygiene (guardrail scripts continue enforcing no *new*
bloat) rather than any unresolved decision from this initiative.
