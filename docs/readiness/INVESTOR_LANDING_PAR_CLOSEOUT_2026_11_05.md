# Investor and Landing Parity: Closeout (2026-11-05)

**Status: PR open, not merged or deployed.** The live sites do not have these fixes yet. The live re-check in "After merge" is still to do.

## External signal

Founder, 2026-11-04: "bring investor.triaxisventures.com to par with landing.triaxisventures.com in every way".

## Decision

Founder, 2026-11-05: "Keep demo mode". Par means the same code and features, with demo data. Investor keeps no real sign-in and no real data.

## What was compared

Read-only, 2026-11-04. Both Vercel projects through the API, with environment variables by name only. All 80 static page routes on both hosts with a headless browser and analytics blocked. Landing was crawled signed out only.

| # | Area | Landing | Investor | Class | Result |
|---|---|---|---|---|---|
| 1 | Data and sign-in | Real sign-in, production Supabase | Forced demo, no Supabase variables | Intentional | Kept, by founder decision |
| 2 | Protected routes signed out | Redirect to `/auth` | Demo page loads | Intentional | Kept |
| 3 | `/auth` | Sign-in form | "Signed in" card | Intentional | Kept |
| 4 | Variables | 69 rows | 7 rows, no database, OAuth or AI keys | Intentional | Kept |
| 5 | Domains | landing and staging | investor only | Intentional | Kept |
| 6 | Sentry | Full set | Auth token only, so no error reporting | Drift | Founder steps below |
| 7 | Vercel framework setting | create-react-app | None; `vercel.json` sets Next.js on both | Drift, harmless | Left as is |
| 8 | Deploy hooks | 1 | 0 | Drift, purpose unknown | Left as is; founder can confirm |
| 9 | Demo-mode variable on Preview | Set | Not set, so investor previews are not demo | Drift | Founder steps below |
| 10 | Scheduled jobs | 3, all `503` | 3, all `503` | Drift | Founder steps below |
| 11 | `/projects`, `/programs` dates | Not checked signed in | 149 raw timestamps on `/projects` | Bug | Fixed in code |
| 12 | Page errors | None signed out | React #418 on 3 pages | Bug | Fixed in code |
| 13 | `/admin/ai-governance` | Not checked signed in | Said nothing was pending, and "not a preview" | Bug | Fixed in code |
| 14 | `/integrations` counts | Not checked signed in | "40 connected" beside "Configured 0" and 27 adapters | Bug | Fixed in code |
| 15 | Failing API calls | Not checked signed in | 401s on most app pages | Bug | Fixed in code |
| 16 | Page weight | Not checked signed in | `/documents` 50,980 elements, 5.7 MB; `/knowledge` 38,002, 3.8 MB | Bug | Fixed in code |
| 17 | `/admin/backups` link | 404 | 404 | Shared bug | Link removed |

## What changed

- **Raw dates.** The project board and approvals list now cut timestamps to month and day (`ProjectsSection.tsx`, `ApprovalsSection.tsx`).
- **React #418.** Dates rendered on both server and browser had no fixed time zone, so a UTC server and an IST visitor produced different text. Confirmed live: the error appears in a browser set to IST and not in one set to UTC. Three formatters now use UTC and say so: `MobileStoreLaunchConsole.tsx`, `CustomerSuccessLiveOpsPanel.tsx`, `WorkflowTimelinePanel.tsx`. This is visible to live users too: those times now read as UTC rather than local time.
- **AI Governance.** It now shows the same pending item as the inbox, from one shared record (`src/demo/demoAiReviews.ts`). On the demo, the note says the data is illustrative and actions change nothing (`EnterpriseAdminPage.tsx`, `AdminActionsPanel.tsx`).
- **Integrations.** On the demo, the adapter and configured counts come from the demo's own list (`getDisplayedIntegrationHealth` in `pluginRegistry.ts`). Live counts are unchanged.
- **API calls.** Demo pages no longer call routes they can't use. The skip uses `isDemoModeForcedByEnv()`, so it only applies to a deployment built in demo mode. A live browser with a leftover demo flag behaves as before.
- **Known exception to the API skip.** `/lite/settings/integrations` on investor still makes one failing call to `/api/connectors/status`. The Lite boundary guard forbids demo imports in Lite, so this file was restored rather than changed. The page handles the failure, and the guard matters more than one 401.
- **Page weight.** `/documents` and `/knowledge` render 50 documents at a time, with a "Show more" button (`useVisibleRowCount.ts`). This applies to live tenants too.
- **Backups link.** Removed rather than given a page, because `ADMIN_PANEL_WIRING_ROADMAP_2026_07_25.md` records that no backup table, service or route exists. A page would advertise a feature that isn't built.
- **Hosting record.** `HOSTING_DEPLOYMENT_ARCHITECTURE_2026_07_24.md` gained a dated Current State section and corrected lines.

## What did not change

Investor's demo mode and data, any Vercel setting or variable, landing's sign-in, the database, and the deploy workflows.

## Founder steps in Vercel

Scope was checked against the Vercel API on 2026-11-04. Do these before the merge, because variables only reach new builds.

**Mark none of the `NEXT_PUBLIC_` rows Sensitive.** `deploy-production.yml` builds with `vercel pull`, and landing's browser console reports `Invalid Sentry Dsn: [SENSITIVE]` for its sensitive DSN row. That is the likely cause, not yet proven.

**A. Investor error reporting (item 6).** The investor project has no Sentry row except `SENTRY_AUTH_TOKEN`, so these are new rows and touch nothing shared.

1. In Sentry, open Settings, then Projects, then the project you want investor errors in, then Client Keys (DSN). Copy the DSN.
2. In Vercel, open `triaxis-product-investor-demo`, then Settings, then Environment Variables.
3. Add `NEXT_PUBLIC_SENTRY_DSN` with the DSN. Tick Production only. Leave Sensitive off. Save.
4. Add `SENTRY_DSN` with the same value, Production only.
5. Add `SENTRY_ORG` and `SENTRY_PROJECT`, Production only.

**B. Investor previews (item 9).** The existing `NEXT_PUBLIC_AXXESS_DEMO_MODE` row is Production only. Add a separate row rather than editing that one, since shared rows have caused trouble on landing.

1. In the same page, add `NEXT_PUBLIC_AXXESS_DEMO_MODE` with the value `true`.
2. Tick Preview only. Leave Sensitive off. Save.

**C. Investor scheduled jobs (item 10).** These have no data to work on.

1. Open `triaxis-product-investor-demo`, then Settings, then Cron Jobs.
2. Click Disable Cron Jobs.

**D. Optional: landing's scheduled jobs.** All three return `503` because `CRON_SECRET` is missing. Adding it starts the social sync, Brand24 sync and pilot snapshot jobs for real, so this is a product decision.

1. Open `triaxis-www-frontend-import`, then Settings, then Environment Variables. Search for `CRON_SECRET` and confirm no row exists.
2. Add `CRON_SECRET` with a long random value. Tick Production only. Save.

**E. Optional: landing's browser error reporting.** `NEXT_PUBLIC_SENTRY_DSN` is a Production-only, Sensitive row, so replacing it affects nothing else.

1. Open `triaxis-www-frontend-import`, then Settings, then Environment Variables.
2. Delete the `NEXT_PUBLIC_SENTRY_DSN` row.
3. Add it again with the DSN from Sentry. Tick Production only. Leave Sensitive off. Save.

## After merge

1. Confirm both domains serve the merge commit, using `meta.githubCommitSha` from the Vercel API.
2. Re-run the crawl of all 80 routes on both hosts, with analytics blocked, and record the results here.
3. Run `PLAYWRIGHT_BASE_URL=https://investor.triaxisventures.com pnpm exec playwright test investor-landing-par`.

## Closeout Evidence

Issue ID: INVESTOR-LANDING-PAR
Title: Bring investor to par with landing, keeping demo mode
Origin plan: founder-approved in session on 2026-11-05; comparison table in the shared session notes, reproduced above
Research artifact: the table above
Implementation commit(s): `4a7b087`
PR: [#453](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/453)
Branch: `fix/investor-landing-par`, from `origin/main` at `d393d8f`
Files changed: see "What changed"; new test `tests/e2e/investor-landing-par.spec.ts`

Verification result (raw):
- Typecheck: PASS, `pnpm run typecheck`, and `pnpm --dir apps/mobile run typecheck`
- Lint: PASS, `pnpm run lint`, zero warnings
- Vitest: `pnpm run test -- --maxWorkers=2`: `Test Files 332 passed (332)`, `Tests 1863 passed (1863)`, `Errors 1 error`, exit 1. The error was `Failed to start threads worker` for `src/app/page.test.tsx`, so that file never ran. Re-run alone: `Test Files 1 passed (1)`, `Tests 3 passed (3)`. Combined: 1866 of 1866 tests across 333 files, in two runs rather than one clean run.
- Build: PASS, `pnpm run build`
- Supabase: PASS, `pnpm run supabase:verify`: 47 migrations, 114 tables, 114 RLS protected, one existing warning
- Playwright, production build in demo mode: `23 passed`, `19 skipped`, 0 failed, full `tests/e2e` suite. The skips were not reviewed in this work.
- Playwright, dev server, new spec only, with analytics blocked by host: `18 passed`, 0 failed. See the second Playwright entry under Errors.
- Local crawl, production build in demo mode, 80 static routes, browser in `Pacific/Auckland`: 0 failed requests, 0 page errors, 0 raw timestamps. `/documents` 1,519 elements and 172,528 characters of HTML (was 50,980 elements, 5.7 MB). `/knowledge` 1,340 elements and 142,986 characters (was 38,002 elements, 3.8 MB). This crawl was run before the final narrowing of the API skips, and the spec above was re-run after it.

Deploy evidence: None yet. Not deployed.

Acceptance criteria (stated in the task before work began): agreed differences closed, both sites checked live with exact evidence, closeout and decision ledger entry exist. **Not yet met:** the differences are closed in code only and the live check is outstanding.

Regression test: `tests/e2e/investor-landing-par.spec.ts` was written after the code edits but before any deploy, and run against the live site, which still has the old code: 17 failed, 1 passed. The one pass was a backups test pointed at a page without the admin nav; it was then moved to `/admin/users`. Also added: `useVisibleRowCount.test.ts`, and cases in `pluginRegistry.test.ts` and `PilotConversionSection.test.tsx`.

Errors hit this session:
- Error: skipping API calls on any demo flag broke "renders real events when the API returns them, regardless of Demo Mode" in `PilotConversionSection.test.tsx`.
  Resolution: fixed; the test exposed a real mistake, and the skip now uses `isDemoModeForcedByEnv()`.
- Error: 5 Playwright failures on the first full run, against the dev server (3 in the new spec, plus `sprint13-readiness` and `visual-mobile-admin`).
  Resolution: the 3 in the new spec are closed by the entry below. `sprint13-readiness` and `visual-mobile-admin` passed on the later production build, and `sprint13-readiness` took 22.8 minutes on this machine's dev server. Slow dev compiles are the likely cause for those two, not proven. PR #453's CI run is the check on them.
- Error: 2 tests in the new spec stayed on a loading state on the dev server, locally and in CI on `932f42d`, including CI retries. I first blamed slow compiles, and longer timeouts did not help, which ruled that out.
  Resolution: fixed. The spec blocked analytics with `/posthog|mixpanel/`, which also matched dev server chunk URLs, so those pages never hydrated. It now matches the host only, and the new spec passes 18 of 18 on the dev server. Production chunk names are hashed, which is why production builds passed.
- Error: the Lite boundary guard failed on `44a0888`, because a demo import was added to `LiteIntegrationsSection.tsx`.
  Resolution: fixed in `932f42d` by restoring the file. `pnpm run lite:ci` passes: guard across 66 files, 95 of 95 Lite tests.
- Error: Vitest `Failed to start threads worker` for `src/app/page.test.tsx`, on a 51-minute run while the machine was loaded.
  Resolution: file re-run alone and passed, 3 of 3. Same class as the worker issue in `docs/readiness/FAILED_OR_TIMED_OUT_CHECKS.md`.
- Error: `git worktree add` with `MSYS_NO_PATHCONV=1` created the worktree under the wrong path.
  Resolution: fixed with `git worktree move`.
- Error: first local run of the new spec did not reproduce #418, because a browser in IST matched the local server.
  Resolution: fixed; the browser now uses `Pacific/Auckland`, which matches no server here. That exposed the unfixed `WorkflowTimelinePanel` formatter.

Decision outcomes:
- Decision: keep investor in demo mode.
  Outcome: Pending, review by 2026-11-19.
- Decision: remove the backups link rather than build a page.
  Outcome: Pending, review by 2026-11-19.

Final status: Code complete
Remaining risk: times on the three changed panels now show UTC for live users. "Show more" means browser find on the page only covers rows already shown; the Knowledge Hub's own search and filters still cover all documents.
Follow-up issue IDs: see below
Supersedes: none
Superseded by: none
Reopened by: none

## Still partial or unsupported

- **Landing's signed-in features were not compared.** That needs the founder or a staging login, so "same features" is backed by shared code, not by a signed-in comparison.
- **Demo actions and AI questions** were not exercised on the live site.
- **Deploy order.** Git integration and `deploy-production.yml` can finish out of order, as they did on 2026-11-04. It corrected itself: both sites were on `d393d8f` when re-read on 2026-11-05. Not fixed here.
- **Security policy.** CSP blocks the `vexo.co` and `getlaunchlist` scripts on both sites. Not fixed here.

## Decision ledger

```
Decision: Investor stays in forced demo mode. Par means the same code and features, with demo data.
Why: A public, no-login site with production data would be a major security and product change, and would undo the July separation of demo and product.
What changed: Demo-only bug fixes, shared fixes for dates, list length and the dead backups link, and the hosting record.
Architecture boundary: Investor stays a separate Vercel project with no database or secret keys. API skips apply only to builds forced into demo mode.
Product boundary: Investor shows illustrative data and never accepts real sign-in.
Verification: See Closeout Evidence.
Outcome: Pending, review by 2026-11-19.
Follow-up: Founder confirmation to merge #453; Vercel steps; live re-check; signed-in landing comparison.
```
