# Mobile Store Credentials and D-U-N-S Dependency

Date created: 2026-07-24  
Product: AXXESS TRIaxis  
Company: Triaxis Ventures Private Limited  
Applies to: iOS App Store, TestFlight, Google Play Console, Android production/beta release, mobile CI/CD release readiness

## Executive Summary

iOS and Android store-release builds are not yet completing or progressing to full store-release readiness because the required company-owned keys, secrets, certificates, and credentials are not yet in place under the legal name **Triaxis Ventures Private Limited**.

This is an intentional governance decision.

Triaxis Ventures is not passively waiting for credentials, and it is not choosing the shortsighted path of releasing production mobile apps under the founder's individual name merely to impress investors or create an artificial launch signal.

The correct long-term path is to release and operate AXXESS TRIaxis under the company identity.

## Reason for Current Mobile Release Blocker

Apple Developer Program and Google Play Console company-account setup require company verification artifacts.

For Triaxis Ventures Private Limited, the immediate blocker is the pending issuance of a **D-U-N-S Number** by Dun & Bradstreet.

A D-U-N-S Number is required or commonly requested for company-account verification, especially for Apple Developer Program organization enrollment and related store/account governance.

## D-U-N-S Application Status

Triaxis Ventures Private Limited applied for a new D-U-N-S Number on:

**13 July 2026 at 8:40 AM IST**

The request was submitted to Dun & Bradstreet India.

Reference number:

**DR071320262903910840**

## Dun & Bradstreet Confirmation Email

The following confirmation was received from Dun & Bradstreet India.

Sender:

**DNBIndia-SystemAdmin@dnb.com**

Received:

**Monday, 13 July 2026, 8:40 AM IST**

Body:

> Dear Sir / Madam,
>
> Thank you for requesting a new D-U-N-S® Number for your business : **Triaxis Ventures Private Limited**
>
> The reference number of your request is: **DR071320262903910840**
>
> In case of further assistance, please contact us at  
> Email: **serviceindia@dnb.com**
>
> Best regards  
> Customer Experience Team  
> Dun & Bradstreet India

## Current Waiting State

As of 2026-07-24, no further communication has been received from Dun & Bradstreet India after the confirmation email.

The general turnaround time for free D-U-N-S issuance can be up to approximately 30 days.

This external dependency is therefore being tracked as a credential/governance blocker, not as a product-engineering failure.

## Governance Position

AXXESS TRIaxis should not be released under an individual founder account if the intended product owner and operating company is Triaxis Ventures Private Limited.

Releasing under an individual name may create future complications, including:

- Store ownership transfer friction.
- Brand/account mismatch.
- Investor due-diligence concerns.
- Enterprise buyer trust concerns.
- Government or sovereign stakeholder procurement concerns.
- Certificate and key migration risk.
- App ownership ambiguity.
- Future legal or tax/accounting complications.

The correct path is to complete company verification and release mobile apps under the company identity.

## Impact on Sprint Readiness

This affects:

- Android Beta readiness.
- iOS Beta readiness.
- Mobile store release gates.
- TestFlight readiness.
- Google Play internal/beta release readiness.
- Mobile analytics instrumentation across released apps.
- First-30-users analytics across all three beta surfaces.

## Engineering Status vs Credential Status

Engineering work can continue on:

- Capacitor/Expo/mobile shell readiness.
- Build scripts.
- Signing workflow scaffolding.
- Release gate documentation.
- Store listing materials.
- Screenshots.
- Privacy labels/data safety documentation.
- Mobile analytics event taxonomy.
- Artifact validation where credentials are not required.

But final store release cannot be honestly marked complete until:

- Company-owned Apple Developer credentials are active.
- Company-owned Google Play Console credentials are active.
- Required signing credentials/secrets are created and stored securely.
- TestFlight and/or Play testing tracks succeed under the company account.
- Store review or testing requirements are satisfied.

## Current Status Classification

| Area | Status | Reason |
|---|---|---|
| iOS TestFlight/App Store release | Blocked | Company Apple Developer credentials/D-U-N-S dependency pending |
| Android Play release | Blocked | Company Google Play Console credential path pending |
| Mobile build engineering | In progress / partially scaffolded | Build/release automation can continue without final store credentials |
| Company verification | External dependency | D-U-N-S request pending with Dun & Bradstreet India |
| Founder-name app release | Rejected as strategy | Avoids future ownership, governance, and due-diligence complications |

## Required Next Actions

1. Track D-U-N-S issuance against reference number **DR071320262903910840**.
2. Follow up with Dun & Bradstreet India at **serviceindia@dnb.com** if no response arrives within the expected turnaround window.
3. Use the issued D-U-N-S Number to complete Apple Developer Program organization enrollment.
4. Complete Google Play Console organization/account setup under Triaxis Ventures Private Limited.
5. Generate company-owned signing credentials.
6. Add mobile build/release secrets to the appropriate secure stores.
7. Re-run Android and iOS mobile release workflows.
8. Validate TestFlight and Play testing track readiness.
9. Update Sprint 5/QA3 readiness documents with evidence.

## Completion Criteria

This blocker can be marked resolved only when:

- D-U-N-S Number is issued.
- Apple Developer Program organization account is active, if required for the iOS release path.
- Google Play Console organization account is active, if required for the Android release path.
- Required signing credentials are generated under company control.
- CI/CD or local release tooling can create signed mobile artifacts using company-owned credentials.
- The app can be submitted to TestFlight/Apple review and Google Play testing/review under Triaxis Ventures Private Limited.

## Sprint 5 Engineering-Side Build/Signing Validation Attempt (2026-07-24)

Per the Sprint 5 prompt's instruction to attempt Android/iOS build and signing validation as far as available secrets allow (without releasing under the founder's individual account, and without marking A-23/A-24 `Yes` absent actual signed-artifact evidence), the following non-credentialed checks were run directly in the Claude Code execution environment:

| Check | Command | Result |
|---|---|---|
| Mobile app (Expo) typecheck | `pnpm run mobile:typecheck` | Passed — clean |
| Mobile store release-readiness gate | `pnpm run mobile:store:release-gate` | Passed — `[mobile-store-release-gate] Release readiness pack verified from .` |
| Capacitor shell validation | `pnpm run mobile:capacitor:doctor` | Passed with a named gap: native build scaffolding (`apps/mobile-capacitor/android/gradlew`, `apps/mobile-capacitor/android/settings.gradle`, `apps/mobile-capacitor/ios/App/App.xcodeproj/project.pbxproj`) has never been generated in this checkout — these are produced by `cap add android`/`cap add ios`, not present here |
| Capacitor store readiness doctor | `pnpm run mobile:capacitor:store:doctor` | Passed — `[mobile-store] Store readiness checks passed mode=ci target=all` |
| Capacitor environment validation | (via `mobile:capacitor:sync` chain) | Passed with named gaps: optional env values not set (`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `CAPACITOR_SERVER_URL`, `CAPACITOR_ALLOWED_HOSTS`, `ANDROID_APPLICATION_ID`, `IOS_BUNDLE_IDENTIFIER`) |
| Android keystore generation | (via `prepare-mobile-certificates.mjs`, part of the sync chain) | Explicitly skipped — `[mobile] Android keystore secrets not fully supplied; skipping keystore generation.` (expected; this is the credential gap this document tracks) |
| EAS CLI authentication | `npx eas-cli@latest whoami` (run from `apps/mobile`) | `Not logged in` — no `EXPO_TOKEN` or equivalent credential is present in this environment, so no EAS cloud build (Android or iOS) can be triggered from here even before reaching Apple/Google company credentials |
| Native `cap sync` (Android Gradle / iOS CocoaPods sync) | `pnpm --dir apps/mobile-capacitor run sync` | Could not run to completion — this specific execution environment has no `pnpm` binary directly on `PATH` (only reachable via `corepack pnpm`), and the script's own nested `pnpm run ...` calls fail before reaching `cap sync`; `corepack enable` (which would fix this by installing a shim) failed with `EPERM` writing to `C:\Program Files\nodejs\pnpm` — this machine account lacks the filesystem permission to install it. This is a local sandbox limitation, not a credentials gap: the identical script runs correctly in GitHub Actions (`.github/workflows/mobile-capacitor.yml`), which uses `pnpm/action-setup` to register `pnpm` on `PATH` properly |
| Local Android SDK / Gradle toolchain | `which gradle`, `$ANDROID_HOME` | Not present in this environment at all — independent of credentials, this machine cannot produce a local Android build artifact; that path requires either EAS cloud build or a machine with the Android SDK installed |
| Local iOS/Xcode toolchain | `which xcodebuild` | Not present — expected, since this is a Windows machine; iOS builds are only ever possible via EAS cloud build (macOS build workers) or a physical/virtual Mac, never locally here, regardless of credential status |

**Conclusion:** every engineering-side check that does not require a live EAS session or company-owned signing credentials passes cleanly. The path is blocked at exactly the two points this document already names — no EAS/Expo account session available in this environment, and no company-owned Apple/Google signing credentials — plus one newly-identified, purely local limitation (this sandbox cannot run the nested `pnpm` sync/build scripts or install Android/iOS SDKs) that does not exist in the project's actual CI environment. No signed artifact was produced. **A-23 and A-24 remain `Blocked`** — confidence raised modestly (A-23: 60% → 65%, A-24: unchanged at 30%, since iOS additionally requires build infrastructure this environment can never provide locally) to reflect that the non-credentialed portion of the pipeline is now concretely verified rather than assumed, not because the underlying credential blocker moved.

## Due Diligence Note

This document should be read as a governance-strengthening note.

The absence of completed mobile store releases as of 2026-07-24 is not due to lack of engineering intent. It is due to a deliberate decision to preserve company ownership, future transferability, enterprise trust, investor diligence clarity, and sovereign/government buyer credibility.

