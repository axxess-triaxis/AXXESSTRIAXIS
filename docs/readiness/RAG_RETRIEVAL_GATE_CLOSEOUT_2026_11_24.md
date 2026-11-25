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
- `POST /api/rag/evaluation` let any signed-in user record observations they typed in, because it writes
  with the service role. Fixed in a follow-up change on `fix/rag-evaluation-admin-only`; see the next
  section. Not merged.
- Findings 3 to 5 are candidates for later work, measured with this gate.

## Follow-up: POST is admin only (2026-11-25)

Branch `fix/rag-evaluation-admin-only`, stacked on PR #574. Status: **PR open; not merged, not deployed. No
production data was read or written.**

- **What changed.** `POST /api/rag/evaluation` now calls the shared `canManageOrganization` check in
  `src/security/rbac.ts`, before the body is read. Anyone but a Super Admin or Organization Admin gets 403,
  nothing is written, and the refusal is recorded as `access.denied`. These are the roles in
  `rag_release_gates_admin_access`.
- **What did not change.** `GET`, the RLS policy, migrations, and the service-role write itself. An admin can
  still record observations they typed in, marked `client_supplied`. Rows already in production were not
  checked.
- **Red first.** On `5c287e92` (tests only): 6 failed, 9 passed of 15. The five non-admin roles got 200
  instead of 403, and an Employee with an empty body got 400. On `cb266df3`: 15 of 15 pass.

| Check on `cb266df3` | Command | Result |
|---|---|---|
| Typecheck | `pnpm run typecheck` | exit 0 |
| Mobile typecheck | `pnpm --dir apps/mobile run typecheck` | exit 0 |
| Lint | `pnpm run lint` | exit 0, zero warnings |
| Supabase verify | `pnpm run supabase:verify` | passed, 61 migrations, 129 of 129 tables with RLS |
| Full suite | `pnpm run test --pool=forks --maxWorkers=2` | exit 0, 402 of 402 files, 2585 of 2585 tests |
| Build | `pnpm run build` | exit 0 |

**Error on the way.** `pnpm run test --maxWorkers=2` with the configured `threads` pool ended in a segmentation
fault (exit 139) after about 8 minutes, with no summary. The hypothesis was a native fault that takes down the
one shared process; `forks` gives each file its own. The forks run passed, which fits but does not prove the
cause. No config was changed here. Owner: branch `fix/vitest-local-reliability`.

```
Decision: Enforce the rag_release_gates admin rule in the route with the existing canManageOrganization helper.
Why: The service-role write bypasses RLS, so any signed-in user could record gate results.
What changed: One check and one denied-attempt audit record in POST; nine tests.
Architecture boundary: Existing helpers only. No migration, no new dependency.
Product boundary: GET and retrieval are unchanged.
Verification: The table above.
Outcome: Pending, review by 2026-12-08 (merge, after #574).
Follow-up: None in code. Rows recorded before the fix remain unverified.
```

## Decision ledger

```
Decision: Replace the self-passing RAG gate with one that runs production retrieval on a disposable Supabase stack.
Why: The old gate could not fail, so its passes were not evidence.
What changed: Gate, harness, golden set, API behaviour, CI workflow, correction notes.
Architecture boundary: Existing pgvector and PostgREST path only. No LangChain, LangGraph, MongoDB or new dependency.
Product boundary: Retrieval behaviour is unchanged. POST /api/rag/evaluation now rejects empty input.
Verification: CI runs 45447751231 (red), 45451898878 (pass), 45452956838 (deliberate failure).
Outcome: The gate fails on real breakages. Merge: Pending, review by 2026-12-08.
Follow-up: Abstention and full-text coverage, each as its own change. API role check: see the follow-up above.
```

## Merged and deployed, 2026-11-25

PR #574 was merged at 05:06:48Z as `306f2c89`, on the user's explicit approval to merge and deploy. Its head
`ba73ac89` had 19 checks passed, 3 skipped, none failed.

| Check | Evidence |
|---|---|
| Deploy of `306f2c89` | run 45551305266: landing, investor and lite succeeded, last at 05:14:59Z |
| Deploy of `02b90721` (adds #576) | run 45553173173: all three succeeded, last at 05:31:12Z |
| Sites, 07:02:50Z | landing, investor and lite return 200. Each ETag differs from the one at 05:08Z, and the cached pages date from about 05:34Z, after the second deploy |
| `GET /api/rag/evaluation`, no sign-in | 401 on landing and investor, 404 on lite, the same as at 05:07:32Z, before that deploy finished |

**Not verified:** the signed-in behaviour (`not_measured`, and 400 for incomplete observations) needs a
founder sign-in. No endpoint reports the running commit, so the commit comes from the deploy runs.
