# Plan: rank fusion, chunk full text and abstention (2026-11-24)

Status: **approved by the user ("Yes, after merge"). On 2026-11-25 the user changed the start condition to
"Start stacked now", because #574 was still open, so this work is stacked on its branch in PR
axxess-triaxis/AXXESSTRIAXIS#575.** Results: `RAG_RETRIEVAL_QUALITY_CLOSEOUT_2026_11_25.md`.

Prerequisite: PR axxess-triaxis/AXXESSTRIAXIS#574 on `main`. Checked 2026-11-24 and 2026-11-25: OPEN,
CLEAN, head `ba73ac89`. Everything below was read from that commit.

## What the baseline says (golden/v1/baseline-results.json)

- Semantic top scores: no-answer 0.764 to 0.850; correctly answered 0.782 to 0.955. A cutoff that keeps
  every correct answer (0.782) abstains on 4 of 16. So no fixed cutoff, as the brief says.
- Semantic answers not ranked first: P08, P13, P14, P20, P21, P33, E01, E02, R02. X08 missed (arguable label).
- `full text` served only E01 E03 E06 E08 E14 E16 E21 E22 R08. It requires every word and reads title and
  description only, never the chunk body.
- `answerTenantQuestion` falls back to `answerWithGovernedRag` when citations are empty, so returning no
  citations is not yet abstention: the fallback would answer from metadata.

## Acceptance criteria

1. `golden/v1` byte-identical. `golden/v2` committed, with its own baseline measured on unchanged retrieval
   code, before any retrieval commit. Git order is the proof.
2. Each change is its own commit with its own CI run of `pnpm run rag:release-gate --self-test`.
3. Leaks and errors stay 0 in all modes on both sets. Recall at 5, MRR and nDCG at 5 are not below the v1
   baseline in any mode, and not below the v2 baseline.
4. Rules and weights are chosen on v1 only. v2 is read for the before and after table. If a rule passes v1
   and fails v2, it is dropped or reduced to flag-only; it is not retuned on v2.
5. Thresholds go up only from measured runs, same rule as v1 (baseline minus one question).
6. New self-test breakages (below) are all caught.
7. Before and after table with commits checked in, full checks pass, PR open. No merge, no deploy, no
   migration applied to a hosted project, no production data.

## Steps, one commit and one CI run each

0. Plan document. Then the gate reads a list of golden versions (today `GOLDEN_VERSION` is a constant).
1. **v2 held-out set.** New invented tenants and sectors, new documents and vocabulary, about 100
   questions: paraphrases, codes, restricted and cross-tenant probes, and more no-answer questions than v1
   (about 30), including near misses (topic is covered, the asked fact is not) and codes that do not exist.
   Written from this specification, not from any rule's output. Measure the unchanged code: the "before" row.
2. **Chunk full text with OR matching.** New additive migration: GIN index on
   `to_tsvector('english', chunk_text)` and a `service_role`-only function
   `search_rag_chunks_fulltext(org, document_ids, query, limit)`, same contract as
   `match_rag_document_chunks`: candidates are limited to the already authorized document ids, returns id,
   rank and rarity-weighted query coverage. The existing `search_*_fulltext` functions are unchanged
   (`toolRegistry.ts` and `governedRag.ts` use them). Missing RPC falls back to today's path.
3. **Rank fusion** in semantic mode: reciprocal rank of the semantic list and the chunk full-text list.
   Displayed `score` stays the cosine value, so confidence and review lines keep their meaning; only order
   changes. `retrievalMode` stays `semantic`.
4. **Abstention.** Not a cutoff alone. Candidates, compared on v1: top score relative to the user's other
   authorized chunks (gap or z-score), combined with rarity-weighted word coverage. Abstain only when both
   are weak; when one is weak, flag for human review. Evidence is computed only over documents the user may
   read, so abstaining reveals nothing about hidden ones. Abstaining skips the `answerWithGovernedRag`
   fallback and still reports the serving path. Semantic and full-text modes first; hash only if it costs no
   recall.

Because later steps use step 2, the table is cumulative by commit. It also lists each step's own change.

## Tests

Red first for each step: unit tests in `tenantRagWorkflow.test.ts` for OR matching use, fusion order,
unauthorized chunk never fused in, abstention not falling through to governed RAG, RPC-missing fallback;
SQL contract test for grants (not callable by anon or authenticated). New mutations: chunk full text
returns nothing, fusion ignores the semantic list, abstain always, abstain never, document-id filter
removed from the new function's caller. Existing mutation edits that stop matching are updated in the same commit.

## Files

`supabase/migrations/<new>.sql`, `src/services/rag/tenantRagWorkflow.ts` (790 lines already, so fusion and
abstention go in a new `src/services/rag/retrievalFusion.ts` and `abstention.ts`),
`evaluation/golden/v2/*`, `scripts/rag-release-gate.mjs`, `scripts/rag-gate-mutations.mjs`, tests,
`docs/RAG.md`, closeout, matrix and decision ledger.

## Risks and limits

- One author writes both sets and has read v1. v2 is held out in time, not independent. Will be stated.
- 16 no-answer questions in v1: one question is 0.0625. Small differences are not evidence.
- A rule that meets criterion 3 may abstain on few questions. That result will be reported as it is.
- Measuring is CI only: Docker Desktop was not running and the machine has 8 GB with about 1.2 GB free.
  CI cancels superseded runs, so pushes are one at a time.
- Migration is unapplied to any hosted project; the new code must behave as today there until it is.

## Out of scope

LangChain, LangGraph, MongoDB, paid models, rerankers, knowledge articles, `POST /api/rag/evaluation`,
chunk size, embedding model.
