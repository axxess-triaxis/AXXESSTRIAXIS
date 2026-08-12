# Codebase De-Bloat Checklist (2026-08-11)

Per-item completion record for Codebase De-Bloat Sprint 1. Full evidence in
`docs/readiness/CODEBASE_DEBLOAT_AUDIT_AND_DELETION_PLAN_2026_08_11.md`.

## Inventory

- [x] Total tracked LOC computed with a tooled, repeatable script (`repo:size:audit`), not a
      one-off manual command -- 162,030 real text LOC, 1,391 tracked files.
- [x] Binary-file miscounting identified and quantified (173,921 "lines" of PNG/PDF/ZIP noise,
      51.7% of the naive total) -- the sprint's headline finding.
- [x] LOC by top-level directory computed.
- [x] LOC by file extension computed.
- [x] 500+ LOC files listed (30) and 1,000+ LOC files listed (6), with the Paxel-vs-actual
      discrepancy (14 vs 30) named explicitly, not silently reconciled.
- [ ] Full untracked-content inventory beyond `scratchpad/`/`paxel-upload.sh`/`upload.sh` -- not
      needed; those three were the only untracked content this session found, confirmed via
      `git status`.

## Classification

- [x] Every file over 500 LOC classified into a bucket (`KEEP_CORE`/`KEEP_EVIDENCE`/
      `KEEP_ROADMAP`/`KEEP_GENERATED_LOCKED`/`REFACTOR_LATER`/`SPLIT_LATER`) with a stated reason
      and confidence level.
- [x] Every safe-deletion candidate classified with 95%+ confidence evidence, not assumption.
- [x] The tracked binary survey-export files classified as a founder-decision item, not
      auto-classified into a deletion bucket this audit isn't authorized to decide.
- [ ] Full file-by-file classification of all ~1,334 tracked text files -- not attempted; this
      sprint classified the 500+ LOC files and the specific candidates found, not the entire repo.
      Named as Sprint 2 scope.

## Safe Deletion

- [x] `upload.sh` deleted -- 100% confidence, byte-identical duplicate, zero references.
- [x] `src/services/legacyInstitutionalViewRepository.ts` + test deleted -- 98% confidence,
      corroborated by 6 of this repo's own historical docs plus fresh independent verification.
- [x] `src/mocks/institutionalData.ts` deleted -- 98% confidence, sole consumer was the file above.
- [x] No item below 95% confidence was deleted.
- [x] No evidence doc, migration, test protecting live behavior, or product-surface code was deleted.
- [x] Each deletion is git-restorable (standard commit history, no history rewrite involved).

## Verification

- [x] `node scripts/repo-size-audit.mjs` run, output captured.
- [x] `node scripts/repo-large-files.mjs` run, output captured.
- [x] `node scripts/repo-bloat-guard.mjs` run, output captured (passed).
- [ ] Standard verification suite (typecheck/lint/test/build/lite:ci/mobile doctor) -- run and
      reported with exact pass/fail counts in
      `docs/readiness/CODEBASE_DEBLOAT_SPRINT1_CLOSEOUT_2026_08_11.md`, not this file (avoids
      duplicating the same numbers in two places -- see that doc).

## Memory Pressure

- [x] Existing documented root causes cited accurately from `docs/audit/06_TEST_RELIABILITY_AUDIT.md`
      (`fileParallelism` tradeoff, session-long memory exhaustion / Q-010).
- [ ] New memory-pressure sources investigated (heavy eager-loaded dependencies, barrel imports,
      accidental client imports of server-heavy code) -- not covered this session (spec Section 5
      scope, not completed). Named as Sprint 2 follow-up.

## Guardrails

- [x] `repo:size:audit` script built and working.
- [x] `repo:large-files` script built and working.
- [x] `repo:bloat:guard` script built and working, wired into CI (`ci.yml`'s `quality` job).
- [x] PR template extended with 5 bloat-awareness checklist items.
- [x] `docs/readiness/REPO_HYGIENE_AND_BLOAT_GUARDRAILS.md` governance doc created.
- [ ] LOC trend tracking, bundle analyzer, code-ownership tags, test memory profiling -- not built
      (all optional per the spec; no founder numeric ceiling was given to enforce against).

## Founder Sign-off

- [ ] Decision needed: tracked binary survey-export files in a public repo (Section 7/16 of the
      audit doc) -- working-tree removal vs. history rewrite vs. leave as-is.
- [ ] Decision needed: `README.md` split priority.
- [ ] Decision needed: `supabaseEnterpriseRepositories.ts` split priority.
- [ ] Decision needed: whether to commission a "Codebase De-Bloat Sprint 2" to finish the dead-code
      sweep this session's research instability left incomplete.
- [ ] Decision needed: whether `repo:size:audit`/`repo:large-files` should become CI-enforced
      blocking gates with a numeric ceiling.
