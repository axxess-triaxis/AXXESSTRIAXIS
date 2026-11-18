# Lead sourcing: staging end-to-end test closeout (2026-11-18)

Governed by `CLAUDE.md` (Evidence Chain). Plan approved by the founder on 2026-11-18 ("Yes, plan the test", then plan-mode approval).

**Evidence chain:** the founder's GTM goal of automated lead sourcing → lead-sourcing worker (#524, #525) and its deploy and secret fixes (#529, merged as `dd25d70e`) → this test on staging → status below.

## What was tested
A full run on staging, with no production data and no outreach. Each step:
1. Queued through MCP `source_leads` (agent connection in the founder's staging organization; `source_leads`, `get_sourcing_run` and `approve_sourced_leads` enabled).
2. Claimed and crawled by the worker Lambda `axxess-lead-sourcing-staging` (ap-southeast-2), invoked once by hand. The schedule stays DISABLED.
3. Read back with `get_sourcing_run`.
4. Two candidates were imported with `approve_sourced_leads` after the founder approved the request in staging Approvals.

- **Staging deploy:** `axxesstriaxis-hrzsvw4ou` (staging commit `81679518`). **Run:** `592aed06-a299-4e9d-a6b8-3d05bfc7a951`.
- **Seeds:** the 20 companies from batch 5 (`gtm/leads_crawl_batch5_import20.csv`), plus the exclusion canary "Crevoo" at `crevoo.invalid`. "Crevoo" is on the founder-network list, and its `.invalid` domain can never be fetched. Settings: `verify_cap: 0`.

## Results (exact)
| Check | Expected | Observed |
|---|---|---|
| `source_leads` | queued 20, excluded 1, invalid [] | queued 20, excluded 1, alreadyKnownOrDuplicate 0, invalid [], verifyCap 0 |
| Worker | claims and reports back | `{"claimed":true,"status":200}` in 60 s |
| Run status | done, 0 credits | done, creditsSpent 0, error null |
| Sites | 20 | crawled 20, reached 20, skipped for time 0, robots.txt skips 0, rendered in a browser 1 |
| Candidates | up to 20 | 20: 17 role inboxes, 3 personal addresses published on the site, 0 guessed |
| Same as batch 5 | (first measurement) | contact name 20/20, email 20/20, evidence links off the seed domain 0 |
| Approval | waits for a person | pending until the founder clicked Approve (`PATCH /api/approvals/3897016d… → 200`), then approved |
| Import | 2 leads, no outreach | staging CRM: 2 leads (Keyestone AE, Ridgetop Dental IN), status open, source "Lead sourcing (…)". Candidates: 2 imported, 18 pending. Outreach sequences: 0 |

The per-company comparison is in `gtm/leads_sourcing_staging_e2e_2026_11_18.md` and `.csv`. `gtm/` is local and not committed, because it holds contact data.

## What this does and does not prove
- **Proves:** the deployed path works end to end on staging:
  - agent auth and capability gating (the first call was denied, "capability not granted", until the tools were enabled)
  - the do-not-contact filter, applied before any fetch
  - worker claim, crawl and report back
  - storage and read back
  - human-gated import with no enrollment
- **Does not independently prove accuracy.** Batch 5 was produced by the same crawler code run locally, so 20/20 shows the worker reproduces the local crawl exactly. Batch 5 itself was reviewed by hand before import (`gtm/leads_crawl_batch5_review.md`).
- **Not tested:**
  - the known-lead filter (staging has no record of the production CRM)
  - verification of guessed addresses (`verify_cap: 0`; QEV has 6 credits, so this was kept deliberately)
  - the scheduled trigger
  - any production run

## Configuration done to get here (founder, 2026-11-17 to 2026-11-18; no code)
Staging-only Vercel variables on `Preview (staging)`:
- `LEAD_SOURCING_WORKER_SECRET` (rotated, and matched with Secrets Manager)
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `AXXESS_TOKEN_VAULT_KEY`

Database and accounts:
- migration `20261117120000_lead_sourcing.sql` run in staging
- exclusion list loaded in all 5 staging organizations (15 companies each)
- a staging account signed up and onboarded (Super Admin)

## Open items
1. **Stable worker target.** `AxxessBaseUrl` is a per-deployment URL, because `staging.triaxisventures.com` is behind Vercel Authentication. Every staging deploy needs a worker redeploy. This is a blocker before the schedule is enabled.
2. **Production key in Preview.** The generic Preview `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are shared with Production, so the production keys reach every non-staging preview branch. Flagged and not changed.
3. **No vault key in production.** `AXXESS_TOKEN_VAULT_KEY` is not set for Production, so production cannot issue agent keys (the same 500 seen on staging). It is needed before any production lead-sourcing run.
4. **Production run.** Not started. It needs the founder's go, plus items 1 (if scheduled) and 3.

## Commands run (summary)
- `node ls-e2e.mjs <staging> queue | read | approve`: a local script, not committed. It reads the agent key from a file and never prints it.
- `aws lambda invoke --function-name axxess-lead-sourcing-staging` (profile axxess-triaxis, ap-southeast-2).
- `sam deploy --stack-name axxess-lead-sourcing-staging … ScheduleState=DISABLED`, after each staging redeploy.
- Staging browser session checks of `/api/crm/leads`, `/api/approvals` and `/api/outreach/sequences`.
