# MN-1 — Mobile Native Shell, Navigation, and Product Boundary — Closeout

**Date:** 2026-08-23. **Scope:** `apps/mobile-capacitor` (the Android/iOS Capacitor WebView wrapper).
Source spec: `docs/readiness/MOBILE_NATIVE_CAPACITOR_RESEARCH_AND_ROADMAP_2026_08_23.md` (PR #303,
merged to `main`), executed via the Claude Code prompt in
`docs/readiness/MOBILE_NATIVE_CAPACITOR_SPRINT_PROMPTS_2026_08_23.md`.

## What changed

**New directory, `src/features/mobile/`** (mirrors `src/features/lite/`'s established structure):
- `mobileFeatureRegistry.ts` (+ folded into `mobileIsolation.test.ts`) — the 10-entry registry from
  the roadmap's Mobile Surface Contract (Home, Tasks, Reminders, Meetings, Projects, Approvals,
  Knowledge Hub, Ask AI, CRM Notes, Settings). 8 of the 10 map to an existing, already-allowed
  `NavSection` (reusing the exact same lazy-loaded feature section desktop already renders for that
  section — no forked or duplicated content); Reminders deliberately reuses the Tasks route (the
  roadmap's own reasoning: "Reminders can be created/edited or represented through task due
  dates" — no separate reminders data model exists); Home has no route at all (see below).
- `isNativeMobileSurface.ts` — `window.Capacitor?.isNativePlatform?.() === true`, the real
  Capacitor-injected global, checked without adding `@capacitor/core` as a root dependency (it's
  only ever installed inside `apps/mobile-capacitor`'s own `package.json` today).
- `MobileShell.tsx` — the real shell. Renders `MobileHeader` + `MobileTabBar` + content; when
  `active` maps to an allowed registry section, renders the real `children` (the same
  `ActiveSection` `App.tsx` already resolved via `lazyRouteComponents`); when it doesn't (most
  importantly `active === "dashboard"`, the Full Executive Dashboard), falls back to a local Home
  panel instead — a real safety boundary, not just a UX default, since `App.tsx`'s own
  `defaultSectionForRole` effect routes non-Employee roles to `"dashboard"` on first load.
- `MobileHeader.tsx`, `MobileTabBar.tsx`, `MobileSafeArea.tsx`, `MobileActionButton.tsx`,
  `MobileCommandHome.tsx`, `MobileMorePanel.tsx` — the primitives. Bottom tab bar holds 5 fixed
  slots (Home, Tasks, Approvals, Ask AI, More — matching the bottom-navigation pattern the
  roadmap's own research cites from Salesforce Mobile/ServiceNow Now Mobile); the remaining
  registry entries (Meetings, Reminders, Projects, Knowledge Hub, CRM Notes, Settings) surface
  under "More," a plain real tappable list. `MobileActionButton` enforces the roadmap's 44px
  minimum tap target. `MobileSafeArea` applies `env(safe-area-inset-*)` padding (top for the
  header, bottom for the tab bar only — the middle content area is never double-padded).
- `mobileIsolation.test.ts` — static import-scan (mirrors `liteIsolation.test.ts` exactly) proving
  `src/features/mobile/` never imports Dashboard, Sidebar/TopBar/AppShell, Social Alerts, Beta
  Readiness, complex/product analytics, the full integration catalogue, any `src/features/admin/`
  panel, demo data modules, Golden Path, or the agentic control plane — plus two registry-shape
  tests (every required surface is present; no entry maps to a forbidden `NavSection`).
- `MobileShell.test.tsx` — render-level proof (not just static import-scan): bottom tab bar shows
  every primary tab, `Sidebar`/`TopBar`-specific text/labels are never present, real children render
  for an allowed section, the forbidden-section fallback actually shows Home instead of the passed
  children, tapping a tab calls `onSelectSection`, the More panel lists the remaining entries.
- `isNativeMobileSurface.test.ts` — proves the native-surface check is purely about
  `window.Capacitor`, with no viewport-width branch at all (unlike `useIsMobile()`'s 768px
  `matchMedia` check): asserted `true` at both a phone-sized (375px) and a tablet-sized (1024px)
  simulated `window.innerWidth`, directly satisfying the roadmap checklist's "tablet breakpoint does
  not expose desktop shell" requirement -- a tablet-sized Capacitor app gets `MobileShell` exactly
  like a phone-sized one, never the desktop shell, regardless of width.

**`scripts/mobile-boundary-guard.mjs`** (new) — mirrors `scripts/lite-boundary-guard.mjs`'s
structure: scans `src/features/mobile/` for the same forbidden-import patterns as the isolation
test (build-time enforcement, not just test-time), confirms the 3 required files exist, and
additionally confirms `src/app/App.tsx` actually renders `<MobileShell>` behind an
`isNativeMobile` check — catching the case where `MobileShell` exists but was never wired in.

**`src/app/App.tsx`** — added `isNativeMobile` state (`useState(false)`, corrected via
`useEffect(() => setIsNativeMobile(isNativeMobileSurface()), [])`, the same SSR-safe pattern this
codebase already uses for `useIsMobile()`). The final return now branches: inside the Capacitor
native app, renders `<MobileShell>` wrapping the real `<ActiveSection/>` (still inside
`RouteBoundary`, so RBAC/access checks are unchanged); everywhere else, renders the existing
`<AppShell>` exactly as before, byte-for-byte unchanged in that branch.

**`src/app/layout.tsx`** — added a `viewport` export with `viewportFit: "cover"`, required for
`env(safe-area-inset-*)` to report real values inside the Capacitor WebView. No-op for every other
context (regular browsers without a notch/home-indicator to inset around).

**Root `package.json`** — 3 new scripts: `mobile:native:guard`, `mobile:native:test`,
`mobile:native:ci` (mirrors the existing `lite:*` script family's naming and structure).

## What did not change

- No changes anywhere in `apps/mobile` (the separate Expo/React Native app — a distinct, parallel
  pipeline per `docs/readiness/MOBILE_RELEASE_READINESS_KANBAN_2026_07_27.md`) or
  `apps/mobile-lite-capacitor`/`src/features/lite`/`src/app/lite` (AXXESS Lite's own surface).
- `AppShell.tsx`/`Sidebar.tsx`/`TopBar.tsx` (X0 desktop chrome) — zero changes. Desktop web and
  mobile-web-in-a-regular-browser render exactly as they did after the sidebar-responsiveness fix
  (PR #302), unaffected by this sprint.
- No changes to `apps/mobile-capacitor`'s own config, build scripts, or native `android/`/`ios/`
  projects — MN-1 is entirely a web-side change; the same deployed URL Capacitor already points at
  now behaves differently only when `window.Capacitor.isNativePlatform()` is true.
- No new backend, no Supabase schema changes, no auth/RBAC/RLS/audit changes. `RouteBoundary`'s
  real access check still gates every section in the mobile branch exactly as in the desktop one.
- Command Home (a real "what needs attention now" data view), Reminders as its own real screen, and
  every other MN-2-scoped daily-use workflow are explicitly not built here — see "What still loads
  from desktop / transitional decisions" below.

## What still loads from desktop / transitional decisions (per the prompt's own escape hatch)

The prompt's step 4 explicitly allows: *"If current route architecture makes this risky, create a
transitional wrapper but document exactly what still loads from desktop."* Two decisions taken
under that allowance:

1. **8 of the 10 registry entries render the exact same feature-section component desktop renders**
   (`TasksSection`, `MeetingsSection`, `ApprovalsSection`, `ProjectsSection`, `KnowledgeHubSection`,
   `AIWorkspaceSection`, `StakeholdersSection`, `SettingsSection`) inside `MobileShell`'s chrome
   instead of `AppShell`'s. These sections were already allowed by the roadmap's own Mobile Surface
   Contract and already real/live — MN-1 changes the chrome around them, not their content or data.
   None of them import `Dashboard`/`Sidebar`/`TopBar`/`AppShell` themselves (confirmed via the same
   boundary guard scanning), so this doesn't reintroduce any forbidden surface. Making each of
   these feel genuinely mobile-native (compact layouts, mobile-appropriate forms, tablet two-pane)
   is explicit MN-2 scope ("Core Mobile Workflows and Tablet Layout") per the roadmap.
2. **Home has no dedicated Next.js route or `NavSection`.** Adding either would mean touching
   `src/app/navigation.ts`'s shared `NavSection` union, `navGroups` (visible on the desktop
   sidebar), `lazyRouteComponents`, and RBAC visibility rules — a materially riskier, wider-blast-
   radius change than this sprint's stated goal ("stop the app feeling web-wrapped by creating a
   shell and guardrail layer"). Instead, Home is a real, honest, **local** panel
   (`MobileCommandHome.tsx`) rendered directly by `MobileShell` with no route change at all: a real
   greeting using the actual authenticated user's name, and real, working navigation links to every
   other registered surface. It deliberately shows **no metrics, counts, or "what needs attention"
   data** — inventing a fake urgent-items number would repeat this program's own
   `DEMO_DATA_LEAKAGE_AUDIT.md` mistake. A genuine Command Home with real data is explicit MN-2
   scope.

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` (root) | Clean, 0 errors |
| `npx eslint` on all changed files | Clean, 0 warnings |
| `npx vitest run --config vitest.config.mjs src/features/mobile` | **22/22 passing** (3 files: `mobileIsolation.test.ts`, `MobileShell.test.tsx`, `isNativeMobileSurface.test.ts`) |
| `npx vitest run --config vitest.config.mjs src/app src/features/lite src/features/mobile` | **405/405 passing across 84 files** (pre-dates the 4 added `isNativeMobileSurface.test.ts` tests; re-confirmed independently via the row above) — confirms no regression to `AppShell`/`Sidebar`/`TopBar`/routing tests or to Lite's own isolation tests |
| `node scripts/mobile-boundary-guard.mjs` | Passes, 11 files scanned. **Verified it actually catches violations**, not just passes trivially: a deliberately-injected `DashboardSection` import into a scratch file inside `src/features/mobile/` made it fail with exit code 1 and the correct reason; the scratch file was then removed and the guard re-confirmed clean. |
| `pnpm run mobile:native:ci` (guard + test together) | Passes (both components independently verified above) |
| `pnpm --dir apps/mobile run typecheck` | **Blocked** — `pnpm install` refuses to run non-interactively in this environment (`[ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY]`, no TTY available to confirm a `node_modules` purge). Not a regression risk: zero files in `apps/mobile` were touched by this sprint. |
| `npm run build` (root, production) | **Succeeds**, exit code 0. Every existing route (dashboard, tasks, meetings, approvals, projects, knowledge, stakeholders, settings, admin/*, lite/*, etc.) still compiles/prerenders correctly alongside the new `src/features/mobile/` module. |
| Capacitor doctor | Not run this pass -- no native config changed, only the web bundle Capacitor's WebView already points at. |
| Android/tablet visual smoke test | **Not performed.** See "What claim is still unsupported" below. |

## Remaining risk

- **No live device/browser confirmation that `window.Capacitor.isNativePlatform()` actually
  resolves `true` inside the real Android app and triggers `MobileShell`.** The check itself is a
  single, well-documented Capacitor API used exactly as its own docs describe; the branching logic
  around it is fully covered by the 18 mobile-specific tests plus the 405-test regression run. But
  this is still a claim about real native-runtime behavior that only a live device can confirm.
  This session's attempts at interactive live-browser verification for the prior sidebar fix (PR
  #302) hit a tooling-environment limitation (the Browser pane not compositing/hydrating reliably)
  documented in that PR — the same limitation would apply here, so no further attempt was made this
  pass rather than repeat a known-unreliable path.
- **The 8 reused feature sections were built and tested for desktop layouts**, not phone-width
  ones. They should render (they're just React components, no desktop-specific sizing assumptions
  were found in this sprint's own scan), but their information density, form field sizing, and
  table/list layouts were not visually re-audited for a 375px-wide screen in this pass — that's
  explicit MN-2 scope ("mobile Tasks," "mobile Approvals," etc. as distinct MN-2 outputs, not a
  claim that today's shared components are already mobile-optimized).
- **`apps/mobile` Expo typecheck could not be run** in this environment (see Verification table) --
  low risk since nothing there changed, but it means that specific checklist item from the sprint
  prompt is unverified rather than confirmed passing.

## What claim is still unsupported

No claim is made that this has been visually confirmed on a real Android device or emulator, or
that App Store/Play Store screenshots exist for it. Per the roadmap's own Hard Boundaries: *"Do not
claim App Store / Play Store readiness until real signed-store evidence exists"* -- this closeout
does not claim that, and does not claim a live walkthrough happened when it did not.

## Next sprint recommendation

Proceed to **MN-2 -- Core Mobile Workflows and Tablet Layout** per the roadmap: build a real Command
Home (replacing `MobileCommandHome`'s honest placeholder with actual "what needs attention" data,
reusing real repositories the same way this codebase's other honest-empty-state work already
does), give Tasks/Meetings/Approvals/Projects/Knowledge Hub/CRM Notes their own mobile-native
layouts instead of reusing the desktop section components as-is, add the tablet two-pane layout,
and -- as a prerequisite before claiming any of MN-1 or MN-2 "done" in a broader release-readiness
document -- get this branch in front of an actual Android device or emulator for the visual smoke
test this closeout could not perform.
