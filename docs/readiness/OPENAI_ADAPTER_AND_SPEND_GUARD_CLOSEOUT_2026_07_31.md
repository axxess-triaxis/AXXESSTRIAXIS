# Real OpenAI Adapter + Financial Spend Guard — Closeout (2026-07-31)

## Objective

Founder live-tested the AI Workspace and got a RAG answer with real, indexed citations but no
actual synthesized answer to "What is AXXESS TRIaxis?" — root-caused to zero genuine external-API
implementations existing for OpenAI/Anthropic/Google/xAI/Falcon/Jais (only Kimi/DeepSeek via
OpenRouter were real; everything else returned `remotePlaceholderProvider`'s plausible-looking but
entirely fake completion text regardless of whether an API key was configured). Founder directive:
"Proceed with OpenAI Chat Completions API call, parallel to the existing OpenRouter adapter (~60
lines, same interface, real cost/token tracking), though build in explicit logic to never move
into 'pay as you go' territory. Current credit balance is $20, should stop usage before credit
balance turns $0.01." Follow-up: "Same logic also applies to Openrouter/Grok/Claude once
configured."

## What Changed

- **`src/services/ai/aiSpendGuard.ts`** (new) — fail-closed budget guard.
  `checkProviderBudgetHeadroom(provider)` refuses a call (returns `ok: false` with a reason) if
  Supabase admin config is unavailable, no budget row exists for the provider, or remaining budget
  (`ceiling - spent`) is at or below a `$0.50` safety margin. `recordProviderSpend(provider,
  costUsd)` is a best-effort, read-then-write post-call update (not atomic — an accepted tradeoff
  at this app's low concurrency; the pre-call margin already absorbs staleness risk).
- **`src/services/ai/providers/openAiProvider.ts`** (new) — real OpenAI Chat Completions adapter
  (`gpt-4o-mini`), budget-guarded via the same functions above before every call, records real cost
  from actual token usage after.
- **`src/services/ai/providers/openRouterProvider.ts`** — same guard wired in (founder's explicit
  "same logic also applies to OpenRouter" instruction), budgeted under a shared `"openrouter"`
  provider key since Kimi and DeepSeek bill against one shared OpenRouter account/credit pool.
- **`src/services/ai/providers/index.ts`** — `liveModelProviders` (renamed from
  `openRouterBackedProviders`) now includes `"openai"`; `buildAiProviderAdapters` routes `"openai"`
  to the real adapter instead of the placeholder stub.
- **`src/services/rag/tenantRagWorkflow.ts`** — updated to the renamed `liveModelProviders` import;
  this is the set `answerTenantQuestion` checks to decide whether a router result is a genuine
  model answer (`model_synthesis`) or must fall back to the local extractive summary.
- **`supabase/migrations/20260731100000_ai_provider_budget.sql`** (new) — `ai_provider_budget`
  table (`provider text primary key, budget_ceiling_usd, spent_usd`), seeded with `openai` at
  founder-stated $20.00 and `openrouter` at $20.00 (explicit founder-approved placeholder pending
  the real OpenRouter balance — founder confirmed "Same as OpenAI ($20)" when asked). RLS enabled,
  service-role-only access via `grant` (no explicit policy needed — matches the established
  `agent_connections`/`agent_action_grants` pattern; an earlier draft of this migration incorrectly
  added a permissive `using (true)` policy, caught and fixed by `supabase:verify`).
- **`docs/AI_ROUTING_AND_PRICING_TIER_POLICY.md`** (new) — full 5-tier pricing/AI-routing policy
  document per founder's explicit "fully document this in policy going forward" instruction.

## What Did Not Change

- Anthropic/Google/xAI/Falcon/Jais remain stub-only (`remotePlaceholderProvider`) — no real
  adapters built for them this pass; they are explicitly named as the next candidates once
  configured, per the founder's own follow-up instruction.
- No changes to the RAG retrieval/citation pipeline itself — this pass is purely about what happens
  once a provider is selected to synthesize an answer.

## What Was Verified (exact commands, exact results)

Run together with the session-persistence security fix in the same full-suite pass (see
`SESSION_PERSISTENCE_SECURITY_FIX_CLOSEOUT_2026_07_31.md` for the combined run):

- `pnpm run typecheck` / `pnpm --dir apps/mobile run typecheck` — both exit 0.
- `pnpm run lint` — exit 0, 0 warnings.
- `pnpm run test` — 826/826 tests passed across 188/188 files (one file's first-run worker-thread
  timeout confirmed as this session's known infra flake, not a regression, by an isolated re-run).
  Unit coverage for this batch specifically: `aiSpendGuard.test.ts` (10/10), `openAiProvider.test.ts`
  (6/6), `openRouterProvider.test.ts` (6/6, rewritten to mock the new spend-guard dependency).
- Two pre-existing tests in this batch initially failed and were fixed as part of this closeout
  (not new regressions from the security fix — see the security-fix closeout for detail): the
  "Sprint 1 proof" test in `aiRouter.test.ts` needed the spend-guard's Supabase-admin dependency
  mocked (it now correctly fails closed without it, exactly as designed); the placeholder-stub
  fallback test in `tenantRagWorkflow.aiRouting.test.ts` needed its mocked provider changed from
  `openai` (no longer a stub) to `anthropic` (still genuinely stub-only) to keep testing what it
  was meant to test.
- `pnpm run build` — exit 0.
- `pnpm run supabase:verify` — exit 0, after fixing the migration's RLS predicate (see above).

## What Remains Partial / Blocked

- ~~Migration not yet applied to production~~ — **resolved 2026-07-31.** Founder ran
  `supabase/migrations/20260731100000_ai_provider_budget.sql` directly in the Supabase Dashboard
  SQL Editor (production project `axxess-triaxis`); confirmed via screenshot showing "Success. No
  rows returned" for the `grant`/`comment` statements at the end of the file. The spend guard now
  has real `openai` and `openrouter` budget rows to check against in production.
- **OpenRouter's real account balance is unconfirmed.** $20 is an explicit founder-approved
  placeholder ("Same as OpenAI ($20)"), not a verified real balance — tagged here per this repo's
  founder-stated-but-unverified discipline. Update `budget_ceiling_usd` for the `openrouter` row
  once the real balance is known.
- **Anthropic/Google/xAI/Falcon/Jais remain stub-only** — explicitly out of scope this pass, next
  candidates per the founder's own instruction once those provider accounts are configured.
- **Live production verification is HITL-only**: confirm a real OpenAI-routed RAG answer in the
  live AI Workspace, and confirm the spend guard actually blocks a call once the tracked balance
  nears the safety margin — neither can be self-certified from this environment.

## Exact File/Command/Branch State

- Branch: `canonical/sprint-1-35-unified-gitlab`, no new branch created.
- Not yet committed at the time this closeout was written — see commit immediately following this
  file for the actual commit hash.
- Files in this changeset: `src/services/ai/aiSpendGuard.ts` (new),
  `src/services/ai/aiSpendGuard.test.ts` (new), `src/services/ai/providers/openAiProvider.ts` (new),
  `src/services/ai/providers/openAiProvider.test.ts` (new),
  `src/services/ai/providers/openRouterProvider.ts`, `src/services/ai/providers/openRouterProvider.test.ts`,
  `src/services/ai/providers/index.ts`, `src/services/rag/tenantRagWorkflow.ts`,
  `src/services/ai/aiRouter.test.ts`, `src/services/rag/tenantRagWorkflow.aiRouting.test.ts`,
  `supabase/migrations/20260731100000_ai_provider_budget.sql` (new),
  `docs/AI_ROUTING_AND_PRICING_TIER_POLICY.md` (new).
