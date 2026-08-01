# Phone/SMS OTP Sign-In -- Sprint 4 Closeout (2026-07-28)

Date: 2026-07-28
Branch: `canonical/sprint-1-35-unified-gitlab`
Governance source: `CLAUDE.md`'s evidence-chain discipline
Related: `docs/readiness/EMAIL_DELIVERY_AND_OAUTH_ROADMAP_2026_07_27.md` (Sprint 4),
`docs/readiness/ACTIONABLES_READINESS_MATRIX.md` A-68

## Summary

Founder asked, while working through the OAuth roadmap: "For phone OAuth, can we add a tag in Sign
Up/Sign In? It might be very convenient product feature." After a cost comparison across SMS
providers (Twilio, MessageBird, Vonage, India-specific aggregators) for a mixed India/international
audience, the founder chose to start with Twilio and asked this be added to the roadmap and built
code-ready in the meantime. This closeout covers that engineering pass.

## What Changed

- **`src/auth/authApi.ts`**: added `phoneAuthEnabled()`, reading `NEXT_PUBLIC_AUTH_PHONE_ENABLED`
  -- same shape as the existing `authProviderEnabled()` used for Google/Microsoft, kept separate
  since phone auth isn't an OAuth redirect flow.
- **`src/auth/serverSession.ts`**: added `verifyPhoneOtpServerSide(phone, token)`, calling
  Supabase's `POST /auth/v1/verify` with `{ type: "sms", phone, token }` and reusing the same
  `resolveUser()` + `setServerAuthCookies()` steps `signInServerSide()` already uses -- so a
  phone-verified session gets the identical httpOnly-cookie treatment as password or OAuth sign-in.
- **`src/app/api/auth/phone/start/route.ts`** (new): validates a phone number was supplied, checks
  `phoneAuthEnabled()`, then calls `callSupabaseAuth("otp", { phone })` (the same helper
  `forgot-password`/`resend-confirmation`/`sign-up` already use for no-session Supabase Auth
  actions). Logs the real Supabase failure server-side on error.
- **`src/app/api/auth/phone/verify/route.ts`** (new): validates phone + code, checks
  `phoneAuthEnabled()`, calls `verifyPhoneOtpServerSide()`, audit-logs `auth.login` with
  `method: "phone_otp"` (best-effort, mirrors `/api/auth/login`), returns `{ user }`.
- **`src/features/auth/PhoneOtpSignIn.tsx`** (new): two-step UI -- phone number entry with a "Send
  code" button, then a code entry step with "Verify" and a "Use a different number" escape hatch.
  Always visible regardless of configuration state, matching `OAuthProviderButtons.tsx`'s "visible,
  honest about readiness" pattern -- the route itself returns the clear
  "Phone sign-in is not enabled for this deployment." message when the flag is off, shown inline.
- **`src/app/auth/page.tsx`** (Sign In) and **`src/features/auth/EnterpriseAuthFlowPage.tsx`**
  (Sign Up branch): both now render `<PhoneOtpSignIn />` directly below the existing
  `<OAuthProviderButtons />`.

## What Did Not Change

- No new database tables or columns -- phone-authenticated users flow through the exact same
  `resolveUser()`/`userContextFromAuthUser()` path as any other new Supabase Auth user; a
  phone-only user with no email correctly falls back to `email: ""` and `needsOnboarding: true`,
  routing to onboarding like any first-time sign-in.
- No changes to the existing password or OAuth sign-in paths.
- Twilio is not configured anywhere -- this ships fully gated off (`NEXT_PUBLIC_AUTH_PHONE_ENABLED`
  unset in production), so it has no live effect until the founder completes the external setup.

## What Was Verified

- **19 new tests across 4 files, all passing**: `authApi.test.ts` (3, `phoneAuthEnabled` on/off
  states), `phone/start/route.test.ts` (4, source-level, matching this repo's established pattern
  for Next.js routes with `next/headers` dependencies), `phone/verify/route.test.ts` (5, same
  pattern), `PhoneOtpSignIn.test.tsx` (3 behavioral render tests: always visible, surfaces the exact
  not-enabled error without advancing steps, and a full happy-path send-code -> verify -> route
  flow with a mocked `fetch`).
- `pnpm run typecheck` -- clean.
- `pnpm run lint` (`eslint . --max-warnings=0`) -- clean, zero warnings.
- `pnpm run test` -- **157 test files passed, 625 tests passed** (up from 153 files / 610 tests
  before this change).
- `pnpm run build` -- clean, no errors.
- **Not verified**: no live retest -- impossible before Twilio exists as a configured Supabase SMS
  provider. Any attempt today would just re-confirm the intentional `NEXT_PUBLIC_AUTH_PHONE_ENABLED`
  gate, not real delivery.

## What Remains Partial or Blocked

- Founder must create a Twilio account, get a Messaging-capable number/Messaging Service, and
  configure it as the SMS provider in **Supabase Dashboard -> Authentication -> Providers ->
  Phone**.
- Once done, this agent sets `NEXT_PUBLIC_AUTH_PHONE_ENABLED=true` in Vercel production and deploys.
- Live HITL retest (real code sent, real verify, real session) follows that.

## Exact File / Commit / PR / Deployment State

Files changed (7 source, 4 test):
- `src/auth/authApi.ts`
- `src/auth/authApi.test.ts` (new)
- `src/auth/serverSession.ts`
- `src/app/api/auth/phone/start/route.ts` (new)
- `src/app/api/auth/phone/start/route.test.ts` (new)
- `src/app/api/auth/phone/verify/route.ts` (new)
- `src/app/api/auth/phone/verify/route.test.ts` (new)
- `src/features/auth/PhoneOtpSignIn.tsx` (new)
- `src/features/auth/PhoneOtpSignIn.test.tsx` (new)
- `src/app/auth/page.tsx`
- `src/features/auth/EnterpriseAuthFlowPage.tsx`

Docs updated same pass: `EMAIL_DELIVERY_AND_OAUTH_ROADMAP_2026_07_27.md` (Sprint 4 added, checklist
updated with the actual state of Sprints 2/3 as of 2026-07-28 -- including the still-open
`RESEND_API_KEY` 401 and the Google-configured-but-Microsoft-not finding),
`ACTIONABLES_READINESS_MATRIX.md` (new A-68; A-26 updated with the direct Supabase authorize-
endpoint check results). Tally now 68 actionables, 36 Yes / 21 Blocked / 11 No.

Branch: `canonical/sprint-1-35-unified-gitlab`. Commit and push (to `origin` and `gitlab`) follow in
this session. No production deployment for this specific change -- it has zero live effect until
`NEXT_PUBLIC_AUTH_PHONE_ENABLED` is set, so deploying now would not be observable; better bundled
with the Google/Microsoft flag flip once those are also ready, per `CLAUDE.md`'s deployment
discipline (explicit confirmation required for every deploy regardless).
