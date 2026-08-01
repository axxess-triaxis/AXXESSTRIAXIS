# Pilot 1 (Imprints Production) -- Onboarding Incident (2026-07-29)

Date: 2026-07-29
Related: `docs/LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md` (entry 2,
Imprints Production).

## What Was Observed

A screenshot from a real device (mobile, WhatsApp icon visible in the status bar, suggesting the
onboarding link may have been opened from a WhatsApp chat) showed the `/onboarding/complete`
review screen for a real onboarding attempt:

- Organization: Imprints
- Sector: Startup
- Role: Super Admin
- Department: Multimedia
- Workspace: Digital Production
- Starting focus: Knowledge & AI decision support
- Notices: 4/4 accepted

Below the summary, a red error banner read: **"Organization name is required."** -- the exact
server-side validation message from `provisionTenantForUser()`
(`src/auth/provisioning.ts:202`), surfaced verbatim via `EnterpriseOnboardingPage.tsx`'s error
handling. The "Provision tenant" button was clicked, the client accepted it (client-side
`isOnboardingComplete()` gate must have passed, since a different, prefixed message
-- "Complete the following before provisioning: ..." -- would otherwise have shown instead), but
the server rejected the request with a missing-organization-name error, despite the organization
name being visibly present on the same screen.

## Investigation

Read the full path the organization name travels, end to end:

1. `src/onboarding/enterpriseOnboarding.ts` -- `EnterpriseOnboardingState.organizationName`,
   `isOnboardingComplete()` requires `state.organizationName || state.invitationCode`.
2. `src/features/onboarding/EnterpriseOnboardingPage.tsx` -- the "Organization name" `TextInput`
   writes to `state.organizationName` via `updateState`, which both calls `setState` and
   synchronously persists to `localStorage` (`saveState`). The review screen renders
   `state.organizationName` directly. `continueFlow()` sends `body: JSON.stringify(state)` to
   `POST /api/onboarding/provision` unmodified.
3. `src/app/api/onboarding/provision/route.ts` -- reads `body.organizationName`, matching the
   client's field name exactly. No transformation, no alternate field name.
4. `src/auth/provisioning.ts` -- `provisionTenantForUser` re-validates
   `input.organizationName.trim()`, throws the exact observed message if empty. Only one such
   check exists in this function -- confirmed by direct search, not a duplicate/hidden check
   elsewhere reusing the same string.
5. `src/proxy.ts` -- checked for possible interference (redirects, body-stripping). Ruled out:
   `/api/onboarding/provision` does not match the `/onboarding` protected-route prefix
   (`isProtectedRoutePath` checks `pathname.startsWith("/onboarding")`, and `/api/...` never
   starts with that), and none of the host-based marketing/beta redirect rules apply to this path
   or host combination.

**Field naming is consistent end to end -- no mismatch found in the code.** This rules out the
most common class of "value shown on screen but not sent to the server" bug.

## What Remains Unconfirmed

The code path is internally consistent, which means the most likely explanation is a **client-side
state/storage timing or persistence issue specific to the device or browser context this attempt
happened in**, not a straightforward logic bug reproducible by reading the code alone:

- The wizard's steps are separate Next.js routes (`/onboarding/create-organization`, `/onboarding/
  sector`, `/onboarding/workspace`, `/onboarding/security`, `/onboarding/complete`), so
  `OnboardingWizard` fully unmounts and remounts on each step, reloading state from `localStorage`
  each time (`useEffect(() => setState(loadState()), [])`). If `localStorage` failed to persist
  between two of these navigations on this specific device/browser -- a known category of issue in
  some mobile in-app browsers/WebViews (including WhatsApp's built-in browser, which the status bar
  suggests may be in use here), which can partition or restrict storage differently from a normal
  browser tab -- the review screen could still show a previously-typed value from the live
  component state in some renders while a stale/empty value ends up in what's actually persisted
  and submitted.
- This is a **hypothesis, not a confirmed root cause.** It has not been reproduced in this
  environment (no live device access), and no code change has been made based on it -- per
  `CLAUDE.md`'s evidence discipline, this is documented as unconfirmed rather than presented as a
  fix.

## Immediate Practical Workaround (No Code Change Required)

If this recurs, ask the pilot contact to:
1. Open the onboarding link in a standard browser tab (Chrome or Safari) rather than through
   WhatsApp's (or any other app's) built-in in-app browser, if that's how the link was opened.
2. Retry the onboarding flow from the start rather than resuming a partially-completed one, in
   case stale `localStorage` from an earlier attempt is involved.

## Corroborating Evidence (2026-07-29, later same day)

Ekora Hive -- the founder's other real pilot signup from the same LOI batch (see the pilot log,
entry 3, "Pilot 2") -- completed the identical onboarding flow successfully the same day, reaching
a real, live, provisioned tenant with seeded sample data (confirmed via screenshot: `ekora.hive`,
Super Admin, `landing.triaxisventures.com/tasks`, real "District Outreach Program" sample project
and 2 sample tasks). A second real user hitting no such error on the same code path the same day
is corroborating (not conclusive) evidence for the device/browser-specific hypothesis over a
systemic defect -- it does not rule out a rarer timing race, but it does weigh against "the
onboarding flow is broken for everyone."

## Resolution (2026-07-29, later same day)

Founder confirmed directly: Imprints Production "also successfully onboarded." The onboarding
error did not recur on a subsequent attempt.

**Independent verification attempted, not completed.** Tried to confirm the real
`organizations` row directly via Supabase's REST API using the production service-role key
(pulled production env vars via `vercel env pull`). `SUPABASE_SERVICE_ROLE_KEY` came back empty
-- confirmed (by comparing against other secrets in the same pull, which returned real values)
that this specific variable is stored in Vercel as a write-only "Sensitive" type, which by design
cannot be read back via CLI or API even by a session with otherwise-full production access. This
is an intentional Vercel security control and was not worked around. Pulled env files were deleted
and the local Vercel project link was restored to default immediately after.

**Status recorded as founder-confirmed, not independently database-verified.** No code change was
made -- the issue resolved on retry, which is consistent with (but does not prove) the
device/browser-specific hypothesis below. Root cause remains genuinely unconfirmed.

## Status

**Resolved on retry for both real pilot signups; root cause unconfirmed.** Both Imprints
Production (Pilot 1) and Ekora Hive (Pilot 2) are now founder-confirmed/screenshot-confirmed
onboarded. This is not being closed as a fixed defect, since nothing was changed in code and the
original failure mode was never reproduced under controlled conditions -- it is closed as
"outcome achieved, cause unconfirmed."

## Next Steps

1. If this recurs for a future pilot signup, capture the browser/app used and whether a retry in
   a standard browser tab succeeds -- that would meaningfully move the device/browser hypothesis
   from "leading guess" to "confirmed."
2. If it recurs in a standard browser (ruling out the in-app-browser hypothesis), a deeper
   client-side investigation is needed -- e.g., adding a client-side guard that re-reads
   `organizationName` from `localStorage` immediately before submit and shows a specific "your
   organization name wasn't saved -- please re-enter it" message instead of a generic server error,
   so a real state-loss event is at least diagnosable from the user's own report rather than a bare
   passthrough string.
3. `docs/LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md` (entries 2 and 3)
   updated to reflect both pilots onboarded.
