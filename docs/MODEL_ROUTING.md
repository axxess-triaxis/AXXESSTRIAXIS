# Model Routing

AXXESS uses a tenant-aware, provider-neutral AI routing policy.

The router does not hard-wire the product to one provider. It selects a provider from configured adapters, applies tenant policy, keeps fallback chains, estimates cost, and marks consequential outputs for human review.

## Core Files

- `src/services/ai/tenantModelPolicy.ts`
- `src/services/ai/router/aiRouter.ts`
- `src/app/api/ai/model-policy/route.ts`
- `supabase/migrations/202607140002_sprint20_21_live_ai_platform.sql`

## Policy Fields

- Allowed providers.
- Blocked providers.
- Preferred provider by task category.
- Fallback providers.
- Maximum estimated cost per request.
- Human-review categories.
- Restricted-data external-provider posture.
- Zero-data-retention requirement.
- Gateway tags for attribution.

## Routing Output

Every routed request can include:

- Provider used.
- Model used.
- Routing reason.
- Fallback chain.
- Confidence.
- Human-review requirement.
- Estimated cost.
- Policy id.
- Gateway tags.
- Approval reason.

## Safety Rules

- Restricted data defaults to local fallback unless tenant policy explicitly allows external providers.
- Compliance, risk, and workflow-generation outputs require human approval by default.
- Provider credentials are optional. Local deterministic fallback keeps the app usable in demo and offline development.

## Provider Roadmap

Sprint 22 should connect live provider calls through an AI Gateway or equivalent model abstraction, persist actual token usage, and write provider failure/fallback events to the usage ledger.
