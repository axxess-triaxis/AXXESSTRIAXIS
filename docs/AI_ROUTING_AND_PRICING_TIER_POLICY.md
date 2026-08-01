# AI Routing and Pricing Tier Policy

Status: **Founder-established product policy, 2026-07-31.** This document records the decision as
stated by the founder. Per `CLAUDE.md`'s evidence-chain discipline, every claim below is explicitly
marked as either **Policy (decided)** -- a business/product decision that stands regardless of
current code state -- or **Implementation status** -- what this repository's code actually does
today, verified by reading the source, not assumed. Where policy and implementation diverge, that
gap is called out plainly rather than implied as already built.

## 1. The Five Pricing Tiers (Policy, as stated by the founder)

| Tier | Platforms | Default AI Model(s) | Distinguishing Features |
|---|---|---|---|
| **Unos** (Single User Single Serve) | iOS & Android only | Kimi/DeepSeek via OpenRouter | Entry tier for individual users |
| **Emerging Enterprise** (Multi-user self-serve) | iOS & Android (added features, multi-user) | Kimi/DeepSeek via OpenRouter | Multi-user support added |
| **Enterprise 1.0** | iOS, Android (full-fledged), web app | Kimi/DeepSeek default; customer can plug in their own OpenAI/Anthropic on their own paid plan | Policy engine, analytics suite, multi-agentic options (single agent runs at a time) |
| **Sovereign** | iOS, Android, web (full feature, less customized) | Client chooses own model; Claude/OpenAI recommended; model can be trained on local datasets | Per-seat pricing; private cloud, sandboxed; airgapping and physical storage optional/chargeable; local-language NLP (GCC gets Jais/Falcon as add-ons); 40+ integrations, some stock integrations priced in |
| **Sovereign+** ("Palantir of the Global South") | iOS, Android, tailored web | Client chooses own model, in keeping with regulations; local datasets incorporated; no OECD data bias | Per-seat pricing; private cloud by default; physical storage priced at 10/30/50/70/90% tiers; physical encrypted keys; GCC gets Jais and Falcon bundled in; unlimited integrations (Pro plans priced in on most, custom integrations billed to client's own plan) |

### Target buyer segmentation (Policy, founder-clarified)

**Unos and Emerging Enterprise are MSMEs, small startups, small NGOs, proprietorships, and
partnerships** -- cost-sensitive buyers optimizing for price, not data-residency politics. This is
the reason Kimi/DeepSeek-via-OpenRouter is the correct default at these two tiers: it is a
deliberate segmentation decision, not an oversight. The data-sovereignty conversation is scoped to
start at **Enterprise 1.0 and above**, where tenants already gain the ability to bring their own
OpenAI/Anthropic credentials, and to **Sovereign/Sovereign+**, where the client chooses their own
model entirely.

### Framing for external communication (Policy -- how to describe this if asked)

Data sovereignty in this pricing model is **a premium feature scoped to the buyers who need it, not
a general company stance that applies uniformly across every tier.** If ever asked externally
"is data sovereignty a principle or a premium feature for AXXESS," the accurate answer is: it is a
premium feature for the buyers who need it (Enterprise 1.0+), and irrelevant overhead for the ones
who don't (Unos/Emerging Enterprise). This is a defensible, coherent position -- but it must be
stated plainly and consistently if it comes up, not left ambiguous, since a skeptical reviewer could
otherwise read the tier split as inconsistency rather than intentional segmentation.

## 2. Points Flagged for Precision (Policy -- decisions still open, not yet resolved)

These were raised during internal review and are recorded here as **open items requiring a decision
or a precision fix**, not yet resolved as of this document's date:

1. **"Local datasets will be incorporated into model training" (Sovereign+).** This is a strong,
   specific technical claim. Fine-tuning, RAG-based grounding/embeddings on client data, and full
   pretraining are three different claims with different cost, feasibility, and defensibility
   profiles. **Action needed**: decide which of these is actually intended before this claim is used
   in any client-facing or investor-facing material, since a technical reviewer will read "model
   training" literally as full training, not retrieval augmentation.
2. **Operational load of five tiers.** Five tiers with this much variation (model choice, physical
   storage percentage, integration count, per-seat vs. flat pricing) is a real GTM/ops surface area
   for a pre-revenue company -- collections, model-licensing terms per tier, and support scoping all
   multiply with tier count. Not flagged as wrong, but recorded as a known cost of this design that
   should be planned for, not discovered later.

## 3. AI Provider Routing -- Current Implementation Status (verified by reading the code, 2026-07-31)

This section exists specifically so that "policy" and "what the code actually does" are never
conflated. Verified directly against `src/services/ai/providers/index.ts`,
`src/services/ai/providers/openRouterProvider.ts`, and `src/services/ai/model-routing-policy.ts`.

### What is genuinely implemented (makes a real, live external API call)

- **Kimi (Moonshot AI) and DeepSeek, both via OpenRouter** -- `createOpenRouterProvider()` makes a
  real `POST` to `https://openrouter.ai/api/v1/chat/completions`, using `OPENROUTER_API_KEY`, with
  real token-usage-based cost calculation verified against OpenRouter's own published pricing
  (2026-07-27 snapshot). This is the **only** genuinely live model-calling path in this codebase
  today.
- **Local deterministic fallback** -- real, but not an external model call; extractive/rule-based
  synthesis over authorized tenant sources.

### What is configured but NOT genuinely implemented (a real gap, not a policy choice)

**OpenAI, Anthropic, Google, xAI, Falcon, and Jais all share the same code path today:**
`remotePlaceholderProvider()` in `src/services/ai/providers/index.ts`. This applies **regardless of
whether their API key/credential is actually set** -- `OPENAI_API_KEY` being configured in Vercel
production (confirmed present, and the AI Router status panel correctly shows OpenAI as
"configured") does **not** mean OpenAI is ever actually called. The stub returns fixed text:

> "\[Provider\] is configured as an adapter-ready provider for \[category\]. Live completion calls
> remain provider-gated until production credentials, policy review, and audit sampling are
> enabled."

This was deliberately preserved (not silently papered over) in the RAG-answer-selection logic added
2026-07-30 (`src/services/rag/tenantRagWorkflow.ts`'s `openRouterBackedProviders` check) specifically
*because* trusting this stub's text as a real answer would have been a fabrication -- but it means
**every tier's "default model" that isn't Kimi/DeepSeek is currently non-functional for live
completions**, including:
- Enterprise 1.0's "customer can plug in their own OpenAI/Anthropic" -- no real call exists to plug
  into yet.
- Sovereign/Sovereign+'s "client chooses own model, Claude/OpenAI recommended" -- same gap.
- GCC add-ons Jais/Falcon -- config scaffolding exists (`FALCON_API_BASE_URL`/`FALCON_API_KEY`,
  `JAIS_API_BASE_URL`/`JAIS_API_KEY` are read and checked), but no real endpoint call is implemented
  either.

### A related, separate implementation gap worth flagging

`selectAiProvider()` (`model-routing-policy.ts`) does not currently do any tier-aware or
"prefer genuinely live providers" ordering -- it picks the first capability-matching *configured*
provider in a fixed array order (`openai, anthropic, google, xai, falcon, jais, kimi, deepseek,
local`). Since OpenAI is both first in that order and already "configured" (credential present),
it is very often selected ahead of Kimi/DeepSeek even though only Kimi/DeepSeek can produce a real
answer today -- meaning most tenant questions currently reach the stub, get correctly rejected by
the honesty check, and fall back to local synthesis. This is not a tier-pricing policy question; it
is a routing-order bug that compounds the missing-OpenAI-implementation gap. Not fixed as part of
this policy document -- recorded here so it is not lost.

## 4. What Needs To Be Built (Not Yet Implemented -- for future scoping, not committed here)

Recorded as scope, not as work in progress:

1. A real OpenAI Chat Completions API adapter, parallel in shape to `createOpenRouterProvider()`
   (same `AiProviderAdapter` interface, real token usage and cost tracking).
2. The equivalent for Anthropic/Claude once API credits/access are available (founder-stated:
   "pending API connect and credits").
3. Real endpoint-calling adapters for Falcon/Jais (GCC add-ons) -- currently config-only.
4. Tier-aware routing: `selectAiProvider()` needs to know which tier a tenant is on and weight
   genuinely-implemented providers accordingly, rather than fixed array order.
5. Enterprise 1.0+'s "customer plugs in their own OpenAI/Anthropic on their own paid plan" needs a
   real bring-your-own-credential flow (tenant-supplied API key, not a shared platform key) --
   distinct from items 1-2 above, which would use AXXESS's own credentials.
6. Sovereign/Sovereign+ physical-storage percentage tiers (10/30/50/70/90%), airgapping, and
   client-chosen-model-with-local-training all remain product/infrastructure design work with no
   corresponding code yet -- not scoped further here.

## 5. Source

This policy was stated directly by the founder in conversation on 2026-07-31, including a review
pass (geopolitical/positioning risk on Kimi/DeepSeek defaults, precision concern on "model
training" language, operational-complexity note) and the founder's clarification that Unos/Emerging
Enterprise are MSME/small-business tiers, which resolved the positioning question. Tagged
`Founder-stated, source artifact needed` only where a claim above describes a future/planned
capability rather than a decision already made -- the tier structure and default-model assignments
themselves are treated as settled policy, not open questions.
