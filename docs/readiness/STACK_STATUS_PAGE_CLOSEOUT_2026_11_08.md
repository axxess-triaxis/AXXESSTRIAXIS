# Stack Status Page: Closeout (2026-11-08)

**Status: merged (PR #459, `c2bc70c`), deployed to production and staging, and the five stack scenarios passed on staging. On 2026-11-09 the page was viewed signed in on staging and showed real runs (see "Signed-in view on staging").**

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

## Live results (2026-11-08)

- **Merged:** PR #459 merged to `main` as `c2bc70c`; the production deploy for that commit succeeded.
- **Investor, live:** `investor-landing-par` spec against investor.triaxisventures.com: `19 passed`, including `/admin/stack` (200, sample data). Landing and staging return 401 when signed out, as expected.
- **Staging:** `main` merged into `staging` and pushed as `eec34ae`; its Vercel deploy statuses report success. The domain sits behind Vercel login, so it was not opened from here.
- **Stack scenarios on staging:** `playwright test --config playwright.stack.config.ts --retries=1`, run from the founder's machine, log finished 2026-11-08 18:14: `4 passed`, `1 flaky`, `9.6m`.
  - All five passed on the retry: Callismatic lead makes one task; completed Omnidamus conversation makes one task with no real message sent; a duplicate event makes one task; spam makes no task; a malformed event reaches the failure queue and makes no task.
  - The first attempt stopped at the test admin's sign-in (Executive Dashboard not visible within 20 s).
  - An earlier run the same day (12:06) failed scenario 1 because Callismatic labelled the test lead `important` instead of `lead`. Callismatic's lead labelling is not deterministic; an unlabelled lead would not take STILL's every-lead path.
- **Signed-in view:** done on 2026-11-09, see the next section.
- **Credential note:** during setup the Callismatic staging `ADMIN_API_KEY` was shown in a local terminal and in the working conversation. It needs a new value in its Secrets Manager secret (staging only).

## Signed-in view on staging (2026-11-09)

**External signal:** the founder asked to show the four-product orchestration in the YC demo, and chose the seeded test admin for the sign-in.

**How:** the founder passed Vercel's login in the Claude desktop browser pane. Claude then signed in to staging.triaxisventures.com as `orgadmin.alpha@axxess.test`, using the seeded password from `tests/e2e/helpers.ts`, and opened `/admin/stack`. That is the account `tests/stack/stack.spec.ts` signs in with (`seededUsers.orgAdminAlpha`), and the stack runs land in its organization.

**What the page showed:**

| Item | Value |
|---|---|
| Runs, last 7 days | 18 |
| Tasks created | 18 |
| Awaiting approval | 0 |
| Failed or refused | 0 |
| From Callismatic | 12 runs, 12 tasks created |
| From Omnidamus | 6 runs, 6 tasks created |
| Latest run | 8 Nov, 12:37 UTC |
| Oldest run listed | 4 Nov, 15:14 UTC |

- The schema strip (Callismatic, Omnidamus, Event bus, STILL, AXXESS TRIaxis) and the workflow run list rendered. The runs include the stack test's buyer message, its replay events and the Omnidamus follow-up.
- `GET /api/agents/stack-runs` returned 200.
- No phone number or email appeared in the page text.
- Console: Content Security Policy blocks on `vexo.co`, `getlaunchlist.com` and `vercel.live` scripts, plus one 401 on a resource that was not traced. None came from this page's API call.
- The "What's New" dialog covered the page on first load until it was dismissed.
- A screenshot was taken in the browser pane at 1366 x 900. It was not saved to the repo.

**Not checked:** individual task bodies, the 18:14 run on 2026-11-08 (no run after 12:37 UTC is listed, and why was not traced), and production or landing.

**Demo note:** the stats cover 7 days only. The 15 runs from 4 Nov leave the window after 11 Nov, which leaves 3. Re-run the stack scenarios the day before the demo, so the page shows recent runs.

## Still partial or unsupported

- **Fresh runs before the demo.** The founder needs to run `playwright.stack.config.ts` from their machine, with AWS signed in.
- **Backup recording.** No video of a stack run exists yet.
- **Callismatic lead labelling varies.** The same clear buying message was labelled `important` once and `lead` once.
- **Rotate the exposed staging admin key** (see Live results).
- **Narrow layout:** at phone width, the app's own sidebar and dialog cover the page. That is the existing app layout, not this change.

## Decision ledger

```
Decision: The YC demo's staging minute uses a new /admin/stack page built on existing audit records.
Why: Founder asked for schema, stats and workflow runs on staging; the audit log already records every STILL call.
What changed: See "What changed".
Architecture boundary: Admin-only API, caller's organization only; descriptions never leave the server.
Product boundary: Counts only calls that reached AXXESS. Investor shows labelled sample runs.
Verification: See Closeout Evidence.
Outcome: Merged, deployed, stack scenarios pass on staging, and the signed-in view on 2026-11-09 showed 18 real runs (12 Callismatic, 6 Omnidamus, 0 failed). Review by 2026-11-22.
Follow-up: Re-run the stack scenarios before the demo; rotate the Callismatic staging admin key; make Callismatic's lead labelling dependable.
```
