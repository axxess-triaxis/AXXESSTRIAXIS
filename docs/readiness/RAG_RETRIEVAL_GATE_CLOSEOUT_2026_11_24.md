# RAG gate that runs real retrieval: closeout, 2026-11-24

PR [#574](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/574), branch `feat/rag-real-retrieval-gate`,
from `main` `0c532d53`. Status: **PR open; not merged, not deployed. No production data was read or
written.** Plan and acceptance criteria: `RAG_REAL_RETRIEVAL_GATE_PLAN_2026_11_24.md`.

## Signal and decision

Founder intent: credible AI engineering evidence, and an honest measure before any comparison of
pgvector, MongoDB vector search or LangGraph. The gate on `main` could not provide it.

## What was wrong

- `scripts/rag-release-gate.mjs` scored observations it built from its own two fixtures and imported no
  retrieval code. Copied alone into an empty directory it printed `"status": "passed"` and exited 0.
- `GET /api/rag/evaluation` always scored those built observations. `POST` with no observations did the
  same and wrote a `passed` row to `rag_release_gates`.
- A fixture with no observation and no expected source was a warning, not a failure.

Red first: on `67b6ec64` (tests only, no fix) CI run 45447751231 reported 8 failed and 2533 passed tests.
The 8 are the new ones. On that same commit the old `Required RAG Release Gate` check passed.

## Results

Golden set v1, commit `5b1e7dcfe2e3be57c46eaa7aad5673f6b47c42e4`, CI run 45451898878, measured
2026-11-24T17:49:02Z. 56 synthetic documents, 61 chunks, 3 tenants, 108 questions (75 have an answer).
Raw per-question output: `src/services/rag/evaluation/golden/v1/baseline-results.json`.

| Mode | Recall at 5 | MRR | nDCG at 5 | No-answer correct (16) | No-answer abstained or flagged | Cross-tenant leaks | Unauthorized leaks | Errors | Served by |
|---|---|---|---|---|---|---|---|---|---|
| hash | 0.5600 (42/75) | 0.4018 | 0.4407 | 0/16 | 7/16 | 0 | 0 | 0 | full scan 108 |
| full text | 0.5733 (43/75) | 0.4436 | 0.4756 | 0/16 | 7/16 | 0 | 0 | 0 | full text 9, full scan 99 |
| semantic | 0.9867 (74/75) | 0.9116 | 0.9303 | 0/16 | 0/16 | 0 | 0 | 0 | semantic 107, full scan 1 |
| *random order, calculated* | *0.3511* | *0.1603* | *0.2070* | | | | | | |

The random row is calculated, not run: a user here can read 13 to 18 documents, so five picked at random
often include the right one. Read the other rows against it, not against zero.

| Recall at 5 by category | hash | full text | semantic |
|---|---|---|---|
| Paraphrase (34) | 0.4118 | 0.4118 | 1.0000 |
| Exact terms (22) | 0.8182 | 0.8636 | 1.0000 |
| Restricted, allowed (10) | 0.2000 | 0.2000 | 1.0000 |
| Restricted, denied, with a permitted answer (1) | 1.0000 | 1.0000 | 1.0000 |
| Cross-tenant with an own-tenant answer (8) | 0.8750 | 0.8750 | 0.8750 |

Three attempts on `fa0c17db` (run 45449439144) and the run above gave identical metrics.

### What the numbers show

1. **Isolation held.** Zero leaks in 108 questions in each mode, including 26 that aim at another tenant's
   document or one the user may not read, two of them asked by a Super Admin.
2. **Semantic is the only strong mode here.** Without the embed function, paraphrase recall at 5 falls from
   1.0000 to 0.4118.
3. **Full text served 9 of 108 questions.** `websearch_to_tsquery` requires every word, and
   `documents.search_vector` covers the title and a two-sentence description, not the body. It adds little
   over the hash.
4. **Nothing abstains.** Every no-answer question returned sources in every mode, and in semantic mode none
   was flagged for human review: unrelated questions scored 0.76 to 0.85 on gte-small, above the 0.5 review
   line. Correctly answered questions scored as low as 0.79, so a fixed cutoff would not separate them.
5. **Form codes are semantic's weak spot.** `form HB-PIL-221` and `form number HB-SPL-03` ranked 4th and
   5th.

Findings 3 to 5 describe existing behaviour. This change does not alter retrieval.

### Breaking retrieval fails CI

- **Self-test on every run:** 8 edits to the real source, 9 runs, all caught. Examples: ranking reversed
  (semantic recall at 5 0.0267), embeddings unavailable (0.5733), authorization removed (55 unauthorized
  leaks), tenant isolation removed (329 cross-tenant leaks). The last needed four layers removed together.
- **A pushed break:** `dbd8df4e` inverted the semantic score in `tenantRagWorkflow.ts`. CI run 45452956838
  failed. Reverted in the next commit.

## What changed

- `scripts/rag-release-gate.mjs`: rewritten. With no backend it exits 2 (`not_measured`), never 0.
- `scripts/rag-gate-mutations.mjs`: the deliberate breakages.
- `src/services/rag/evaluation/`: `goldenSet.ts`, `retrievalMetrics.ts`, `retrievalScoring.ts`,
  `retrievalHarness.ts`, `golden/v1/`, tests. `buildPassingRagReleaseGateObservations` is deleted, and a
  fixture with no observation now fails.
- `src/app/api/rag/evaluation/route.ts`: `GET` answers `not_measured` with a null result. `POST` returns
  400 and records nothing unless complete observations are supplied, and marks rows
  `observationSource: client_supplied`.
- `.github/workflows/rag-release-gate.yml`: starts a local Supabase stack. Same job name; more paths.
- `docs/RAG.md` and dated correction notes in the documents that cite the gate.

## What did not change

Retrieval, ingestion, migrations, dependencies, `package.json`, and the Pilot Command Center, which still
lists the two old fixtures as evidence.

## Limits

- **Synthetic and small.** One author wrote the documents and the questions, so they share vocabulary and
  structure. Documents are clean English of 24 to 177 words. Nothing here covers scanned text, tables,
  other languages, long documents or real user phrasing. These numbers do not predict quality on customer
  documents.
- **Small corpus.** 13 to 18 readable documents per user. Recall at 5 will be lower on a real library, and
  HNSW search is barely exercised at 61 chunks.
- **Labels are one person's judgement**, with one relevant document per question. X08 is arguable: a clinic
  retention schedule does not mention weighbridge tickets. It stays as first written, because changing
  labels after seeing results would be tuning.
- **Retrieval only.** Answer quality and model output are not measured. No model is called.
- **Two vacuous minimums.** No-answer correctness is 0 in every mode and the flagged share is 0 in semantic
  mode, so those minimums cannot fail until abstention exists.
- **Leak checks cover these probes.** Zero leaks here is not a proof that no leak is possible.
- **Knowledge articles** are not in the set. Conversation history and attached-document filters are not
  exercised.

## Verification

| Check | Command | Result |
|---|---|---|
| RAG gate, baseline commit | CI run 45451898878 | passed, 9 of 9 breakage runs caught |
| RAG gate, deliberate break | CI run 45452956838 | failed as intended |
| Local typecheck | `pnpm exec tsc --noEmit` | exit 0 |
| Full suite, lint, build, Playwright, mobile typecheck, Supabase verify | CI on the PR head | see the PR checks and the PR description |

The full Vitest suite was not run locally: the machine had about 0.5 GB of free memory. CI is the gate.

## Corrections made to past documents

A dated note was added to each document that cites this gate: `CHANGELOG.md`, `docs/SPRINT_LOG.md`,
`docs/SPRINT_22_23_PILOT_COMMAND_CENTER.md`, `docs/SPRINT_24_LIVE_REVIEW_OAUTH_SANDBOX_GATES.md`,
`docs/SPRINT_25_TOKEN_VAULT_GMAIL_RAG_GATES.md`, `docs/SPRINT_29_PILOT_TENANT_ACCEPTANCE.md`,
`docs/TESTING_DUE_DILIGENCE.md`, `docs/AUTOMATION_OVERVIEW.md`, `docs/archive/README_FULL_2026_10_29.md`,
and the closeouts `AGENT_CALL_PIPELINE_CLOSEOUT_2026_11_13.md`,
`LOCKFILE_DEPLOY_PIPELINE_INCIDENT_CLOSEOUT_2026_08_06.md`,
`RELEASE_AGE_GATE_AND_BUILD_INCIDENT_CLOSEOUT_2026_08_12.md` and
`SECURITY_HARDENING_CLOSEOUT_2026_08_22.md`. Closeouts that say only "all checks passed" also counted this
check; they were not edited one by one, and this paragraph is their correction.

## Remains open

- Founder merge decision on the PR.
- `rag_release_gates` in production may hold passes recorded with no observations. Not checked; production
  was out of scope. Treat every row dated before this change as unverified.
- `POST /api/rag/evaluation` still lets any signed-in user record observations they typed in, because it
  writes with the service role. The row now says `client_supplied`. An admin-only check is a separate change.
- Findings 3 to 5 are candidates for later work, measured with this gate.

## Decision ledger

```
Decision: Replace the self-passing RAG gate with one that runs production retrieval on a disposable Supabase stack.
Why: The old gate could not fail, so its passes were not evidence.
What changed: Gate, harness, golden set, API behaviour, CI workflow, correction notes.
Architecture boundary: Existing pgvector and PostgREST path only. No LangChain, LangGraph, MongoDB or new dependency.
Product boundary: Retrieval behaviour is unchanged. POST /api/rag/evaluation now rejects empty input.
Verification: CI runs 45447751231 (red), 45451898878 (pass), 45452956838 (deliberate failure).
Outcome: The gate fails on real breakages. Merge: Pending, review by 2026-12-08.
Follow-up: Abstention, full-text coverage and the API role check, each as its own change.
```
