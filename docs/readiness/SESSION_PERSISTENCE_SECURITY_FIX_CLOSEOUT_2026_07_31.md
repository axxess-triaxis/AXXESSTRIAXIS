# Session Persistence Security Fix — Closeout (2026-07-31)

## Objective

Founder-reported, live, on `landing.triaxisventures.com`: visiting the site sometimes landed
directly on an already-authenticated "Continue to workspace" screen instead of requiring fresh
sign-in — in both incognito and (more often) normal browser windows, Chrome and Edge, no other
window open. Framed as "0/100 incident acceptability" for an enterprise SaaS platform.

Founder decisions (via AskUserQuestion, this session): force logout applies everywhere immediately
(not just fresh `/auth` visits — an already-open, actively-used tab elsewhere should also get
bounced), and add a hard absolute session cap (24h) on top of removing the auto-continue screen.

## Root Cause (evidence, not guessed)

Not a cross-user cookie leak: cookies are `httpOnly`, `sameSite: lax`, `secure` in production,
host-only, and every session check genuinely revalidates against Supabase's real `/auth/v1/user`
endpoint. The real mechanism: `axxess-refresh-token` had a **sliding 30-day window** —
`setServerAuthCookies()` re-issued a fresh 30-day `maxAge` on every successful refresh
([src/auth/serverSession.ts](../../src/auth/serverSession.ts), pre-fix line 52), so a real session
never truly expired as long as someone opened the app at least once a month.
`AuthProvider.tsx`'s on-mount `useEffect` unconditionally called `fetchServerSession()` on every
load of `/auth`, and `LoginPanel` rendered a "Continue to workspace" bypass whenever that resolved
to an authenticated session — the literal trigger observed live.

## What Changed

- **`src/auth/serverSession.ts`** — new `axxess-session-anchor-token` cookie, set once at original
  sign-in (`signInServerSide`, `establishServerSessionFromOAuthTokens`, `verifyPhoneOtpServerSide`)
  via new `establishSessionAnchor()`, never renewed by `refreshServerSession`. Its own `maxAge` is
  the hard 24h cap (`absoluteSessionMaxAgeSeconds`). `getServerAuthSession()` now clears all auth
  cookies and returns `null` whenever an access/refresh token exists but the anchor cookie does
  not — which is true for every session that existed before this shipped, satisfying "force logout
  everywhere immediately" without a separate revocation list.
- **`src/app/auth/page.tsx`** — `LoginPanel`'s "Continue to workspace" bypass now only renders for
  `session.source === "mock-rbac"` (Investor Preview/demo). For a real (`supabase-auth`) session,
  landing on `/auth` now silently calls `logout()` and renders the normal sign-in form instead.
- **`src/auth/AuthProvider.tsx`** — new focus/`visibilitychange`-triggered revalidation: when a
  `supabase-auth` session is active and the tab regains visibility/focus, it re-checks
  `fetchServerSession()` and drops to `unauthenticated` if the server session is gone, so an
  already-open tab notices a server-side invalidation on next return to it (not a literal
  zero-interaction instant push — no websocket/polling infrastructure exists in this codebase for
  that, and building one was out of scope for this pass).

## What Did Not Change

- Investor Preview / demo session mechanism (`source: "mock-rbac"`, `axxess-demo-session` cookie,
  12h TTL) — untouched, per the prior documented P0 requirement in
  `docs/readiness/CLAUDE_CODE_SPRINT_1_CORRECTION_PROMPT_2026_07_24.md` that this exact screen must
  keep working for that flow.
- No user-facing "remember me" toggle was added — the 24h cap is fixed, not optional.
- True instant, zero-interaction cross-tab logout was not built (explicitly out of scope — see
  plan file).

## What Was Verified (exact commands, exact results)

- `pnpm run typecheck` — exit 0.
- `pnpm --dir apps/mobile run typecheck` — exit 0.
- `pnpm run lint` (`eslint . --max-warnings=0`) — exit 0.
- `pnpm run test` (`vitest run`) — 188/188 test files, 826/826 tests passed. First full run hit a
  known, pre-documented Vitest worker-thread infrastructure timeout (not a code defect — see this
  session's prior occurrences) on `src/features/settings/SettingsSection.test.ts`; re-ran that file
  in isolation and it passed 11/11, confirmed by combining with the 187 files / 815 tests that
  completed in the same full run (187+1=188, 815+11=826).
- New/updated tests specific to this fix, all passing: `src/auth/serverSession.test.ts` (new, 5
  tests — anchor set on sign-in, missing-anchor treated as expired and cookies cleared, valid
  anchor allows normal validation, anchor not renewed on refresh, no-token case returns null);
  `src/app/auth/page.test.tsx` (+2 tests — real session never shows the bypass and triggers a
  silent `/api/auth/logout` call; demo session keeps the bypass unchanged);
  `src/auth/AuthProvider.test.tsx` (+1 test — focus/visibility revalidation drops a real session to
  unauthenticated when the server reports it gone).
- `pnpm run build` (`next build`) — exit 0.
- `pnpm run supabase:verify` — exit 0 (see below; required an unrelated fix along the way).

### Unrelated fixes required to get the full suite green

Two pre-existing failures surfaced in the full suite, both caused by earlier (already-completed,
still-uncommitted) work in this session — the real OpenAI adapter and its spend guard — not by
this security fix. Fixed as part of getting a clean baseline before touching anything further:

- `src/services/ai/aiRouter.test.ts` — the "Sprint 1 proof" test expected a real OpenRouter fetch
  call, but the new spend guard (`aiSpendGuard.ts`) now fails closed when Supabase admin config is
  unavailable in the test environment, so the call was correctly skipped before `fetch` was ever
  reached. Fixed by mocking `../../repositories/supabaseAdmin` with ample budget headroom, matching
  the same pattern `tenantRagWorkflow.aiRouting.test.ts` already used.
- `src/services/rag/tenantRagWorkflow.aiRouting.test.ts` — a test asserting the local-fallback path
  for "a placeholder-stub provider (e.g. OpenAI, no live adapter yet)" broke because OpenAI is no
  longer a stub (it joined `liveModelProviders` earlier this session). Updated the test to use
  `anthropic` instead, which is still genuinely stub-only, preserving the test's real intent.
- `supabase/migrations/20260731100000_ai_provider_budget.sql` — failed `supabase:verify`'s
  permissive-RLS-predicate check. The migration had invented an explicit
  `create policy ... using (true) with check (true)` for service-role access; the actual
  established pattern in this repo (`agent_connections.sql`, `agent_action_grants.sql`) is
  `enable row level security` + `grant ... to service_role` with **no** explicit policy at all,
  since service_role bypasses RLS by default in Supabase. Fixed to match. This migration has not
  yet been applied to production (founder still needs to run it manually).

## What Remains Partial / Blocked

- **Manual, HITL-only verification** (cannot be self-certified): after deploy, confirm a
  previously-signed-in real session is bounced to sign-in on next visit/tab-focus, and confirm
  Investor Preview's "Continue to workspace" still works unchanged.
- **Not yet committed or deployed.** All work described here is in the working tree only.

## Exact File/Command/Branch State

- Branch: `canonical/sprint-1-35-unified-gitlab` (unchanged, no new branch created).
- No commits created yet — awaiting explicit confirmation before commit, and separately before any
  deploy, per standing repo discipline.
- Files touched by this fix specifically: `src/auth/serverSession.ts`,
  `src/auth/serverSession.test.ts` (new), `src/app/auth/page.tsx`, `src/app/auth/page.test.tsx`,
  `src/auth/AuthProvider.tsx`, `src/auth/AuthProvider.test.tsx`.
- Files touched to unblock verification (belong to the separate, earlier OpenAI-adapter batch, not
  this fix): `src/services/ai/aiRouter.test.ts`, `src/services/rag/tenantRagWorkflow.aiRouting.test.ts`,
  `supabase/migrations/20260731100000_ai_provider_budget.sql`.
- Other uncommitted work in the same working tree, untouched by this session and not part of this
  closeout: `apps/mobile-capacitor/android/gradle.properties`, `paxel-upload.sh`, several
  pre-existing `docs/readiness/*.md` files not authored in this session.
