# AI Routing

Sprint 14 introduces a provider-gated AI routing layer for AXXESS.

## Providers

- OpenAI
- Anthropic
- Google Gemini
- xAI
- Falcon endpoint
- Jais endpoint
- Local deterministic fallback

Remote providers are selected only when the related server-side key is configured. The local fallback remains available for investor preview, offline development, and environments where policy requires no external model call.

## Routing Inputs

- Tenant and user context
- User role
- Task category
- Prompt sensitivity
- Citation requirement
- Cost and latency preference
- Preferred provider, when explicitly allowed

## Safety

Restricted prompts are routed to the local fallback until a governed provider is configured. The router returns confidence, citations, provider used, routing reason, and a human review flag for audit-ready workflows.

## Environment

Use `.env.example` as the source of expected variables. Do not expose provider keys through `NEXT_PUBLIC_*`.
