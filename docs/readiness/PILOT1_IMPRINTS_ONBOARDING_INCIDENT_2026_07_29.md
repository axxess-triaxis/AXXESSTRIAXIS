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

## Status

**Blocked, unresolved.** Pilot 1 (Imprints Production) has not been provisioned. No fix has been
applied -- this is a documented, honestly-unconfirmed incident, not a closed defect. Needs either
a live reproduction (ideally with the pilot contact's device/browser details) or a direct retry to
determine whether this was a one-off environment quirk or a reproducible defect.

## Next Steps

1. Ask the pilot contact which browser/app they used, and whether a retry in a standard browser
   tab succeeds.
2. If it recurs in a standard browser (ruling out the in-app-browser hypothesis), a deeper
   client-side investigation is needed -- e.g., adding a client-side guard that re-reads
   `organizationName` from `localStorage` immediately before submit and shows a specific "your
   organization name wasn't saved -- please re-enter it" message instead of a generic server error,
   so a real state-loss event is at least diagnosable from the user's own report rather than a bare
   passthrough string.
3. Update `docs/LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md` (entry 2)
   once resolved either way.
