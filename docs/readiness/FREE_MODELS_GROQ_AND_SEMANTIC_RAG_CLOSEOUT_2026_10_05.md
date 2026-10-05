# Free Models (Groq) and Semantic RAG (gte-small) — Closeout, 2026-10-05

Branch: `feat/groq-free-models-rag` (from `main` `2c8b401`). Status: **code complete and verified locally; production prerequisites 1–5 done (see below);
app code not merged or deployed.**

## External signal → decision

- **Founder directive (2026-10-05):** "we need to shift to Groq/Nemotron/Qwen/OSS and other such
  free models so we can actually test AI and RAG on the product."
- **Founder choices, recorded in chat the same day:**
  - providers: **Groq**;
  - RAG: **answers and real semantic search, both now**;
  - paid providers: **disabled**.
- **Why it mattered:**
  - the only live models were billed providers: OpenAI, and DeepSeek/Kimi through OpenRouter;
  - Anthropic, Gemini, Grok, Falcon and Jais were stubs returning placeholder text;
  - RAG "embeddings" were a 16-dimension token hash (`deterministicEmbeddingProvider`), so
    retrieval could only match words, never meaning.

## What changed

**Models**
- `src/services/ai/providers/groqProvider.ts` (new): an OpenAI-compatible adapter for Groq.
  - Runs `openai/gpt-oss-120b`, then falls back to `openai/gpt-oss-20b` on a 429 or 5xx error.
    Model ids were confirmed against Groq's live `/models` listing.
  - Tool calls are supported, with a defensive JSON parse.
  - `max_tokens` is 2000 because the free tier allows 8,000 tokens a minute per model (Groq's
    `x-ratelimit-limit-tokens` header).
  - Cost is recorded as 0.
- `model-routing-policy.ts`:
  - `groq` is declared first, so it is the default whenever `GROQ_API_KEY` is set.
  - Every billed provider counts as configured only with `AXXESS_AI_PAID_PROVIDERS=enabled`,
    even when its key is present. A stray key can no longer start spending; it shows as
    `disabled`.
- `tenantModelPolicy.ts`: the default task preferences point at `groq`, and `groq` is in the
  default allow-list.
- `agenticChatLoop.ts` (Copilot):
  - The primary model is Groq, else OpenAI (only when paid providers are enabled).
  - It reports `unavailable`, with a reason, when neither is configured and allowed.
  - The tenant policy check now applies to whichever provider is primary.
- `providers/index.ts`: `groq` is added to `liveModelProviders` and wired to its adapter.

**RAG**
- `supabase/migrations/20261005120000_rag_chunk_embeddings_gte_small.sql`. This migration is
  additive:
  - it enables `pgvector` and adds a nullable `rag_document_chunks.embedding vector(384)`;
  - it adds an HNSW cosine index;
  - it adds `match_rag_document_chunks(org, document_ids, query_embedding, limit)`, which returns
    `(id, similarity)` only and is executable by `service_role` only.
- The rollback is in `supabase/rollback/…_ROLLBACK.sql`.
- `supabase/functions/embed/index.ts` (new Edge Function):
  - It computes gte-small embeddings with the model built into the Supabase Edge Runtime. It is
    free, with no external API.
  - JWT verification is off (`config.toml`) because the server credential is an `sb_secret_`
    key, not a JWT. Instead the function requires an `x-embed-secret` header matching
    `EMBED_FUNCTION_SECRET`, and refuses every request if that secret is unset.
- `src/services/rag/embeddings/semanticEmbeddings.ts` (new): the client for that function.
  - It batches 32 texts per request and checks the dimensions (384).
  - It never throws; any failure returns `null`.
- `tenantRagWorkflow.ts`:
  - **Ingestion** writes a gte-small embedding with every chunk (the hash is still written). If
    the write fails because the migration isn't applied yet, it retries without the embedding,
    so ingestion never fails because of this change.
  - **Retrieval** tries semantic ranking first, across every authorized document, before the
    keyword narrowing (which would drop documents that answer the question in other words).
  - The tenant-boundary assertion, role allowlist and `canRetrieveDocument()` run on semantic
    results exactly as on hash results. They are now one shared function, `authorizedCitations`.
  - Any failure, or no embedded chunks, falls back to the previous full-text and hash path
    unchanged.
  - The new retrieval mode is `"semantic"`.
- `scripts/backfill-rag-embeddings.mjs` (new): embeds existing chunks where `embedding is null`.
  It is idempotent and resumable, has a `--dry-run` option, and never prints secrets.
- `.env.example`: adds `GROQ_API_KEY`, the `GROQ_*` overrides, `EMBED_FUNCTION_SECRET` and
  `AXXESS_AI_PAID_PROVIDERS`.

**Also fixed (separate commit, ledger #74):** `supabase:verify` had been failing on `main` since
Dependabot PR #372. The pin now matches the installed CLI version, 2.117.0.

## What did not change

- **Paid adapters** (OpenAI, OpenRouter, and the stubs): not removed. They are re-enabled with
  `AXXESS_AI_PAID_PROVIDERS=enabled`.
- **Local deterministic fallback:** unchanged. It still answers when Groq is unavailable.
- **`governedRag.ts` (the knowledge-article path):** still lexical. Only the document-chunk path
  (`tenantRagWorkflow.ts`) is semantic.
- **Callismatic inside this repo (`apps/callismatic`):** not touched. Its standalone repo moved to
  Groq in `axxess-triaxis/callismatic` PR #3.
- **Restricted-sensitivity handling:** unchanged. External providers, now including Groq, are
  still held off restricted data unless the tenant policy allows them.

## Verification (local, worktree)

| Gate | Command | Result |
|---|---|---|
| Typecheck | `tsc --noEmit` | pass |
| Mobile typecheck | `tsc --noEmit` in `apps/mobile` | pass |
| Tests | `vitest run --config vitest.config.mjs` | **330/330 files, 1833/1833 tests** |
| Lint (changed files) | `eslint --max-warnings=0 <changed files>` | pass, 0 warnings |
| Lint (whole repo) | `eslint . --max-warnings=0` | 6 errors, all in untouched files. Local artefact: see the environment note below |
| Supabase | `node scripts/verify-supabase-migrations.mjs` | passed, 47 migrations, 114/114 RLS |
| Build | `next build` | **not run locally**. Turbopack rejects the linked `node_modules`; CI and the Vercel preview are the build gate |

The new tests cover:
- Groq as the default route, with no cost recorded;
- paid providers off despite keys being present;
- Groq ahead of paid providers when paid ones are enabled;
- the 429 fallback to gpt-oss-20b;
- no retry on 401;
- tool-call parsing;
- the Copilot loop's Groq primary, and `unavailable` when nothing is configured;
- semantic ranking ahead of keyword narrowing;
- a role-restricted chunk never returned through the semantic path;
- fallback when the embed function is down;
- an embedding written with every chunk at ingestion;
- embedding-client batching, validation and the never-throws behaviour.

**Environment note:**
- `pnpm install --frozen-lockfile` is refused locally until about 2026-10-09 15:50 UTC. Three
  transitive packages are newer than the repo's 7-day `minimumReleaseAge`; the same cause blocked
  the 2026-10-05 production deploy.
- I did not override that supply-chain control. Instead this worktree used the main working
  copy's `node_modules` (installed 2026-09-13) through a junction.
- That copy has an older `eslint-config-next`, which is why six existing
  `eslint-disable @next/next/no-location-assign-relative-destination` comments report "rule not
  found". CI runs a clean install.

**Live Groq check (Callismatic, same key and models, 2026-10-05):**
- 3 end-to-end triage runs on the free tier made correct decisions every time;
- the rate-limit headers confirmed 8,000 tokens a minute and 1,000 requests a day.
- This was **not** run against AXXESS itself: no AXXESS environment has `GROQ_API_KEY` yet.

## Production prerequisites, done 2026-10-05 (founder go-ahead given for each step in chat)

| Step | What | Verified by |
|---|---|---|
| 1 | `GROQ_API_KEY` on Vercel **landing only** (`triaxis-www-frontend-import`), Production + Preview, type Encrypted | pulled back: 56 chars, equal to the source key. Investor demo and Lite deliberately left out (founder: "landing only"); they share the same free-tier quota with public traffic |
| 2 | `EMBED_FUNCTION_SECRET` (64 chars, generated locally, never printed): Vercel landing Production + Preview; Supabase `vnliomnfabaicvvvfwia` secrets | Vercel pull: exact match. Supabase `secrets list` SHA-256 digest `44524c0…` equals the local digest. Local copy deleted |
| 3 | `supabase db push`: dry run showed `20261005120000_rag_chunk_embeddings_gte_small.sql` as the only pending migration, then applied | `migration list` shows it local = remote. SQL check: pgvector 0.8.2; `embedding vector(384)`; HNSW index present; `match_rag_document_chunks` executable by `service_role`, not `authenticated`/`anon` (a publishable-key call returned `permission denied`) |
| 4 | `supabase functions deploy embed --use-api` | live: no secret → 401, wrong secret → 401, right secret → 200 in 1.0 s, 3 × 384-dim normalized vectors; "medical oxygen" question vs oxygen note 0.892, vs budget note 0.761 |
| 5 | Backfill of the 6 existing production chunks, through the Supabase CLI's linked connection (both Supabase service keys are *Sensitive* in Vercel, so `scripts/backfill-rag-embeddings.mjs` couldn't get one); writes guarded by `embedding is null` | 6 updated, 0 remaining. Live RPC call ranked all 6 chunks for a business-plan question (top: "Triaxis Ventures 31072026", 0.805) |

Note for the scored ranking: gte-small similarities cluster high (unrelated text still scores about
0.75), so ordering is meaningful but a fixed relevance cutoff would not be; the code uses none.

## What remains: founder go/no-go on each production step

Steps 1–5 are done (table above). Remaining:

6. **Merge and deploy.** The deploy is also gated by the package-age rule until about Oct 9; the
   scheduled redeploy task covers that.
7. **Live verification:**
   - a Copilot turn served by Groq;
   - a RAG question whose answer uses a paraphrase, confirming `retrievalMode: "semantic"` in the
     AI output audit.

## Unsupported claims

- **Groq free-tier limits:** live limits observed on one account on 2026-10-05. They may change.
- **gte-small quality and latency:** not measured on AXXESS documents yet. That needs the live
  backfill and the step-7 check.
- **Production impact:** none yet. Nothing in production has changed.
