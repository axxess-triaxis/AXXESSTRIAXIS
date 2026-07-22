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

**What still needs to happen before Google/Microsoft sign-in actually works, and who needs to do it (not something this codebase or an agent can complete):**

- Register a real OAuth application in Google Cloud Console (for Google) and in Azure Portal / Entra ID (for Microsoft), under Triaxis Ventures' own accounts, with the correct authorized redirect URI (Supabase's own callback URL, found in the Supabase dashboard's Auth > Providers page for each provider).
- Enter the resulting Client ID and Client Secret into the Supabase project's dashboard under **Authentication > Providers > Google** / **Microsoft**, and enable each provider there.
- Set `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=true` / `NEXT_PUBLIC_AUTH_MICROSOFT_ENABLED=true` on the Vercel project (see `.env.example`) and redeploy.

Until all three of the above are done, the buttons are visible (by design, so a real tenant sees the intended options rather than a hidden feature) but will show the safe "not enabled for this deployment" message when clicked -- this is expected, not a bug, and is not something further code changes can resolve.

## Investor Preview

```text
Email: investor.preview@axxess.demo
Password: preview
```

Logging in with this account enables Demo Mode and loads the North East Health Mission tenant.

## User Profile

Profile updates are stored locally by organization and user. This keeps Sprint 11 profile editing usable without requiring a new Supabase user-profile migration. Production user records still flow through the repository layer and can be promoted to persisted profile tables in Sprint 12.

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
