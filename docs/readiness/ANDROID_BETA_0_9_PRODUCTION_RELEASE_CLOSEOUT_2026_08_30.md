# Android Beta 0.9 Closeout -- Production Release and 172-Country Rollout

Date: 2026-08-30
Release: AXXESS TRIaxis Android, Version 5 (0.9.0)

Planning provenance: no Codex-drafted execution prompt for this one -- this closeout documents a
release-management milestone (Google Play Console review outcomes) the founder walked through live
in this session via direct screenshots, not a coding sprint. It exists because this repo's own
evidence-chain standing rule (`CLAUDE.md`) requires a shipped-and-verified milestone to be closed
out with the same discipline as a code sprint, not left implicit in chat.

## What Became Live

Confirmed via three Google Play Console screenshots viewed directly this session (not
founder-recollection, not summarized) -- each timestamped, each showing Google's own UI, not a
chat description of it:

1. **Production rollout, Full rollout.** "Latest releases and bundles" (screenshot, 2026-08-30
   4:18 PM view) shows release 5 (0.9.0) as **"Available on Google Play"** under the Production
   track, Full rollout. This corrects this program's own prior record (`RELEASE_STATUS_2026_08_28.md`,
   as originally written) of "Production + Open Testing (in review)" -- Google's Beta/Production
   review resolved between that original snapshot and this screenshot. Open Testing shows the same
   release 5 as "Available to testers on Google Play," synced with production, not a stale
   separate track.
2. **172-country expansion, published.** A second, later Play Console change -- "Submission 9,"
   Production track, "Countries / regions: Add 172 countries / regions (Albania, Algeria, and 170
   more)" -- was tracked through its full lifecycle via two successive screenshots of the same
   submission-details page:
   - Changes submitted: **2026-08-30, 4:26 PM**
   - Changes approved: **2026-08-30, 4:52 PM**
   - Status: **Published, on 2026-08-30, 6:28 PM**

   172 of Play's 177 total supported countries/regions are now covered. The founder's stated
   reason for the gap of 5 -- China, Cuba, Sudan, and similar territories excluded from paid-app
   distribution -- is founder-provided context, not something either screenshot itself states, and
   is recorded as explanation rather than independently verified against Google's own
   country-restriction policy documentation.

Both milestones are recorded precisely in `RELEASE_STATUS_2026_08_28.md`'s Android Beta section
(three dated update blocks, added and then corrected in place as the submission's own status
changed from "in review" to "Published" within the same session -- see PRs below).

## What This Closeout Does Not Cover

- **The underlying release pipeline and .aab build/upload itself.** `ANDROID_UPLOAD_TO_PLAY=true`
  (the repo variable controlling whether CI actually submits to Play, referenced in
  `FOUNDER_BUG_CLOSURE_LEDGER_2026_07_31.md` item #71 as already set, unlike iOS's equivalent
  variable which needed fixing) was not re-verified this session -- this closeout is scoped to the
  Play Console review/rollout/country-expansion outcomes visible this session, not a fresh
  end-to-end pipeline re-run.
- **iOS.** A separate, unrelated finding this same session -- TestFlight build 0.7.0 (1) showing
  **Rejected** for External Testing -- is explicitly out of scope here. Different platform,
  different review process, not yet root-caused (Apple's rejection reason has not yet been located
  in App Store Connect as of this closeout). Tracking that separately, not folded into this
  Android milestone.
- **A completed native-app onboarding walkthrough.** See "Mixed Finding" below -- this closeout
  does not claim a verified end-to-end account creation on the installed native app.

## Mixed Finding: Onboarding UI Confirmed Clean, Not Confirmed Complete

A 9-screenshot walkthrough shared this session as "Android app working fine... [a tester] tried
Create New Account / Onboarding and it worked very well" was reviewed directly, screenshot by
screenshot, rather than accepted at face value:

- **What it actually evidences:** the enterprise `/onboarding` 6-step wizard (Create organization /
  Join organization / Select sector and role / Create first workspace / Accept security and beta
  notices / Complete provisioning) rendered and navigated without crashes or layout bugs on a real
  Android device, across all 9 screenshots. That is genuine, positive signal.
- **What it does not evidence:** the screenshots show **mobile Chrome**, not the installed native
  app (Chrome's own URL bar, tab-count icon, and overflow menu are visible throughout, reading
  `landing.triaxisventures.com`). The native Capacitor/Play-Store app runs in a bare WebView with
  no browser chrome, so which surface the tester actually used for a from-scratch install is
  unconfirmed.
- **Onboarding did not complete.** Organization name, sector, role, and invitation code were all
  left blank, and all 4 legal-notice checkboxes were left unchecked at every step. The final
  "Complete provisioning" screen correctly caught this -- **"Onboarding needs attention"**
  (Organization: Not set, Sector: Not set, Role: Not set, Notices: 0/4 accepted) -- rather than
  silently completing with missing required data. The validation gate worked as designed; no
  tenant/organization was actually created in this walkthrough.

Net read: real evidence the enterprise onboarding UI is crash-free and navigable on Android via
mobile Chrome. Not evidence of a completed account creation, and not yet evidence about the native
Play-Store app specifically.

## Verification

- Production "Available on Google Play" status: confirmed via direct screenshot, not re-derived
  from a Play Developer API call (no API credentials configured this session for that surface).
- Country-expansion submission lifecycle (submitted / approved / published): confirmed via two
  successive screenshots of the same Play Console submission-details page, same Submission ID (9),
  progressing timestamps.
- Underlying web surface this Android release wraps (`landing.triaxisventures.com`, via
  `CAPACITOR_SERVER_URL`) has working Sentry error monitoring as of this same session (PR #346,
  merged, deployed) -- a separate fix, not part of this release, but relevant supporting context:
  if a production user on this Android release hits a runtime error, it is now confirmed capturable
  rather than silently lost to an env-var naming mismatch.
- No fresh `pnpm run typecheck`/`lint`/`test`/`build` run was required for this closeout -- no
  application code changed as part of the Play Console release-management actions themselves; the
  three PRs below are documentation-only.

## Exact PR/Commit State

- [PR #347](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/347) -- merged `4577a59`: recorded
  Production "Available on Google Play" status.
- [PR #348](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/348) -- merged `a070350`: recorded
  the 172-country submission as "In review" (accurate at the time observed).
- [PR #349](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/349) -- corrects PR #348's snapshot
  to "Published" once the same submission progressed through approval.

All three are docs-only changes to `docs/readiness/RELEASE_STATUS_2026_08_28.md`; no deploy
verification was required for any of them (no `src/` changes).

## Final Closeout Judgment

**Question this closeout must answer:** Is AXXESS TRIaxis Android Beta 0.9 (Version 5) actually
live, and to whom?

**Answer: Yes, confirmed live in Production with full rollout, now covering 172 of 177 Play-
supported countries/regions, both facts read directly from Google Play Console rather than taken
on founder recollection.** What remains open, named rather than glossed over: (1) no confirmed
end-to-end account-creation walkthrough on the *installed native app* specifically -- the one
walkthrough performed used mobile Chrome and did not complete the required onboarding fields; (2)
the underlying CI release pipeline itself was not re-verified this session, only its Play Console
outcome; (3) iOS's own TestFlight rejection this same day is a real, separate, not-yet-root-caused
issue, tracked independently and explicitly not part of this Android closeout's scope.
