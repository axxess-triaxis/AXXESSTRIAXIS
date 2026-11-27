# Vector search benchmark: closeout, 2026-11-27

PR [#585](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/585), branch `feat/mongo-vector-benchmark`, plan
`RAG_VECTOR_BENCHMARK_PLAN_2026_11_25.md`. Status: **pgvector half measured. MongoDB half not run.** No file that
ships to production changed. Synthetic data only. No production data, hosted project or secret was touched, and
`cluster0` was never contacted.

## Signal and decision

On 2026-11-25 the founder supplied an Atlas connection string with the password left as a placeholder, and chose a
vector search benchmark. The open question came from `RAG_RETRIEVAL_QUALITY_CLOSEOUT_2026_11_25.md`:
`match_rag_document_chunks` filters after the HNSW search, so a large multi-tenant table could return fewer rows than
exist.

## Results (pgvector, public)

CI run 45867443226 on `c5bca5ab`, 2026-11-26T17:29:05Z. Postgres 17.6, pgvector 0.8.2. Raw output is in that run's
`rag-vector-benchmark` artifact.

**Part A, golden sets in semantic mode**

| Set | Questions | Recall at 5 | MRR | nDCG at 5 | Leaks | Errors | Searches recorded | Candidate recall against brute force |
|---|---|---|---|---|---|---|---|---|
| v1 | 108 | 0.9867 | 0.9322 | 0.9461 | 0 | 0 | 107 | 1.0000 |
| v2 | 125 | 0.9868 | 0.9452 | 0.9560 | 0 | 0 | 124 | 1.0000 |

Retrieval quality matches the RAG gate's figures in `RAG_RETRIEVAL_QUALITY_CLOSEOUT_2026_11_25.md`.

**Part B, shipped function at 2k, 20k and 50k rows** (one tenant 90%, five at 0.4%, 25 requests per group)

- Recall at 50 was **1.0000 in every arm, size and group**, with 0 short results and 0 candidates outside the request.
- At 50k rows the shipped function took p50 1.76 ms and p95 2.21 ms for the large tenant with 3 documents, and p50 3.83
  ms and p95 5.28 ms with 500 documents. Small tenants took 0.24 ms or less at p50.
- Both breakages were caught: organization filter removed and document filter removed.

### What the numbers show

1. **Postgres never used the HNSW index.** Every saved plan, `auto_explain` inside the function, is a bitmap scan on
   `rag_document_chunks_document_idx` and `rag_document_chunks_digest_idx` (organization), then an exact sort on
   distance. The plan, timings and rows are the same with the index switched off.
2. **So no rows are lost on this path, by construction.** The filters run first and the sort is exact. This is the
   plan production gets for these list lengths, since the request carries the authorized document ids.
3. **The risk in the open question was not exercised.** No arm reached HNSW followed by a filter. The `ef_search 200`
   and `iterative scan` arms therefore measured nothing different, and their numbers say nothing about HNSW tuning.
4. **When Postgres would switch to HNSW is unknown.** That could be a much larger table, a much longer document list,
   or different statistics. The benchmark cannot force that plan without changing the query.

### Against the decision rule

The rule fixed in the plan was: keep pgvector unless it loses rows under filtering and its own settings cannot fix
it. Rows were not lost, so **the recommendation is to keep pgvector.** That holds for the plan Postgres chose here, not
for an HNSW plan, which was not reached.

## MongoDB half (private): not run

- **Licence.** The four licence files in the pinned image `mongodb/mongodb-atlas-local` (amd64
  `sha256:b668285f...`) were read without starting it. They are SSPL v1 (server and mongot) and Apache 2.0 (runner),
  and none mentions benchmarks. MongoDB's Customer Agreement section 4(f) restricts publishing benchmark results.
  Founder decision 2026-11-25: MongoDB numbers stay private. This is a reading of the text, not legal advice.
- **Blocked.** Docker Desktop is not running on the founder's machine (`dockerDesktopLinuxEngine` pipe missing,
  2026-11-27), and the host had about 0.65 GB of free memory, while the container needs 2 GB.
- **Ready to run.** `scripts/rag-vector-benchmark-mongo.mjs --export <export.json.gz>` uses that run's export. It
  refuses to run in CI, writes to gitignored `test-results/`, and asks for an Atlas password with hidden input.
- Given finding 2, a MongoDB run could at most match pgvector on correctness for these workloads. It remains useful
  only as a latency comparison on one machine.

## What changed

| Area | Files |
|---|---|
| Benchmark code | `src/services/rag/evaluation/vectorBenchmark/` (`exactSearch.ts`, `mongoCandidates.ts`, `recordRequests.ts`, `scaleCorpus.ts`, test) |
| Scripts | `scripts/rag-vector-benchmark.mjs` (CI only, exits 2 elsewhere), `scripts/rag-vector-benchmark-mongo.mjs` (private, exits 2 in CI) |
| CI | `.github/workflows/rag-vector-benchmark.yml`, not required |
| Dependency | `mongodb@7.9.0`, dev only, Apache-2.0. 7.9.1 was under the 7-day release-age rule |
| Docs | the plan, this closeout, `DECISION_OUTCOME_LEDGER.md`, `EVIDENCE_INDEX.md` |

## What did not change

Retrieval, migrations, thresholds, the RAG gate, the app, Vercel and hosted Supabase settings.

## Verification

| Check | Result |
|---|---|
| New unit tests | 21 failed first (no module), then 21 passed, local, `--pool=forks` |
| `tsc --noEmit`, `pnpm --dir apps/mobile run typecheck`, `pnpm run lint`, `supabase:verify`, `lite:guard` | exit 0 on `1171d3a0`, local. The mobile and lint exit codes were read through a pipe, so CI is the record |
| CI on `c5bca5ab` | Build, Lint, Type Check, playwright, validate, security and mobile checks passed. Vector benchmark passed |
| Scripts without backends | both exit 2 (`not_measured`) |
| Live check | not applicable: nothing deployed changes. Vercel previews only |

## Remains open

- **RAGBENCH-1, required RAG gate fails on this PR's head, owner Claude Code.** Attempt 1 failed with v2 semantic at
  123 of 125 served (minimum 124), and attempt 2 with v1 semantic at 106 of 108 (minimum 107). Both logs show the local
  Edge Runtime ending embed requests ("CPU time soft limit reached", "early termination"). `embedTexts` turns that into
  a silent fallback, so a question is answered by full text. This PR changes no retrieval code, and `main` passed the
  gate on `79ed334e` with the same retrieval code. Hypothesis: the embed function's CPU limit on the shared runner,
  not code. Not proven. The fix belongs in the gate: retry an embed that the runtime ended, or report such a question
  as not measured rather than as a fallback. It was not re-run a third time.
- **RAGBENCH-2, MongoDB half not run, owner founder (Docker).** Needs Docker Desktop working and about 2 GB free.
- **RAGBENCH-3, HNSW-plus-filter path unmeasured.** It would need a size or list length where Postgres picks HNSW.
- Vercel preview for `triaxis-product-investor-demo` failed on the free plan's 100 deployments a day. Not a code fault.

## Approvals asked this session

Four questions: purpose and checkout (2026-11-25), and licence download and publication (2026-11-25). None could
have been avoided: they were a product choice, a download and a publication decision.

## Decision ledger

```
Decision: Keep pgvector. Benchmark MongoDB only privately, and only as a latency comparison.
Why: At 2k to 50k skewed rows the shipped function lost no rows: Postgres filters first, then sorts exactly.
What changed: Benchmark code, two scripts, a non-required workflow, one dev dependency, docs.
Architecture boundary: No change to retrieval, migrations or the app. MongoDB is not a store for AXXESS.
Product boundary: None. Nothing a user sees changes.
Verification: CI run 45867443226 on c5bca5ab; plans recorded by auto_explain.
Outcome: Pending, review by 2026-12-10 (RAG gate fix for RAGBENCH-1, then merge).
Follow-up: RAGBENCH-1 gate robustness; RAGBENCH-2 private MongoDB run; RAGBENCH-3 HNSW path.
```
