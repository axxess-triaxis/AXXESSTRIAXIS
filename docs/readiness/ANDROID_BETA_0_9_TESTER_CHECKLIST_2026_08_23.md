# Android Beta 0.9 — Tester Checklist

**Date:** 2026-08-23. **Sprint:** MN-4. For whoever installs the Android Beta 0.9 Capacitor build
(founder, or a pilot tester) to walk through on a real device or emulator. Each item is a real,
checkable action against the app as shipped — not a description of intended future behavior.

## Walkthrough

1. **Install / open** — install the build, open the app cold. Confirm the app name and icon shown
   on the device home screen/app drawer are correct ("AXXESS TRIaxis").
2. **Sign in** — sign in with a real tenant account.
3. **Create/view a task** — Tasks tab → New task → fill title → Save → confirm it appears in the
   list and can be marked complete (feel for the haptic tap on completion).
4. **Create/view a meeting** — Meetings (under More) → New meeting draft → confirm it appears under
   Upcoming, tap into it, add a decision or action item, confirm it's saved (reopen the meeting to
   check it persisted).
5. **Ask AI** — Ask AI tab → ask a real question about your organization's own data → confirm an
   answer renders with a confidence percentage and, if any documents matched, source citations.
6. **Upload/open a document** — Knowledge Hub (under More) → tap a document → Open document →
   confirm it opens (there is no upload flow in Beta 0.9 yet — this step is open/view only).
7. **Approve/reject an item** (if any pending approvals exist for your tenant) — Approvals tab →
   tap a pending item → try Reject with no reason typed (should show an inline error) → type a
   reason → Approve or Reject → confirm it moves out of the Pending list.
8. **Check tenant correctness** — confirm every task/meeting/project/document/approval you see
   belongs to your own organization, and that no investor-demo-looking data appears.
9. **Logout** — Settings (avatar in the header) → sign out.
10. **Reopen the app** — confirm you land back at sign-in, not still-logged-in content.
11. **Tablet check** — if you have a tablet or can resize an emulator to ≥768px wide, open Tasks,
    Approvals, Knowledge Hub, or CRM Notes and confirm you see a genuine two-pane list+detail layout,
    not a stretched phone screen.
12. **Slow network check** — turn on airplane mode or throttle the connection, then reopen/navigate
    the app. Confirm the orange "You're offline" banner appears under the header, and that nothing
    crashes or shows a blank screen.
13. **Android back button** — from any list, tap into a detail view, then press the device back
    button — confirm it returns to the list (not to the previous tab, not out of the app). From a
    New Task/Meeting/Project form, press back — confirm it closes the form first. From the Home
    tab, press back — confirm the app minimizes (goes to the background), it does **not** log you
    out and does **not** crash.
14. **Crash/error note capture** — if anything crashes, freezes, shows a blank screen, or shows
    stale/wrong data, log it using the issue template below before continuing.

## Issue logging template

For each issue found, capture:

```
Screen/action: (e.g. "Tasks tab → tap into a task detail")
What happened: (what you saw)
What you expected: (what should have happened)
Device/OS: (e.g. "Pixel 7, Android 14" or "emulator, API 34")
Network: (normal / slow / offline)
Reproducible: (yes, every time / sometimes / once)
Screenshot or screen recording: (attach if possible)
```

## What this checklist does not cover

This checklist is the mobile/tablet UX hardening pass (MN-4). It does not cover security/tenant-
isolation/session-hardening testing — that is MN-5's own scope and will get its own checklist
(`docs/readiness/ANDROID_BETA_0_9_SECURITY_TEST_CHECKLIST_2026_08_23.md`, once that sprint runs).
