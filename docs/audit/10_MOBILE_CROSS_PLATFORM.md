# Phase 10 -- Mobile / Cross-Platform Readiness

## Three Distinct Mobile/Cross-Platform Surfaces, Verified Directly

This repository contains three genuinely different mobile-adjacent surfaces, at three different
maturity levels. Confirmed via direct file inspection (`apps/*` directory contents,
`capacitor.config.ts` files, and `MONOREPO_ARCHITECTURE_AND_BUSINESS_MODEL.md` section 2, which this
phase independently spot-checked rather than took on faith).

### 1. X0 Mobile -- Capacitor shell (`apps/mobile-capacitor`), most mature

Not a separate app -- a native iOS/Android WebView shell loading the identical deployed web
application (`capacitor.config.ts`'s `server.url` points at the real web deployment;
`allowNavigation` restricted to the app's own hosts). **100% kernel reuse**, verified: the same
`src/main.tsx` -> `App.tsx` bundle that the web app serves is what the shell loads, meaning every
feature and fix built once in `src/` reaches this surface automatically, with no second codebase to
keep in sync. Dependencies are exclusively native-shell plugins (`@capacitor/{app,browser,device,
filesystem,haptics,keyboard,network,preferences,share,splash-screen,status-bar}`) -- no UI framework
or business logic duplicated here.

**Blocked on a real, external, dated constraint, not a code gap:** this program's own tracked
DUNS Number application (filed 2026-07-13, ~30-day expected turnaround) gates both App Store and
Play Store submission for a company-name release. As of this audit (2026-08-11), the founder states
DUNS documentation has been submitted and App Store/Play Console credentials plus app launch are
"possibly end-Aug 2026" -- the founder's own hedge, not a committed date. **No individual-account
workaround exists** for this specific blocker, per this program's own prior tracking.

### 2. Native Expo/React Native app (`apps/mobile`), early scaffolding, honestly incomplete

A genuinely separate, natively-built app (`@axxess/mobile`, Expo SDK 54, `expo-router`,
`react-native` 0.86) with its own screen components mirroring the web app's feature set. **What is
real:** a shared-constants package (`packages/shared/src/index.ts` -- sector/role enums, the
analytics event vocabulary, onboarding notice names, OAuth provider config) keeps this app's domain
vocabulary from drifting out of sync with the web/Capacitor kernel. **What is honestly not yet
built, confirmed by direct file read:** `apps/mobile/app/dashboard.tsx` renders hardcoded static
values (e.g. a metric card literally showing `value="18"`) with no Supabase or `fetch` call anywhere
in its screen files. This surface is not live-data-wired and should not be described as
production-ready -- this is the existing repo documentation's own framing, independently confirmed
by this phase, not softened or inflated in either direction.

### 3. AXXESS Lite mobile (`apps/mobile-lite-capacitor`), earliest stage

Directly inspected this phase: the directory contains only `capacitor.config.ts` and `package.json`
-- no `app/` source directory, no screens. This matches the XLA tracker's own status for this surface
(Phase 6/8 already tallied this tracker: 26 total items, 2 `Done`, 6 `Blocked`, 17 `Planned`). The 2
`Done` items are infrastructure-level (`XLA-21`: `getLiteHostRedirectUrl()` proxy routing, code +
tests, **not yet redeployed** to `triaxis-product-lite-web` as of its own last update; `XLA-22`: CI
workflow scripts verified individually, the composite script not yet observed running in a real PR).
The 3 mobile-specific `Blocked` items (`XLA-23/24/25` -- native project generation, keystore/
certificate setup, app-store listing registration) are explicitly gated on the same DUNS clearance
blocking X0 Mobile, extended to a second app -- not a new, independent blocker.

## CI Coverage for Mobile Specifically

7 of this repo's 15 GitHub Actions workflow files are mobile-specific: `mobile-capacitor.yml`,
`mobile-capacitor-release.yml`, `mobile-eas-production-build.yml`, `mobile-lite-capacitor.yml`,
`mobile-store-release-readiness.yml`, `mobile-validate.yml`, `mobile-visual-regression.yml` --
**47% of this repo's total CI surface area is mobile-dedicated**, a genuinely substantial investment
for a product whose mobile store release is currently blocked on an external, non-technical
dependency (DUNS). Not evaluated further this phase whether all 7 currently pass -- that would
require a live CI run, out of scope for a static repo read.

## A Real, Cross-Phase-Confirmed Mobile Defect

Phase 9's PostHog error-tracking data found an **Android WebView `postMessage` bridge error** (~40
occurrences across ~39 real users, 4 issue sub-groups, first seen Aug 9) -- JavaScript calling a
native method on an already-destroyed WebView, a defect class specific to exactly the Capacitor-shell
architecture described above. This is a genuine, currently-open, user-affecting mobile defect found
independently by this audit's usage-observability data, not by this phase's own inspection -- cited
here rather than duplicated, per Phase 9's own cross-reference.

## Answering the Audit Protocol's Own Question: Is This Program Mobile-Ready?

**Split answer, by surface, stated plainly rather than averaged into one number.** X0 Mobile (the
Capacitor shell) is code-complete and carries full feature parity with the web app today -- its only
blocker is external and dated (DUNS), not technical. The native Expo/React Native app is honest
early scaffolding with hardcoded UI and no live data -- not production-ready, and this repo's own
documentation already says so without this audit needing to correct an inflated claim. AXXESS Lite
mobile is earlier still -- a config file and a package manifest, no app code yet. Averaging these
three into a single "mobile readiness" percentage would misrepresent all three; they are reported
separately because they are separately true.

## Cross-References

- **Phase 9** (`09_USAGE_OBSERVABILITY.md`) -- source of the Android WebView defect cited above.
- **Phase 5** (`05_ENTERPRISE_READINESS.md`) and the existing readiness memory
  (`project_duns_mobile_release_blocker.md`) already track the DUNS blocker; not re-derived here,
  only cross-referenced and updated with today's founder-stated timeline.
- **Phase 6** (`06_TEST_RELIABILITY_AUDIT.md`) did not separately test mobile-specific test files in
  this pass beyond what the general `src/` shard runs already covered; mobile-specific CI (the 7
  workflows named above) was not executed live by this audit.
