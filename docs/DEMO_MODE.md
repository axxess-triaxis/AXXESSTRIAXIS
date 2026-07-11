# Demo Mode

Demo Mode is the AXXESS investor-preview layer. It runs on the same application shell and repository contracts as production, but swaps in a seeded North East Health Mission tenant.

## Enablement

- Settings: `Settings -> Demo`
- Environment: `NEXT_PUBLIC_AXXESS_DEMO_MODE=true`
- Demo login: `investor.preview@axxess.demo` with password `preview`

No code changes are required to enable or disable Demo Mode.

## Seeded Environment

The preview tenant includes:

- 186 projects across 12 programs
- 2,200 institutional documents
- 128 Knowledge Hub articles
- 4,200 document activity records
- 64 stakeholders
- 42 approvals
- 680 audit logs
- 36 users

The dataset uses one coherent fictional institution, North East Health Mission, and local regional workflows across public health, hospitals, procurement, grants, compliance, district reviews, CSR proposals, monitoring and evaluation, and audit observations.

## Production Fallback

When Supabase is unavailable in a demo deployment, the service provider falls back to demo repositories rather than showing backend errors. Investor-facing dashboards and Knowledge Hub views continue rendering with seeded data and an `Investor Preview` badge.

## Guided Demo

Sprint 15 adds a guided investor/customer walkthrough that runs on the normal app shell:

- Start from the Executive Dashboard.
- Inspect a governed Knowledge Hub document.
- Ask an AI Workspace question with cited RAG-style sources.
- Create or inspect follow-through tasks.
- Review approvals with human decisioning and audit language.
- Close on analytics and pilot/request-feedback CTAs.

Use `/dashboard?demo=guided` to activate the walkthrough. The guided state is stored locally and survives navigation between major screens.

## Screenshot Mode

Use `?screenshot=true` on product routes to hide guided-demo chrome and capture clean product screenshots. Recommended routes are documented in `docs/DEMO_SCREENSHOT_GUIDE.md`.

## Normal Mode

When Demo Mode is off, new tenants do not receive seeded demo data. If Supabase is connected, the application uses production repositories. If Supabase is not connected, the shell presents a clean tenant.

## Reset

The Settings demo panel includes a one-click reset. Reset restores the original seeded tenant, removes local preview modifications, and reloads the active view.

## Guardrails

- Demo data is tenant-scoped to the North East Health Mission organization.
- Production tenants never receive seeded data.
- Demo repositories remain separate from Supabase-backed repositories.
- No service-role keys are exposed to the browser.
