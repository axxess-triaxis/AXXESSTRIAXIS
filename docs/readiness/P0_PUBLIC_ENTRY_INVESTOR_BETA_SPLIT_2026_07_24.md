# P0 Correction: Public Entry Split -- Investor Demo vs Beta Workspace

Date: 2026-07-24
Product: AXXESS TRIaxis
Company: Triaxis Ventures Private Limited
Reporter: Sudipta Koushik Sarmah, Founder and Managing Director (HITL's own "Attempt 4")
Executor: Claude Code

**Superseded routing note (later the same day):** the root-cause fix below (entry-path conflation + cookie/localStorage TTL desync) is unchanged and still the correct diagnosis. However, the *implementation* of the split -- originally built as `/investor` and `/landing` pages inside the `axxesstriaxis` Next.js app -- was superseded by a safer, founder-directed architecture: three separate Vercel projects on separate subdomains (`investor.triaxisventures.com`, `landing.triaxisventures.com`), sharing the same codebase, rather than in-app routes. The in-app `/investor`/`/landing` pages described below were removed once the subdomain projects went live. See `docs/readiness/HOSTING_DEPLOYMENT_ARCHITECTURE_2026_07_24.md` for the final, authoritative architecture, rationale, and tradeoffs. The root-cause narrative and underlying bug fix in this document remain accurate and load-bearing.

## Attempt 4 Summary

The HITL reported, from a live walkthrough of `https://www.triaxisventures.com/`:

1. The public site shows "AXXESS Enterprise Intelligence Platform" with two actions: "Open Beta Workspace" and "Sign In".
2. "Open Beta Workspace" routes to `https://beta.triaxisventures.com/auth?next=%2Fdashboard`, which shows a stale state: "AXXESS / Signed in / Ananya Rao is authenticated." with a "Continue to workspace" button.
3. "Continue to workspace" is dead -- clicking it produces no visible movement.
4. "Sign In" leads to the exact same stale state, not a login form.
5. There is no clear path to Sign In / Sign Up / Create Workspace / OAuth from either public-site link.
6. Investor/demo users and beta workspace users were being mixed into the same broken auth path.

Judged P0: "Investors will not know where to land, and beta users cannot reliably enter the product." Explicit product decision requested: separate investor demo (`www.triaxisventures.com/investor`) from beta workspace entry (`www.triaxisventures.com/landing`).

## Root Cause

Confirmed by direct code read (`src/app/page.tsx`, `src/app/auth/page.tsx`, `src/auth/AuthProvider.tsx`, `src/demo/demoMode.ts`, `src/proxy.ts`) and a live, cookie-less `curl` against `https://beta.triaxisventures.com/auth` (which returned a clean login form, ruling out a global server-side misconfiguration and confirming this is client/browser session state). Two compounding issues:

**1. Entry-path conflation.** Both public-site buttons land on the same `/auth` route (`{beta}/dashboard` redirects there when unauthenticated; `{beta}/auth` goes there directly). `/auth`'s `LoginPanel` shows "Signed in / {name} is authenticated" for *any* session, including the demo/investor mock session created by clicking "Open investor preview" (`AuthProvider.login()`'s `isDemoLogin()` branch, which calls `setDemoModeEnabled(true)`). That flag persists in `localStorage` **indefinitely** -- no expiry. So any browser that has ever opened Investor Preview shows the stale demo persona as "signed in" on every subsequent `/auth` visit, via either link, regardless of intent.

**2. Cookie/localStorage TTL desync.** The edge-visible `axxess-demo-session` cookie expires after 12 hours; the `localStorage` flag `isDemoModeEnabled()` reads never expires. Once the cookie lapses while `localStorage` still says demo mode is on: the client renders "Signed in as Ananya Rao" (a pure client-side check, still true), but clicking "Continue to workspace" (`router.push("/dashboard")`) hits `src/proxy.ts`'s edge guard, which finds no valid cookie and redirects back to `/auth?next=%2Fdashboard` -- immediately re-rendering the identical "Signed in" screen. The button appears to do nothing.

This is a recurrence, in a different form, of a defect first flagged in the original Sprint 1 pre-work walkthrough (`docs/readiness/TENANT_0_ONBOARDING_ATTEMPTS_2026_07_24.md`, P0-01) and partially fixed in the Sprint 1 correction pass (the edge-cookie recognition fix). That fix solved "the edge middleware can't see a client-only demo flag at all" but not the two issues above, which is why the HITL reproduced essentially the same symptom again.

## Product Decision Implemented

Public entry is split into two dedicated, non-overlapping routes, exactly as requested:

- **Investor demo**: `https://www.triaxisventures.com/investor`
- **Beta workspace**: `https://www.triaxisventures.com/landing`

## Routes Changed

| Route | Status | Behavior |
|---|---|---|
| `/` (`www.triaxisventures.com`) | Modified | Two clearly separate CTAs: "Investor Demo" -> `/investor`, "Beta Workspace" -> `/landing`. No longer routes both through `beta.triaxisventures.com/dashboard`/`/auth`. |
| `/investor` | New | Dedicated, isolated investor-demo entry. Establishes the demo session on load (same mechanism as the former "Open investor preview" button), shows clear "AXXESS Investor Preview" labeling, an explicit "illustrative demo tenant... nothing here is a real customer's information" disclosure, and a working "Continue to demo" action into `/dashboard`. Links back to `/landing` for pilot-team visitors who land here by mistake. |
| `/landing` | New | Dedicated beta-workspace entry. Unconditionally clears any stale demo/investor session on load (`setDemoModeEnabled(false)`), so it never shows the demo persona as "signed in" regardless of prior browsing history in that browser. Only a genuine Supabase-backed session (`source: "supabase-auth"`) short-circuits to "already signed in, continue to workspace" -- a lingering mock/demo session never does. Offers Sign In (email/password + Google/Microsoft OAuth), Sign Up, and Forgot Password. Links to `/investor` for visitors looking for the demo instead. |
| `/auth` | Unchanged (still used internally, e.g. as the `next=` redirect target when a protected route is visited without a session) | No behavior change; kept as-is for backward compatibility with existing links and the proxy's redirect target. |

## Underlying Bug Fix (applies everywhere, not just the new routes)

`src/demo/demoMode.ts` gained `refreshDemoSessionCookie()`, called from `src/auth/AuthProvider.tsx`'s mount effect whenever `isDemoModeEnabled()` is true. This re-issues the edge-visible cookie with a fresh 12-hour TTL on every app load while demo mode is active, keeping it in sync with the non-expiring `localStorage` flag and eliminating the specific desync that made "Continue to workspace" appear dead.

## Files Changed

### Added

- `src/app/investor/page.tsx` -- investor demo entry route.
- `src/app/investor/page.test.tsx` -- 5 tests.
- `src/app/landing/page.tsx` -- beta workspace entry route.
- `src/app/landing/page.test.tsx` -- 5 tests.
- `src/app/page.test.tsx` -- 1 test (homepage CTA routing).
- `docs/readiness/P0_PUBLIC_ENTRY_INVESTOR_BETA_SPLIT_2026_07_24.md` -- this document.

### Modified

- `src/app/page.tsx` -- CTAs now point to `/investor` and `/landing` (relative paths on the same host); removed the now-unused `NEXT_PUBLIC_BETA_WORKSPACE_URL` indirection.
- `src/demo/demoMode.ts` -- added `refreshDemoSessionCookie()`.
- `src/demo/demoMode.test.ts` -- 1 new test.
- `src/auth/AuthProvider.tsx` -- mount effect now refreshes the demo cookie when demo mode is active.
- `src/auth/AuthProvider.test.tsx` -- 1 new test.
- `docs/TENANT_0_ONBOARDING_FINDINGS_2026_07_22.md` -- "Attempt 5 Log" cross-reference added.
- `docs/readiness/TENANT_0_ONBOARDING_ATTEMPTS_2026_07_24.md` -- follow-up section appended to the original P0-01 log.
- `docs/readiness/POST_SPRINT_41_MANUAL_ORCHESTRATION_QA_TENANT_0_2026_07_24.md` -- addendum marking T0-15/T0-16 fixed.
- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` -- P0 correction note appended.
- `docs/readiness/QA3_READINESS_KANBAN.md` -- P0 correction Kanban update appended.

## Tests Added

12 new tests across 6 files, all passing:

- `src/app/investor/page.test.tsx` (5): establishes demo session and shows a working "Continue to demo" action; navigates to `/dashboard` on click; clear investor/demo labeling and isolation disclosure; link back to `/landing`; sets the edge-visible demo cookie.
- `src/app/landing/page.test.tsx` (5): real sign-in form for a fresh browser; clears a stale demo/investor session on load instead of showing "Signed in as Ananya Rao"; no investor-preview button (link to `/investor` instead); Sign Up/OAuth options present; "already authenticated" branch only for a genuine Supabase session.
- `src/app/page.test.tsx` (1): homepage CTAs link to `/investor` and `/landing`, not a shared auth path.
- `src/demo/demoMode.test.ts` (1): `refreshDemoSessionCookie()` re-issues the cookie without touching the `localStorage` flag.
- `src/auth/AuthProvider.test.tsx` (1): mount effect refreshes the demo cookie when the (non-expiring) flag is already set, closing the exact desync window the bug depended on.

Existing `src/app/auth/page.test.tsx` (5 tests) re-run unchanged and still pass -- `/auth` itself was not modified, confirming no regression to the existing sign-in path.

## Deployment Status (Final, Post-Supersession)

Deployed and live-verified: `www.triaxisventures.com` (Website, `axxesstriaxis`) shows "Welcome Aboard" -> `https://landing.triaxisventures.com` and "Experience AXXESS" -> `https://investor.triaxisventures.com`, confirmed via direct `curl` against the live homepage. `investor.triaxisventures.com` confirmed serving the forced-demo persona with no session; `landing.triaxisventures.com` confirmed requiring real auth with no demo persona. Full detail, evidence, and the underlying three-project architecture: `docs/readiness/HOSTING_DEPLOYMENT_ARCHITECTURE_2026_07_24.md`.

## HITL Retest Instructions (Final)

1. Use a fresh or incognito browser profile (this exact class of bug depends on prior local browser state -- testing in the same browser/profile used for earlier walkthroughs risks re-observing stale state unrelated to this fix).
2. Visit `https://www.triaxisventures.com/`. Confirm two clearly separate tabs: "Experience AXXESS" and "Welcome Aboard".
3. Click "Experience AXXESS". Confirm it opens `https://investor.triaxisventures.com`, shows the demo persona immediately, with data clearly marked as illustrative/demo.
4. Return to `https://www.triaxisventures.com/` and click "Welcome Aboard". Confirm it opens `https://landing.triaxisventures.com` with a real sign-in form -- not "Signed in as Ananya Rao" -- even though you just visited the investor demo in the same browser a moment ago.
5. Sign in with a real account (or sign up). Confirm you land in the real workspace, not the demo one.
6. Note: as of this document's writing, `investor.triaxisventures.com`/`landing.triaxisventures.com` are configured on Vercel but require a DNS `A` record at the domain's registrar (Wix, confirmed via `vercel domains inspect`) pointing to `76.76.21.21` before they resolve publicly -- see the hosting architecture document for exact records needed if these URLs are not yet reachable when you test.
