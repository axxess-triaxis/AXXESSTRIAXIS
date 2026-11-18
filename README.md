# AXXESS TRIaxis

[![CI](https://github.com/axxess-triaxis/AXXESSTRIAXIS/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/axxess-triaxis/AXXESSTRIAXIS/actions/workflows/ci.yml)
<a href="https://www.producthunt.com/products/axxess-triaxis?embed=true&amp;utm_source=badge-featured&amp;utm_medium=badge&amp;utm_campaign=badge-axxess-triaxis" target="_blank" rel="noopener noreferrer"><img alt="AXXESS TRIaxis on Product Hunt" width="180" src="public/branding/product-hunt-featured.svg"></a>

AXXESS is the AI workspace for small organisations: tasks, documents, meetings, a CRM and an AI
assistant in one tenant, with a human approving anything risky and every action written to an
audit log. Built by [Triaxis Ventures Private Limited](https://github.com/axxess-triaxis), India.

![AXXESS executive dashboard in the investor demo](docs/assets/axxess-investor-demo-dashboard.png)
<sub>Investor demo with demo data, captured 2026-10-30.</sub>

## Try it

- **[landing.triaxisventures.com](https://landing.triaxisventures.com)**: the live app. Sign-in required.
- **[investor.triaxisventures.com](https://investor.triaxisventures.com)**: the demo. No sign-in, demo data only.

## Status, checked 2026-11-18

| | Status | Evidence |
|---|---|---|
| Web | Live. Both links above return HTTP 200. Every merge to `main` deploys the live app | `curl`, 2026-11-18; [`deploy-production.yml`](.github/workflows/deploy-production.yml) |
| Android | Version 5 (0.9.0) on Google Play: Production track, full rollout, 172 countries and regions (as of 2026-08-30) | [Android production closeout, 2026-08-30](docs/readiness/ANDROID_BETA_0_9_PRODUCTION_RELEASE_CLOSEOUT_2026_08_30.md) |
| Pilots | 2 pilot organisations onboarded on the live app (July and August 2026); 5 signed letters of intent | [LOI and pilot log](docs/LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md) |
| Prepayment | Both pilots have committed to prepay. One commitment is in writing (2026-08-12); that both are in writing and both pilots are still active is *Founder-stated, source artifact needed* | Same log |
| Revenue | None collected. The latest commercial record in this repo (2026-08-11) says collection waits on the company's current account and GST registration | [Commercial evidence](docs/audit/08_COMMERCIAL_EVIDENCE.md) |

## Lead sourcing

AXXESS can find sales leads for its own go-to-market, with a person approving every lead before it
enters the CRM.

| Step | What happens | State |
|---|---|---|
| 1. Seed list | An agent queues a run of company websites through the MCP tool `source_leads`. A founder-maintained exclusion list is checked first | Shipped ([#525](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/525)) |
| 2. Crawl | An AWS Lambda worker ([`workers/lead-sourcing`](workers/lead-sourcing/README.md)) claims the run over HTTPS, crawls each site, skips pages that `robots.txt` disallows, and posts back contacts found on the company's own domain | Shipped ([#524](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/524) crawler, [#525](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/525) worker; fixes [#529](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/529), [#532](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/532), [#533](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/533)) |
| 3. Approve and import | `approve_sourced_leads` always needs a fresh human approval; standing grants never cover it. Only approved candidates become CRM leads. The worker never imports, enrolls or contacts anyone | Shipped ([#525](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/525)) |

**First production run, 2026-11-18:** 30 founder-approved seed companies, 26 sites reached,
8 candidates, 7 imported after the founder chose them. Nothing was sent to them. The production
worker's schedule is off; this run was invoked once by hand.
[Closeout](docs/readiness/LEAD_SOURCING_PROD_RUN1_CLOSEOUT_2026_11_18.md) ·
[staging end-to-end test](docs/readiness/LEAD_SOURCING_STAGING_E2E_CLOSEOUT_2026_11_18.md) ·
[agent and MCP design](docs/readiness/LEAD_SOURCING_AGENT_MCP_CLOSEOUT_2026_11_17.md)

**In progress, not shipped:** automatic run schedules
([#535](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/535)) and automatic company discovery
on Amazon Bedrock ([#536](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/536)). Both PRs are
open and unmerged.

## Stack

Next.js and React in TypeScript, Supabase (Postgres with row-level security), hosted on Vercel.
The Android app is a Capacitor shell that loads the same web app (`apps/mobile-capacitor`).
AI calls go through a provider-neutral router (`src/services`). The lead-sourcing crawler runs on
AWS Lambda, deployed with AWS SAM ([`workers/lead-sourcing/template.yaml`](workers/lead-sourcing/template.yaml)).

## Run it locally

Needs Node 22+ and pnpm 11+.

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local   # set NEXT_PUBLIC_AXXESS_DEMO_MODE=true to run on demo data
pnpm run dev                 # http://localhost:3000
pnpm run typecheck && pnpm run lint && pnpm run test
```

**Which CI is real:** GitHub Actions ([`.github/workflows`](.github/workflows)) gates every PR; the
badge above is `ci.yml`. `.gitlab-ci.yml` mirrors those checks on a GitLab copy and `bitrise.yml` is
an optional mobile pipeline; neither gates merges here. The app is Next.js. The root `vite.config.ts`
and `index.html` are left over from the first prototype and no script builds them.

## How status is tracked

Every claim above links to a file in this repo. Status lives in:

- [Readiness matrix](docs/readiness/ACTIONABLES_READINESS_MATRIX.md): every actionable as `Yes`, `Blocked`, `No` or `Deferred`
- [Decision and outcome ledger](docs/readiness/DECISION_OUTCOME_LEDGER.md): each major decision, its PR and its verification
- `docs/readiness/*_CLOSEOUT_*.md`: one closeout per shipped piece of work

## More

- [Previous full README](docs/archive/README_FULL_2026_10_29.md): architecture, governance, sprint history, roadmap, FAQ (archived, not current)
- [How AXXESS fits the other Triaxis products](docs/TRIAXIS_STACK.md)
- [Architecture and business model](MONOREPO_ARCHITECTURE_AND_BUSINESS_MODEL.md) · [Security](SECURITY.md) · [Contributing](CONTRIBUTING.md) · [Licence](LICENSE)
