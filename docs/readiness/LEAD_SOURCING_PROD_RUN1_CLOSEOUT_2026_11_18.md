# Lead sourcing: first production run, closeout (2026-11-18)

## Evidence chain
- **External signal:** the GTM pivot to India and UAE first (founder, 2026-11-11), with first segments of real estate brokerages and private clinics (founder, 2026-11-14).
- **Product decision:** the founder approved a plan for a first production run. Its terms:
  - 30 fresh seeds, researched by Claude and approved by the founder
  - `verify_cap: 0`
  - the worker deployed with its schedule off and invoked once by hand
  - the founder chooses which candidates to import
- **Shipped artifact:**
  - production worker stack `axxess-lead-sourcing-prod`
  - PR #532 (`8f6237f1`), the schedule name fix
  - PR #533, the personal-address match fix (open at the time of writing)
- **Verification:** below.
- **Current status:**
  - 7 leads imported into the production CRM, with no outreach
  - the production schedule is DISABLED
  - the worker still runs the pre-#533 matching code

## Production layout (verified 2026-11-18)
- **The live app is landing.triaxisventures.com**, Vercel project `triaxis-www-frontend-import`.
  - It deploys on every merge to `main` through `.github/workflows/deploy-production.yml`.
  - It uses Supabase project `vnliomnfabaicvvvfwia`.
- **`axxesstriaxis`** (beta.triaxisventures.com, triaxisventures.com) shares the same database. The founder states beta is not used. See the correction in `LEAD_SOURCING_STAGING_E2E_CLOSEOUT_2026_11_18.md`.
- **`vercel redeploy` of a landing deployment reuses its prebuilt output.** Vercel warns that it "will not use the latest environment variables". A merge to `main` triggers a fresh build that does.

## Setup done
| Item | Who | Evidence |
|---|---|---|
| Lead-sourcing tables in prod | already present | Founder's prod SQL editor screenshot: `to_regclass` returned `lead_sourcing_runs` and `lead_source_exclusions`. When they were created is not known. |
| Worker secret | Founder (one-line PowerShell; Claude never saw the value) | Secrets Manager `axxess-prod-lead-sourcing-worker-V2UuHx`, created 09:19:44 UTC, 1 version. Vercel `triaxis-www-frontend-import` Production `LEAD_SOURCING_WORKER_SECRET`, set in the same run. |
| Landing rebuild | Merge of #532 | `deploy-production.yml` run `44278728223`: landing and investor jobs succeeded. |
| Worker stack | Claude (founder go) | `sam deploy` of `main` `8f6237f1`: `axxess-lead-sourcing-prod` CREATE_COMPLETE, schedule `axxess-lead-sourcing-prod-every-5-min` DISABLED, `AxxessBaseUrl` = landing, no QEV secret. A manual invoke returned 200 `{"claimed":false}`. |
| Exclusions | Claude, from the founder's signed-in landing session | `POST /api/lead-sourcing/exclusions`: 15 `founder_network` added, rerun added 0. |
| Agent connection | Founder | New Anthropic connection with `source_leads`, `get_sourcing_run` and `approve_sourced_leads`. The key is in a local file and never entered chat. |

## Seeds
- **30 companies:** 15 brokerages and 15 clinics, 16 UAE and 14 India.
- **Sources:** each company's own website, found through web search with listing sites (Property Finder, Practo, WhatClinic and similar) filtered out. No LinkedIn, no Google results scraping.
- **Overlap check:** none of the 30 domains appears in any earlier `gtm/` batch file, and none of the companies is on the exclusion list.
- **Founder approval:** "Approve all 30".
- **Location:** the list stays in `gtm/leads_sourcing_prod_run1_seeds.csv`, uncommitted like the other gtm files.

## Run `cc7a2676-926c-4e04-b1f0-43f6637f6e75`
| Stage | Result |
|---|---|
| Queue (`source_leads`) | queued 30, excluded 0, already known or duplicate 0, invalid 0, verifyCap 0 |
| Crawl (one manual invoke) | 200, no function error; run `done`, creditsSpent 0 |
| Sites | 30 crawled, 26 reached, 0 skipped for time |
| Pages | 14 pages skipped by robots.txt, 1 page rendered in a browser |
| Findings | 12 sites name a leader; 12 have an on-domain email |
| Candidates | 8 (brokerage 7, clinic 1): 2 personal addresses, 6 role inboxes; 0 with evidence off the seed's own domain |
| Import | The founder chose 7 and skipped DRE Real Estate. Approval `49b19763` was approved and executed. |
| CRM after | Production leads went from 76 to 83. The 7 new leads are status `open`, source "Lead sourcing (... named on <own site>)". 0 enrolled in a sequence: the import path has no sequence code (`leadSourcingRepository.ts`). |

**Imported companies:**
- Elite Property Dubai
- Whitehorse International
- Dax & Bax Properties
- Capion Real Estate
- Seven Luxury Real Estate
- Global Constructions & Realtors
- Neya Dermatology & Aesthetics

Contact names and addresses are in the uncommitted review file `gtm/leads_sourcing_prod_run1_2026_11_18.md`, not in the repository.

## What this shows and does not show
- **Yield:** 8 of 30 sites produced a candidate (27%). The hand-run batch 5 produced 37 from 160 sites (23%), so the two are close.
- **Clinics yield far less than brokerages here:** 1 of 15 against 7 of 15. Most clinic sites list no email on their own domain, or block crawlers.
- **One wrong label:** the crawler called `maintenance@` the co-founder's personal address, because the name part "Ain" matched letters inside "maintenance". The founder skipped that candidate. PR #533 fixes the match.
- **Not tested:** guessed-address verification (QEV, kept at 0 credits), and the production schedule.
- **No outreach happened.** Whether to contact these 7 is a separate founder decision.

## Open items
1. **Merge #533 and redeploy the prod worker,** keeping the schedule DISABLED, before any further run.
2. **Production schedule:** only after #533 is deployed, and with the founder's go.
3. **Staging schedule rename:** the staging stack still uses the old schedule name `WorkerFunctionEveryFiveMinutes`. Its next deploy renames it and must pass `ScheduleState=ENABLED`.
4. **Clinic yield:** decide whether clinics need a different seed source, or role-inbox-only outreach.
