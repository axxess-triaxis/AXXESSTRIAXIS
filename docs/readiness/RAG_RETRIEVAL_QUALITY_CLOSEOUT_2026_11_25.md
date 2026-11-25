# Chunk full text, rank fusion and abstention: closeout, 2026-11-25

PR [#575](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/575), branch `feat/rag-retrieval-quality`,
stacked on `feat/rag-real-retrieval-gate` (PR #574, head `ba73ac89`, open when this was written). Status:
**PR open; not merged, not deployed. The migration is applied to no hosted project. No production data was
read or written.** Plan and acceptance criteria: `RAG_RETRIEVAL_QUALITY_PLAN_2026_11_24.md`.

## Signal and decision

`RAG_RETRIEVAL_GATE_CLOSEOUT_2026_11_24.md` found that full text served 9 of 108 questions, form codes were
semantic's weak spot, and nothing ever abstained. This change addresses those three, measured one at a time
on the gate from #574. No LangChain, LangGraph, MongoDB, paid model or new dependency.

## Results

Cumulative: each row is the code at that commit, so it includes the rows above. Every run is
`pnpm run rag:release-gate --self-test` on a fresh CI database. "No-answer correct" means no sources
returned; "abstained or flagged" also counts a human-review request. Random order, calculated for v1 by
#574: recall at 5 0.3511.

| Step | Commit | CI run | Gate |
|---|---|---|---|
| Before | `6d3cb068` | 45543893235 | passed |
| 1. Chunk full text | `247aa457` | 45545327157 | failed: `fulltext-returns-nothing` not caught, old minimums |
| 2. Fusion, every match votes | `afa8bf11` | 45545952361 | failed: semantic MRR and nDCG fell below the minimum, and `fusion-ignores-full-text` not caught |
| 3. Fusion, coverage above 0.5 | `9bfd41cd` | 45546783045 | failed: `fusion-ignores-full-text` not caught, old minimums |
| 4. Abstention, both modes | `532a0226` | 45547527087 | failed: full text below its v2 minimums; two abstention breakages not caught, old minimums |
| 5. Full text flags instead | `33f1b04a` | 45548722741 | failed: `full-text-review-flag-removed` not caught, old minimums |
| Final code, minimums raised | `13960f0a` | 45549466974 | passed; 16 of 16 breakage runs caught. Metrics identical to row 5 |

Rows 1 to 5 failed because minimums only go up after a measurement, and a new breakage cannot be caught
until the minimum it should trip exists. Rows 2 and 4 also failed on quality, and both were changed.

| v1, semantic | Commit | Recall at 5 | MRR | nDCG at 5 | No-answer correct | Abstained or flagged | Leaks | Errors |
|---|---|---|---|---|---|---|---|---|
| Before | `6d3cb068` | 0.9867 (74/75) | 0.9116 | 0.9303 | 0/16 | 0/16 | 0 | 0 |
| 1. Chunk full text | `247aa457` | 0.9867 (74/75) | 0.9116 | 0.9303 | 0/16 | 0/16 | 0 | 0 |
| 2. Fusion, every match votes | `afa8bf11` | 0.9867 (74/75) | 0.8433 | 0.8796 | 0/16 | 0/16 | 0 | 0 |
| 3. Fusion, coverage above 0.5 | `9bfd41cd` | 0.9867 (74/75) | 0.9322 | 0.9461 | 0/16 | 0/16 | 0 | 0 |
| 4. Abstention, both modes | `532a0226` | 0.9867 (74/75) | 0.9322 | 0.9461 | 5/16 | 14/16 | 0 | 0 |
| 5. Full text flags instead | `33f1b04a` | 0.9867 (74/75) | 0.9322 | 0.9461 | 5/16 | 14/16 | 0 | 0 |

| v1, fulltext | Commit | Recall at 5 | MRR | nDCG at 5 | No-answer correct | Abstained or flagged | Leaks | Errors |
|---|---|---|---|---|---|---|---|---|
| Before | `6d3cb068` | 0.5733 (43/75) | 0.4436 | 0.4756 | 0/16 | 7/16 | 0 | 0 |
| 1. Chunk full text | `247aa457` | 0.7733 (58/75) | 0.7100 | 0.7261 | 0/16 | 12/16 | 0 | 0 |
| 2. Fusion, every match votes | `afa8bf11` | 0.7733 (58/75) | 0.7100 | 0.7261 | 0/16 | 12/16 | 0 | 0 |
| 3. Fusion, coverage above 0.5 | `9bfd41cd` | 0.7733 (58/75) | 0.7100 | 0.7261 | 0/16 | 12/16 | 0 | 0 |
| 4. Abstention, both modes | `532a0226` | 0.7600 (57/75) | 0.6967 | 0.7127 | 9/16 | 16/16 | 0 | 0 |
| 5. Full text flags instead | `33f1b04a` | 0.7733 (58/75) | 0.7100 | 0.7261 | 0/16 | 16/16 | 0 | 0 |

| v1, hash | Commit | Recall at 5 | MRR | nDCG at 5 | No-answer correct | Abstained or flagged | Leaks | Errors |
|---|---|---|---|---|---|---|---|---|
| Before | `6d3cb068` | 0.5600 (42/75) | 0.4018 | 0.4407 | 0/16 | 7/16 | 0 | 0 |
| 1. Chunk full text | `247aa457` | 0.5600 (42/75) | 0.4018 | 0.4407 | 0/16 | 7/16 | 0 | 0 |
| 2. Fusion, every match votes | `afa8bf11` | 0.5600 (42/75) | 0.4018 | 0.4407 | 0/16 | 7/16 | 0 | 0 |
| 3. Fusion, coverage above 0.5 | `9bfd41cd` | 0.5600 (42/75) | 0.4018 | 0.4407 | 0/16 | 7/16 | 0 | 0 |
| 4. Abstention, both modes | `532a0226` | 0.5600 (42/75) | 0.4018 | 0.4407 | 0/16 | 7/16 | 0 | 0 |
| 5. Full text flags instead | `33f1b04a` | 0.5600 (42/75) | 0.4018 | 0.4407 | 0/16 | 7/16 | 0 | 0 |

| v2, semantic | Commit | Recall at 5 | MRR | nDCG at 5 | No-answer correct | Abstained or flagged | Leaks | Errors |
|---|---|---|---|---|---|---|---|---|
| Before | `6d3cb068` | 0.9868 (75/76) | 0.9232 | 0.9397 | 0/33 | 0/33 | 0 | 0 |
| 1. Chunk full text | `247aa457` | 0.9868 (75/76) | 0.9232 | 0.9397 | 0/33 | 0/33 | 0 | 0 |
| 2. Fusion, every match votes | `afa8bf11` | 0.9737 (74/76) | 0.8232 | 0.8611 | 0/33 | 0/33 | 0 | 0 |
| 3. Fusion, coverage above 0.5 | `9bfd41cd` | 0.9868 (75/76) | 0.9452 | 0.9560 | 0/33 | 0/33 | 0 | 0 |
| 4. Abstention, both modes | `532a0226` | 0.9868 (75/76) | 0.9452 | 0.9560 | 10/33 | 20/33 | 0 | 0 |
| 5. Full text flags instead | `33f1b04a` | 0.9868 (75/76) | 0.9452 | 0.9560 | 10/33 | 20/33 | 0 | 0 |

| v2, fulltext | Commit | Recall at 5 | MRR | nDCG at 5 | No-answer correct | Abstained or flagged | Leaks | Errors |
|---|---|---|---|---|---|---|---|---|
| Before | `6d3cb068` | 0.6316 (48/76) | 0.3414 | 0.4121 | 0/33 | 20/33 | 0 | 0 |
| 1. Chunk full text | `247aa457` | 0.6974 (53/76) | 0.6105 | 0.6319 | 0/33 | 28/33 | 0 | 0 |
| 2. Fusion, every match votes | `afa8bf11` | 0.6974 (53/76) | 0.6105 | 0.6319 | 0/33 | 28/33 | 0 | 0 |
| 3. Fusion, coverage above 0.5 | `9bfd41cd` | 0.6974 (53/76) | 0.6105 | 0.6319 | 0/33 | 28/33 | 0 | 0 |
| 4. Abstention, both modes | `532a0226` | 0.6447 (49/76) | 0.5849 | 0.5997 | 8/33 | 32/33 | 0 | 0 |
| 5. Full text flags instead | `33f1b04a` | 0.6974 (53/76) | 0.6105 | 0.6319 | 0/33 | 32/33 | 0 | 0 |

| v2, hash | Commit | Recall at 5 | MRR | nDCG at 5 | No-answer correct | Abstained or flagged | Leaks | Errors |
|---|---|---|---|---|---|---|---|---|
| Before | `6d3cb068` | 0.6053 (46/76) | 0.2855 | 0.3633 | 0/33 | 20/33 | 0 | 0 |
| 1. Chunk full text | `247aa457` | 0.6053 (46/76) | 0.2855 | 0.3633 | 0/33 | 20/33 | 0 | 0 |
| 2. Fusion, every match votes | `afa8bf11` | 0.6053 (46/76) | 0.2855 | 0.3633 | 0/33 | 20/33 | 0 | 0 |
| 3. Fusion, coverage above 0.5 | `9bfd41cd` | 0.6053 (46/76) | 0.2855 | 0.3633 | 0/33 | 20/33 | 0 | 0 |
| 4. Abstention, both modes | `532a0226` | 0.6053 (46/76) | 0.2855 | 0.3633 | 0/33 | 20/33 | 0 | 0 |
| 5. Full text flags instead | `33f1b04a` | 0.6053 (46/76) | 0.2855 | 0.3633 | 0/33 | 20/33 | 0 | 0 |

### What the numbers show

1. **Leaks and errors stayed 0** in every mode, on both sets, at every commit.
2. **Full text is the large gain.** It served 9 of 108 v1 questions before and 91 after; 8 of 125 and then
   105 on v2. For questions naming an exact term,
   full-text recall at 5 is now 1.0000 on both sets (v1 before: 0.8636).
3. **Plain fusion made semantic worse** (v1 MRR 0.9116 to 0.8433; v2 recall 75/76 to 74/76). I had expected
   a gain. Chunks with few of the question's words were outvoting the right paraphrase: the 17 demoted v1
   paraphrases had no match above 0.45 coverage. Counting only coverage above 0.5 beat the baseline on both
   sets. That rule was chosen from v1.
4. **Semantic abstention held up on v2.** It abstains on 5/16 v1 and 10/33 v2 no-answer questions and
   abstains on or flags 14/16 and 20/33, with no change to recall, MRR or nDCG. On answerable questions: v1
   flags 2 of 75 (P04, P14) and abstains on none. v2 flags 10 of 76 and abstains on one, P27, whose sources
   were already wrong before this change.
5. **The flag is less precise on v2 than on v1** (10 of 76 against 2 of 75 answerable questions flagged;
   20/33 against 14/16 no-answer ones). This is the expected cost of choosing limits on v1, and they were
   not adjusted after seeing it.
6. **Full-text abstention was measured and dropped.** It passed v1 with no margin (57/75, recall at 5
   exactly at the minimum, P11 lost) and failed v2 (53/76 to 49/76: P04, P06, P20, P35 lost). By the plan's
   rule it became a review flag, so full-text mode still never abstains.
7. **In full-text mode the review flag says little.** It reached 16/16 and 32/33 no-answer questions, but any
   source with coverage under 0.5 also sets it, and the gate does not record flags on answerable questions
   in that mode, so its precision is not measured. It was 12/16 and 28/33 before this flag, and 7/16 and
   20/33 before any change.

## What changed

- `golden/v2`: 62 documents and 125 questions (76 with an answer, 33 without one), committed and measured on
  unchanged retrieval code before any retrieval commit. `golden/v1` corpus and questions are unchanged and
  both sets are pinned by hash in `goldenSetV2.test.ts`. The gate measures v1, then v2.
- `supabase/migrations/20261125120000_rag_chunk_fulltext.sql` (rollback file beside it): generated column,
  GIN index, and `search_rag_chunks_fulltext`, callable by `service_role` only. The existing
  `search_*_fulltext` functions are unchanged.
- `src/services/rag/`: `chunkFullText.ts`, `retrievalFusion.ts`, `retrievalEvidence.ts`, `abstention.ts`,
  and their use in `tenantRagWorkflow.ts`. `RagAnswer` gained an optional `retrievalEvidence`.
- `scripts/rag-gate-mutations.mjs`: breakages for full text, fusion and abstention.
- Thresholds raised from measured runs only. None was lowered.

## What did not change

Authorization, tenant checks, ingestion, embedding model, chunk size, `package.json`, hash mode ranking, and
the routes. Where the migration is not applied, retrieval takes its previous path.

## Limits

- **v2 is held out in time, not independent.** One author wrote both sets, and had read v1 before writing
  v2. It was committed before any retrieval change (`6d3cb068`). Aggregate v2 numbers were visible in the failed plain
  fusion run; the fix was chosen from v1 only.
- **Small sets.** One question is 0.0133 of v1 recall and 0.0625 of v1 no-answer correctness. Small
  differences are not evidence. English, synthetic, clean text; nothing here predicts customer documents.
- **Thin margins.** Limits are fitted to gte-small and to the 91 v1 questions that have an answer or
  have none. A correctly answered v1 question (P14) scores 0.790, near the abstain line of 0.785; P21 has
  coverage 0.255, near the 0.25 review line. A new embedding model or another language needs re-measuring.
- **Follow-up questions are judged alone.** Conversation history does not reach retrieval, so "what about
  the second one?" can now abstain where it used to return unrelated sources. Not in either set.
- **Questions not in English** are stemmed as English and embedded by an English model. They may abstain or
  be flagged more often. Not measured.
- **Full text still loses some paraphrases** that the token hash ranked by luck: 7 of 75 in v1 and 8 of 76
  in v2 rank lower than before, all but one of them paraphrases, against larger gains elsewhere.
- **Hash mode cannot abstain.** It has no word evidence. Its no-answer correctness stays 0.
- **Knowledge articles** and answer text are not measured.
- **Applying the migration** rewrites `rag_document_chunks` once under an exclusive lock. It is not applied
  anywhere except the CI runner's throwaway database; until it is, the new function is missing and retrieval
  behaves as it does today.

## Verification

| Check | Where | Result |
|---|---|---|
| RAG gate, each step | CI runs under Results | as listed |
| RAG gate, final code | CI run 45549466974 on `13960f0a` | passed, 2026-11-25T04:55:26Z; 16 of 16 breakage runs caught; 0 leaks, 0 errors |
| Full unit suite, lint, typecheck, build | CI Repository Quality 45549467145 on `13960f0a` | passed; 407 files, 2614 tests |
| Playwright | CI 45549466949 on `13960f0a` | 35 passed, 28 skipped; the base branch run 45454071912 has the same counts |
| `pnpm run typecheck`, `pnpm --dir apps/mobile run typecheck`, `pnpm run lint` | local, `532a0226` | exit 0, exit 0, exit 0 with no warnings |
| `pnpm run supabase:verify` | local, `532a0226` | passed; one warning, in `20260702165736_initial_enterprise_schema.sql`, not touched here |
| `pnpm exec tsc --noEmit`, `src/services/rag` tests, eslint on changed code | local, flag-only change | exit 0; 137 passed; clean |
| Full unit suite, first run | local, overlapped with edits | 407 files and 2614 tests passed, then exit 139 |
| Full unit suite, second run | local, `33f1b04a`, log head records the commit | 407 files and 2614 tests passed, exit 0. Only threshold JSON and docs changed during it |
| Red first | local, each step | chunk full text, fusion, evidence and abstention tests failed before their code and passed after. Abstention: 4 failed; flag-only: 1 failed |

The migration ran only in CI's throwaway database, through `supabase start`. Its SQL has no hosted run.
Screens were not checked by hand: no UI changed.

## Remains open

- RAGQ-1, owner Claude Code: the first local full-suite run exited 139 after every test passed. It did not
  happen on the rerun or in CI. `CHUNKED_DOCUMENT_UPLOAD_ARCHITECTURE_CLOSEOUT_2026_07_31.md` and
  `RAG_DOCUMENT_TEXT_EXTRACTION_CLOSEOUT_2026_07_30.md` describe similar local crashes from native modules.
  Same cause here is a hypothesis, not shown.
- Founder decisions: merge #574, then #575; and when to apply the migration.
- Possible follow-up, unverified: `match_rag_document_chunks` filters by organization and document after the
  HNSW search, so on a large multi-tenant table it could return fewer rows than exist. The golden sets are
  too small to show it.

## Decision ledger

```
Decision: Add any-word full text over chunk bodies, coverage-gated rank fusion, and two-signal abstention.
Why: Full text served 9 of 108 questions, form codes ranked low, and no-answer questions always got sources.
What changed: One additive migration, retrieval order in semantic mode, full-text mode, abstention.
Architecture boundary: Postgres full text and pgvector only. Authorization stays in tenantRagWorkflow.ts.
Product boundary: Some questions now return no sources and ask for human review.
Verification: CI runs listed under Results, each on its own commit.
Outcome: Measured on v1 and held-out v2 as above. Merge: Pending, review by 2026-12-09.
Follow-up: Real-question set from pilot users; abstention limits re-measured if the embedding model changes.
```
