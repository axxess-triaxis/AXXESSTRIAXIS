# Codebase De-Bloat Sprint 2 -- Closeout (2026-08-12)

Branch `docs/codebase-debloat-sprint-2-evidence-policy`, off `main` post-PR-#223-merge. Not yet
merged as of this closeout.

**"LOC reduction is not a measure of product quality. It is a repo hygiene and operational-risk
control metric" -- Sprint 1's own standing line, still true here. This closeout does not claim the
repo is de-bloated because files were moved: no file was moved this pass. It states exactly what
changed (three new documents) and what did not (zero bytes of evidence relocated).**

## Operation

Sprint 2 of the Codebase De-Bloat initiative: review the 57 tracked binary files Sprint 1 found were
causing LOC miscounting, classify each one, decide what can safely move out of the repo going
forward, and produce a founder-reviewable evidence storage policy -- without losing evidence,
product function, auditability, or diligence history.

## Objectives

1. Recompute the repo hygiene baseline (Phase 1, fully specified in the received prompt).
2. Classify all 57 tracked binary files into `KEEP_CORE` / `KEEP_EVIDENCE` /
   `MOVE_CANDIDATE_PENDING_APPROVAL`.
3. Design a concrete, reusable evidence storage policy (classification criteria, move-out
   mechanism options, index-entry template) -- not decide the destination, which only the founder
   can name.
4. Surface any evidence-completeness gaps found along the way, not just bloat findings.

## Constraints

Per the sprint's own non-negotiables: nothing product-critical deleted or altered; no evidence
deleted without founder/HITL approval; no git history rewritten; pitch decks, survey exports, LOI
references, feedback artifacts, and rendered screenshots not removed merely for size; no product
behavior changed; X0/Demo/Lite/mobile/Supabase/RAG/Knowledge Hub/AI/integrations/analytics/auth/
RBAC/RLS/tests untouched; no "de-bloated" claim without stating exactly what changed.

**A genuine constraint on this sprint's own scope, named rather than hidden**: this sprint's prompt
was received truncated twice (identical cutoff after the Phase 1 baseline-recompute commands, on
two separate paste attempts) -- Phase 2 onward and any required-output-doc list specified by the
original author were never received. Per explicit founder direction, this sprint's remaining scope
(this document's own Objectives 2-4) was designed from the stated Objective/Non-Negotiables/Required
Reading rather than a guessed continuation of the missing text.

## Tasks executed

1. **Baseline recomputed** on this branch: `node scripts/repo-size-audit.mjs` -> 163,800 real text
   LOC, 1,403 tracked files (1,346 text / 57 binary), 43.9 MB binary storage.
   `node scripts/repo-large-files.mjs` -> 30 files over 500 LOC (unchanged from Sprint 1).
   `node scripts/repo-bloat-guard.mjs` -> passes, 0 violations.
2. **All 7 required-reading files read**, none missing.
3. **All 57 tracked binary files inventoried by exact path and size**, classified into 4 groups
   (5 `KEEP_CORE`, 4 `MOVE_CANDIDATE_PENDING_APPROVAL` beta-feedback exports, 44
   `MOVE_CANDIDATE_PENDING_APPROVAL` rendered screenshots, 1 `KEEP_EVIDENCE` pitch deck) -- full
   detail and reasoning in `CODEBASE_DEBLOAT_SPRINT2_EVIDENCE_ARTIFACT_AUDIT_2026_08_12.md`.
4. **Confirmed via `git grep`** that no generator script exists for the 44 rendered screenshots --
   they are genuinely irreplaceable, not regeneratable build output.
5. **Found and documented a real evidence-completeness gap**: the actual signed LOI/engagement-
   letter PDFs this program's own commercial-traction claims rest on (5 signed LOIs, 1 referral
   agreement) are not tracked anywhere in this repository -- only markdown summaries citing them by
   filename exist, confirmed via a full-tree `git grep`/`git ls-files` search.
6. **`docs/readiness/EVIDENCE_STORAGE_POLICY_2026_08_12.md` written**: classification criteria,
   3 move-out-mechanism options with a stated recommendation (external storage + in-repo index,
   matching this program's own existing but previously-implicit LOI-citation pattern), and a reusable
   index-entry template for future evidence artifacts.
7. **Also landed, as a separate small follow-up PR discovered during this sprint's setup, not part
   of Sprint 2's own scope**: PR #224, restoring a Sprint 1 commit (`ae57da3`) that never made it
   into PR #223's merge -- PR #223 was merged one commit before that push landed. Content: the
   `wasm` binary-extension addition and a `repo-hygiene.yml` workflow extending `repo:bloat:guard`
   coverage to the GitLab mirror branch. Named here because it was found while preparing this
   sprint's branch, not because it's this sprint's own deliverable.

## Tasks that did not clear

1. **No file was moved.** This was true by design (see Objectives) -- the actual move-out mechanism
   and destination are founder decisions this sprint cannot make unilaterally, per its own
   non-negotiables. `MOVE_CANDIDATE_PENDING_APPROVAL` status is exactly that: pending, not executed.
2. **The missing-LOI-PDFs finding is not resolved.** This audit can confirm the files aren't in the
   repo; it cannot determine where they currently live, or whether that location is durable.
3. **No kanban/checklist docs produced**, unlike Sprint 1's 5-doc shape. Deliberate: this sprint's
   narrower scope (one classification pass, one policy document) didn't warrant the same tracking
   overhead Sprint 1's larger, more executional scope needed. If Sprint 3 (the actual move
   execution, once approved) has enough moving parts to need one, it should get its own.
4. **This sprint's own prompt gap was never fully resolved** -- Phases 2+ as originally intended by
   whoever wrote the prompt remain unknown; this closeout's scope is this session's own designed
   continuation, not a guarantee it matches unwritten original intent.

## What claim is still unsupported

No claim is made that the 29 MB of `MOVE_CANDIDATE` binaries will definitely leave the repo, or on
what timeline -- that depends entirely on founder decisions 1-3 below. No claim is made about
*where* the missing LOI PDFs currently are -- only that they are not in this repository.

## Verification

```
node scripts/repo-size-audit.mjs      -> 163,800 real text LOC, 1,403 files (1,346 text / 57 binary) -- unchanged from this sprint's own start-of-session baseline
node scripts/repo-large-files.mjs     -> 30 files over 500 LOC -- unchanged
node scripts/repo-bloat-guard.mjs     -> passes, 0 violations -- unchanged
git diff --check                      -> clean, no whitespace/line-ending issues in the 3 new docs
```

No typecheck/lint/test/build run -- zero `.ts`/`.tsx`/config files touched this sprint (3 new
markdown docs only, confirmed via `git status`).

## Exact files changed

```
docs/readiness/CODEBASE_DEBLOAT_SPRINT2_EVIDENCE_ARTIFACT_AUDIT_2026_08_12.md   (new)
docs/readiness/EVIDENCE_STORAGE_POLICY_2026_08_12.md                            (new)
docs/readiness/CODEBASE_DEBLOAT_SPRINT2_CLOSEOUT_2026_08_12.md                  (new, this file)
```

3 commits expected on this branch (one per doc, or combined -- see PR for exact commit list).
Branched fresh off `main` post-merge of PR #223. Separately, PR #224 (unrelated to this sprint's
own diff) landed the orphaned Sprint 1 commit.

## Actionables / follow-up

1. **Founder decision**: where do the signed LOI/engagement-letter PDFs live today, and should they
   be added under this new policy once approved -- the single most consequential open item from
   this sprint.
2. **Founder decision**: approve a move-out mechanism (Option A/B/C in the policy doc) for the 29 MB
   of beta-feedback exports and rendered screenshots. Option B recommended.
3. **Founder decision**: if Option B, name the specific external storage destination.
4. Once 1-3 are answered, a "Codebase De-Bloat Sprint 3" (or a Sprint 2 follow-up) would execute the
   actual move + index-entry creation -- not attempted this pass.
5. Confirm directly whether `AXXESS by Triaxis Beta User Product Feedback Survey.zip` (not labeled
   PII-masked, unlike its sibling export) actually contains any PII -- flagged in the audit doc,
   worth resolving before any move decision, not after.

## Outcome

Full classification of all 57 tracked binary files complete, evidence-backed, none guessed. A
concrete, reusable evidence storage policy produced with real options and a stated recommendation.
One real evidence-completeness gap surfaced (missing LOI source PDFs) that this program's own future
diligence readiness should treat as more urgent than the bloat question it was found alongside. Zero
files moved, zero bytes of storage reduced -- by design, pending the founder decisions named above.
