# Feedback Email, Invite Email, and OAuth Sign-In -- Roadmap (2026-07-27)

Date: 2026-07-27
Branch: `canonical/sprint-1-35-unified-gitlab`
Governance source: `CLAUDE.md`'s evidence-chain discipline
Goals, as given by the founder:
1. "Send Feedback" button, when provided feedback, sends it to `triaxisgrp@gmail.com`.
2. "Invite Team", when provided an email and "Send Invite" is clicked, actually sends a mail
   invite to the entered email.
3. OAuth enabled on the "Sign In" form for Gmail and Microsoft.
4. **Added 2026-07-28**, founder's own words -- "For phone OAuth, can we add a tag in Sign
   Up/Sign In? It might be very convenient product feature" -- phone/SMS OTP sign-in (via Twilio,
   per founder decision after a cost comparison) as a fourth sign-in method.

## Evidence-First Finding (Read Before Planning Any New Build)

Before writing any new code, the existing codebase was audited for all three goals. **All three are
substantially further along than a fresh build would assume** -- this is not starting from zero:

| Goal | Backend | Frontend wiring | Blocker |
|---|---|---|---|
| 1. Feedback email | `src/services/email/feedbackEmail.ts` -- real Resend integration, hardcoded default recipient `triaxisgrp@gmail.com` (exact requested address), already called from `POST /api/beta-feedback` | **Bug found**: `BetaFeedbackModal.tsx`'s `submitFeedback()` calls `applicationServices.betaFeedbackRepository.create()` directly -- a raw Supabase write with no email step -- and never calls the `/api/beta-feedback` route that actually sends the email | (a) code bug above, (b) `RESEND_API_KEY` absent from production |
| 2. Invite email | `src/services/email/invitationEmail.ts` -- real Resend integration, already called from `POST /api/invitations` | **Same bug class**: `SettingsSection.tsx`'s `inviteUser()` calls `applicationServices.invitationsRepository.create()` directly as its primary path, only falling back to `fetch("/api/invitations")` if that direct write throws -- which it normally won't | (a) code bug above, (b) `RESEND_API_KEY` absent, (c) `NEXT_PUBLIC_APP_URL` absent (invite links would resolve to `http://localhost:3000`) |
| 3. OAuth (Google + Microsoft) | `/api/auth/oauth/start` (builds a real Supabase Auth `authorize` URL) + `/api/auth/oauth/callback` (exchanges tokens, establishes a real server session, audit-logs `auth.login`) -- both real, both tested | `OAuthProviderButtons.tsx` is already rendered on the real Sign In form (`EnterpriseAuthFlowPage.tsx:236`), already calls `/api/auth/oauth/start` and redirects to the returned URL | Gated off by `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED` / `NEXT_PUBLIC_AUTH_MICROSOFT_ENABLED` (both absent -> both disabled); Supabase Auth itself has no Google/Azure provider configured (no OAuth app exists yet in Google Cloud Console or Microsoft Entra); `NEXT_PUBLIC_APP_URL` also feeds the OAuth redirect target |

Verified via `vercel env ls production` against `triaxis-www-frontend-import`, 2026-07-27: none of
`RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED`,
`NEXT_PUBLIC_AUTH_MICROSOFT_ENABLED` exist in production today.

**Practical consequence:** this is not a 3-feature build. It is two real, narrow bug fixes (email
sending is wired but bypassed) plus a set of founder-only external actions (API keys, OAuth app
registration) that this agent cannot perform per its own operating constraints -- consistent with
every prior email/API-key/OAuth-adjacent blocker already tracked in this program
(`RESEND_API_KEY` is A-08/A-65; `SUPABASE_SERVICE_ROLE_KEY` is A-67; every third-party credential
this session -- OpenRouter, Tinybird, Mixpanel/PostHog -- has followed the same "Claude Code
does not create accounts or enter credentials" boundary).

## Sprint Plan

### Sprint 1 (this session, engineering-only, no founder action needed)

1. Fix `BetaFeedbackModal.tsx`: route `submitFeedback()` through `POST /api/beta-feedback` (the
   route that actually calls `sendFeedbackNotificationEmail`) instead of writing directly to
   `betaFeedbackRepository.create()`. Preserve the existing UX (success/error toast, message reset).
2. Fix `SettingsSection.tsx`'s `inviteUser()`: make `POST /api/invitations` (the route that
   actually calls `sendInvitationEmail`) the primary path, not a catch-block fallback. Preserve
   existing UX (toast, invite list refresh, disabled-while-saving state).
3. Add/update tests proving each UI action now hits the email-sending route, not just the
   repository, using the same mocking pattern already established in this repo
   (`vi.mock("../../providers/serviceProvider", ...)` / route-level tests with a mocked `fetch`).
4. Run full verification suite (typecheck/lint/test/build) and update
   `ACTIONABLES_READINESS_MATRIX.md` A-08/A-65 with this specific finding and fix.
5. Write this roadmap + a closeout doc once Sprint 1 lands.

### Sprint 2 (founder action required -- cannot be performed by this agent)

Per this agent's own operating constraints (no account creation, no entering credentials into any
system, no changing production security/account settings without explicit per-action confirmation):

1. **Add `RESEND_API_KEY` to Vercel production** (`triaxis-www-frontend-import`). Founder already
   has a Resend account from earlier email-delivery work this program; if not, sign up at
   resend.com, verify a sending domain (or use the `onboarding@resend.dev` test sender already
   coded as the default `from` address), generate an API key, add it in Vercel -> Project Settings
   -> Environment Variables -> `RESEND_API_KEY` -> Production.
2. **Add `NEXT_PUBLIC_APP_URL`** to Vercel production, value `https://landing.triaxisventures.com`
   -- this is a public URL, not a secret, but is still a production configuration change this
   agent will not make without your explicit go-ahead in chat. Needed so invitation links and the
   OAuth redirect target resolve to the real domain instead of `localhost:3000`.
3. **Register a Google OAuth 2.0 Client** in Google Cloud Console: create/select a project, configure
   the OAuth consent screen, create an OAuth Client ID (type: Web application), authorized redirect
   URI = `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback` (exact URL is in
   Supabase Dashboard -> Authentication -> Providers -> Google once you open it).
4. **Register a Microsoft Entra ID (Azure AD) app** for Microsoft sign-in: App registrations -> New
   registration, add a client secret, same redirect URI pattern (Supabase calls this provider
   "Azure").
5. **Enter both sets of credentials into Supabase Dashboard** -> Authentication -> Providers ->
   enable Google and Azure, paste each Client ID/Secret, save.
6. **Set `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=true` and `NEXT_PUBLIC_AUTH_MICROSOFT_ENABLED=true`** in
   Vercel production once step 5 is done.
7. Redeploy (this agent can run the deploy itself once you confirm, same as today's Golden Path
   deploy).

### Sprint 3 (live HITL verification, after Sprint 2 unblocks)

1. Submit a real "Send Feedback" and confirm an email arrives at `triaxisgrp@gmail.com`.
2. Send a real "Invite Team" invite to a real test address and confirm the email arrives with a
   working accept link (not pointing at `localhost`).
3. Click "Continue with Google" and "Continue with Microsoft" on the real Sign In form and confirm
   each completes a real sign-in.
4. Update `ACTIONABLES_READINESS_MATRIX.md` with live confirmation, matching this program's existing
   `Yes (code + test shipped, pending HITL live confirmation)` -> `Yes` (live) pattern.

### Sprint 4 (added 2026-07-28) -- Phone/SMS OTP sign-in via Twilio

Founder decision after a cost comparison (Twilio vs. MessageBird vs. Vonage vs. India-specific
aggregators): start with Twilio for the mixed India/international audience; revisit a
cost-optimized dual-provider split only once real volume justifies the extra engineering. This is
architecturally simpler than OAuth -- no browser redirect to a third party, just two direct
server-to-server Supabase Auth calls (request OTP, verify OTP), following the exact
`signInServerSide`/`establishServerSessionFromOAuthTokens` pattern `serverSession.ts` already uses.

**Engineering (this agent, no founder action needed) -- done 2026-07-28:**
- `src/auth/authApi.ts`: added `phoneAuthEnabled()`, gated on `NEXT_PUBLIC_AUTH_PHONE_ENABLED`
  (same "always visible, honest about readiness" pattern as `authProviderEnabled`).
- `src/auth/serverSession.ts`: added `verifyPhoneOtpServerSide(phone, token)`, calling Supabase's
  `POST /auth/v1/verify` with `{ type: "sms", phone, token }` and reusing `resolveUser` +
  `setServerAuthCookies` exactly like `signInServerSide`.
- `POST /api/auth/phone/start` (new): requests an OTP via `callSupabaseAuth("otp", { phone })`.
- `POST /api/auth/phone/verify` (new): verifies the code, establishes the session, audit-logs
  `auth.login` with `method: "phone_otp"`.
- `src/features/auth/PhoneOtpSignIn.tsx` (new): two-step UI (phone number -> code), wired into both
  real auth surfaces -- `src/app/auth/page.tsx` (Sign In) and `EnterpriseAuthFlowPage.tsx`'s
  sign-up branch (Sign Up), directly below the existing OAuth buttons.
- 19 new tests across 4 files (`authApi.test.ts`, `phone/start/route.test.ts`,
  `phone/verify/route.test.ts`, `PhoneOtpSignIn.test.tsx`); typecheck/lint/build clean.

**Founder action required (cannot be performed by this agent):**
1. Create a Twilio account (twilio.com) if one doesn't already exist, and a Messaging Service /
   phone number capable of sending SMS.
2. Copy the Twilio **Account SID**, **Auth Token**, and the **Twilio phone number** (or Messaging
   Service SID) you'll send from.
3. In **Supabase Dashboard -> Authentication -> Providers -> Phone**, enable Phone sign-in, choose
   **Twilio** as the SMS provider, and paste in the Account SID / Auth Token / sender number.
4. Tell this agent once step 3 is done -- it will set `NEXT_PUBLIC_AUTH_PHONE_ENABLED=true` in
   Vercel production and deploy (same pattern as the Google/Microsoft flags).
5. Live HITL retest: request a code on the real Sign In form, receive the real SMS, verify it signs
   in successfully.

## Checklist

- [x] Sprint 1.1 -- Fix `BetaFeedbackModal.tsx` to route through `/api/beta-feedback`
- [x] Sprint 1.2 -- Fix `SettingsSection.tsx` `inviteUser()` to route through `/api/invitations`
- [x] Sprint 1.3 -- Tests for both fixes (5 new: 2 in `BetaFeedbackModal.test.tsx`, 3 in
      `SettingsSection.test.ts`)
- [x] Sprint 1.4 -- Full verification suite clean (typecheck, lint zero-warnings, 153 files / 610
      tests, build)
- [x] Sprint 1.5 -- Matrix updated (A-08, A-65), closeout doc written
      (`EMAIL_DELIVERY_SPRINT1_CLOSEOUT_2026_07_27.md`); committed and pushed (`c56da8f`)
- [x] Sprint 2.1 -- `RESEND_API_KEY` added to production -- first attempt landed on the wrong
      Vercel project (`axxesstriaxis`, the marketing site, not `triaxis-www-frontend-import`);
      corrected 2026-07-28, confirmed present via `vercel env ls production`
- [x] Sprint 2.2 -- `NEXT_PUBLIC_APP_URL` added to production (`https://landing.triaxisventures.com`
      -- founder's message had a typo, `.com` was missing, corrected and confirmed before adding)
- [x] Sprint 2.7 (partial) -- Deployed twice (`dpl_FXhpJqit6eozh8nAssdpjHHZGg3s` for the key/URL
      addition, `dpl_GveAxArUWsMoSPdPTXTAvJUfQGp1` after adding diagnostic Resend-error logging)
- [ ] **Sprint 2.1b (blocking, live-diagnosed 2026-07-28)** -- despite being present, the Resend key
      itself is being rejected: production logs show
      `{ status: 401, name: 'validation_error', error: 'API key is invalid' }` from Resend for both
      feedback and invitation sends. Founder asked to regenerate the key in the Resend dashboard and
      re-add it (delete + fresh add, not edit-in-place) to rule out a paste/truncation error --
      **not yet re-confirmed**.
- [x] Sprint 2.3 -- Google OAuth Client registered in Google Cloud Console and **already configured
      in Supabase** -- confirmed 2026-07-28 by calling Supabase's own
      `/auth/v1/authorize?provider=google` directly (no dashboard login needed): returns a real
      `302` to a live Google consent screen. Only the `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED` flag (2.6)
      and a deploy remain for Google specifically.
- [ ] Sprint 2.4 -- Microsoft Entra app registered (founder) -- **not yet done**, same live check
      against `/auth/v1/authorize?provider=azure` returned
      `{"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}`
- [ ] Sprint 2.5 -- Azure provider configured in Supabase Dashboard (founder) -- not yet done
- [x] Sprint 2.6 (Google only) -- `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=true` set in production and
      deployed (`dpl_GCmqt1WbGVsKmCWWoS7uJqYESJLg`), 2026-07-28. Confirmed live via
      `GET /api/auth/oauth/start?provider=google` on the real domain, now returns a real
      `authorizeUrl`. Microsoft's flag stays unset until 2.4/2.5 are done.
- [ ] Sprint 3.1 -- Live feedback email confirmed -- blocked on 2.1b
- [ ] Sprint 3.2 -- Live invite email confirmed -- blocked on 2.1b
- [x] Sprint 3.3 -- Google sign-in OAuth-start confirmed live -- direct production check
      `GET /api/auth/oauth/start?provider=google` returns a real Supabase `authorizeUrl`.
- [ ] Sprint 3.3b -- Full Google browser click-through confirmed -- **attempted 2026-07-29, three
      sequential defects found so far, not yet closed**:
      1. Google rejected with "Access blocked: This app's request is invalid -- Error 400:
         redirect_uri_mismatch." Root cause: the `redirect_uri` sent did not match any URI
         registered as Authorized in the Google Cloud Console OAuth Client Supabase's Google
         provider uses. **Fixed** by the founder adding
         `https://vnliomnfabaicvvvfwia.supabase.co/auth/v1/callback` to that Client's Authorized
         redirect URIs -- confirmed working on retry (Google's account-chooser and consent screens
         both completed cleanly).
      2. After completing Google's consent screen, the browser landed on
         `vercel.com/login?next=%2Fsso-api%3Furl%3D...` -- Vercel's own Deployment Protection SSO
         wall -- instead of the AXXESS TRIaxis app, because Supabase's post-login redirect targeted
         the raw `.vercel.app` deployment hostname rather than the custom
         `landing.triaxisventures.com` domain. **Fixed and confirmed** by the founder reconfiguring
         both Site URL and Redirect URLs in Supabase Dashboard -> Authentication -> URL
         Configuration to the custom domain -- root cause was Supabase's URL Configuration, not
         Vercel's Deployment Protection settings. See A-72.
      3. Retrying now gets past the Vercel wall and reaches
         `https://landing.triaxisventures.com/auth/login?error=server_error&error_code=unexpected_failure&error_description=Unable+to+exchange+external+code%3A+4%2F0A...`
         -- a **Supabase-side failure**: GoTrue received Google's authorization code but its own
         server-to-server exchange of that code with Google's token endpoint failed, before any
         session token was ever generated. Classic causes: the Google Client Secret (or Client ID)
         stored in Supabase Dashboard -> Authentication -> Providers -> Google is stale, mistyped,
         or belongs to a different OAuth Client than the one fixed in step 1. See A-73 for the exact
         fix path -- needs the founder to re-copy the current Client ID/Secret from Google Cloud
         Console into Supabase's Google provider settings.
- [ ] Sprint 3.4 -- Live Microsoft sign-in confirmed -- blocked on 2.4/2.5/2.6
- [ ] Sprint 3.5 -- Matrix closed out on live evidence
- [x] Sprint 4 engineering -- phone/OTP code-complete, tested, typecheck/lint/build clean
      (2026-07-28)
- [x] Sprint 4 founder actions -- Twilio account created, configured as Supabase's Phone provider
      (confirmed 2026-07-29 via Supabase's own `/auth/v1/settings`: `"phone": true`,
      `"sms_provider": "twilio"`); `NEXT_PUBLIC_AUTH_PHONE_ENABLED` set in production
- [x] Sprint 4 live HITL retest -- **founder-confirmed 2026-07-29: "Twilio - OTP works."** Real
      end-to-end phone sign-in completed live. See A-68.
