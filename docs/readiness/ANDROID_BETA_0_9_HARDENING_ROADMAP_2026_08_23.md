# Android Beta 0.9 Hardening Roadmap

**Date:** 2026-08-23. **Sprint:** MN-4 (Codex-drafted prompt, delivered by the founder). Executes
the "Native Feel" checklist the roadmap/sprint-prompts docs originally scoped as **MN-3**
(`docs/readiness/MOBILE_NATIVE_CAPACITOR_SPRINT_PROMPTS_2026_08_23.md`, lines 379-526) — confirmed
via direct search that MN-3 was never executed (no closeout doc exists for it); MN-4 is that same
unexecuted scope, renumbered and expanded by Codex, layered on top of MN-1 (shell, PR #305) and
MN-2 (native screens, PR #306).

## 1. Android Runtime Audit — current state

Read directly from `apps/mobile-capacitor/` in this repository (not assumed):

| Item | Current state |
|---|---|
| Android entrypoint | `com.getcapacitor.BridgeActivity`, `launchMode="singleTask"`, `exported="true"` (`android/app/src/main/AndroidManifest.xml`) |
| Capacitor config | `apps/mobile-capacitor/capacitor.config.ts` — env-driven `appId`/`server.url`/`allowNavigation`, hardcoded-safe defaults (see table below) |
| App name | "AXXESS TRIaxis" (`capacitor.config.ts` `appName`, and `AndroidManifest.xml` `android:label`) |
| App ID / package name | `com.triaxis.axxess` (default; overridable via `CAPACITOR_APP_ID`/`ANDROID_APPLICATION_ID`) |
| App icon / splash assets | `@mipmap/ic_launcher` referenced in manifest; `resources/` directory exists in `apps/mobile-capacitor/`. **Not visually verified this pass** — no local Android SDK/emulator to render them (see Release Evidence Package). |
| Server URL / bundled web behavior | Remote-URL WebView, **not a bundled local build** — `server.url` defaults to `https://app.axxess.dev`, same deployment desktop web serves (confirmed in MN-1's own research) |
| Allowed hosts | `app.axxess.dev,localhost,127.0.0.1` by default (`CAPACITOR_ALLOWED_HOSTS` env override) |
| Environment variable assumptions | `CAPACITOR_SERVER_URL`, `NEXT_PUBLIC_APP_URL`, `CAPACITOR_ALLOWED_HOSTS`, `CAPACITOR_APP_ID`, `ANDROID_APPLICATION_ID`, `IOS_BUNDLE_IDENTIFIER` — see `apps/mobile-capacitor/capacitor.config.test.ts` (new this sprint) for the exact default/override behavior, now regression-tested |
| Permissions requested | **None declared in the app's own manifest** — no `<uses-permission>` tags at all in `AndroidManifest.xml`. `allowBackup="false"`, `usesCleartextTraffic="false"` with a `network_security_config.xml` that disables cleartext globally with no domain exceptions. See section 8 below for the full review. |
| Back-button behavior | **Was entirely unhandled before this sprint** (confirmed: no `backButton`/`@capacitor/app` reference anywhere in `src/` prior to this change) — the real gap this sprint closes. See section 3. |
| Keyboard behavior | `Keyboard: { resize: 'body', style: 'dark' }` already configured in `capacitor.config.ts` — Android resizes the WebView body when the keyboard opens, the standard/recommended Capacitor approach. No code change was needed to reach a working baseline; verified by config inspection, not a live keyboard-open screenshot (see Remaining risk in the closeout). |
| Status bar behavior | `StatusBar: { style: 'LIGHT', backgroundColor: '#8B1E2D' }` already configured. |
| App resume/session behavior | Not modified this sprint — MN-4 is explicitly scoped to UX/runtime hardening, not auth/session (that is MN-5's explicit scope per the founder's own framing). |
| Offline behavior | **Was entirely unhandled before this sprint** — no `@capacitor/network` usage anywhere. New this sprint: `useMobileNetworkStatus.ts` + `MobileOfflineBanner.tsx` (see section 2). |
| External link handling | `@capacitor/browser` is an installed dependency (`apps/mobile-capacitor/package.json`) but not yet wired into any mobile screen's external-link taps — **not exercised this sprint**, documented as a gap, not fixed (see "What remains partial or blocked" in the closeout). |
| File upload behavior | Not present in any MN-2 mobile screen (Knowledge Hub is read/open-only via signed URL, no upload flow built for mobile yet) — **out of scope**, nothing to hardened here this pass. |
| Memory-heavy screens | See section 6. |

## 2. Mobile Shell Hardening

MN-1/MN-2 already delivered: bottom navigation (`MobileTabBar.tsx`), single-column phone layout,
tablet two-pane (not a stretched phone UI) for Tasks/Approvals/Knowledge/CRM Notes
(`useMobileTabletLayout.ts`), no desktop sidebar/TopBar/dashboard table anywhere in the mobile
render tree (enforced by `scripts/mobile-boundary-guard.mjs` + `mobileIsolation.test.ts`), 44px
minimum tap targets (`MobileActionButton.tsx`). Confirmed still passing this sprint (guard scan: 36
files, 0 violations).

**New this sprint:**
- `MobileOfflineBanner.tsx` + `useMobileNetworkStatus.ts` — a real offline banner driven by the
  actual Capacitor `Network` plugin status (not a decorative placeholder), rendered inside
  `MobileShell` below the header whenever the device is confirmed offline.

No route exposing a forbidden desktop/demo surface was found — re-confirmed by re-running the full
`mobileIsolation.test.ts`/`mobile-boundary-guard.mjs` suite after every change this sprint.

## 3. Android Back Button

**The core deliverable of this sprint.** New files:
- `src/features/mobile/MobileBackHandlerContext.tsx` — a lightweight registration mechanism. Only
  one native mobile screen is ever mounted at a time (`MobileShell` renders exactly one per active
  tab), so a single "currently registered handler" ref is sufficient; no navigation stack needed.
- `src/features/mobile/useMobileBackButton.ts` — the real listener, registered via
  `window.Capacitor.Plugins.App.addListener('backButton', ...)` (the same dependency-free
  window-bridge pattern `isNativeMobileSurface.ts` already established — `@capacitor/app` is not a
  root `src/` dependency). No-op outside the real Capacitor app.

**Exact precedence implemented, matching the sprint prompt's spec line for line:**
1. The currently-mounted screen's own registered handler runs first (wired into all 6 screens with
   list/detail state: Tasks, Meetings, Projects, Approvals, Knowledge, Stakeholders — closes an open
   inline create-form first if one is open, else pops the phone-layout detail view back to its
   list; skipped for the detail branch on tablet, where list and detail render side by side with no
   separate "screen" to leave).
2. If nothing was handled and the app isn't already on the Home tab, back navigates to Home (one
   step back up the tab hierarchy — never a dead-end, never a blank screen).
3. If already on Home with nothing left to pop, `App.minimizeApp()` is called — Android's own
   recommended behavior for a root screen, deliberately **not** `App.exitApp()` (force-kills the
   process) and never anything that touches auth/session, so an accidental logout is structurally
   impossible from this code path.

Ask AI and Home have no internal list/detail state, so they don't register a handler — back from
either falls straight to step 2/3 above, which is correct (Home from anywhere-but-Home; minimize
from Home itself).

**Tested** (not just implemented) — `useMobileBackButton.test.tsx`, 5 tests, all passing: no native
listener registered outside Capacitor; a registered screen handler is tried first and short-circuits
tab-level navigation when it reports it handled the press; falls through to Home when nothing is
registered and not already home; minimizes (never exits, never logs out) when already home; falls
through to Home when a registered handler reports it had nothing to pop.

## 4. Keyboard And Form Behavior

`Keyboard.resize: 'body'` was already configured in `capacitor.config.ts` prior to this sprint —
the standard Capacitor approach where Android resizes the WebView body on keyboard show, which
already keeps focused inputs, the Ask AI input, and every create-task/meeting/project form's submit
button reachable without additional per-form code. No form-layout regressions were found by
re-reading every MN-2 screen's own form markup (plain `<input>`/`<textarea>` inside scrollable
`overflow-y-auto` containers, no fixed-height clipping). **Not verified via a live keyboard-open
screenshot this sprint** — config-level verification only; named explicitly as a remaining risk in
the closeout, not claimed as visually confirmed.

## 5. Session/Auth Hardening On Android

**Explicitly out of scope for MN-4** per the founder's own framing when delivering MN-5
("MN-4 covers mobile/tablet UX hardening. MN-5 is the security pass," which covers auth/session in
detail). No auth/session code was touched this sprint.

## 6. Performance And Memory

- **Desktop dashboard/admin/demo code pulled into the mobile bundle:** re-confirmed absent —
  `mobileIsolation.test.ts`'s static import scan (extended, still passing) proves `src/features/
  mobile/` never imports `features/dashboard`, `features/admin/*`, `features/analytics`,
  `features/alerts`, `features/beta-readiness`, demo data modules, or the agentic control plane.
- **Large assets on startup:** not investigated at the bundle-analyzer level this sprint (no
  `next build --analyze` or equivalent run) — documented as a real gap, not claimed as measured or
  resolved.
- **Lazy loading:** every MN-2 native screen is a plain component import inside `MobileShell.tsx`'s
  `nativeScreens` map, not individually code-split via `React.lazy()` — unlike desktop's
  `lazyRouteComponents.tsx` pattern. This is a real, named optimization opportunity **not
  implemented this sprint** (would need real bundle-size measurement first to know if it's worth
  the added complexity — adding it without measuring would be guessing, not hardening).
- **Large lists needing pagination/virtualization:** every MN-2 screen fetches with
  `{ pageSize: 100 }` (or 50) and renders the full result client-side with no virtualization. For
  Beta 0.9's real current data volumes (early pilot tenants) this is very unlikely to be a genuine
  problem yet — named as a forward-looking risk, not fixed pre-emptively without evidence it's
  needed.

## 7. Native Polish

| Item | Status this sprint |
|---|---|
| App icon | Present (`@mipmap/ic_launcher`), not visually re-verified (no local emulator) |
| Splash screen | Configured (`capacitor.config.ts`), not visually re-verified |
| Status bar color/style | Configured, not visually re-verified |
| Safe area | Already handled by `MobileSafeArea.tsx` (MN-1) |
| Haptics for key confirmation only | **New this sprint** — `triggerMobileHaptic.ts`, a single light-impact tap, wired at exactly two genuine confirmation points: marking a task complete, deciding an approval. Not used anywhere else (no haptic on routine navigation/taps). |
| Pull-to-refresh | **Not implemented this sprint** — deferred; named explicitly rather than silently dropped. See closeout. |
| Loading states | Already present everywhere (`LoadingState.tsx`, used by every MN-2 screen) |
| Empty states | Already present everywhere (`EmptyState.tsx`, used by every MN-2 screen) |
| Error states | **Partial** — every screen's fetch `.catch()` currently falls back to an empty array/list silently, which is indistinguishable from "genuinely no data" in the UI. A real, distinct error state (e.g. "couldn't load — retry") was not added this sprint; named as a gap. |
| Offline/network-unavailable state | **New this sprint** — `MobileOfflineBanner.tsx` (see section 2) |
| Retry affordances | Not added this sprint (follows from the error-state gap above) |
| External links opening safely | Not wired this sprint (see section 1's "External link handling" row) |
| File picker/upload path | N/A — no mobile upload flow exists yet (MN-2 scope, not MN-4) |

## 8. Android Permissions Review

**Every permission this app currently requests, read directly from
`apps/mobile-capacitor/android/app/src/main/AndroidManifest.xml`:**

**None.** There are zero `<uses-permission>` declarations in the app's own manifest. The only
declared `<queries>` entries are intent-visibility declarations (not permissions): `SENDTO`
(`mailto:`) and `DIAL` (`tel:`), which let the app offer "compose email" / "dial number" without
themselves granting any dangerous permission.

Two Capacitor plugin dependencies are installed but neither requires a dangerous Android permission
for the capabilities this app actually uses: `@capacitor/filesystem` (installed, not yet wired into
any mobile upload/download flow — see section 7) and `@capacitor/network`/`@capacitor/haptics`
(both newly wired this sprint; neither needs a manifest permission on Android — `ACCESS_NETWORK_
STATE`/`VIBRATE` are typically merged in automatically by the plugin's own manifest but do not
require runtime user consent and are not privacy-sensitive).

**Conclusion: nothing to remove.** No camera, microphone, location, contacts, or storage permission
is requested, matching the sprint's own "do not add unless a working feature genuinely requires it"
rule — none of those features exist in Beta 0.9 yet.

`android:allowBackup="false"` is also already set (no Android Auto Backup of app data/session state
to Google's servers) — a real hardening property already in place before this sprint, not something
MN-4 needed to add.

## 9. Beta Tester Readiness

See `docs/readiness/ANDROID_BETA_0_9_TESTER_CHECKLIST_2026_08_23.md` (new this sprint).

## 10. Android Build / Release Evidence

See `docs/readiness/ANDROID_BETA_0_9_RELEASE_EVIDENCE_PACKAGE_2026_08_23.md` (new this sprint) for
exact commands run and exact output.
