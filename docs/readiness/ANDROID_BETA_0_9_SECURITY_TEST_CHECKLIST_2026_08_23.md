# Android Beta 0.9 — Security Test Checklist

**Date:** 2026-08-23. **Sprint:** MN-5. For the founder/operator to walk through on a real Android
device or emulator. Distinct from MN-4's own UX tester checklist
(`docs/readiness/ANDROID_BETA_0_9_TESTER_CHECKLIST_2026_08_23.md`) — this one is security-focused
only.

## Walkthrough

1. **Fresh install/open** — install the build cold, open it.
2. **Sign in to a real tenant** — use a real Supabase-authenticated account, not a demo login.
3. **Confirm no demo data** — every task/meeting/document/approval/stakeholder you see should
   belong to your real organization; nothing should look like the investor-demo dataset.
4. **Confirm correct tenant only** — if your account belongs to exactly one organization, confirm
   you never see another organization's data anywhere in the app.
5. **Logout** — Settings (avatar) → sign out.
6. **Reopen the app** — confirm you land at sign-in, not still-logged-in content.
7. **Confirm logged-out state persists** — force-close the app from the Android recent-apps
   switcher and reopen it; confirm you are still signed out (not silently re-authenticated).
8. **Background and resume** — put the app in the background for a few minutes, then bring it back
   to the foreground; confirm your session and tenant are still correct (no swap, no crash).
9. **Test session expiry if possible** — if you can wait out or otherwise trigger the 24-hour
   absolute session cap on a test account, confirm the app cleanly returns you to sign-in rather
   than showing stale or broken content.
10. **Try navigating directly to a forbidden/admin screen** — if you know or can guess a direct URL
    for an admin/dashboard/analytics route, try opening it inside the app; confirm it does not
    render (should fall back to the mobile Home panel, per MN-1's own safety boundary).
11. **Try accessing another tenant's document**, only if you have safe, deliberately-provisioned
    test data for two different organizations — confirm you cannot open or see it.
12. **Test the Android back button on the auth screen and on a protected screen** — confirm it
    never silently logs you out or leaves a blank screen (this was MN-4's own back-button work;
    re-confirm here specifically for the sign-in screen, which MN-4's testing did not specifically
    cover).
13. **Check the analytics/PostHog dashboard** (if you have access) for any accidental document text,
    stakeholder PII, or auth token appearing in captured events or session recordings. Per this
    sprint's fix, session replay should show **zero recordings** for sessions that ran inside the
    real Android app (recording is now disabled there entirely) — spot-check that no new mobile
    session recordings appear after this build is installed.
14. **Confirm no raw key/token is visible** anywhere in the UI, in any error message, or (if you can
    inspect it) in network request/response bodies.
15. **Log any issue found** using the same issue template as the MN-4 tester checklist, noting it is
    a *security* finding explicitly in the "Screen/action" field.
16. **Founder signs off or keeps this security sprint open** — do not treat code-complete as
    equivalent to sign-off; this checklist's own completion is the sign-off gate.

## What this checklist cannot cover from this environment

- OAuth redirect round-trip behavior inside the real Capacitor WebView (item 3 of the baseline doc)
  — genuinely untested, named as unknown/needs-HITL there.
- Live re-verification of the 6/6 tenant-isolation harness result against production Supabase — the
  2026-08-12 harness doc is current but was not re-run this sprint (requires live production
  credentials this environment does not have).
- Any claim of penetration-test completion, security certification, or SOC2 readiness — this
  checklist is an operational smoke test, not a substitute for either.
