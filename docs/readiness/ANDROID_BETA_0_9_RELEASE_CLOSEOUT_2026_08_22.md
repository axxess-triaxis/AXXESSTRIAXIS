# AXXESS TRIaxis Android Beta 0.9 — Release Closeout

**Date:** 2026-08-22
**Scope:** Getting the first real Android build of AXXESS TRIaxis (`com.triaxis.axxess`) onto Google Play — Internal testing (live) and Open testing (submitted for review). This is the first Android artifact this program has ever gotten past Google's own systems; everything before this point was CI producing a build that never reached a real Play Console app.

This is written as the full process, not just the final "it worked" step, per founder request — most of the real work here was diagnostic, spread across two days and two separate systems (GitHub Actions CI and Google Play Console) that don't expose errors to each other.

---

## Timeline (verified against GitHub Actions run history, not recollection)

**2026-08-21, 08:16–13:22 — seven failed CI runs while the pipeline itself was broken**

Two independent bugs were stacked on top of each other, so each run only ever revealed one at a time:

1. **iOS credential coupling.** `mobile-capacitor-release.yml` ran Android and iOS release jobs unconditionally, so an Android-only attempt still failed on missing Apple credentials. Fixed by adding a `release_target` (`all`/`android`/`ios`) `workflow_dispatch` input, a "Resolve release target" step producing `run_android`/`run_ios` outputs, and gating both production-release jobs plus the sign-off job's artifact/checklist steps behind those outputs.
   Shipped: [PR #281](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/281) "fix(mobile-release): Android-only release runs skip Apple credentials", merged 2026-08-21T11:01:46Z.

2. **Capacitor 8.5 template drift.** `scripts/apply-capacitor-store-config.mjs`'s regex patching of the generated `build.gradle` had three distinct bugs surfaced once the Android-only path could actually run: a greedy `\s+` pattern that let `compileSdk` match across `compileSdkVersion`'s line; a signing-config insertion that matched the *first* `release {` in the file (which after the fix's own signingConfigs block was inserted, was `signingConfigs.release`'s body, not `buildTypes.release`'s); and an application-id injection anchor that didn't fall back correctly when the `apply plugin: 'com.android.application'` line was structured differently than assumed. Fixed and verified by extracting the real `android-template.tar.gz` bundled inside the installed `@capacitor/cli@8.5.0` and running the patch script end-to-end against it in a scratch directory — not assumed correct from reading the regex.
   Shipped: [PR #284](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/284) "fix(mobile): Capacitor 8.5 Android build.gradle template mismatch", merged 2026-08-21T12:16:25Z.

**2026-08-21 13:22 → 2026-08-22 12:46 — "Package not found: com.triaxis.axxess"**

Google's Play Developer Publishing API cannot create a brand-new app; the first version of any package name must be uploaded once through the Play Console UI by a human. Founder created the app manually in Play Console. This is a platform constraint, not a bug in this repo's pipeline.

**2026-08-22 12:46 — "The caller does not have permission"**

The CI service account was never granted access inside Play Console's own **Users and permissions** panel — a separate authorization system from Google Cloud IAM entirely; being an Owner/Editor on the GCP project grants nothing in Play Console. Diagnosed from the error text plus a Play Console screenshot showing exactly one human user on the account. Founder located and used the correct panel (after two false starts — Cloud Console's IAM search, then Play Console's unrelated "Android developer verification" page) and invited the service account.

**2026-08-22 13:17:57Z — first successful CI run** (`android_version_code` defaulted to 1)

This produced the first real Android App Bundle Google Play ever accepted for this app. It uploaded to the Internal testing track with `status: draft`, per the workflow's `r0adkll/upload-google-play@v1` step.

**2026-08-22, afternoon — Play Console-side confusion over the same bundle**

The draft release that CI's upload created carried a blocking error — "An active app bundle was uploaded before you chose your app signing key" — plus a deobfuscation-file warning. Diagnosed as a Play App Signing enrollment check; confirmed via the App signing page that both "Releases are signed by Google Play" and "Automatic protection is on" were active (2 of 2), meaning enrollment itself was not the live blocker.

Working around this by creating new manual release drafts on the same track (releases 3, 6, 7) instead produced a different, more informative symptom: "Add from library" showed **no bundles at all**, and re-uploading the same file failed with **"Version code 1 has already been used."** Both are explained by the same mechanism, confirmed against Google's own documentation and a matching open issue on the upload action this pipeline uses: a bundle uploaded via the API with `status: draft` is owned by the specific draft release object the API created, and Play Console won't let a second, separately-created draft reference it. The original draft (release 1) was discarded to free the bundle; a stray, unrelated Production-track draft (auto-created at app setup, targeting only 4 of 177 countries, never touched a bundle) was discarded separately as routine cleanup — it was never Live.

**2026-08-22 16:59:35Z — one more CI run, confirms the diagnosis**

Ran again without specifying `android_version_code` (defaults to 1) to see if a fresh upload would clear the state. It failed at the exact predicted point: `##[error]Version code 1 has already been used.` This is direct evidence for the "bundle locked to its originating draft" theory, from the CI logs rather than only the Play Console UI.

**2026-08-22 17:18:54Z — final successful CI run, `android_version_code: 2`**

Re-ran with `release_target: android` and `android_version_code: 2` (the workflow_dispatch input added in PR #281, now paying off for a second, unrelated reason). Clean build, clean upload, no version-code collision. This is the bundle that actually shipped.

**2026-08-22, evening — Internal and Open testing**

- Internal testing: version 2 bundle attached, release notes and the 7-address tester list ([PERSONAL EMAILS MASKED — 7 individual addresses, see Play Console's own tester roster for the real list]) added, release published. Founder-reported from the live console: **released, 5 of 7 users showing as reached** — not independently screenshotted by me at that exact moment, so tagged founder-stated rather than directly verified, though it is a direct read of the Play Console UI rather than a recollection.
- Open testing: same bundle submitted for Google's review. Status as of the last confirmed screenshot (Submission ID 1, 2026-08-22 23:12): **"In review."** Review outcome is not yet known — this is the one item in this closeout that is genuinely open, not resolved.
- Closed testing: deliberately skipped. Founder's stated reason — releasing under a DUNS-verified organization account exempts it from Google's 12-testers/14-continuous-days closed testing requirement. **Verified independently this session** (not taken on founder's word alone) against Google's current Play Console Help documentation: the requirement applies to personal developer accounts created after 2023-11-13; organization accounts, and specifically accounts verified with a D-U-N-S number (this account: 772361194, issued 2026-08-21), are exempt and can apply for production access directly. Skipping was correct.
- Production track: a submission covering Production/Open testing/Closed testing(Alpha)/Store Listing/App Content/Store settings metadata was sent for review together (confirmed intentional by the founder). Production itself currently has **no app bundle attached** — that draft was the one discarded during cleanup — so this metadata review clearing does not put anything live to the public; a new Production release with a bundle would still need to be deliberately created afterward.

---

## Decision Ledger

**Decision:** Ship Android beta 0.9 to Internal testing now and submit Open testing for review in the same pass, skipping Closed testing.
**Why:** DUNS-verified organization account is exempt from Google's closed-testing prerequisite; there's no compliance reason to wait 14 days before wider testing.
**What changed:** `mobile-capacitor-release.yml` gained an Android-only release path and a working `android_version_code` override; `apply-capacitor-store-config.mjs`'s Capacitor 8.5 template patching was fixed; a real Play Console app, service-account grant, and two live tracks (Internal, Open) now exist for `com.triaxis.axxess`.
**Architecture boundary:** No app code changed — this was entirely CI pipeline and Play Console configuration.
**Product boundary:** Beta 0.9 scope only; no App signing, pricing, or Production rollout decisions were made beyond what's stated above.
**Verification:** CI run history (databaseIds 32575367432 and 32587355886, both `conclusion: success`); Play Console screenshots at each stage; a live web search against Google's own current Help documentation confirming the closed-testing exemption claim.
**Outcome:** Internal testing live (founder-reported, 5 of 7 testers reached); Open testing submitted, review pending.
**Follow-up:** Confirm Open testing review outcome when it lands; when ready for Production, deliberately create a new Production release with a bundle (none exists there today) rather than assuming the metadata review covers it.

---

## What was verified (exact sources)

- PR #281 merged 2026-08-21T11:01:46Z; PR #284 merged 2026-08-21T12:16:25Z (`gh pr view`).
- 7 failed `Capacitor Mobile Release` runs 2026-08-21T08:16:30Z–13:22:12Z, then more through 2026-08-22T12:46:33Z; first success 2026-08-22T13:17:57Z (run 32575367432); one further failure 2026-08-22T16:59:35Z (run 32586379743, confirmed via job logs: `##[error]Version code 1 has already been used.` on the "Upload Android bundle to Google Play internal testing" step); final success 2026-08-22T17:18:54Z (run 32587355886, confirmed via job logs: `ANDROID_VERSION_CODE: 2`) — all via `gh run list`/`gh run view --log`.
- Closed-testing exemption claim verified live against Google Play Console Help ("App testing requirements for new personal developer accounts") during this session, not accepted on founder recollection alone.

## What remains partial or blocked

- **Open testing review outcome — unknown.** Status was "In review" as of the last screenshot; not yet resolved either way.
- **Production track — no bundle.** Metadata is under review; the track itself has nothing to roll out. A distinct, deliberate action is required before anything reaches Production.
- **Deobfuscation file warning** (from the earlier release-1 review screen) was never explicitly resolved — it's a warning, not a blocker, and wasn't revisited once release 1 was discarded in favor of the version-2 bundle. Worth adding an R8 mapping-file upload step to the CI pipeline in a future pass if crash reporting on obfuscated code matters for this beta.

## What claim is still unsupported

- The exact count of testers who have actually installed the app (vs. simply being on the invite list) is founder-reported from the console, not something I independently screenshotted at time of writing.

## Exact files changed (this arc only)

- `.github/workflows/mobile-capacitor-release.yml` — `release_target` input, target-resolution step/outputs, conditional job/step gating (PR #281).
- `scripts/apply-capacitor-store-config.mjs` — three regex/anchor fixes for Capacitor 8.5's Android template (PR #284).
- No other repo files changed in this arc; all remaining work (app creation, service-account invite, tracks, tester list, release notes, version-code bump, submitting Open testing) was Play Console / GitHub Actions configuration, not code.

## Outcome

First-ever real Android release of AXXESS TRIaxis reached actual Google Play infrastructure this cycle. Internal testing is live. Open testing is submitted and pending Google's review — the correct next checkpoint, not yet reached.
