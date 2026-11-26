# Lead sourcing v2 (automatic discovery on schedules) - production closeout, 2026-11-19

## Evidence chain

- **External signal.**
  - Founder request (2026-11-18): "Plan the automatic seed sourcing next - We need this fully automated and on Bedrock. Users should be able to use it end to end and set it n schedule."
  - Before this, the engine only crawled seed lists that were researched by hand. Production run `cc7a2676`, recorded in `LEAD_SOURCING_PROD_RUN1_CLOSEOUT_2026_11_18.md`.
- **Product decisions** (founder, 2026-11-18):
  - Always auto-import, with review afterwards.
  - All orgs, with monthly caps.
  - Bedrock, with the model switched later. Founder's words: "Switch to Groq/oss models then", "Use cheapest oss models, Anthropic later on", "AWS credits need preservation".
  - Anthropic models return `AccessDeniedException` ("not available for this account") for account 227214487086. Discovery therefore runs on `openai.gpt-oss-20b-1:0` in ap-southeast-2.
  - Founder go for production in this session: "Yes, test the schedule firing too -And lets push to production".
- **Shipped artifact.** PRs #535 (schedules and scheduler), #536 (discovery on Bedrock + AgentCore web search), #538 (auto-import), #539 (Lead sourcing page) and #540 (oss model, extraction fallback and the fixes below).
  - Stacked, merged down the stack, then #535 into `main` as merge commit `afd0c898`.
  - Migration `20261118120000_lead_sourcing_schedules.sql`. The founder ran it in the prod SQL editor (project vnliomnfabaicvvvfwia). It was applied in staging on 2026-11-18.
- **Verification:** below.
- **Current status:** live in production. The first production schedule was created on 2026-11-19 at the founder's request ("Create the first production schedule if plan permits"):
  - Schedule `6bfdb12b`, "Dubai real estate brokerages": brokerages in Dubai, AE, 10 companies per run, weekly on Monday at 09:00 Asia/Dubai, turned on.
  - The API returned 201, with the first run due 2026-11-23 at 05:00 UTC.
  - Before it was created, the production exclusion list was checked and holds all 15 `founder_network` companies.

## What changed

**App (Vercel, `main` at `afd0c898`):**
- Schedules, runs, exclusions and usage APIs under `/api/lead-sourcing/*`.
- Worker routes for the scheduler tick, the discovery claim and seed submission.
- Auto-import of discovery-run candidates. Nothing is ever enrolled in a sequence.
- The Lead sourcing page at `/crm/lead-sourcing`, for senior roles.

**Worker (`axxess-lead-sourcing-prod`, deployed 2026-11-19 ~12:07 UTC from `afd0c898`):**
- `DiscoveryEnabled=true`, `DiscoveryModelId=openai.gpt-oss-20b-1:0` and `ScheduleState=ENABLED`.
- Every 5 minutes it runs the scheduler tick, then one discovery run or one crawl run.

**Fixes found by the staging tests on 2026-11-18 and 2026-11-19, all in #540 and so in `afd0c898`:**
- `23b3c2b2`:
  - "Approved Maintenance Works" was imported as a person (run `1c8c5775`).
  - Service and listing words are now stopwords.
  - Abstract-noun tokens of 8 or more letters are rejected.
- `bfe64637`:
  - The crawl died with `Runtime.NodeJsExit` 17 s in (run `1f823eb2`). A headless-browser render had left a promise that never settled.
  - Renders now settle within 60 s and browser close within 10 s, and a disconnected browser is relaunched.
- `368cb82e`:
  - "Popular Search" was imported as a founder (run `09a9ad4f`). The real name was only in an image, so the menu heading after "Founder & CEO" was taken.
  - Text after a role that recurs on the page is now skipped, and menu words are stopwords.

## What did not change

- No outreach. No sequence enrolment. The MCP tools' human-approval gate is unchanged.
- No countries beyond IN and AE. No registry imports. No billing tiers.
- No production schedule was created, so the production worker has not yet run a discovery.

## What was verified

**Local gates on the final head** (`368cb82e`, the same tree as `f2f47b83`):
- `pnpm run typecheck`, `pnpm --dir apps/mobile run typecheck`, `pnpm run lint` (zero warnings), `pnpm run supabase:verify` and `pnpm run build`: all exit 0.
- `pnpm run test`: 387 files, 2373 tests passed.

**PR CI on #535 head `f2f47b83`:**
- 24 checks, all passed or skipped. These include `playwright`; `Build, Lint, Type Check`; `Supabase CLI And Migration Static Verify`; CodeQL; and Secret Scan.
- `tests/e2e/lead-sourcing.spec.ts` covers creating and deleting a schedule, plus the guest refusal.

**Each new test fails on the old code:** the two name tests from `23b3c2b2` and the menu-heading test from `368cb82e`.

**Staging, run by hand, `1c8c5775` (2026-11-18):**
- Discovery, then crawl, then 2 leads auto-imported with 0 enrolments, then Remove marked one lost.

**Staging, run by hand, `1f823eb2` (2026-11-19):**
- Discovery: 6 searches, 10 companies suggested, 5 checked, 1 queued (4 already known).
- The crawl crashed (this led to `bfe64637`). The stale-run sweep marked the run failed at 11:05 UTC, as designed.

**Staging schedule firing, `09a9ad4f` (2026-11-19):**
- Schedule "E2E Dubai brokerages" was set to daily at 17:00 Asia/Kolkata, which is 11:30 UTC.
- 11:30:02 UTC tick: `{"due":1,"started":1}`.
- Discovery: 3 searches, 4 model turns, 5 suggested, 4 checked; 9,099 input and 1,063 output tokens.
- Crawl on the fixed worker: 4 of 4 sites reached, 2 pages rendered in the browser with no crash, 1 candidate auto-imported, 93 s.
- The schedule was turned off again afterwards (PATCH 200, `enabled:false`).

**Production:**
- `POST /api/lead-sourcing/worker/tick` with no key changed from 404 to 401 at 12:06:02 UTC, once Vercel served `afd0c898`.
- The prod worker's 12:12:01 UTC tick logged `{"tick":{"due":0,"started":0,"skipped":0,"lost":0}}` with no error. That shows the worker key is accepted and the new tables exist.

## What remains partial or open

- **Contact-name precision.** The extractor is rule-based, and each staging run surfaced a new kind of false name, fixed above.
  - More will appear in production. The safety nets are:
    - leads are never contacted automatically
    - each lead records where its name came from
    - Remove (optionally with "also exclude") takes one click
  - The staging CRM still holds the "Popular Search" lead from `09a9ad4f`. That is staging data only.
- **Staging page hangs on "Checking session"** while the APIs answer 200. It was seen after PR #545 (sign-in timing) was merged into `staging` by another session. It is not from this work and has not been investigated here.
- **No production discovery has run yet.** The first scheduled run is due 2026-11-23 at 05:00 UTC. Checking that run (stats, imported names, 0 enrolments) is the next step.
- **Anthropic on Bedrock** needs an AWS Support case ("Account and billing"), which has not been opened. Switching back later is a parameter change, because the IAM policy already allows the Haiku profile.
- **Search quota.** AgentCore web search is free up to 5,000 queries a month for the AWS organisation. The app caps searches at 300 per org per month and 4,500 across all orgs.

## Unsupported claims

- None claimed. No production lead has been sourced by discovery yet.

## Exact state

**Git and PRs:**
- `main` at `afd0c898`.
- PRs #535, #536, #538, #539 and #540 are merged.

**Workers:**

| Stack | Code | Deployed |
|---|---|---|
| `axxess-lead-sourcing-staging` | `f2f47b83` | 2026-11-19 |
| `axxess-lead-sourcing-prod` | `afd0c898` | 2026-11-19 |

**Commands:**
- Workers were deployed with `node build.mjs; sam build --no-cached; sam deploy ...`, with the parameters listed above.
- No secret values were read. The secrets are referenced by ARN only.
