# MN-4 — Android Beta 0.9 App Hardening — Closeout

**Date:** 2026-08-23. **Scope:** `apps/mobile-capacitor` (Android). Executes the previously-scoped-
but-never-shipped "MN-3: Native Feel, Performance, Android/Tablet QA, and Release Evidence" from
`docs/readiness/MOBILE_NATIVE_CAPACITOR_SPRINT_PROMPTS_2026_08_23.md` (confirmed via search: no
MN-3 closeout exists), delivered by the founder as a Codex-drafted prompt named MN-4. Branch
`feat/mn4-android-hardening`, based on `origin/feat/mn2-mobile-core-workflows` (MN-2's PR #306 not
yet merged to `main` at MN-4's start, matching this program's established stacked-PR pattern).

## Status

**Code-complete / Android Beta 0.9 hardening pending founder device walkthrough.** Per this sprint's
own "Do Not Overclaim" instruction: no Play Store readiness, no iOS readiness, no full native-app
status, and no complete performance resolution is claimed. This is a Capacitor Android beta with a
mobile-native shell and hardened Android behavior, not a native rewrite.

## What changed

Full detail in `docs/readiness/ANDROID_BETA_0_9_HARDENING_ROADMAP_2026_08_23.md` (current-state
audit) — summary here:

- **Android hardware back button** (the sprint's core deliverable): `MobileBackHandlerContext.tsx`
  (registration mechanism) + `useMobileBackButton.ts` (the real `window.Capacitor.Plugins.App.
  addListener('backButton', ...)` listener, no-op outside the real Capacitor app) + wiring into all
  6 mobile screens with list/detail state (Tasks, Meetings, Projects, Approvals, Knowledge,
  Stakeholders). Exact precedence: registered screen handler first, then tab-level "go to Home,"
  then `App.minimizeApp()` at the true root — never `App.exitApp()`, never touches auth/session, so
  an accidental logout is structurally impossible from this code path.
- **Offline state**: `useMobileNetworkStatus.ts` (real Capacitor `Network` plugin status) +
  `MobileOfflineBanner.tsx`, rendered inside `MobileShell` whenever confirmed offline.
- **Haptics, used sparingly**: `triggerMobileHaptic.ts`, wired at exactly two genuine confirmation
  points (task marked complete, approval decided) — nowhere else.
- **`src/features/mobile/isNativeMobileSurface.ts`**: extended its existing dependency-free
  `window.Capacitor` type declaration to also type `Plugins.App`, `Plugins.Network`, and
  `Plugins.Haptics` (only the exact methods this codebase now calls) — the same pattern MN-1
  established for `isNativePlatform`, not a new dependency.
- **Android runtime + permissions audit**: read directly from `AndroidManifest.xml`,
  `capacitor.config.ts`, and `network_security_config.xml` — zero `<uses-permission>` entries exist
  today (no camera/microphone/location/contacts/storage requested), `allowBackup="false"` and
  `usesCleartextTraffic="false"` were already in place before this sprint. Full table in the roadmap
  doc.
- **4 new docs**: this closeout, the hardening roadmap, the tester checklist
  (`ANDROID_BETA_0_9_TESTER_CHECKLIST_2026_08_23.md`), and the release evidence package
  (`ANDROID_BETA_0_9_RELEASE_EVIDENCE_PACKAGE_2026_08_23.md`, with real, exact `capacitor-doctor`/
  `store-doctor` command output captured this session, not paraphrased).
- **New tests**: `useMobileBackButton.test.tsx` (5 tests — precedence order, no-op-outside-
  Capacitor, never-exits/never-logs-out), `apps/mobile-capacitor/capacitor.config.test.ts` (3 tests
  — real default app ID/server URL/allowed hosts, real env-override behavior, cleartext-never-
  enabled floor). All 6 MN-2 screen test files updated to wrap their renders in
  `MobileBackHandlerProvider` (a new required context dependency the back-button feature
  introduced), with no change to what each test actually asserts.

## What did not change

- No changes to `apps/mobile` (Expo) or `apps/mobile-lite-capacitor`/Lite's own surface.
- No changes to `AppShell.tsx`/`Sidebar.tsx`/`TopBar.tsx` or any desktop `*Section.tsx` component.
- No changes to auth/session/RBAC/RLS/audit code — explicitly out of scope for MN-4 (that is MN-5's
  scope, per the founder's own framing when delivering both prompts in sequence this session).
- No changes to `apps/mobile-capacitor`'s native `android/`/`ios/` project files, Gradle config, or
  signing setup.
- Pull-to-refresh was **not** implemented this sprint (named in the roadmap doc as deferred, not
  silently dropped) — it is real added UI surface area the sprint's time did not stretch to safely
  cover on top of the back-button/offline/haptics work, and the prompt's own scope treats it as
  "where appropriate," not mandatory everywhere.
- A distinct error state (vs. today's silent empty-array fallback on fetch failure) was **not**
  added this sprint — named as a real, specific gap in the roadmap doc.
- External link safe-opening (`@capacitor/browser`) was **not** wired into any mobile screen this
  sprint — the dependency is installed but unused; named as a gap.

## What remains partial or blocked

- **No live Android device/emulator walkthrough was performed** — this environment has no local
  Android SDK/emulator (confirmed via `capacitor-doctor.mjs`'s own advisory output, captured
  verbatim in the release evidence package). Every back-button/offline/haptics claim in this
  closeout is backed by unit tests exercising the real Capacitor plugin bridge API shape in JSDOM,
  not a device screenshot. This is the same tooling-environment limitation MN-1 and MN-2 both
  already named.
- **No unsigned or signed APK build was produced** — blocked by the same missing local Android
  toolchain; exact blocker documented in the release evidence package rather than faked.
- **App icon/splash/status-bar rendering not visually confirmed** — files are present and
  configured; not screenshotted.

## What claim is still unsupported

No claim is made that Android Beta 0.9 "feels native" as a subjective visual judgment — that
requires the founder's own device walkthrough per this sprint's own Manual HITL Checklist. No claim
of Play Store readiness, iOS readiness, or measured performance improvement is made anywhere in
these docs.

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` (root) | Clean, 0 errors |
| `npx eslint . --max-warnings=0` (root) | Clean, 0 warnings (one real violation was found and fixed mid-sprint — `useMobileBackButton.test.tsx` called a hook conditionally; fixed to call it unconditionally with a no-op fallback, then re-verified clean) |
| `npx vitest run --config vitest.config.mjs src/features/mobile apps/mobile-capacitor/capacitor.config.test.ts` | **73/73 passing** (14 files) |
| `npx vitest run --config vitest.config.mjs src/app src/features/lite src/features/mobile apps/mobile-capacitor` | **460/460 passing across 96 files** — confirms no regression to `AppShell`/`Sidebar`/`TopBar`/routing tests, Lite's own isolation tests, or MN-1/MN-2's own suites |
| `node scripts/mobile-boundary-guard.mjs` | Passes, 36 files scanned |
| `npx next build` (root, production) | **Succeeds**, exit code 0. Every existing route still compiles/prerenders correctly alongside this sprint's changes. |
| `node scripts/capacitor-doctor.mjs` | Exit 0 — real advisory about missing native build scaffolding (gradlew/settings.gradle/Xcode project), not a hard failure. Exact output in the release evidence package. |
| `node scripts/validate-capacitor-store-readiness.mjs --mode=ci --target=android` | Exit 0. |
| `pnpm --dir apps/mobile run typecheck` | Not run this sprint — MN-4 made zero changes to `apps/mobile` (the separate Expo app); no reason to expect a different result than MN-1/MN-2's already-documented `[ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY]` blocker. |

*(Same tooling note as MN-1/MN-2: `pnpm run <script>` itself is blocked in this worktree by a
non-interactive dependency-status-check pnpm runs before every script; verification commands above
were run directly against the underlying binaries via the existing NTFS junction to the main repo's
`node_modules` — not a weaker check, the identical binaries each `pnpm run <script>` would invoke.)*

## Next sprint recommendation

MN-5 (Android Beta 0.9 Security Hardening) is already queued, per the founder's own sequencing this
session. Beyond that: get this branch in front of a real Android device or emulator for the visual
smoke test that neither MN-1, MN-2, nor MN-4 could perform in this environment — the back-button,
keyboard, offline-banner, and haptics behavior are all unit-tested against the real Capacitor plugin
API shape, but none has been confirmed on a real device yet.
