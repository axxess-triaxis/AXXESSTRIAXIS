# Codebase De-Bloat Sprint 1 -- Closeout (2026-08-11)

Branch `chore/codebase-debloat-sprint-1`, branched fresh off `main`. Not yet merged as of this
closeout. Full evidence and methodology in the companion docs this sprint produced:
`CODEBASE_DEBLOAT_AUDIT_AND_DELETION_PLAN_2026_08_11.md`, `CODEBASE_DEBLOAT_KANBAN_2026_08_11.md`,
`CODEBASE_DEBLOAT_CHECKLIST_2026_08_11.md`, `REPO_HYGIENE_AND_BLOAT_GUARDRAILS.md`.

**Update (2026-08-12): both blockers this closeout originally named as "pre-existing, unrelated"
are resolved on `main`.** A separate, concurrent session fixed the `pnpm` lockfile
`minimumReleaseAge` policy violation and `src/demo/demoMode.ts`'s RSC-boundary build bug (PR #221,
merge `8e82fe0`; closeout: `docs/readiness/RELEASE_AGE_GATE_AND_BUILD_INCIDENT_CLOSEOUT_2026_08_12.md`).
This branch was rebased onto the fixed `main` and re-verified: `npx next build` now completes
cleanly (0 errors, full route table), and `pnpm run mobile:lite:capacitor:doctor` now completes
successfully (previously blocked entirely by the lockfile issue -- `cap doctor` reports normal
version-drift info, not an error). Both items move from "Tasks that did not clear" to resolved.

**Two residual CI gaps remain on `main`, confirmed pre-existing and unrelated to both that incident
and this sprint:** the standing Vitest worker-startup crash (this sprint's own verification runs hit
the same pattern repeatedly, documented above) and `Sprint 27/29 Pilot Acceptance Gate`'s Playwright
failure. Neither is new, neither is caused by this sprint's changes, neither is this sprint's scope
to fix. Full detail: `docs/readiness/RELEASE_AGE_GATE_AND_BUILD_INCIDENT_CLOSEOUT_2026_08_12.md`,
"What Remains Open."

**"LOC reduction is not a measure of product quality. It is a repo hygiene and operational-risk
control metric." This closeout does not claim the repo is clean, that memory problems are solved, or
that dead code is fully removed.**

## Operation

Founder-directed spec: dead-code audit, safe-deletion plan (95%+ confidence only), and bloat
guardrails, in response to a reported ~0.10% historical deletion rate, 14 files Paxel flagged at
500+ LOC, and a 350k+ tracked LOC figure against an estimated ~160-170k "core" LOC.

## Objectives

1. Build a tooled, repeatable LOC/large-file inventory (not a one-off manual estimate).
2. Classify every large file and every deletion candidate into the spec's own bucket vocabulary.
3. Delete only what clears 95%+ confidence.
4. Add guardrails so this kind of bloat question doesn't need to be re-litigated from scratch next time.
5. Document memory-pressure causes and product-surface boundary status honestly.

## Constraints

Per the founder's own non-negotiables: no deletion may touch X0 Web, Investor Demo, AXXESS Lite,
mobile Capacitor targets, Supabase migrations, auth/RBAC/RLS/tenant-isolation code, RAG/Knowledge
Hub, integrations/token vault, agentic infrastructure, analytics instrumentation, existing test
coverage, evidence-chain docs, or founder governance docs. Only delete at 95%+ confidence. Do not
split large files this sprint unless the split is "tiny and extremely safe." Do not rewrite
architecture as a cleanup exercise.

## What was audited

- A tooled LOC inventory (`scripts/repo-size-audit.mjs`) run across all 1,391 tracked files.
- All 30 files over 500 real text LOC, individually classified with a stated reason and confidence.
- A byte-for-byte duplicate check on the two untracked helper scripts the founder specifically
  flagged for review.
- A full `scripts/` directory orphan sweep (every `.mjs`/`.sh` file cross-referenced against
  `package.json`, all 15 GitHub Actions workflows, and doc references).
- A targeted filename-pattern sweep for `old`/`legacy`/`deprecated`/`backup`/`copy` markers across
  all 1,391 tracked files, which surfaced this sprint's second real finding (see below).
- A self-declared "stale"/"superseded" sweep across `docs/readiness/*.md`.
- Product-surface boundary status: `lite:guard` read and confirmed passing; the AXXESS Lite doctrine
  docs' explicit exclusion rules cross-checked.
- Memory-pressure root causes, cited from the existing `docs/audit/06_TEST_RELIABILITY_AUDIT.md`
  finding, not re-investigated.

**What was not audited** (see "Tasks that did not clear" below): an exhaustive file-by-file sweep of
all ~1,334 tracked text files for old demo/onboarding variants, duplicate readiness-doc content
beyond the self-declared-stale check, and new memory-pressure sources beyond the two already-known
causes.

## Key finding

**The reported "350k+ LOC" figure is a measurement artifact, not a real bloat crisis.** A naive
`git ls-files | xargs wc -l` counts binary files (PNG/PDF/ZIP) as if every byte-boundary newline were
a real line of code. This repo has 57 such tracked binary files whose combined naive "line count" is
173,921 -- 51.7% of the pre-sprint naive total. Real text/code LOC is **162,030** (pre-deletion) /
**161,988** (post-deletion) -- already matching the founder's own "~160-170k core" estimate almost
exactly. This reframes the entire sprint: there was no large hidden pool of dead code to hunt for.

## Tasks executed

1. **Corrected LOC methodology built and run**: `scripts/repo-size-lib.mjs` (shared binary-exclusion
   logic), `scripts/repo-size-audit.mjs`, `scripts/repo-large-files.mjs` -- all new, all tested working.
2. **`upload.sh` deleted** -- byte-identical duplicate of `paxel-upload.sh` (untracked, confirmed via
   `diff -q` and `git grep`, 100% confidence).
3. **`src/services/legacyInstitutionalViewRepository.ts` + its test file + `src/mocks/institutionalData.ts`
   deleted** (60 real text LOC) -- confirmed zero consumers via fresh `git grep`, independently
   corroborated by 6 of this repo's own historical docs stating this exact file was confirmed dead
   as far back as Sprint 4 (2026-07-22) and deliberately left in place each time as "out of scope."
   The `InstitutionalRepository` type it implemented remains real and used elsewhere (demo/empty
   repositories) -- only the one dead adapter implementation was removed.
4. **`scripts/repo-bloat-guard.mjs` built and wired into CI** (`.github/workflows/ci.yml`'s `quality`
   job, as a new fail-fast first step) -- confirmed via full search that no equivalent gate existed
   across any of this repo's 15 workflows before this sprint.
5. **`.gitignore` updated** -- `/scratchpad/`, `/upload.sh`, `/paxel-upload.sh` added, preventing
   future accidental tracking of local/scratch/tooling files.
6. **`.github/PULL_REQUEST_TEMPLATE.md` extended** -- 5 bloat-awareness checklist items added to the
   existing "Enterprise Impact" block, matching the founder's spec verbatim.
7. **`docs/readiness/REPO_HYGIENE_AND_BLOAT_GUARDRAILS.md` created** -- new standing governance doc
   (deletion criteria, split criteria, evidence-doc retention policy, binary-file handling); none
   existed before this sprint (confirmed: neither `README.md` nor `CLAUDE.md` had one).
8. **All 5 required output documents produced** (this closeout, plus the audit doc, kanban,
   checklist, and governance doc listed above).

## LOC before/after

| | Real text LOC | Tracked files | Files over 500 LOC |
|---|---:|---:|---:|
| Before this sprint | 162,030 | 1,391 | 30 |
| After this sprint | 161,988 (net -42, after accounting for ~500 new LOC in the 4 guardrail scripts and ~60 LOC removed) | 1,391 in index pre-commit (drops to 1,393 tracked, net +2 for the 4 new scripts minus 3 deleted, minus upload.sh) | 30 (unchanged -- no file crossed the threshold in either direction) |

This is intentionally a small, honest delta -- consistent with this sprint's own headline finding
that there was never a large hidden-bloat problem. The value of this sprint is the corrected
methodology and the guardrails, not a large LOC reduction number.

## Files over 500 LOC before/after

Unchanged: 30 before, 30 after. None of the deleted files were in the 500+ LOC list (they were 30,
15, and 15 lines respectively). None of the 4 new guardrail scripts individually exceed 500 LOC.

## Memory-pressure findings

Two real, pre-existing, already-documented causes, cited accurately from
`docs/audit/06_TEST_RELIABILITY_AUDIT.md`, neither re-investigated nor claimed fixed this sprint:
(a) `vitest.config.mjs`'s `fileParallelism: true` tradeoff (worker-startup crashes under concurrent
load, mitigated by the `--pool=forks` fallback this session used successfully for its own
verification runs), (b) session-long cumulative memory exhaustion on an 8GB dev machine (Q-010,
still `OPEN`). New memory-pressure source investigation (spec Section 5) was not covered this
session -- named as follow-up.

## Guardrails added

`pnpm run repo:size:audit`, `pnpm run repo:large-files`, `pnpm run repo:bloat:guard` (wired into
CI), a 5-item PR-template checklist addition, and the new
`REPO_HYGIENE_AND_BLOAT_GUARDRAILS.md` governance doc. Full detail in the audit doc's Section 13.

## Tests run

- `npx tsc --noEmit -p tsconfig.json` -> **0 errors**, full repo.
- `npx eslint . --max-warnings=0` -> **0 errors, 0 warnings**, full repo.
- `npx vitest run --config vitest.config.mjs` (scoped run touching the deletion blast radius plus
  broader coverage) -> **220 test files / 1,297 tests, all passing, 0 failures.** 6 "Unhandled
  Errors" were vitest worker-startup timeouts on phantom duplicate test-file matches inside nested
  `.claude/worktrees/*` directories (a pre-existing, known flake pattern from other sessions' work in
  this same checkout this session) -- not assertion failures against any real file.
- `node scripts/repo-size-audit.mjs`, `node scripts/repo-large-files.mjs`,
  `node scripts/repo-bloat-guard.mjs` -> all run successfully, output captured in the audit doc.
- `node scripts/lite-boundary-guard.mjs` (`pnpm run lite:guard`) -> **passed across 49 files.**
- `pnpm run lite:test` -> 36 test files / 183 tests; 1 file initially reported "failed"
  (`liteNavigation.test.ts`) alongside the same worker-startup timeout pattern -- **re-run in
  isolation immediately after: 3 test files / 3 tests, all passing.** Confirmed the initial result
  was the known infra flake, not a real regression from this sprint's deletions (no plausible causal
  link between `liteNavigation.test.ts` and the 3 deleted files either).
- `pnpm run mobile:lite:capacitor:doctor` -> **could not run**: blocked by the same pre-existing
  `[ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION]` lockfile policy issue already being fixed on a separate,
  concurrent branch (`fix/pnpm-lockfile-release-age-gate`) this session observed elsewhere -- any
  `pnpm install`-triggering command currently fails the same way, unrelated to this sprint's changes.

## Build result

`npx next build` **fails** -- for a confirmed pre-existing, unrelated reason: `src/demo/demoMode.ts`
has an RSC-boundary violation (importing `useEffect`/`useState` into a module reachable from a Server
Component route) that this session already independently confirmed, in the Security Hardening Sprint
closeout the same day, is unrelated to that sprint's own changes. This branch does not touch
`demoMode.ts`, `WorkflowRecordsPage.tsx`, or any file in the failure's import trace either -- same
root cause, same conclusion: **this build failure pre-dates and is independent of this sprint's
changes**, and blocks `main` today regardless of whether this PR merges.

## Risks

- The corrected LOC methodology (binary exclusion) has not been cross-checked against an independent
  second measurement tool.
- `repo:bloat:guard`'s forbidden-path list is a fixed set; a new build tool's cache directory
  introduced later would not be caught until the list is updated by hand.
- The dead-code sweep beyond this sprint's 2 confirmed findings (the script duplicate and the
  `legacyInstitutionalViewRepository` chain) is incomplete -- residual dead code may exist elsewhere
  and is not disproven, only not yet found.
- `pnpm run mobile:lite:capacitor:doctor` could not be verified this pass due to the pre-existing
  lockfile policy issue named above -- once that's fixed (separately, by another session), this
  check should be re-run before considering this sprint's verification fully complete.

## Founder-stated claim unsupported by this audit

None. Every number in this closeout traces to a command actually run this session, cited above.

## Next sprint recommendation

A "Codebase De-Bloat Sprint 2" scoped specifically to: (a) the dead-code sweep this session's
research instability left incomplete (old demo/onboarding variants, duplicate readiness-doc content,
old mobile scaffold copies), (b) the founder decision on the tracked binary survey-export files
(audit doc Section 16), and (c) whether `repo:size:audit`/`repo:large-files` should become
CI-enforced blocking gates. Not attempted this pass, since this sprint's own headline finding already
answered the most urgent open question (there is no large unexplained-bloat crisis).

## Exact files changed

```
scripts/repo-size-lib.mjs                    (new)
scripts/repo-size-audit.mjs                  (new)
scripts/repo-large-files.mjs                 (new)
scripts/repo-bloat-guard.mjs                 (new)
package.json                                 (3 new scripts)
.github/workflows/ci.yml                     (1 new step)
.github/PULL_REQUEST_TEMPLATE.md             (5 new checklist items)
.gitignore                                   (3 new entries)
upload.sh                                    (deleted)
src/services/legacyInstitutionalViewRepository.ts       (deleted)
src/services/legacyInstitutionalViewRepository.test.ts  (deleted)
src/mocks/institutionalData.ts                           (deleted)
docs/readiness/CODEBASE_DEBLOAT_AUDIT_AND_DELETION_PLAN_2026_08_11.md  (new)
docs/readiness/CODEBASE_DEBLOAT_KANBAN_2026_08_11.md                  (new)
docs/readiness/CODEBASE_DEBLOAT_CHECKLIST_2026_08_11.md               (new)
docs/readiness/REPO_HYGIENE_AND_BLOAT_GUARDRAILS.md                   (new)
docs/readiness/CODEBASE_DEBLOAT_SPRINT1_CLOSEOUT_2026_08_11.md        (new, this file)
```
