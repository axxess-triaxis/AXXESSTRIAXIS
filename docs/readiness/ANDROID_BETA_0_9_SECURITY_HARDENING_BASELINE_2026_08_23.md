# Android Beta 0.9 — Security Hardening Baseline

**Date:** 2026-08-23. **Sprint:** MN-5 (Codex-drafted prompt, delivered by the founder immediately
after MN-4). Security-only pass — mobile/tablet UX hardening is MN-4's scope, not repeated here.
Branch `feat/mn5-android-security-hardening`, based on `origin/feat/mn4-android-hardening` (PR
#307, not yet merged to `main` at MN-5's start).

Every finding below is tagged **confirmed safe**, **confirmed risk**, **unknown / needs HITL**, or
**out of scope**, per the sprint's own required format. Every claim cites an exact file and line.

## 1. Mobile app URL/origin behavior — confirmed safe

The Capacitor WebView loads a **remote server URL**, not bundled local assets — `server.url`
defaults to `https://app.axxess.dev` (`apps/mobile-capacitor/capacitor.config.ts:13`), the same
deployment desktop web serves (confirmed in MN-1's own research, re-confirmed by MN-4's
`capacitor.config.test.ts`). `allowNavigation` defaults to `app.axxess.dev,localhost,127.0.0.1`
(`capacitor.config.ts:14`). `cleartext: false` is hardcoded, not env-overridable — MN-4's
`capacitor.config.test.ts` (3 tests) already regression-proves this can never flip to `true`
regardless of env vars.

## 2. Auth cookie/session model — confirmed safe

Session lives in three httpOnly cookies set server-side (`src/auth/serverSession.ts:6-14`):
`axxess-access-token`, `axxess-refresh-token`, `axxess-session-anchor-token`. Cookie options
(`serverSession.ts:49-57`): `httpOnly: true`, `sameSite: "lax"`, `secure` in production. None of
these are readable from client JavaScript, in the Capacitor WebView or anywhere else — httpOnly is
enforced by the browser/WebView engine itself, not application code.

**24-hour absolute session cap is real and enforced**, not just documented: `absoluteSessionMax
AgeSeconds = 60 * 60 * 24` (`serverSession.ts:14`). The anchor cookie is set once at sign-in only
(`establishSessionAnchor`, `serverSession.ts:93-96`) and never renewed on refresh; a missing/expired
anchor is treated as a fully expired session even if the refresh token itself is still technically
valid (`getServerAuthSession`, `serverSession.ts:252-262`) — this is the mechanism that makes
"sign in once, stay signed in forever via sliding refresh" structurally impossible, by the code's
own design intent, not an incidental side effect.

## 3. OAuth callback behavior — out of scope

No OAuth-in-Capacitor-specific code path was found or modified this sprint. Google OAuth handoff
inside the native WebView was not exercised or tested this pass — named as **unknown / needs HITL**:
whether the OAuth redirect round-trip (leaving the WebView to a system browser/Custom Tab and
returning) works correctly in the real Capacitor app has not been verified, live or otherwise, in
this environment. No code change was made to this path this sprint since exercising it safely
requires a real device.

## 4. Token storage locations — confirmed safe

Real Supabase access/refresh tokens are confined entirely to the three httpOnly cookies above.
`localStorage`/`sessionStorage` are used elsewhere in `src/` (see item 9), but never for a token or
credential — confirmed via a full-repo search (this sprint's own read-only research pass).

## 5. `localStorage`/`sessionStorage` usage — confirmed safe (with one improvement made)

Full inventory (non-test files): `src/auth/localProfile.ts:46` (cached display-name/profile, not a
secret), `src/demo/demoMode.ts:121` (demo-mode boolean flag), `src/hooks/useWhatsNewPanel.ts`,
`useMicroSurveyPrompt.ts`, `useGoldenPathDisplayMode.ts`, `usePostDemoSatisfactionPrompt.ts`,
`useGuidedDemo.ts` (all UI-state flags, not sensitive), `src/features/onboarding/*` (onboarding
form/progress state), and two draft-handoff keys with real institutional text:
`src/services/agentic/agenticDraftHandoff.ts` (`axxess.agenticDraft.v1` — an AI-answer summary +
citations) and `src/services/agentic/stakeholderActionHandoff.ts` (`axxess.stakeholderNoteDraft.v1`
— a stakeholder name + note body). Both already had a real 10-minute staleness expiry built in
before this sprint. **Improvement made this sprint**: neither was previously cleared on logout —
`clearAgenticDraft()`/`clearStakeholderNoteDraft()` (new exports) are now called unconditionally
from `AuthProvider.logout()` (`src/auth/AuthProvider.tsx`), so a shared/re-used device never carries
a signed-out user's draft text into the next session. See section 9 of the roadmap-equivalent
closeout for test evidence.

## 6. Sensitive env vars visible to client — confirmed safe

Full-repo search (this sprint) for `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, `RESEND_API_
KEY`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `AXXESS_TOKEN_VAULT_KEY` found every real read
confined to server-only files: `src/repositories/supabaseAdmin.ts`, `src/services/email/*.ts`,
`src/services/ai/providers/*.ts`, `src/services/ai/model-routing-policy.ts`,
`src/services/integrations/tokenVault.ts`, `enterpriseConnectorVault.ts`,
`src/services/agents/agentConnectionVault.ts` — every one of these is only ever imported by
`/api/*/route.ts` handlers, never by any client-rendered component. The one apparent client-side hit
(`src/features/ai-workspace/AIWorkspaceSection.tsx:242`) is a **comment** explaining that this
component deliberately does *not* read `OPENAI_API_KEY` and instead fetches `/api/ai/model-policy` —
not an actual read. **New this sprint**: `scripts/mobile-secret-exposure-audit.mjs`, a runnable,
CI-wired check (`pnpm run mobile:security:secrets`) that scans `src/features/mobile/` for these
exact secret names plus any direct `process.env.*` read at all — verified this sprint to actually
catch a deliberately-injected violation (exit 1, correct reason) before being removed and
re-confirmed clean (exit 0, 23 files scanned).

## 7. Android permissions — confirmed safe (see MN-4's own audit, re-confirmed)

Zero `<uses-permission>` entries exist in `AndroidManifest.xml` — no camera, microphone, location,
contacts, or storage permission requested. `allowBackup="false"` (no Android Auto Backup of app
data). Full detail already in MN-4's `ANDROID_BETA_0_9_HARDENING_ROADMAP_2026_08_23.md`, section 8
— re-confirmed unchanged this sprint (no permission was added or removed).

## 8. WebView / Capacitor Android settings — confirmed safe, two new findings documented (not changed)

- `usesCleartextTraffic="false"` + `network_security_config.xml`'s `cleartextTrafficPermitted="false"`
  base-config with no domain exceptions — confirmed safe, re-verified this sprint.
- No `setWebContentsDebuggingEnabled` call found anywhere in the native project (searched
  `apps/mobile-capacitor/android` for `.java`/`.kt`/`.gradle` files) — confirmed safe: WebView
  remote debugging is not force-enabled in release.
- **New finding, not changed**: `apps/mobile-capacitor/android/app/build.gradle:32` sets
  `minifyEnabled false` for the release build type — release APKs are not R8/ProGuard-shrunk or
  obfuscated. **Confirmed risk (low severity)**: this makes reverse-engineering the (thin) native
  Android wrapper code marginally easier, though the app itself contains almost no business logic
  natively (it's a WebView pointed at the real backend — the actual sensitive logic is server-side,
  confirmed safe per section 6). Not changed this sprint: flipping `minifyEnabled` to `true` without
  a real device/build to test against risks a genuine release-breaking ProGuard rule miss that this
  environment has no way to catch before shipping — documented as a named follow-up, not applied
  blind.
- **New finding, not changed**: the `axxess://` custom-scheme deep link
  (`AndroidManifest.xml:31-36`) has no `android:autoVerify="true"` and is a plain custom scheme, not
  a verified Android App Link tied to a real domain. **Confirmed risk (low severity)**: a malicious
  app could in principle register the same custom scheme and intercept an `axxess://` intent on a
  compromised/rooted device. Not changed this sprint — no code currently constructs or expects an
  `axxess://` deep link carrying sensitive data (no OAuth-callback-via-custom-scheme flow was found
  anywhere in `src/`), so the actual exploitable surface today is minimal; named as a real hardening
  candidate for whenever a real deep-link flow is added, not fixed pre-emptively without a concrete
  attack surface to fix against.

## 9. Analytics and session-replay privacy — confirmed risk, fixed this sprint

Named-event analytics (`PostHogAnalyticsProvider.ts`) route every payload through
`sanitizeAnalyticsPayload`/`sanitizeUserProperties` (`src/services/analytics/sanitize.ts:3`), which
strips any property key matching `/(email|phone|token|secret|password|key|content|body|message|note
|notes|description|document|agenda|decision|action_item|address)/i` before it reaches PostHog —
**confirmed safe** for that stream.

**Confirmed risk, already self-acknowledged in the code's own comments before this sprint**
(`PostHogSessionReplayInit.tsx:14-18`): the separate posthog-js SDK session-replay/autocapture
stream is not filtered by `sanitize.ts` at all — PostHog's default input masking covers form fields
only, not rendered document text, stakeholder records, AI answers, or approval descriptions. This
codebase's mobile screens render exactly that content (Knowledge Hub document titles/summaries, Ask
AI answers/citations, Stakeholders names/notes, Approvals descriptions), with no per-route replay
masking built anywhere.

**Fixed this sprint**: `disable_session_recording: isNativeMobileSurface()` added to the
`posthog.init()` call (`PostHogSessionReplayInit.tsx`) — session replay is now entirely disabled
inside the real Capacitor native app. Autocapture and named-event tracking are unaffected (both
already safe per above). Desktop/mobile-web behavior is unchanged — this is a mobile-scoped fix, not
a broader desktop privacy-policy change this sprint wasn't asked to make. Regression-tested: 3 tests
in `PostHogSessionReplayInit.test.tsx` (recording enabled by default outside Capacitor, disabled
inside it, enabled again when explicitly outside it).

## 10. Document upload/download behavior — confirmed safe (structurally, not load-tested)

No mobile upload flow exists yet (MN-2 scope, still not built — Knowledge Hub is open/view-only via
a real signed download URL, `storageRepository.getSignedDownloadUrl`). No document body text,
titles, or content were found flowing into any analytics call (confirmed by the `sanitize.ts` regex
above covering `content`/`body`/`document`). No file-size/type constraint testing was performed this
sprint since there is no mobile upload path to test yet — **out of scope**, not a gap in this
sprint's own scope.

## 11. Agentic/MCP mobile exposure — confirmed safe

`POST /api/agents/mcp` requires a Bearer API key — missing or invalid key returns 401
(`src/app/api/agents/mcp/route.ts:53-62`). `AgentConnectionsPanel` (the admin UI for issuing/
managing agent keys) and the MCP/plugin-runtime endpoints are all present in
`mobileIsolation.test.ts`'s forbidden-specifier list (`"AgentConnectionsPanel"`, `"pluginRuntime"`,
`"/api/agents"`, `"/api/plugins/runtime"`) and in `mobile-boundary-guard.mjs`'s equivalent pattern
list — both re-verified passing this sprint (36 files scanned, 0 violations). No mobile screen
offers agent-key issuance, agent connection management, or any autonomous-action trigger.

## 12. Tenant isolation and demo/live separation — confirmed safe

`tenantScopeFromUser(user, accessToken)` (`src/repositories/supabaseEnterpriseRepositories.ts:
368-375`) derives `organizationId` purely from the server-side `UserContext`, never from a request
body. The **one** route in this codebase that accepts a client-supplied `organizationId` at all —
`POST /api/tenants` (the tenant-switch endpoint, `src/app/api/tenants/route.ts:71-84`) — cross-checks
it against a real active `organization_members` row for that exact user before ever trusting it,
returning 403 otherwise. **New this sprint**: `src/app/api/tenants/route.test.ts` (3 tests) proves
this directly — rejects an org the user has no real membership in and never calls the tenant-switch
write; accepts one only with a real membership row present.

Live database evidence already exists and is current: `docs/readiness/TWO_TENANT_ISOLATION_HARNESS_
EXECUTION_2026_08_12.md` documents a real re-run of `scripts/verify-two-tenant-isolation.mjs`
against production Supabase, using each tenant's own real non-privileged access token — 6/6 resource
types (`projects`, `tasks`, `documents`, `knowledge_articles`, `audit_logs`, `workflow_timeline_
events`) reported both cross-tenant read AND write blocked, overall status `"passed"`. This is not
re-run this sprint (it requires live production Supabase credentials this environment does not have
— see Verification below) but is current, dated 2026-08-12, and directly relevant to mobile since
mobile reads the identical repositories through the identical scope-derivation path.

`pnpm run supabase:verify` (`scripts/verify-supabase-migrations.mjs`) was run for real this sprint:
**44 migrations, 114 tables, 114/114 RLS-protected**, one warning flagged — `20260702165736_initial
_enterprise_schema.sql:346`, a `using (true)` policy on `public.permissions`. Read directly: this
policy is `to authenticated` (not public) and covers only the global RBAC permission-definition
lookup table (permission names/descriptions), not tenant data — **confirmed safe**, any authenticated
user seeing the full list of possible permission names is not a tenant-isolation risk.

**Note on `docs/readiness/ACTIONABLES_READINESS_MATRIX.md`**: its own A-10 row still shows the
superseded "4/6 partial" isolation result predating the 2026-08-12 harness doc above — a staleness
gap in that matrix, not touched this sprint (not in MN-5's explicit file list; flagged here rather
than silently left unmentioned).

Demo mode (`src/demo/demoMode.ts:66-70`) is a client-only `localStorage` boolean
(`axxess.demoMode.enabled`), independent of the real Supabase session. **Confirmed safe by design**:
the code's own comments (`demoMode.ts:12-13`, `src/proxy.ts:28-30`) state the demo flag is "never
used for real authorization — tenant-scoped API calls still require a real Supabase session," and
this sprint's research corroborates it structurally (every tenant-scoped repository call goes
through `tenantScopeFromUser`, which reads the real session, not the demo flag). Since Capacitor's
WebView storage is app-sandboxed (not shared with any system browser or other app), the practical
odds of a real Android Beta 0.9 install ever having this flag set are effectively zero absent a
mobile-specific demo-mode UI toggle — and no mobile screen exposes one (confirmed via
`mobileIsolation.test.ts`'s forbidden list blocking `demo/demoDataset`, `demoOrganization`,
`demoUserContext`). No code change was made here — the existing architecture already satisfies the
sprint's own requirement ("demo session remains isolated... unless explicitly intended").
