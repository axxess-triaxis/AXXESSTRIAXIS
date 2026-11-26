# Plan: RAG gate that runs real retrieval (2026-11-24)

Branch `feat/rag-real-retrieval-gate` from `main` `0c532d53`. Plan recorded before any code change
(Mandatory Plan-First rule in `CLAUDE.md`). Founder intent: credible AI engineering evidence, and an
honest measure before any comparison of pgvector, MongoDB vector search or LangGraph.

## Finding that motivates the work

`scripts/rag-release-gate.mjs` on `main` runs `evaluate(buildPassingObservations())`. The observations
are built from the two fixtures' own expected answers. The script imports no retrieval code, so nothing
that breaks retrieval can fail it. `GET /api/rag/evaluation` scores the same built observations, and
`POST` with no body writes a `passed` row to `rag_release_gates`.

## Acceptance criteria

1. A test shows the old gate passes with no retrieval code present. It fails on `main` and passes here.
2. CI indexes a synthetic multi-tenant corpus in Postgres with pgvector and asks about 100 questions
   through `answerTenantQuestion`, the function `POST /api/rag/query` calls.
3. Hash, full-text and semantic modes each report recall at 5, MRR, nDCG at 5, no-answer correctness,
   and cross-tenant and unauthorized-document leak counts.
4. Any leak, query error or missing embedding fails the build. Quality thresholds come from the
   measured baseline.
5. Deliberate breakages of the real source fail the gate, and CI checks that on every run.
6. The API records no pass when no observations were supplied.
7. The results table, raw numbers and the measured commit are checked in. Limits of synthetic data are
   stated. Past documents that cite the gate carry a dated correction note.
8. Full checks run and a PR is open. No merge, no deploy, no production data.

## Approach

- **Same path as production, not a copy.** The workflow starts the local Supabase stack (Postgres with
  pgvector, PostgREST, Auth, Edge Runtime), applies every migration, and serves the real `embed`
  function (gte-small). The harness signs in as synthetic users, so row-level security applies to
  document reads as it does live. Ingestion uses `ingestTenantDocument`; questions use
  `answerTenantQuestion` with the real Supabase repositories.
- **Modes are production's own degradations.** Semantic: the embed function is configured. Full text:
  it is not. Hash: it is not, and no full-text repository is passed.
- **Independent oracle.** Each question names the documents that answer it and the test derives
  forbidden documents from the golden set, never from `canRetrieveDocument`.
- **Mutations.** A Vite plugin edits the real source at load time (for example, reverses the ranking or
  removes the authorization check). An edit whose target text is missing is an error, so a mutation
  cannot silently stop working.

## Hypotheses to check in CI, one at a time

- H1: every migration applies from empty on a fresh local stack. Unknown: no recorded run of the manual
  drill in `supabase-cli.yml` was found.
- H2: the local Edge Runtime runs gte-small within the client's 20 second timeout.
- H3: the documented gte-small score clustering makes zero-source abstention rare in semantic mode.

## Out of scope

No change to retrieval behaviour, no LangChain, LangGraph or MongoDB, no new dependency, no production
data, no deploy.
