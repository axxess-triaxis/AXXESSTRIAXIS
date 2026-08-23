# MN-1 Through MN-5 — Mobile Native Sprint Arc — Consolidated Closeout

**Date:** 2026-08-23. **Scope:** the full 5-sprint Android Capacitor beta hardening arc run in a
single session — MN-1 (native shell), MN-2 (core workflows), MN-4 (UX/runtime hardening), MN-5
(security hardening). All four Codex-drafted prompts delivered by the founder in sequence; MN-3 was
never separately executed (confirmed via search — its planned scope was absorbed into MN-4). This
document consolidates the four individual sprint closeouts into one evidence trail and adds the
merge/deploy/release outcome that happened after all four shipped, since that outcome involved a
real discrepancy worth recording precisely rather than glossing over.

Individual sprint closeouts, kept as the detailed record (not superseded, only summarized here):
- `docs/readiness/MN1_MOBILE_NATIVE_SHELL_CLOSEOUT_2026_08_23.md`
- `docs/readiness/MN2_MOBILE_CORE_WORKFLOWS_CLOSEOUT_2026_08_23.md`
- `docs/readiness/ANDROID_BETA_0_9_HARDENING_CLOSEOUT_2026_08_23.md` (MN-4)
- `docs/readiness/ANDROID_BETA_0_9_SECURITY_HARDENING_CLOSEOUT_2026_08_23.md` (MN-5)

## What shipped, sprint by sprint

**MN-1 — Native Shell** ([PR #305](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/305)): a
real mobile-native shell (`MobileShell`, bottom tab bar, compact header) replacing the desktop
sidebar/TopBar entirely inside the Capacitor app, gated on `window.Capacitor.isNativePlatform()`.
Explicit include/exclude registry (`mobileFeatureRegistry.ts`) enforced by a static import-scan
guard (`scripts/mobile-boundary-guard.mjs`) and isolation test — the mechanism that has kept every
forbidden desktop/demo/admin surface out of mobile across all five sprints. Transitional: 8 of 10
registered surfaces reused the desktop section component inside the new chrome.

**MN-2 — Core Mobile Workflows** ([PR #306](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/306)):
replaced that transitional reuse with 8 real native screens (Home, Tasks+Reminders, Meetings,
Projects, Approvals, Knowledge Hub, Ask AI, CRM quick notes), each reading/writing through the same
tenant-scoped repositories and API routes desktop already uses. Tablet two-pane layout for
Tasks/Approvals/Knowledge/CRM.

**MN-4 — Android Beta 0.9 App Hardening** ([PR #307](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/307)):
real Android hardware back-button handling (the sprint's core deliverable — previously entirely
unhandled), a real offline banner, sparing haptics at task-complete/approval-decide, and a full
Android runtime + permissions audit (confirmed zero requested permissions).

**MN-5 — Android Beta 0.9 Security Hardening** ([PR #308](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/308)):
session replay disabled inside the real Capacitor app (closing a self-acknowledged gap), sensitive
sessionStorage drafts now cleared on logout, a new secret-exposure audit script (verified to catch
a real injected violation), and a test proving the one client-payload tenant-override route in this
codebase actually rejects an unauthorized org.

## Verification, aggregated

Every sprint's own closeout has its exact per-sprint numbers; combined picture: typecheck clean
across all four PRs, full-repo lint clean across all four (one real `react-hooks/rules-of-hooks`
violation was found and fixed mid-MN-4, not silently ignored), zero test regressions across
660+ cumulative targeted test runs (520/520 was MN-5's own full targeted count, itself inclusive of
everything MN-1/2/4 touched), production build succeeded on every PR, `mobile-boundary-guard.mjs`
passed on every PR with an increasing file count (11 → 36 files scanned as the mobile surface grew).

**No claim is made and none of the four PRs claims**: Play Store readiness without signed evidence,
iOS readiness, full native-app status, complete performance resolution, or a completed HITL device
walkthrough. Every sprint's closeout states "code-complete, pending founder device walkthrough" as
its own status — that status is unchanged by this consolidation.

## Merge and deploy outcome (2026-08-23, after all four sprints shipped)

This part is being recorded in unusual detail because it did not go cleanly, and the founder's own
CLAUDE.md evidence-chain rule requires that be stated plainly rather than folded into a generic
"deployed successfully."

**Merge to `main`:** All four PRs merged successfully. `main`'s required CI checks (`Build, Lint,
Type Check` / `validate`) were failing at merge time, but this was independently confirmed as
**pre-existing infrastructure flakiness unrelated to this diff** — `main` itself showed the identical
`Worker exited unexpectedly` vitest crash, at the identical deterministic point in file-execution
order, on its own most recent run predating any of these four merges. A separate, also pre-existing
Playwright E2E failure (`tests/e2e/sprint27-golden-path.spec.ts`, desktop dashboard workflow,
unrelated to mobile) was independently confirmed on `main` too. Given this, the founder gave
explicit, in-conversation confirmation to bypass the gate per CLAUDE.md's Production Gate Bypass
standing rule, with all five required elements stated before each merge (reason, named failed gate,
accepted risk, rollback condition, post-deploy verification) — recorded in each merge commit's own
body on GitHub. PRs #305 and #306 were merged directly; #307 and #308 were merged by the founder
after the harness's own safety classifier declined a third consecutive automated bypass-merge in a
row (a deliberate guardrail, not worked around).

**Web deploy:** partially succeeded, blocked by a real infrastructure limit, not a code defect.
Merging four PRs in quick succession fired a fresh Vercel deploy across all three linked projects
(landing, investor demo, lite) on each merge, and hit Vercel's free-tier `api-deployments-free-per-day`
cap (100/day) partway through. Confirmed result: `landing.triaxisventures.com` redeployed once,
carrying MN-1's code (the first merge's deploy attempt, before the cap hit) — not MN-2/4/5.
`investor.triaxisventures.com` and `lite.triaxisventures.com` were not successfully redeployed today
at all. This resolves on its own once the quota resets (~24h from first hit); no merged code was
lost, `main` has everything. This is the same known Vercel free-tier constraint already on record as
deferred to a post-funding tier upgrade — not a new problem this sprint introduced.

**Android/Google Play:** this is the one item that needs direct correction against what was
initially reported, and is the reason this consolidated closeout exists rather than a one-line "all
shipped" summary.

- A **real, working, signed-release CI pipeline was confirmed to exist** this session
  (`.github/workflows/mobile-capacitor-release.yml`), with real production secrets already
  configured in the repo (`ANDROID_KEYSTORE_BASE64`, `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`, etc., added
  2026-08-21 — the same day the DUNS number was issued).
- That pipeline **did** successfully build and upload a real signed AAB to Google Play's internal
  testing track on **2026-08-22** (`android_version_code: 2`), confirmed via that run's own log
  (`Finished uploading to the Play Store: 12095982888236824559`) and via
  `docs/readiness/ANDROID_BETA_0_9_RELEASE_CLOSEOUT_2026_08_22.md` (a separately-written, detailed
  account of that day's release process, including Internal testing being published to 7 named
  testers and Open testing being submitted for Google's review, status "In review" as of that
  document's last update — not yet resolved as of this closeout).
- **Today (2026-08-23), a new run was triggered** (`android_version_code: 3`, intended to carry the
  MN-1 through MN-5 code) via `workflow_dispatch` on `main`, at the founder's explicit request and
  with the founder personally executing the trigger. The run completed with overall status
  `success` — but direct inspection of the GitHub Actions API for that specific run shows the
  **"Upload Android bundle to Google Play internal testing" step itself was `skipped`**, zero
  duration, condition evaluated false. Every other step in that job (build, signing, checklist)
  succeeded. The root cause of the skip was not conclusively identified in this session — the
  configured secrets and repo variables (`ANDROID_UPLOAD_TO_PLAY=true`,
  `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` present) were re-checked and are unchanged from yesterday's
  successful run, and the `production-mobile` GitHub Environment has no protection rules or branch
  restrictions that would explain it.
- **Founder-stated claim**: "published changes to published bundle on Google Console; now updated
  app is in Google testing." Per this repo's own evidence-chain rule, this is tagged
  **founder-stated, contradicted by direct CI evidence** rather than accepted at face value: the
  CI record for today's run shows the upload never executed. The most likely explanation is that
  what's visible in Play Console right now is still **yesterday's version-code-2 build**, which
  genuinely is live in Internal testing and was genuinely submitted for Open testing review — not
  today's version-code-3 build carrying the MN-4/MN-5 hardening work, which has not yet reached
  Google Play. This was flagged directly to the founder in-conversation before this document was
  written, with a request to confirm the version code currently shown in Play Console, to resolve
  the discrepancy definitively.

**Net position on Android release specifically:** the MN-1 through MN-5 code is on `main` and is
real, tested, and ready to ship to Android — but as of this closeout, the build actually live in
Google Play testing is very likely still the pre-MN-4/MN-5 build from 2026-08-22, not the hardened
one. Re-triggering the release workflow (a fresh `android_version_code: 4` or higher, since 3's
upload never completed and may be in an inconsistent state per the exact "bundle locked to its
originating draft" mechanism already documented in the 2026-08-22 closeout) is the concrete next
step, once the skip's root cause is understood or simply worked around by re-running.

## What remains open, across the whole arc

- **No live Android device/emulator walkthrough has been performed at any point across all five
  sprints.** This is the single most-repeated named risk in this session's own documentation — MN-1,
  MN-2, MN-4, and MN-5 each name it independently. It remains the true gating item for calling
  Android Beta 0.9 done, separate from and in addition to the Play Store upload discrepancy above.
- **OAuth-in-Capacitor redirect behavior**: genuinely untested, no code path found or exercised
  (MN-5 baseline doc).
- **Today's Play Store upload discrepancy**: needs the founder's confirmation of what version code
  is actually showing in Play Console before it can be marked resolved either way.
- **Vercel deploy quota**: self-resolves in ~24h from 2026-08-23; no action needed beyond waiting,
  or upgrading the tier.

## Decision Ledger

**Decision:** Ship all five sprints of the Android Capacitor hardening arc in one session, merge to
`main`, and attempt a production Android release in the same session.
**Why:** Founder-directed, sequential Codex-drafted prompts delivered back-to-back; founder
explicitly requested "commit, push and deploy everything" and then explicitly confirmed the
Play Store release trigger after being shown the exact tradeoffs.
**What changed:** ~40 new/modified source and test files across the four PRs; a real Android
back-button/offline/haptics/session-replay/logout-hardening layer; a proven, secret-configured CI
release pipeline confirmed capable of reaching Google Play (yesterday) and re-triggered (today, with
an unresolved discrepancy).
**Architecture boundary:** the MN-1 mobile/desktop boundary (isolation test + build-time guard) held
across every subsequent sprint without a single violation, re-verified at every stage.
**Product boundary:** no forbidden desktop/demo/admin surface reached mobile at any point; the
Play Store upload discrepancy is a release-process gap, not a product-boundary violation.
**Verification:** typecheck/lint/test/build clean on every PR; CI-level gate bypass was explicit,
justified, and founder-confirmed per the standing rule; deploy and release outcomes are reported
exactly as observed, including the parts that did not go as expected.
**Outcome:** code shipped and merged; web deploy partially rolled out (landing only, MN-1-level);
Android release status is unresolved pending founder confirmation of the actual Play Console state.
**Follow-up:** confirm Play Console version code; re-trigger Android release if needed; wait out the
Vercel quota or redeploy manually once reset; schedule the still-pending real device walkthrough
before making any Beta 0.9 readiness claim beyond "code-complete."
