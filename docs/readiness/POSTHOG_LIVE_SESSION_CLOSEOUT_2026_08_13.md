# PostHog Live Session Closeout -- 2026-08-13

**Branch:** `docs/actionables-matrix-a102-a103-stale-fix` -- **PR:** [#233](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/233) (open, unmerged as of this closeout)
**Commits covered:** `e9f50d8`..`9119a0a` (6 commits; the branch's first 2 commits, `1f82475`/`0c2b961`, are a separate A-102/A-103/A-11 stale-status workstream, not covered here)

## Operation

Founder shared a PostHog URL and logged in inside this Claude Code session's browser pane -- the first time PostHog data was pulled live against the authenticated UI in this program, rather than read from a founder-shared screenshot (every prior PostHog entry in `POSTHOG_DATA_ANALYTICS_INSIGHTS_LOG_2026_08_09.md` used the latter method). What followed was an iterative live-data investigation: Web Analytics, Web Vitals at multiple percentiles, and an Installation Health check, across both tracked domains, with several real errors caught and corrected mid-session by the founder.

## What changed

- **`docs/readiness/POSTHOG_DATA_ANALYTICS_INSIGHTS_LOG_2026_08_09.md`** -- five new/extended subsections:
  - **§1.8** -- `landing.triaxisventures.com` Web Analytics, live pull, window 2026-07-27 to now (~17 days): 41 visitors, 551 page views, 106 sessions.
  - **§2.4** -- `investor.triaxisventures.com` Web Analytics, live pull, window corrected to 2026-08-08 to now (~5-6 days): 592 visitors, 672 page views, 643 sessions.
  - **§1.3b** -- `landing` Web Vitals P99, full LCP path breakdown. Worst: `/dashboard` 43.25s, `/integrations` 27.14s, `/settings` 23.84s, `/knowledge` 19.93s. Includes the FCP path breakdown (checked on founder request) and the INP path breakdown (checked on founder request, confirmed Good on nearly every path including the worst-LCP ones).
  - **§1.3c** -- new: P75 vs. P99 comparison on both domains, added after the founder asked whether P99 could read as better than P75 on some pages. It does not, on either domain or metric checked.
  - **§3 (Cross-cutting notes)** -- Installation Health check result (6/6 passed, project-level).
  - **Evidence index** -- one new row pointing at this pull.
- **`docs/readiness/ACTIONABLES_READINESS_MATRIX.md`**, row A-105 -- two additions to the existing evidence text: the P99 path-breakdown cross-reference, and a founder-stated hypothesis (Vercel Hobby / Supabase free tier struggling under now-significant real traffic) with its own verification status noted inline.

## What did not change

- No application code, migration, or config file was touched -- this is a pure evidence/documentation session.
- A-105's **status** field is unchanged (`No` -- the redirect-chain theory remains the primary root-cause candidate). The new P99/P75 data was added as supporting evidence, not used to flip the row's disposition.
- No new actionable (A-### row) was created for the LCP findings; everything landed as an update to the existing A-105 row.
- The Vercel/Supabase capacity hypothesis was **not** promoted to a confirmed root cause -- it remains a plausible, complementary theory to the redirect-chain theory, not a replacement for it. (Its Supabase-tier premise is now founder-confirmed, per "What was verified" below -- but confirming the premise is not the same as confirming it explains the LCP regression.)

## What was verified

- **Installation Health, live pull:** 6 of 6 checks passed (`/project/498426/web/health`) -- event tracking 3/3, configuration 2/2 (Authorized URLs, reverse proxy), performance 1/1 (`$web_vitals` confirmed tracked). Rules out instrumentation misconfiguration as an explanation for the Poor LCP readings.
- **Vercel Hobby tier:** independently confirmed against existing repo evidence (`VERCEL_PLATFORM_METRICS_SNAPSHOT_2026_07_29.md`, screenshot-based, predates this session) -- not founder-stated-only.
- **Supabase plan tier:** founder-confirmed 2026-08-13 -- **Free tier.** Resolves the one open item this closeout originally flagged (a Supabase Dashboard billing-page check). Both halves of the A-105 capacity hypothesis (Vercel Hobby + Supabase Free) are now confirmed as real; the hypothesis itself -- that this capacity level is contributing to the LCP regression -- remains unconfirmed, since confirming the infra tier is not the same as confirming it's the cause.
- **P75 vs. P99, no reversal:** checked directly by pulling both percentiles on both domains rather than accepting the founder's initial framing. Confirmed P99 >= P75 everywhere checked (`landing` `/dashboard`: 10.87s P75 vs 43.25s P99; `investor` `/dashboard`: 3.60s P75 vs 6.37s P99; `investor` FCP: 1.92s P75 vs 4.73s P99) -- the mathematically expected direction, no anomaly found.
- **Window-label errors, self-caught after founder correction:** the founder pointed out the shared URL's literal `date_from=2026-07-08` predates real PostHog instrumentation on both domains ("Landing is July 27 onwards, investor is 8 Aug onwards... July 8 is irrelevant date"). Checked and confirmed two separate mislabeling errors in already-committed text (§1.3b said "~5-6 weeks," §2.4 had wrongly applied `landing`'s 2026-07-27 date to the `investor` entry instead of `investor`'s real 2026-08-08 start). Both fixed in commit `9119a0a`. **Verified empirically, not just by the documented wiring dates:** re-pulling each domain with its corrected start date returned figures numerically identical to the incorrect wider window, confirming zero real traffic existed on either domain before its actual wiring date -- the underlying numbers were never wrong, only the window labels describing them.
- Every commit on this branch passed `node scripts/repo-bloat-guard.mjs` and `git diff --check` before being pushed (doc-only diffs, no code touched).

## What remains partial or blocked

- **No root cause has been confirmed for the LCP regression.** The redirect-chain theory (A-105's existing primary candidate) and the Vercel/Supabase capacity theory (new this session) are both live, unconfirmed candidates -- this session's data narrows and enriches the picture (confirms `/dashboard` as the worst offender at a much higher tail value than previously known, shows the pattern spans four authenticated routes not one, rules out client-side JS blocking via the INP data) but does not isolate which candidate, or what combination, is the actual cause. No server-side timing or network-waterfall data has been pulled.
- **No fix has been attempted or proposed this session.** This was an evidence-gathering pass only.

## What claim is still unsupported

- The founder's framing that "significant traffic" is straining the infrastructure is plausible and now has real traffic-volume evidence behind it (600+ weekly visitors, up from near-zero at launch), but there is no measurement in this repo tying that traffic volume to the specific LCP degradation -- it is a reasonable hypothesis, not a demonstrated causal link.

## Exact files, commits, PR/branch state

- Files: `docs/readiness/POSTHOG_DATA_ANALYTICS_INSIGHTS_LOG_2026_08_09.md`, `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` (A-105 row only).
- Commits: `e9f50d8`, `3c4713e`, `99bca3d`, `47ea9e4`, `c102b41`, `9119a0a`.
- Branch: `docs/actionables-matrix-a102-a103-stale-fix`, pushed to `origin`.
- PR: [#233](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/233), open, unmerged -- left for founder review/merge, consistent with every other PR this session.
- Verification commands run before every push: `node scripts/repo-bloat-guard.mjs`, `git diff --check`. No typecheck/lint/test/build run -- zero `.ts`/`.tsx`/config files in this diff.

## Follow-up

1. Founder decision needed: merge PR #233 (or continue adding to it).
2. ~~Check Supabase Dashboard billing/plan page~~ -- done, founder-confirmed Free tier, 2026-08-13.
3. If pursuing the LCP root cause further: server-side timing or a network-waterfall capture (e.g. a Lighthouse/WebPageTest run against `/dashboard`) would be the next evidence tier beyond what PostHog's aggregate percentiles can show.
