# Plan: vector search benchmark, pgvector and MongoDB (2026-11-25)

Branch `feat/mongo-vector-benchmark` from `main` `754524ff`. Approved by the founder 2026-11-25; recorded before any
benchmark ran. Motivation: the RAG gate (#574) was built so this comparison would have an honest baseline, and
`RAG_RETRIEVAL_QUALITY_CLOSEOUT_2026_11_25.md` left one question unverified: `match_rag_document_chunks` filters after
the HNSW search, so a large multi-tenant table could return fewer rows than exist.

The outcome is evidence and a recommendation. MongoDB is not being adopted.

## Changed after approval

Step 0 read the licences before code was written.

- MongoDB's Customer Agreement section 4(f) restricts publishing benchmark results. It covers Enterprise software and
  excludes open source components. The four licence files in the pinned Atlas Local image
  (`sha256:b668285f...`, read without starting it) are SSPL v1 (server, mongot, and a pointer to it) and Apache 2.0
  (runner). A text search of them found no benchmark or publication clause. This is a reading, not legal advice.
- Founder decision the same day: **MongoDB numbers stay private.** This repository is public, so MongoDB does not run in
  CI and no MongoDB number goes into code, logs, artifacts, a PR or this folder.
- So the MongoDB half answers searches recorded by the pgvector half instead of running `answerTenantQuestion` beside a
  Supabase stack. If its candidates equal pgvector's, all later steps get the same input. If not, end-to-end quality for
  MongoDB is **not measured**, and that is reported.

## Acceptance criteria

1. Part A (public): golden v1 and v2 in semantic mode through the unchanged `answerTenantQuestion`, with candidate recall
   and leaks checked before authorization. Must meet the RAG gate's thresholds.
2. Part B (public): the shipped function at 2k, 20k and 50k rows with skewed tenants. Recall at 50 and rows returned
   against brute force, p50 and p95, and the plan Postgres used.
3. MongoDB (private): the same requests. Scores are compared with independently computed cosine (1e-4); a mismatch stops
   the comparison.
4. Deliberate breakages are caught: organization filter removed, document filter removed, score conversion wrong.
5. No file that ships to production changes. Synthetic data only. No secret anywhere. Without backends: exit 2.

## Decision rule, fixed before measuring

- A golden-set difference under 2 questions per set is no difference.
- Keep pgvector unless it loses rows under filtering **and** its own settings (`hnsw.ef_search`,
  `hnsw.iterative_scan`, a partitioned index) do not fix it.
- Latency compares only arms on the same machine. CI, a laptop and Atlas are never compared with each other.

## Out of scope

Retrieval behaviour, migrations, hosted Supabase, production data, Vercel settings, LangChain, LangGraph, Atlas
automated embedding, MongoDB full-text search, any paid tier.
