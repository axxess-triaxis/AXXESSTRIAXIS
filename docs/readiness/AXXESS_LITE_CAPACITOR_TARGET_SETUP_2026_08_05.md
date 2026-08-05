# AXXESS Lite -- Capacitor Target Setup Plan

Date: 2026-08-05
Sprint: XL-1 -- AXXESS Lite Web Project and Separate Capacitor Target Setup
Status: Safe scaffold created (config + package manifest only). No native Android/iOS project has been generated. No build has been run.

## Whether `apps/mobile-capacitor` can support multiple targets cleanly

**No.** Each Capacitor native project (`android/`, `ios/`) bakes its application ID / bundle identifier directly into native project files (`AndroidManifest.xml`'s package name, Xcode's `Info.plist` bundle ID, Gradle's `applicationId`). Capacitor has no first-class, low-risk mechanism for one native project to represent two distinct installable apps with two distinct identities and two distinct start URLs -- product-flavor-style workarounds exist in raw Gradle/Xcode but are not a Capacitor-native pattern and would add real native-build maintenance risk to `apps/mobile-capacitor`'s existing, working X0 Mobile target. This sprint's own suggested alternative (`apps/mobile-lite-capacitor`) is the correct shape.

## Decision: new `apps/mobile-lite-capacitor` workspace

Created this sprint: `apps/mobile-lite-capacitor/package.json` and `apps/mobile-lite-capacitor/capacitor.config.ts`. This workspace member is automatically picked up by the existing `pnpm-workspace.yaml` (`apps/*` glob already covers it -- no workspace config change was needed).

**What was NOT done, deliberately (safe scaffold, not a full store build, per this sprint's own instruction):**

- No `android/` or `ios/` native project directories exist yet. Generating them (`npx cap add android`, `npx cap add ios`) requires a working Android SDK / Xcode toolchain to complete safely and verifiably -- this session runs on Windows, where iOS native project generation is not possible at all, and Android native project generation without a verified SDK setup risks a broken, partially-scaffolded native project being committed. The `cap:add:android`/`cap:add:ios` scripts are present in the new package's `package.json` so the next step is a single documented command, not a research task, but running them is left to whoever has the actual toolchain (or a CI runner already proven to have it, e.g. this repo's existing `.github/workflows/mobile-capacitor.yml`/`mobile-capacitor-release.yml`).
- `pnpm install` was not run scoped to this new package (i.e. `@capacitor/core`, `@capacitor/cli`, and the rest of the dependency list in its `package.json` are not yet installed into `node_modules`). The root `pnpm install` this sprint's other changes triggered did register the new workspace member in `pnpm-lock.yaml`, but did not need to resolve its dependency tree since no script depending on those packages was run.
- No build (`build:android`/`build:ios`) or store-config step was run.

## Required scripts (already added, this sprint)

In `apps/mobile-lite-capacitor/package.json`: `cap:add:android`, `cap:add:ios` (the one-time native-project-generation step described above), `sync`/`sync:android`/`sync:ios`, `android`/`ios` (open in the native IDE), `doctor`.

Delegating scripts added to the root `package.json` this sprint (mirroring the existing `mobile:capacitor:*` pattern for `apps/mobile-capacitor`): `mobile:lite:capacitor:install`, `mobile:lite:capacitor:sync`, `mobile:lite:capacitor:android`, `mobile:lite:capacitor:ios`, `mobile:lite:capacitor:doctor`. These are thin `pnpm --dir apps/mobile-lite-capacitor run <script>` delegations, added because they are genuinely, meaningfully distinct (a different target directory) -- not fabricated aliases. Deliberately not added this sprint: `mobile:lite:capacitor:build:*`/`release:*`/`store:*` equivalents, since those depend on the native projects existing first (see above); adding them now would be scripts that cannot succeed, which this program's standing practice (no checklist-theater, nothing added that isn't real) argues against.

## Required environment variables

| Variable | Purpose | Relationship to X0 Mobile's equivalent |
|---|---|---|
| `CAPACITOR_SERVER_URL` | The hosted URL the Lite app loads at runtime. | Must point at the X Lite Web deployment (`lite.triaxisventures.com` per the companion Vercel doc's recommendation), **not** `app.axxess.dev` (X0 Mobile's default). The config's fallback (`${NEXT_PUBLIC_APP_URL}/lite`) is a safety net only, not the intended production value. |
| `CAPACITOR_ALLOWED_HOSTS` | Comma-separated navigation allowlist. | Should include the Lite domain, `localhost`, `127.0.0.1` -- should **not** include `app.axxess.dev` unless Lite is deliberately allowed to navigate to the X0 domain (not recommended, since that would let a Lite-installed app browse into the full X0 UI inside its own webview). |
| `CAPACITOR_LITE_APP_ID` | Android `applicationId` / iOS bundle identifier for this specific native project. | A new variable, distinct from X0 Mobile's `CAPACITOR_APP_ID`/`ANDROID_APPLICATION_ID`/`IOS_BUNDLE_IDENTIFIER`. Proposed default in the config (`com.triaxisventures.axxesslite`) is **not final** -- see below. |

## How X Lite Mobile's start URL differs from X0 Mobile's

X0 Mobile (`apps/mobile-capacitor`) defaults `server.url` to `https://app.axxess.dev` -- the root of the full X0 web app, meaning an X0 Mobile build loads the entire enterprise console (subject to the user's own role-based access once logged in). X Lite Mobile's config (`apps/mobile-lite-capacitor/capacitor.config.ts`) instead defaults `server.url` to `${NEXT_PUBLIC_APP_URL}/lite` -- a specific route path under the Lite route tree built this sprint (`src/app/lite/*`), which per this sprint's own isolation tests (`src/features/lite/liteIsolation.test.ts`, `src/features/lite/LiteShell.test.tsx`) never renders X0's Sidebar/TopBar/Dashboard/admin components. Once the X Lite Web Vercel project exists with its own domain, `CAPACITOR_SERVER_URL` should be set explicitly to that domain's root (e.g. `https://lite.triaxisventures.com`) rather than relying on the `/lite` path suffix on a shared `NEXT_PUBLIC_APP_URL` fallback.

## App identity -- proposed, not final

Per this sprint's own non-negotiable ("Do not use these final identifiers without noting founder confirmation required"):

- **App name (proposed):** `AXXESS Lite`
- **Android package (proposed):** `com.triaxisventures.axxesslite`
- **iOS bundle ID (proposed):** `com.triaxisventures.axxesslite`

**Founder confirmation required before any store submission or production Capacitor build uses these identifiers.** They are currently set as the scaffold's default in `apps/mobile-lite-capacitor/capacitor.config.ts`, overridable via `CAPACITOR_LITE_APP_ID`.

## Android/iOS credential blockers

This program's existing D-U-N-S Number blocker (applied 2026-07-13, ~30-day TAT, expected ~2026-08-12, company-name-only mobile store release per this program's memory) applies to X Lite Mobile's eventual store release exactly as it already applies to X0 Mobile's -- it is not a new blocker introduced by this sprint, but it now also gates a second product surface's store release. No new credential blocker specific to X Lite Mobile has been identified this sprint, since no store-facing work (signing keys, App Store Connect / Play Console entries) was attempted.

## Xiaomi/Vivo/low-to-mid Android compatibility checklist

Per Pilot User 1's feedback (`docs/LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md` entry 2) and the doctrine's Section 7, this is a stated, explicit QA requirement, not an assumption. This sprint does not perform device testing (no native build exists yet to test), but records the checklist shape for when XLA-15 (`docs/readiness/AXXESS_LITE_DOCTRINE_AND_SURFACE_CONSTITUTION_2026_08_05.md`, Section 10) is executed:

- [ ] Test on at least one real or real-device-equivalent Xiaomi device (MIUI/HyperOS's aggressive background-process killing is a known source of Capacitor app instability not visible on stock Android/emulators).
- [ ] Test on at least one real or real-device-equivalent Vivo device (Funtouch OS has similar background-restriction behavior).
- [ ] Verify the app launches and the splash screen (`SplashScreen` plugin, already configured in this sprint's scaffold) does not hang on either OEM skin.
- [ ] Verify keyboard resize behavior (`Keyboard` plugin, `resize: "body"`) on both OEM skins, since keyboard-handling regressions are a common MIUI/Funtouch-specific issue.
- [ ] Verify the app is not killed mid-session by aggressive battery-optimization defaults on either OEM skin during a normal task-creation flow.
- [ ] Confirm minimum supported Android API level is appropriate for common low/mid-range Indian-market devices (not decided by this document -- a founder/engineering decision for XL-3).
- [ ] Record pass/fail evidence for each device tested, per this program's standing evidence-chain discipline (no compatibility claim without a named device and a result).

None of these are marked complete by this sprint -- this is the checklist shape, not executed evidence.
