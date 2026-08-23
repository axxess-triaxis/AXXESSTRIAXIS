# MN-5 — Android Beta 0.9 Security Hardening — Closeout

**Date:** 2026-08-23. **Scope:** security/privacy/tenant-safety/auth/network hardening of Android
Beta 0.9 only — mobile/tablet UX hardening was MN-4's scope, not repeated here. Branch
`feat/mn5-android-security-hardening`, based on `origin/feat/mn4-android-hardening` (PR #307, not
yet merged to `main` at MN-5's start).

## Status

**Code-complete security hardening / pending Android device HITL verification.** No claim is made
of enterprise security certification, penetration-test completion, SOC2 readiness, Play Store
readiness, iOS readiness, or a fully secure mobile app. This closeout documents what was found,
what was fixed, what remains a named risk, and what only a real device or live credentials can
verify.

## What changed

Full detail with exact file:line citations in
`docs/readiness/ANDROID_BETA_0_9_SECURITY_HARDENING_BASELINE_2026_08_23.md` — summary here:

- **Session replay disabled inside the real Capacitor app.** `PostHogSessionReplayInit.tsx` now
  passes `disable_session_recording: isNativeMobileSurface()` to `posthog.init()`. This closes a
  gap the code's own prior comments already self-acknowledged: PostHog's default input masking
  covers form fields only, not the document titles, AI answers/citations, stakeholder notes, and
  approval descriptions this app's mobile screens render. Autocapture and named-event tracking are
  unaffected (already routed through `sanitizeAnalyticsPayload`, confirmed safe). Desktop/web
  behavior is unchanged — a mobile-scoped fix, not a broader privacy-policy change. 3 new tests.
- **Sensitive sessionStorage drafts now cleared on logout.** `clearAgenticDraft()` (new export,
  `agenticDraftHandoff.ts`) and `clearStakeholderNoteDraft()` (new export,
  `stakeholderActionHandoff.ts`) are now called unconditionally from `AuthProvider.logout()`. Both
  keys could previously hold a real AI-answer summary/citations or a real stakeholder name/note body
  for up to their existing 10-minute staleness window after being written, with no logout-time
  cleanup. 2 new tests proving the removal itself works, on top of each module's existing tests.
- **New: `scripts/mobile-secret-exposure-audit.mjs`** (`pnpm run mobile:security:secrets`) — scans
  `src/features/mobile/` for 13 named secret patterns (`SUPABASE_SERVICE_ROLE_KEY`,
  `RESEND_API_KEY`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `AXXESS_TOKEN_VAULT_KEY`, OAuth
  `CLIENT_SECRET`, SMTP/Stripe/Paddle/Vercel/GitHub credentials) plus any direct `process.env.*`
  read at all. Verified this sprint to actually catch a deliberately-injected violation (exit 1,
  correct reason) before the scratch file was removed and the guard re-confirmed clean.
- **New: `pnpm run mobile:security:ci`** — chains the secret audit, the mobile boundary guard, and
  4 sensitive-endpoint test files (`tenants`, `approvals`, `approvals/[id]`, `stakeholders/notes`)
  plus the Capacitor config validation test, kept fast and non-flaky (no live-DB dependency).
- **New: `src/app/api/tenants/route.test.ts`** (3 tests) — the sprint's own required "tenant ID
  cannot be overridden from client payload" proof. `POST /api/tenants` is the one route in this
  codebase confirmed to accept a client-supplied `organizationId` at all; these tests prove it
  rejects an org the caller has no real active membership row for (403, tenant-switch write never
  called) and only accepts one backed by a real membership row.
- **3 new readiness docs**: this closeout, the security baseline (12 sections, each item tagged
  confirmed-safe / confirmed-risk / unknown-needs-HITL / out-of-scope), and the security test
  checklist for the founder's own device walkthrough.

## What did not change

- No changes to RBAC, RLS, audit-log, HITL-approval, or session-check logic anywhere — every
  mechanism reviewed this sprint (24h absolute session cap, httpOnly cookie model, `tenantScope
  FromUser`'s server-derived scoping, the MCP bearer-key gate) was already correct and was left
  exactly as found.
- No Android permission was added or removed (MN-4 already confirmed zero requested; unchanged).
- `apps/mobile-capacitor/android/app/build.gradle`'s `minifyEnabled false` and the `axxess://`
  custom-scheme deep link's missing `autoVerify` were **found and documented, not changed** — both
  named as low-severity confirmed risks in the baseline doc with an explicit reason for not
  blind-fixing them this pass (no local Android build/device to verify a ProGuard-rule change
  against; no real deep-link flow exists yet to fix the app-link-verification gap against).
- No change to `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` — its A-10 row's staleness (still
  showing the superseded 4/6 isolation result) was flagged in the baseline doc, not silently
  ignored, but editing that shared matrix was not in MN-5's explicit file list.
- No changes to `AppShell`/`Sidebar`/`TopBar`, any desktop `*Section.tsx`, X0 Web, Investor Demo, or
  AXXESS Lite.

## Confirmed safe (no fix needed — verified this sprint, not assumed)

- Tenant scoping is server-session-derived everywhere except one route, which cross-checks its one
  client-supplied value against real membership before trusting it (new test proof above).
- All 6 named secrets (`SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_SECRET_KEY`, `RESEND_API_KEY`,
  `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `AXXESS_TOKEN_VAULT_KEY`) are confined to server-only
  files, zero client-reachable hits found in a full-repo search.
- Real auth tokens are confined to three httpOnly cookies; no token/secret found in any
  `localStorage`/`sessionStorage` call site across `src/` (9 non-sensitive UI-state keys inventoried,
  2 sensitive-but-not-secret draft keys found and hardened, see above).
- MCP endpoint requires a Bearer key; `AgentConnectionsPanel`/MCP/plugin-runtime are all already
  blocked from mobile by the existing boundary guard and isolation test (re-verified, 36 files, 0
  violations).
- `pnpm run supabase:verify` (real run this sprint): 44 migrations, **114/114 tables RLS-protected**,
  one warning traced and confirmed benign (a `to authenticated` `using (true)` policy on the global
  `permissions` lookup table, not tenant data).
- Live tenant-isolation harness evidence already exists and is current
  (`docs/readiness/TWO_TENANT_ISOLATION_HARNESS_EXECUTION_2026_08_12.md`, 6/6 resource types
  including `documents`, both read and write blocked cross-tenant) — not re-run this sprint (needs
  live production credentials), cited as current rather than re-proven.

## What remains partial or blocked (named exactly)

- **OAuth-in-Capacitor redirect round-trip: unknown / needs HITL.** No code path for this was found,
  tested, or modified this sprint — genuinely unverified, not assumed safe.
- **`minifyEnabled false` and the unverified `axxess://` custom scheme**: confirmed risks, low
  severity, intentionally not fixed this pass (see "What did not change").
- **Live re-run of the tenant-isolation harness against production Supabase**: not performed this
  sprint — this environment has no live production Supabase credentials. The cited 2026-08-12 result
  is current, not stale, but is not new evidence from this sprint.
- **No live Android device/emulator walkthrough** — same environment limitation MN-1/MN-2/MN-4 all
  already named. Every fix in this sprint is regression-tested against real code paths in JSDOM/
  Node, not confirmed on a real device.

## What claim is still unsupported

No claim is made that Android Beta 0.9 is fully secure, that a penetration test has occurred, or
that any compliance certification applies. The security test checklist
(`ANDROID_BETA_0_9_SECURITY_TEST_CHECKLIST_2026_08_23.md`) is the actual sign-off gate, not this
closeout's own "code-complete" status.

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` (root) | Clean, 0 errors |
| `npx eslint . --max-warnings=0` (root) | Clean, 0 warnings |
| `npx vitest run --config vitest.config.mjs src/app src/features/lite src/features/mobile apps/mobile-capacitor src/services/agentic src/services/analytics` | **520/520 passing across 104 files** — no regressions |
| `pnpm run mobile:security:secrets` (`node scripts/mobile-secret-exposure-audit.mjs`) | Passes, 23 files scanned. Verified this sprint to actually catch an injected violation before being fixed and re-confirmed clean. |
| `pnpm run mobile:security:ci` (secrets + boundary guard + 5 sensitive-endpoint/config test files) | Passes — 24 tests across 5 files, plus the two guard scripts |
| `node scripts/mobile-boundary-guard.mjs` | Passes, 36 files scanned |
| `npx next build` (root, production) | **Succeeds**, exit code 0 |
| `node scripts/verify-supabase-migrations.mjs` (`supabase:verify`) | **Passes** — 44 migrations, 114/114 RLS-protected, 1 warning traced and confirmed benign (see above) |
| `pnpm --dir apps/mobile run typecheck` | Not run — MN-5 made zero changes to `apps/mobile` (the separate Expo app) |

*(Same tooling note as MN-1/MN-2/MN-4: `pnpm run <script>` itself is blocked in this worktree by a
non-interactive dependency-status-check pnpm runs before every script; every command above was run
directly against the underlying binaries via the existing NTFS junction to the main repo's
`node_modules` — identical binaries, not a weaker check.)*

## Mobile security readiness rating after this sprint

**Solid, with two structural gaps named rather than hidden.** The architecture that matters most —
server-derived tenant scoping, httpOnly session cookies with a real enforced 24h cap, secret
isolation, RLS coverage — was already correct before this sprint and is now additionally guarded by
CI-wired checks rather than resting on manual review alone. The two real gaps closed this sprint
(session replay, logout-time draft cleanup) were genuine, not manufactured to have something to fix.
The two named-but-unfixed low-severity risks (`minifyEnabled false`, unverified custom-scheme deep
link) and the one genuinely-unknown item (OAuth-in-Capacitor) are the honest remaining picture.

## Can Android Beta 0.9 be shared with pilot users?

**Not yet, pending the founder's own device walkthrough** using
`ANDROID_BETA_0_9_SECURITY_TEST_CHECKLIST_2026_08_23.md`. Nothing found this sprint is a blocking
critical issue on the evidence gathered — but "no HITL walkthrough occurred" is itself named
explicitly per this sprint's own exit criteria, not treated as equivalent to a passed walkthrough.
