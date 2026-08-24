# Android Beta 0.9 (Version Code 3) — Founder Walkthrough Triage

**Date:** 2026-08-24. **Source:** Ritashree Mahanta (co-founder) full walkthrough of Android Beta
0.9, version code 3 — the first build carrying MN-1 through MN-5's mobile-native hardening,
confirmed live in Google Play Internal testing per the founder-shared Play Console screenshot
(2026-08-23). 30 screenshots (`attachments (3).zip`, founder-forwarded), deduped to **19 unique
screens** (11 were repeat visits to the same screen at different timestamps) and saved to
`docs/readiness/evidence/android-beta-v3-ritashree-walkthrough-2026-08-24/` (not yet git-tracked,
pending a decision on whether to commit binary evidence into this repo).

**Confirmed independently before triage**: this is genuinely version 3 — the real
`MobileTabBar`/`MobileHeader` shell is visible throughout (Today/Tasks/Approvals/Ask AI/More), no
desktop sidebar anywhere. MN-1's shell reached the device. Two of the twelve items below were also
independently confirmed against this session's own source code (not just visually), not merely
relayed.

12 issues, founder-provided, triaged into P0/P1/P2. Two items are corrected/expanded from this
session's own earlier characterization (marked "correction" below) since the founder flagged both
needed a stronger read than initially given.

## P0 — broken, needs immediate fix

### 1. No Sign Out / Log Out anywhere in the native app
**Confirmed against source, not just the screenshots.** `grep` for sign-out/logout across
`src/app/layout/` shows the only sign-out control in this entire codebase lives in
`TopBar.tsx`/`AppShell.tsx` — the desktop chrome MN-1 replaced entirely with `MobileHeader`/
`MobileTabBar`. `MobileHeader.tsx`'s avatar button only navigates to Settings
(`onAvatarPress`); Settings itself (`src/features/settings/`) has no sign-out control of its own —
it never needed one, since desktop users always had one in the surrounding chrome. **Net effect: a
user on the real Android app currently has no way to sign out at all.** This is a structural
regression MN-1 introduced (not present before MN-1, since the old desktop sidebar/TopBar — however
broken-looking on mobile — did carry a working sign-out), not a pre-existing gap. It also directly
undercuts MN-5's own logout-hygiene work (`clearAgenticDraft()`/`clearStakeholderNoteDraft()` on
logout) — that code is correct but currently unreachable on mobile, since logout itself is
unreachable.

### 2. "Create task from this answer" fires on a no-match AI response, producing a garbage task
**Correction from this session's own earlier characterization** — flagged by the founder as needing
correction, and it does: this was described as a UX papercut; it is a real functional bug.
Screenshot evidence (`1000224353.jpg` → `1000224354.jpg`): asking "Hi" returns "No authorized
institutional source matched this question... 0% confidence" (correct, honest RAG behavior for an
unanswerable query) — but tapping "Create task from this answer" on that exact response opens the
New Task form pre-filled with **"No authorized institutional source matched this..."** as the task
title. The create-actionable flow (`writeAgenticDraft`/`readAndClearAgenticDraft`,
`src/services/agentic/agenticDraftHandoff.ts`, consumed in `MobileTasksScreen.tsx`) has no guard
against firing when the answer itself was a non-answer. Needs a check before offering (or before
acting on) "Create task from this answer" when `confidence` is 0 / `humanReviewRequired` is true
with zero sources.

## P1 — real UX/product gaps, not full breakage

### 3. Ask AI has no graceful handling of a plain greeting
**Correction from this session's own earlier characterization**, per the founder's flag — this was
described as "technically honest, reads as broken to a first-time user," and stands as a real
finding: asking "Hi" gets the identical 0%-confidence rejection any unanswerable institutional
question would get. There is no small-talk/greeting path distinct from a genuine no-match. A
first-time tester's very first interaction with Ask AI is a cold rejection.

### 4. No "Create Reminder" workflow exists on mobile
**Confirmed against source**: `MobileTasksScreen.tsx` has a real Reminders tab (list, complete/
incomplete toggle) but `grep` for any reminder-creation call (`remindersRepository.create`) across
that file returns nothing. The Reminders tab is genuinely read/toggle-only — there is no "+New
Reminder" affordance anywhere, unlike Tasks' own working "+New task" flow on the adjacent tab.

### 5. Settings reads as ported-web, not mobile-native
Screenshots `1000224339`, `1000224342`–`344`: Settings uses a 4-way horizontal tab strip (Profile /
Organization / Users / Permissions) squeezed into phone width — a desktop tab-bar pattern, not a
mobile-native settings list/drill-down. This is the one MN-2 registry entry that still falls back to
the reused desktop `SettingsSection` (documented as a known, named gap in both MN-2's and MN-4's own
closeouts) — this walkthrough is the first real evidence of what that reuse actually looks like on
a phone.

### 6. Today screen duplicates the bottom nav in its own Quick Links grid
Screenshot `1000224326`: "Quick Links" (Tasks, Approvals, Ask AI, Meetings, Reminders, Projects,
Knowledge Hub, CRM Notes, Settings) repeats every destination already reachable from the bottom tab
bar and the More panel, on the one screen (Home) that should be the most distinctively "here's what
needs your attention today," not a second navigation menu.

### 7. Mobile-native reachability of web integrations is unverified
Founder's own framing: "we can't be sure every web integration would carry to mobile app by
default." Real, open question — Integrations is deliberately excluded from the mobile registry
(confirmed forbidden-surface, not an oversight), but that doesn't answer whether backend
integration-dependent behavior triggered indirectly from an in-scope mobile screen (e.g. an
AI answer citing a document that came from a connected source) degrades gracefully. Not yet
investigated this session — a real gap, not yet reproduced or root-caused.

## P2 — polish, sequencing/scope calls

### 8. Whitespace sprawl across empty states
Nearly every empty-state screenshot (`1000224327`, `328`, `331`, `333`, `334`, `335`) shows a short
message followed by a large blank canvas extending to the tab bar. Real and visible throughout, not
confined to one screen.

### 9. Settings wastes vertical space specifically
Same family as #8, called out separately by the founder for Settings in particular — the tab strip
+ card padding pattern (`1000224339`) leaves large gaps between form sections.

### 10. "Profile" tab reads as placeholder/stale
Least specific of the 12 — screenshots show Settings > Profile with real, editable fields (Display
Name, Email, Title, Avatar Initials, Department, Timezone) and a real "Linked sign-in methods" phone
-number-link card (`1000224339`, `355`), which is not obviously a placeholder. **Needs
clarification from the founder** on what specifically reads as stale — an empty `TITLE` field, the
`DISPLAY NAME` showing a username rather than a real name, or something else not distinguishable
from the screenshots alone.

### 11. Permissions tab is redundant for mobile
Screenshot `1000224344`: a static reference table (Super Admin / Org Admin / Executive / Manager /
Employee / Guest role descriptions) with no interactive controls — genuinely read-only reference
content, reasonable candidate to drop from the mobile Settings surface entirely rather than fix.
Product-scope call, not a bug.

## New feature requests, added after initial triage (cross-platform, not mobile-only)

Two further items the founder added — distinct in kind from 1–12: these are real feature gaps, not
regressions, and both are scoped **web and mobile together**, not mobile-only like the rest of this
list.

### 13. No company logo upload anywhere in Settings
**Confirmed absent**: no logo-upload capability exists anywhere in `src/features/settings/` on
either platform. Organization Profile (screenshot `1000224342`) shows organization name/mode/
project/document counts only — no branding/logo field at all.
**RBAC scope, founder-specified**: logo upload/change must be gated to **Super Admin and
Organization Admin only** — not a self-service control for every role. This maps onto the real,
already-existing role vocabulary shown in the app's own Permission Matrix (screenshot `1000224344`:
Super Admin, Organization Admin, Executive, Manager, Employee, Guest), so the gating mechanism
itself doesn't need inventing — just applying to a new logo field/control.

### 14. No user display picture, status, or availability
**Confirmed absent from the domain model itself**, not just the UI: `packages/core/src/domain/
entities.ts` has no presence/availability concept anywhere — every `status` field in the schema
belongs to a task, project, document, meeting, invitation, or CRM lead, never to a user's real-time
state. Avatar is initials-only (`AVATAR INITIALS` text field, screenshot `1000224339`) — no image
upload. The founder's own framing ("very essential in Enterprise SaaS") is a real product argument,
not a cosmetic one — this would need real schema work (a presence/availability field, an avatar
storage path on the user record), not just a UI addition.
**RBAC scope, founder-specified**: unlike the logo (item 13), the user display picture itself
should be available to **every role** — every user sets their own DP regardless of Super Admin /
Org Admin / Executive / Manager / Employee / Guest standing.
**Status/availability values, founder-specified**: three states — **Public**, **Private**,
**Inactive**. Not yet defined by the founder: the exact semantics of each (e.g. whether "Private"
hides the user from CRM/stakeholder-facing views versus just hiding a status indicator, whether
"Inactive" is user-set or system-inferred from session activity) — needs that clarification before
this can be scoped as real schema/enum work, but the three-value shape itself is now settled.

## Sequencing recommendation

**P0s (items 1–2) are safe to start immediately** — both are narrow, well-understood, low-risk
fixes (add a real sign-out control somewhere reachable in the native shell; guard the
create-actionable flow against a zero-confidence/no-source answer) that don't require a founder
product decision first.

**P1/P2 items 5, 6, 8, 9, 11 involve real layout/IA decisions** (how much of Settings gets rebuilt
mobile-native this pass vs. deferred again; whether Quick Links gets cut or Home gets redesigned
around real "what needs attention" data instead; whether Permissions gets removed outright) that
this document deliberately does not decide unilaterally — flagged for the founder's sequencing call
rather than assumed.

Item 10 needs the founder's own clarification before it can be scoped as a fix at all.

**Items 13–14 are their own, larger initiative, not part of this mobile-only pass.** Both are
cross-platform (web and mobile share the same Settings/user-profile data model, so the schema work
is one change, not two), both need real backend work (a logo storage path + RBAC-gated write, a
user avatar storage path + upload flow, and — for status/availability — a genuinely new schema
concept this codebase doesn't have at all today, unlike logo/DP which are "just" storage + a field).
Recommend scoping these as a separate sprint once 1–12 are through, rather than folding them into
whatever fixes the P0s first.

## Proposed immediate sequencing (pending founder confirmation)

1. **Now**: fix items 1–2 (P0) — sign-out control, create-actionable-from-no-match guard.
2. **Next, once 1–2 ship**: founder confirms scope for items 5, 6, 9, 11 (Settings rebuild depth,
   Quick Links vs. Home redesign, Permissions tab removal) and clarifies item 10, so those can be
   scoped as a real sprint rather than guessed at.
3. **Separately**: items 13–14 as their own initiative (logo/DP/status schema + RBAC work,
   cross-platform), scoped and sequenced independently once 1–12 are addressed.

This sequencing is a recommendation, not a decision already made — flagging it explicitly rather
than starting all twelve at once.
