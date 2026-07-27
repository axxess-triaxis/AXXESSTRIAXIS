# Global GTM AI Router Roadmap -- Tiered, Cost-Optimized, Multi-Model Routing

Date created: 2026-07-27
Source: founder-directed strategy discussion (2026-07-27) on tiered AI provider economics for
global GTM (India/Indic, UAE/Gulf/Arabic, and a future Spanish/Portuguese/French expansion slot),
scoped against the actual current AI router codebase.
Governance: matches this program's evidence-chain discipline -- every claim about current code below
is cited to an exact file; nothing about provider pricing, exact model IDs, or third-party API
contracts is asserted with more confidence than has been verified at implementation time.

## Business Intent (As Directed)

A five-tier AI provider strategy to cut cost at the low end and preserve capability/sovereignty at
the high end:

| Tier | Segment | Provider strategy |
|---|---|---|
| 1 | Single user | Kimi / DeepSeek / Jais / other language-appropriate cost-efficient model |
| 2 | Multi-user, non-enterprise | Same provider pool as Tier 1 |
| 3 | Enterprise (MSMEs, midcorps, NGOs, district administration) | Weighted multi-model: ~70% through Tier 1/2's cost-efficient pool, ~30% through OpenAI/Claude -- routed via OpenRouter and Core42, tuned for token-usage efficiency |
| 4 | Sovereign | OpenAI, Claude, Jais, Falcon, and similarly-positioned "safe" models, run in sandboxed environments, grounded in RAG trained on localized data (see "Tier 4/5: Infrastructure and Data Ambitions" below -- this is a distinct, larger initiative than the router work in Sprints 1-4) |
| 5 | Sovereign+ | Palantir-for-the-Global-South positioning; a possible bespoke foundation model, airgapped infrastructure, full NLP integration, permanent contextual memory, physical storage -- explicitly future and out of scope for this roadmap's Sprints 1-4 |

### Tier 4/5: Infrastructure and Data Ambitions (Directional, Not Yet Scoped)

Founder direction (2026-07-27) for Tier 4 includes running models in **sandboxed environments
using Kubernetes** and grounding RAG in **localized training/retrieval data sourced from government partnership APIs,
public web crawl, and purchased datasets from data-labeling vendors (Mercor, Micro1, Alignerr, Scale
AI)**. Tier 5 envisions airgapped infrastructure, permanent contextual memory, and physical storage,
in a "Palantir for the Global South" positioning, with a possible bespoke foundation model further
down the line.

**This is real, but it is a different category of work than Sprints 1-4** (which are AI-router
adapter code) -- it spans infrastructure/DevOps (Kubernetes sandboxing), data acquisition and
vendor/government relationships (dataset purchases, partnership APIs), and potentially
significant budget. It is captured here as directional intent so it isn't lost, but it is
**deliberately not broken into sprint checklist items in this document** until it has its own
scoping pass -- folding unscoped infrastructure and data-partnership work into an AI-router sprint
plan would understate its actual size and risk.

Regional specialization layered across tiers 3-5 depending on geography: **Sarvam** (Indic
languages), **Jais** (Core42/G42, Arabic -- UAE-origin, reinforces the sovereignty narrative for
Gulf government/enterprise buyers, not just a cost play), **Falcon** (TII, Arabic/general), and a
reserved future slot for Spanish/Portuguese/French specialists (lower priority than Sarvam/Jais --
see "Non-Negotiables" below on why).

## Current State (Verified Against Code, 2026-07-27)

- **`src/services/ai/types.ts`**: `AiProviderName` is currently `openai | anthropic | google | xai |
  falcon | jais | local`. `AiTenantRoutingPolicyInput` already supports `allowedProviders`,
  `blockedProviders`, `preferredProviders` (per task category), `fallbackProviders`,
  `maxEstimatedCostPerRequestUsd`, `requireHumanApprovalFor`, and cost/latency preference fields --
  a real foundation for tiered policy, not a rewrite target.
- **`src/services/ai/model-routing-policy.ts`**: `falcon` and `jais` are already modeled with
  `costTier: "low"` and, respectively, `languages: [english, arabic, french]` and
  `languages: [english, arabic]`, `mode: "endpoint"` (i.e. already designed for a
  bring-your-own-endpoint integration, which is exactly what a Core42-hosted Jais/Falcon deployment
  is). Configuration today reads `FALCON_API_BASE_URL`/`FALCON_API_KEY` and
  `JAIS_API_BASE_URL`/`JAIS_API_KEY` from environment -- both currently unset, so both providers
  report `status: "missing_credentials"`.
- **`src/services/ai/providers/index.ts`**: **every remote provider adapter is
  `remotePlaceholderProvider`** -- a stub that returns a canned "adapter-ready" string regardless of
  provider or prompt. `local` (`localProvider.ts`) is the only adapter that does real, deterministic
  work. **No remote provider anywhere in this codebase makes a real API call today.** This is the
  single most load-bearing gap: tiered routing logic built on top of stub providers routes between
  five flavors of the same fake response.
- **`src/services/ai/tenantModelPolicy.ts`**: `selectTenantModelRoute()` is a real, working policy
  engine -- picks one best-match provider per request (by task-category preference, allow/block
  list, cost ceiling, restricted-data gating), computes an estimated cost via a flat
  `perThousandTokenEstimate` keyed by `costTier` (`low: $0.002`, `medium: $0.012`, `high: $0.04` per
  1K tokens -- a heuristic, not real per-model pricing), and builds a fallback chain. **It selects
  exactly one provider deterministically; there is no weighted/split routing (e.g. "70-80% Kimi,
  20% Grok") anywhere in this code today.** That is new logic, not a policy tweak.
- **`src/services/ai/router/aiRouter.ts`**: `routeAiRequest()` is the real orchestration entry point
  (classify -> select policy route -> find adapter -> call `.complete()` -> return audited result
  with cost/policy/gateway tags). This is the correct, already-built integration point for
  everything below -- it does not need to be replaced, only fed real adapters and a tier-aware
  policy layer.
- **No tenant/organization "subscription tier" field has been confirmed to exist yet** in the
  schema. Needs a direct check against the `organizations` table at implementation time before
  Sprint 3 can assign a tenant to Tier 1-5 automatically rather than by manual policy override.

## Non-Negotiables

- **Do not remove or weaken the `local` deterministic fallback.** It is the existing safety net for
  unconfigured/blocked providers and restricted-sensitivity data; every tier's fallback chain still
  ends there, per the existing `defaultFallbackProviders` pattern.
- **Do not claim capability that isn't real.** Per this program's own established discipline (see
  `docs/UNSUPPORTED_OR_PARTIAL_CLAIMS.md`), a provider is only marked `configured`/live once it is
  making real API calls with real credentials -- not once its type/config entry exists.
  Falcon/Jais already "existing in code" is not the same as them working; say so plainly at every
  stage of this roadmap.
- **Sarvam/Jais are the capability priority; Spanish/Portuguese/French is the cost priority.**
  Per the 2026-07-27 strategy discussion: Indic and Arabic are markets where general frontier models
  are genuinely underpowered (the product's own market research already documents this). Spanish,
  Portuguese, and French are already strongly covered by Claude/GPT/Gemini -- a regional specialist
  there is a cost/tone optimization, not an unlock. Do not let Sprint 4 (lower priority) block
  Sprints 1-3.
- **No exact third-party API contract, model slug, or price is asserted below without verification
  at implementation time.** OpenRouter's exact catalog, Core42's exact API shape for Jais/Falcon,
  and Sarvam's exact endpoint contract are all things the implementing sprint must check directly
  against current provider documentation -- not assumed from this planning pass.

## Founder Action Items (Cannot Be Done By This Agent)

| Item | Needed for | Notes |
|---|---|---|
| OpenRouter account + API key | Sprint 1 (Kimi, DeepSeek, and as a fallback path for Grok/Gemini) | Single key covers multiple models -- this is the point of using it as the aggregation layer |
| Core42 API access for Jais (and possibly Falcon) | Sprint 2 | Per your own note, conversations with the UAE ecosystem (Plug and Play UAE, AI Liwan Group, and reportedly Hub71) are already in progress -- worth confirming Core42 access is part of one of those threads rather than a cold start |
| Sarvam API account + key | Sprint 2 | |
| Direct `xAI`/Grok and `Google`/Gemini API keys, if not routed through OpenRouter | Sprint 1 | Decision needed: route Grok/Gemini through OpenRouter too (simpler, one integration) or direct (potentially cheaper/faster, two more integrations) |
| Decision: which Spanish/Portuguese/French model(s) | Sprint 4 | Not scoped by this roadmap -- open question, lower priority per Non-Negotiables above |
| Confirm/design a tenant subscription-tier field | Sprint 3 | If one doesn't already exist on the organization/tenant model, this is schema work requiring a product decision on where tier assignment lives (billing system? admin-set flag?) |

## Sprint Breakdown

### Sprint 1 -- Prove the Pipe: One Real Provider, Real Calls, Real Cost

Goal: replace the stub with one genuinely working remote adapter before building any tier logic on
top of it. Highest leverage target is OpenRouter, since it fronts multiple Tier 1-3 models through
one integration.

- [ ] Add `OPENROUTER_API_KEY` to env schema and `getAiProviderConfigurations()`
- [ ] Add `kimi` and `deepseek` to `AiProviderName` and `providerCapabilities` (both `mode: "remote"`,
      `costTier: "low"`, capabilities/languages verified against real model documentation, not
      copied from openai's list)
- [ ] Build a real adapter (`src/services/ai/providers/openRouterProvider.ts`) implementing
      `AiProviderAdapter.complete()` against OpenRouter's actual chat-completions API, parameterized
      by model slug -- one adapter factory serving both `kimi` and `deepseek` configs
- [ ] Replace the flat `perThousandTokenEstimate` heuristic for these two providers with real
      cost calculation from OpenRouter's response `usage` + published per-model pricing
- [ ] Decide and implement: Grok/Gemini via OpenRouter too, or direct APIs (see Founder Action Items)
- [ ] Tests: mocked-fetch adapter tests (same `vi.stubGlobal("fetch", ...)` pattern already used
      throughout this codebase), plus a `routeAiRequest()` integration test proving a real
      classification -> policy -> adapter -> response round trip for at least one non-local provider
- [ ] Live verification: one real, HITL-confirmed AI Workspace query actually served by a real
      external model, not `local` -- the first time this will have happened in this program

### Sprint 2 -- Sovereign/Regional Specialists: Jais, Falcon, Sarvam

Goal: turn the already-scaffolded Falcon/Jais config into working adapters, and add Sarvam as a new
provider, for the Tier 4-5 sovereignty story and Tier 3 Indic-language capability.

- [ ] Confirm Core42's actual API contract for Jais (and Falcon, if also served through Core42) --
      likely OpenAI-compatible-schema based on how most hosted open-model APIs are shaped, but verify
      before implementing rather than assuming
- [ ] Wire real `FALCON_API_BASE_URL`/`FALCON_API_KEY` and `JAIS_API_BASE_URL`/`JAIS_API_KEY`,
      implement real adapters replacing their stub entries
- [ ] Add `sarvam` to `AiProviderName`/`providerCapabilities` (Indic languages,
      `costTier: "low"`), implement its real adapter against Sarvam's actual API
- [ ] Re-verify and correct the `languages` arrays across all providers against real, current model
      documentation -- several entries today (e.g. `openai` listing `assamese`, `anthropic` listing
      `bengali`) look like placeholders inherited from a template, not verified capability claims
- [ ] Tests + live verification for each newly-real provider, same bar as Sprint 1

### Sprint 3 -- Tier-Based Policy Presets and Weighted Routing

Goal: turn "Tier 1-5" from a business concept into actual routing behavior.

- [ ] Confirm whether a tenant subscription-tier field exists on the organization model; if not,
      scope and add it (schema + admin surface for setting it)
- [ ] Define five named policy presets (extending `buildTenantModelPolicy()`, not replacing it) --
      Tier 1/2: single cheap provider only; Tier 3: multiple allowed low-cost providers; Tier 4/5:
      `anthropic`/`openai` preferred, RAG-grounding required
- [ ] **Build weighted/split routing** for Tier 3's "70-80% Kimi/DeepSeek-class, 20% Grok/Gemini"
      requirement -- this is new logic; `selectTenantModelRoute()` today picks one deterministic
      best match, not a weighted distribution across a request stream. Needs a documented, testable
      weighting mechanism (e.g. seeded random selection among eligible candidates per policy weight),
      not an approximation
- [ ] Wire tier -> policy preset resolution into `routeAiRequest()`'s context-building step
- [ ] Extend the existing `/api/ai/model-policy` admin route to expose and let an Organization Admin
      view (and, if in scope, override) their tenant's assigned tier and resulting policy
- [ ] Tests: policy-preset unit tests per tier, plus a statistical test on the weighted-routing
      distribution (e.g. run N simulated selections, assert the observed split falls within a
      reasonable tolerance of the configured weight -- not just "it picks something")

### Sprint 4 -- Regional Expansion Slot + Full Live Verification (Lower Priority)

Goal: leave a real, working slot for the Spanish/Portuguese/French tier once that decision is made,
and close out this roadmap with genuine end-to-end evidence across all tiers -- not before Sprints
1-3 are live-verified.

- [ ] Decision (founder): which Spanish/Portuguese/French provider(s), informed by the same
      capability-vs-cost framing in Non-Negotiables above
- [ ] Add the chosen provider(s) following the same adapter pattern as Sprints 1-2
- [ ] Full HITL live-verification pass: one real query per tier, per major provider, with cost and
      routing-reason evidence captured -- the same evidence-chain discipline this program has used
      for every other capability closeout
- [ ] Update `docs/readiness/AI_CAPABILITY_MILESTONE_KANBAN_2026_07_26.md` and
      `ACTIONABLES_READINESS_MATRIX.md` with real, live-confirmed status once this is genuinely
      working -- not before

## Board

### Not Started

All items above -- this roadmap is scoping only as of 2026-07-27. No code has been written against
it yet.

## Evidence

`src/services/ai/types.ts`, `src/services/ai/model-routing-policy.ts`,
`src/services/ai/tenantModelPolicy.ts`, `src/services/ai/providers/index.ts`,
`src/services/ai/router/aiRouter.ts`, `docs/UNSUPPORTED_OR_PARTIAL_CLAIMS.md`,
`docs/readiness/AI_CAPABILITY_MILESTONE_KANBAN_2026_07_26.md`, and the 2026-07-27 strategy
discussion this roadmap was directed from.
