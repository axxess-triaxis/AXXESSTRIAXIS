# Authentication

AXXESS uses a Supabase Auth-ready facade with a local investor preview path.

Real Supabase-backed auth is the default for deployed environments. Local mock-RBAC auth is allowed only when `NEXT_PUBLIC_AXXESS_AUTH_SHELL=false` is explicitly set for local UI development.

## Supported Flows

- Email/password login through `/api/auth/login`
- Email/password sign-up through `/api/auth/sign-up`
- Google/Microsoft OAuth sign-up and sign-in through `/api/auth/oauth/start` and `/api/auth/oauth/callback` (see "OAuth Sign-Up And Sign-In" below)
- Logout through `/api/auth/logout`
- Session validation through `/api/auth/session`
- Protected routes through route metadata and middleware helpers
- Investor preview login through Demo Mode
- Local profile creation and editing for display name, email, initials, department, title, and timezone

## OAuth Sign-Up And Sign-In (2026-07-22)

Both `/auth` (sign-in) and `/auth/sign-up` now show three separate, always-visible identity options -- manual email/password, "Continue with Google", and "Continue with Microsoft" -- rather than only the manual form. This closes a real gap found during a live Tenant 0 onboarding attempt: there was no visible sign-up entry point on the sign-in page at all, and no alternative to manual email/password anywhere in the UI, even though backend OAuth-start infrastructure (`/api/auth/oauth/start`) already existed.

How it works:

1. `OAuthProviderButtons` (`src/features/auth/OAuthProviderButtons.tsx`) calls `GET /api/auth/oauth/start?provider=google|microsoft`, which returns a Supabase `/auth/v1/authorize` URL if the provider is enabled, or a clear, safe error message if it is not (`"<provider> OAuth is not enabled for this deployment."`) -- shown inline, never masked.
2. The browser is redirected to that URL, completes the provider's own consent screen, and Supabase redirects back to `/auth/login` with `access_token`/`refresh_token` in the URL fragment.
3. `EnterpriseAuthFlowPage`'s `login` kind picks up those fragment tokens and `POST`s them to the new `/api/auth/oauth/callback` route, which calls `establishServerSessionFromOAuthTokens` (`src/auth/serverSession.ts`) -- this sets the exact same httpOnly session cookies password login does, then routes the user into `/dashboard` or `/onboarding` depending on whether they already belong to an organization.

### Enablement Runbook (External Steps -- Only Triaxis Ventures Can Do These)

All application code for Google/Microsoft OAuth already exists and works (`OAuthProviderButtons.tsx`, `/api/auth/oauth/start`, `/api/auth/oauth/callback`, `establishServerSessionFromOAuthTokens`). Enabling it for real requires registering real OAuth applications in Google's and Microsoft's own consoles and entering their credentials into Supabase -- these are credentialed, third-party-console actions that Claude Code cannot perform on your behalf under any circumstance, even if asked. No further application code changes are needed to complete this; it is entirely the checklist below.

**Step 0 -- Get the exact Supabase redirect URI first.** In the Supabase dashboard, go to **Authentication > Providers**, open the **Google** row (or **Azure**/Microsoft row), and copy the **Callback URL (for OAuth)** shown there verbatim. Do not guess or construct this URL from the project ref -- copy it exactly as Supabase displays it, and use the same value for both Google and Microsoft registrations below.

**Step 1 -- Google Cloud Console (for "Continue with Google"):**
1. In Google Cloud Console, open **APIs & Services > OAuth consent screen** and configure it (app name, support email, scopes: `email`, `profile`, `openid` is enough).
2. Go to **APIs & Services > Credentials > Create Credentials > OAuth client ID**, application type **Web application**.
3. Under **Authorized redirect URIs**, paste the exact Supabase callback URL from Step 0.
4. Save, then copy the resulting **Client ID** and **Client Secret**.

**Step 2 -- Azure Portal / Entra ID (for "Continue with Microsoft"):**
1. In Azure Portal, go to **Microsoft Entra ID > App registrations > New registration**.
2. Under **Redirect URI**, select **Web** and paste the exact Supabase callback URL from Step 0.
3. After registration, go to **Certificates & secrets > New client secret**, and copy the generated secret value immediately (it is not shown again).
4. Copy the **Application (client) ID** from the app registration's Overview page.

**Step 3 -- Supabase Dashboard:**
1. Go to **Authentication > Providers > Google**, paste the Client ID/Secret from Step 1, and enable the toggle.
2. Go to **Authentication > Providers > Azure (Microsoft)**, paste the Client ID/Secret from Step 2, and enable the toggle.

**Step 4 -- Vercel env vars + redeploy (this part Claude Code can do, once Step 3 is confirmed complete -- these are plain `true`/`false` flags, not secrets):**
```bash
npx vercel env add NEXT_PUBLIC_AUTH_GOOGLE_ENABLED production
npx vercel env add NEXT_PUBLIC_AUTH_MICROSOFT_ENABLED production
```
(value `true` for each), then a production redeploy via `scripts/deploy-vercel.mjs`.

**Step 5 -- Live verification (no login required, so Claude Code can do this too):** `curl` `/api/auth/oauth/start?provider=google` and `?provider=microsoft` against the live deployment and confirm `{"ok":true,"authorizeUrl":...}` instead of the `400` "not enabled" response; then confirm in a browser that clicking each button reaches the real Google/Microsoft consent screen.

Until Steps 1-4 are done, the buttons remain visible (by design, so a real tenant sees the intended options rather than a hidden feature) but show the safe "not enabled for this deployment" message when clicked -- this is expected, not a bug.

## Sign-Up/Login Error Diagnosability And Confirmation Resend (Sprint 42)

Before Sprint 42, `/api/auth/sign-up` and `/api/auth/login` both caught every Supabase Auth failure with a bare `catch {}` -- no server-side logging, and every failure (wrong password, unconfirmed email, an account that already exists, a misconfigured project) produced the same generic message. This made a real Tenant 0 "Create account" report undiagnosable from the logs alone.

Both routes now parse the real Supabase error via a shared helper (`src/auth/supabaseAuthError.ts`, `SupabaseAuthError`/`parseSupabaseAuthErrorResponse`), log the real status/code server-side with `console.error`, and return a specific `code` field for the two most actionable cases:

- **Sign-up, `user_already_exists`** -- returns `409` with a message pointing the user at sign-in instead of a generic "unable to create account" error.
- **Login, `email_not_confirmed`** -- returns `401` with `code: "email_not_confirmed"`. The sign-in page (`src/app/auth/page.tsx`) detects this and shows a **"Resend confirmation email"** action, calling a new `POST /api/auth/resend-confirmation` route (`{email}` -> Supabase's `/auth/v1/resend`, `{type: "signup"}`). This route always returns the same success response regardless of whether the account exists or the resend actually succeeded, to avoid leaking account existence (account enumeration).

All other failure reasons still fall back to the original safe generic message on both routes -- only the two known, actionable codes above get distinct copy. This does not change the underlying Supabase project configuration (e.g., whether email confirmations or SMTP delivery are enabled) -- see `docs/SUPABASE_CLI.md` for that gap, which remains independently unverified.

## Investor Preview

```text
Email: investor.preview@axxess.demo
Password: preview
```

Logging in with this account enables Demo Mode and loads the North East Health Mission tenant.

## User Profile

For a real Supabase-auth session, editing a profile in Settings calls `PATCH /api/profile`, which writes to the real `profiles` and `users` tables via `updateTenantProfile` (`src/auth/provisioning.ts`) -- this is genuine server-side persistence, not a stub (audited and confirmed in Sprint 1: Tenant 0 Production Activation, 2026-07-23). `src/auth/localProfile.ts`'s `localStorage` layer is a client-side display cache written alongside the real save, and is also the standalone source of truth for the mock-RBAC/local-dev auth path (`NEXT_PUBLIC_AXXESS_AUTH_SHELL=false`) where there is no real Supabase session to persist against.

## RBAC

Supported roles:

- Super Admin
- Organization Admin
- Executive
- Manager
- Employee
- Consultant
- Guest

Routes and feature controls read the authenticated `UserContext`. Organization boundaries are enforced through tenant-scoped repositories and RLS-ready metadata.

## Security Notes

- Client login responses do not expose Supabase access or refresh tokens.
- Server-only service-role keys must remain outside `NEXT_PUBLIC_*` variables.
- Demo login is isolated to the seeded preview tenant.
- Production and beta deployments must use `NEXT_PUBLIC_AXXESS_AUTH_SHELL=true` so the client waits for `/api/auth/session` instead of creating a mock authenticated user.
- Session validation uses httpOnly cookie-backed server checks for protected API routes.
- `src/proxy.ts` (renamed from `src/middleware.ts` in Sprint 5, following Next.js 16's middleware-to-proxy convention rename -- same Edge Runtime behavior, no functional change) enforces the same production-safe default at the edge: any protected route (`/dashboard`, `/projects`, `/admin/*`, etc.) without a session cookie is redirected to `/auth` unless the auth shell is explicitly disabled (`NEXT_PUBLIC_AXXESS_AUTH_SHELL=false`, local mock auth only) or Demo Mode is explicitly enabled. This closes the 2026-07-22 QA finding where an unset auth-shell variable let the client render an authenticated workspace while the server still returned `401` for every tenant-scoped request.

## Sprint 5 Live Verification (2026-07-22)

A live, read-only browser replay against `beta.triaxisventures.com` during Sprint 5 confirmed the production deployment was, until that point, still exhibiting the exact F-001/F-003 mismatch this document describes: a cold, cookie-less browser rendered a fully authenticated "Organization Admin" dashboard while every tenant-scoped API call returned `401`, and `/auth` showed "Signed in -- Organization Admin is authenticated" instead of a login form. This was not a regression -- it was confirmation that the live deployment predated this session's Sprint 1 fix entirely (Vercel's own deployment record showed it was created 2026-07-21, before Sprint 1 began), compounded by `NEXT_PUBLIC_AXXESS_AUTH_SHELL`/`NEXT_PUBLIC_AXXESS_DEMO_MODE` never having been set on the Vercel project at all. Both variables were set explicitly and a production redeploy was executed via the Vercel CLI. See `docs/SPRINT_5_CLOSEOUT_2026_07_22.md` for the full replay evidence and deployment record.

## Sprint 13 Auth Readiness

Sprint 13 adds route surfaces for:

- `/auth/sign-up`
- `/auth/login`
- `/auth/forgot-password`
- `/auth/reset-password`
- `/auth/mfa/enroll`
- `/auth/mfa/challenge`
- `/auth/security`
- `/settings/security`
- `/settings/account/delete`
- `/settings/privacy`

Email/password sign-up and password recovery call Supabase Auth when public Supabase settings are configured. MFA, OAuth, and passkeys remain provider-gated until the Supabase project enables the required factors/providers.
