# Stack Status Page: Closeout (2026-11-08)

**Status: built and tested locally, not merged, deployed or shown on staging yet.**

## External signal

YC demo planning, 2026-11-08. The founder plans 4 minutes on investor.triaxisventures.com and 1 minute on staging.triaxisventures.com, and asked for staging to show "a schema+stats page with workflow runs".

## Decision

Add one admin page, `/admin/stack`, built on records AXXESS already keeps. No new table or AWS change. The same page serves staging, landing and investor:

- **Staging and landing:** real data for the signed-in admin's own organization.
- **Investor:** labelled sample runs, with no API call.

## What changed

- `src/services/agents/stackWorkflowSnapshot.ts`: builds 7-day stats and the latest 20 runs from the `agent_tool_call` audit rows that `/api/agents/mcp` writes. The source comes from the "From Callismatic" or "From Omnidamus" line that STILL adds to each task. Descriptions are never returned, because they can hold phone numbers and emails.
- `src/app/api/agents/stack-runs/route.ts`: new. Super Admin and Organization Admin only, caller's own organization only.
- `src/features/stack/StackStatusSection.tsx`: schema, stats, per-source counts and workflow runs. Times are shown in UTC, so the server and browser render the same text.
- `src/demo/demoStackRuns.ts`: sample runs for forced demo mode.
- Registered in `navigation.ts`, `routes.ts`, `lazyRoutes.tsx` and `rbac.ts`, plus `src/app/admin/stack/page.tsx`.
- `tests/e2e/investor-landing-par.spec.ts` now also covers `/admin/stack`.

## What did not change

- **Calls that never reach AXXESS are not counted.** That covers duplicates, spam and malformed events, which STILL or its AWS failure queue stop first. The page says so.
- **No AWS reads.** The failure queue count would need AWS access from AXXESS.
- **No production stack change.** The every-lead rule is still on staging only.

## Closeout Evidence

Run on `feat/stack-status-page`, from `origin/main` at `2023d58`:

- **New tests failed first:** 4 test files failed before the code existed. Three couldn't resolve their imports, and the route test asserted `'dashboard'` where `'admin/stack'` was expected.
- **Unit tests, affected files:** `Test Files 6 passed (6)`, `Tests 28 passed (28)`.
- **Static checks:** `pnpm run typecheck`, `pnpm --dir apps/mobile run typecheck`, `pnpm run lint` with zero warnings, and `pnpm run supabase:verify` all exit 0.
- **Full suite:** `pnpm run test -- --maxWorkers=2`: `Test Files 336 passed (336)`, `Tests 1883 passed (1883)`.
- **Build:** `pnpm run build` exits 0 and lists `/admin/stack` and `/api/agents/stack-runs`.
- **Playwright on a production build forced into demo mode:**
  - `investor-landing-par` spec: `19 passed (54.5s)`, including `/admin/stack` with no failing API call and no page error.
  - Screenshots at 1366 and 390 pixels wide: schema, sample label, stats and runs render. The existing "What's New" dialog covered part of the page.

## Still partial or unsupported

- **Real data has not been viewed.** That needs a signed-in admin on staging. STILL writes into the organization its agent key belongs to, so the founder must sign in as an admin of that organization.
- **Staging shows nothing yet.** It needs this merged to `main`, then `main` merged into `staging` and pushed. Both need founder approval. The page will also be empty until stack runs exist in the last 7 days, and running the five stack scenarios needs an AWS sign-in.
- **Narrow layout:** at phone width, the app's own sidebar and dialog cover the page. That is the existing app layout, not this change.

## Decision ledger

```
Decision: The YC demo's staging minute uses a new /admin/stack page built on existing audit records.
Why: Founder asked for schema, stats and workflow runs on staging; the audit log already records every STILL call.
What changed: See "What changed".
Architecture boundary: Admin-only API, caller's organization only; descriptions never leave the server.
Product boundary: Counts only calls that reached AXXESS. Investor shows labelled sample runs.
Verification: See Closeout Evidence.
Outcome: Pending, review by 2026-11-22.
Follow-up: Merge; update staging; run the stack scenarios; check with a real sign-in.
```
