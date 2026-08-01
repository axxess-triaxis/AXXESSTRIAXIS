-- Real OpenAI Chat Completions calls are billed against the founder's own OpenAI account. This
-- table is the hard spend guard: cumulative real cost (from actual token usage, not an estimate)
-- is tracked here and checked BEFORE every call, so the app can refuse to make a new call once
-- the tenant-wide budget's safety margin is reached -- never relying on OpenAI's own usage
-- dashboard (which can lag) as the only backstop. Platform-wide (not tenant-scoped): this is
-- AXXESS's own shared credential and budget, not a per-organization spend limit.
create table if not exists public.ai_provider_budget (
  provider text primary key,
  budget_ceiling_usd numeric(10, 4) not null check (budget_ceiling_usd >= 0),
  spent_usd numeric(10, 4) not null default 0 check (spent_usd >= 0),
  updated_at timestamptz not null default now()
);

-- Founder-stated starting balance, 2026-07-31: $20 on the OpenAI account backing OPENAI_API_KEY.
insert into public.ai_provider_budget (provider, budget_ceiling_usd, spent_usd)
values ('openai', 20.00, 0)
on conflict (provider) do nothing;

-- OpenRouter (shared account/credit pool behind both the Kimi and DeepSeek adapters) --
-- $20 is an explicit placeholder the founder approved pending the real account balance; update
-- budget_ceiling_usd here once the actual OpenRouter balance is confirmed.
insert into public.ai_provider_budget (provider, budget_ceiling_usd, spent_usd)
values ('openrouter', 20.00, 0)
on conflict (provider) do nothing;

alter table public.ai_provider_budget enable row level security;

-- Service-role only (matches agent_connections/agent_action_grants' actual pattern): RLS enabled
-- with zero policies denies authenticated/anon by default; service_role bypasses RLS entirely in
-- Supabase, so no explicit permissive-predicate policy is needed here at all.
grant select, insert, update on public.ai_provider_budget to service_role;

comment on table public.ai_provider_budget is 'Hard spend guard for real (non-stub) external AI provider calls -- cumulative real cost tracked and checked before every call so the app fails closed (refuses the call) once a provider''s safety margin is reached, rather than relying solely on the provider''s own billing dashboard.';
comment on column public.ai_provider_budget.spent_usd is 'Cumulative real cost from actual token usage on completed calls -- updated after each successful call, never an estimate.';
