# MN-7 — Mobile-Native Settings Rebuild + Home Quick Links Removal Closeout

**Date:** 2026-08-24. **Branch:** `feat/mn7-settings-rebuild-and-home-cleanup`, stacked on
`feat/mn6-p0-signout-and-ai-guard` (PR #312, not yet merged at the time this branch was created).
**Worktree:** `.cache/worktrees/mn7-settings-rebuild`.

## Origin

Founder instruction "Proceed with 5, 6, 9, 11" against
`docs/readiness/ANDROID_BETA_0_9_V3_WALKTHROUGH_TRIAGE_2026_08_24.md`, the same triage doc MN-6
closed items 1–2 from. Because items 5/6/9/11 involve real layout/IA decisions the triage doc
explicitly flagged as needing founder confirmation (not a narrow bug fix like the P0s), this pass
went through Plan Mode with a concrete implementation plan before any code was written — the plan
is preserved at `C:\Users\Sudipta Sarmah\.claude\plans\squishy-sprouting-plum.md` at time of writing.

## What changed

### Item 6 — Home's "Quick Links" grid removed

[`src/features/mobile/MobileCommandHome.tsx`](../../src/features/mobile/MobileCommandHome.tsx):
the `quickLinks` grid (literally every `mobileFeatureRegistry` entry minus "home" — 9 buttons,
100% overlap with the bottom tab bar + More panel) is removed entirely. The real `summaryCards`
grid (due-today task count, pending-approvals count, next meeting, recently-updated document —
already fetched from live repositories/`/api/approvals`) and the "Ask AXXESS a question" CTA are
unchanged. No new data plumbing was needed: `summaryCards` was already the "what needs my
attention today" content the triage doc asked for; the fix was removing the redundant grid, not
inventing anything.

### Items 5 & 9 — Real native Settings screen replaces the reused desktop fallback

New native screen, following the same list/drill-down/tablet-split pattern as every other MN-2
screen (`MobileTasksScreen.tsx`):

- [`src/features/mobile/screens/MobileSettingsScreen.tsx`](../../src/features/mobile/screens/MobileSettingsScreen.tsx) —
  container. Top-level list (Profile / Organization / Team & Access), phone drill-down with a
  "← Back to Settings" link, tablet side-by-side split, one `useRegisterMobileBackHandler` for the
  Android hardware back button.
- [`src/features/mobile/screens/MobileSettingsProfilePanel.tsx`](../../src/features/mobile/screens/MobileSettingsProfilePanel.tsx) —
  ports desktop `SettingsSection.tsx`'s `ProfilePanel` (same `updateProfile(form)` call/field
  shape), `LinkedPhoneSection` (same `/api/auth/phone/link/{start,verify}` routes, restyled for
  spacing/tap-targets only — not redesigned), and `AgenticGateTogglePanel` (same
  `isAgenticGateEnabled`/`setAgenticGateEnabled` localStorage preference) — all three combined into
  one drill-down panel, matching how desktop renders them together under its own `profile` tab.
- [`src/features/mobile/screens/MobileSettingsOrganizationPanel.tsx`](../../src/features/mobile/screens/MobileSettingsOrganizationPanel.tsx) —
  ports desktop's `OrganizationPanel` read-only query (`organizationsRepository.getById`,
  `projectsRepository.list`, `documentsRepository.list`), restyled as stat tiles matching
  `MobileCommandHome`'s own tile styling. **Deliberately does not port desktop's demo-mode branch**
  (see "Decision 1" below).
- [`src/features/mobile/screens/MobileSettingsTeamPanel.tsx`](../../src/features/mobile/screens/MobileSettingsTeamPanel.tsx) —
  ports desktop's `UserAdministration` (list users/pending invitations, invite via
  `POST /api/invitations`, revoke via `invitationsRepository.update` with its existing
  `/api/repositories/invitations` PATCH fallback, role-change and suspend/enable via
  `usersRepository.update`, the same `role_changed`/`user_invited` analytics events), restructured
  as a list→detail drill-down with a collapsible invite form, instead of desktop's persistent
  two-column layout. RBAC gating: see "Decision 2" below.

[`src/features/mobile/MobileShell.tsx`](../../src/features/mobile/MobileShell.tsx) — registers
`MobileSettingsScreen` in the `nativeScreens` map for `"settings"`, replacing the `children`
fallback. Updated the two comment blocks that described Settings as "the sole remaining exception"
(now stale) to reflect MN-7. No item 11 (Permissions) registry change was needed — confirmed there
never was a `"permissions"` entry in `mobileFeatureRegistry.ts`; it was always a desktop-only
`SettingsSection` sub-tab, so "dropping" it from mobile is purely the new screen never including a
Permissions row, not a registry removal.

## Two decisions made explicit during planning (not left implicit in the code)

1. **No demo-mode branch on the native Organization panel.** The roadmap's own Mobile Surface
   Contract (`docs/readiness/MOBILE_NATIVE_CAPACITOR_RESEARCH_AND_ROADMAP_2026_08_23.md` line 183:
   "Tests prove Demo data is not exposed") settles this — `MobileSettingsOrganizationPanel` always
   renders the live-organization query path and never imports `demo/demoDataset` (which is on
   `mobileIsolation.test.ts`'s forbidden-import list). A real test
   (`MobileSettingsOrganizationPanel.test.tsx`) asserts "Investor Preview" never renders and the
   seeded demo institution name never leaks in.
2. **RBAC duplication (`canManageUsers`).** Desktop already inline-duplicates
   `Boolean(user && ["Super Admin", "Organization Admin"].includes(user.role))` twice in
   `SettingsSection.tsx` with no shared helper. `MobileSettingsTeamPanel.tsx` duplicates it a third
   time (a literal copy of an already-shipped check, zero behavioral-drift risk) rather than
   extracting a shared `rbac.ts` helper that would also touch desktop — kept this sprint
   mobile-file-only. Extracting a shared helper is flagged as a reasonable follow-up, not done here.

## What did not change

- No backend/repository/API logic anywhere — every new panel calls the exact same
  repository methods and routes desktop `SettingsSection.tsx` already uses. This is a
  presentation-layer rebuild only.
- Desktop `SettingsSection.tsx` itself is untouched — desktop keeps its Permissions tab, its
  4-way tab strip, and its demo-mode branch exactly as before.
- `mobileFeatureRegistry.ts` — no change (confirmed no `"permissions"` entry ever existed).
- `src/app/App.tsx` — no change (its `children` pass-through was already unconditional).
- Triage doc items 3, 4, 7, 8, 10, 12, 13, 14 — not part of this pass.

## What was verified

Run from `.cache/worktrees/mn7-settings-rebuild` via this repo's established direct-binary
workaround (`node_modules/.bin/...`, since `pnpm run` aborts non-interactively in every worktree),
checked incrementally after each file per the plan's implementation order, then again in full:

- **Typecheck:** `node_modules/.bin/tsc --noEmit -p tsconfig.json` — 0 errors (run after every
  file addition, stayed clean throughout).
- **Lint:** `node_modules/.bin/eslint` on all 12 new/changed source and test files — 0 errors,
  0 warnings.
- **Tests:** `node_modules/.bin/vitest run --pool=forks src/features/mobile` (default
  `--pool=threads` hits the same known pre-existing worker-startup timeout documented in MN-6's
  closeout) — **17 test files passed, 96 tests passed, 0 failed.** This includes
  `mobileIsolation.test.ts` (confirms no forbidden import, e.g. `demo/demoDataset`, exists anywhere
  under `src/features/mobile/` after the new files were added) and every pre-existing mobile test
  file, alongside the 6 new/extended files this pass added:
  - `MobileSettingsScreen.test.tsx` (4 tests) — all three rows render with **no** Permissions text
    anywhere (item 11 regression), drill-down/back-link navigation, tablet side-by-side split.
  - `MobileSettingsOrganizationPanel.test.tsx` (3 tests) — honest loading/zero state, real
    live-tenant data renders, and demo mode/seeded dataset never appears (decision 1 regression).
  - `MobileSettingsProfilePanel.test.tsx` (5 tests) — form pre-fill, `updateProfile` call shape,
    real phone-link start/verify routes, phone-link hidden for `mock-rbac` sessions, Agentic Gate
    toggle flips the real `localStorage` preference.
  - `MobileSettingsTeamPanel.test.tsx` (7 tests) — real user/invitation listing, admin invite/
    role-change/suspend all call the right repository methods with the right payloads, non-admin
    write controls render disabled with the informational toast (decision 2 regression), revoke
    plus its PATCH fallback on repository rejection.
  - `MobileCommandHome.test.tsx` (+1 test) — "Quick links" text is now absent (item 6 regression).
  - `MobileShell.test.tsx` (rewrote 1 test) — Settings now renders the native screen, not the
    reused desktop `children` (the exact opposite of what this test asserted before MN-7).
  - Two bugs caught and fixed during this pass: `MobileSettingsTeamPanel.test.tsx`'s analytics mock
    initially omitted the top-level `trackEvent` export `EmptyState.tsx` imports directly (crashed
    on mount since the "Select a user" empty state renders immediately); and the suspend-confirmation
    test's `getByRole("button", { name: "Disable" })` matched two elements (the detail-panel button
    and the confirm dialog's own button) until scoped with `within(getByRole("dialog"))`.
- **Build:** `node_modules/.bin/next build` — exit code 0, full route manifest emitted, no
  error/failed lines in the log.
- **Not run this pass** (no schema change, no routing/auth/onboarding behavior change):
  `pnpm --dir apps/mobile run typecheck` (no `apps/mobile` changes), `pnpm run supabase:verify`,
  Playwright — matching the precedent set by every prior MN sprint.

## What remains partial or blocked

- **Not built into a new Capacitor Android bundle or uploaded to Google Play.** This exists in this
  branch/PR only until a version-code bump and CI release run happen — same caveat as MN-6.
- **No live-device confirmation.** All verification this pass is Vitest (jsdom) + Next.js build —
  not a real Android walkthrough. Given items 5/6/9/11 came directly from a real device walkthrough
  finding real layout problems screenshots alone wouldn't have caught, a follow-up device re-test
  (ideally by Ritashree, mirroring how the original findings were found) is the real closing
  evidence for this pass, more so than for MN-6's narrower fixes.
- Triage doc item 10 ("Profile" reads stale) still needs founder clarification before it can be
  scoped — unchanged from the triage doc, not addressed this pass.
- Items 13–14 (company logo upload, user DP/status/availability) remain their own separate,
  larger, cross-platform initiative, not started.

## What claim is still unsupported

- No claim is made that this native Settings screen looks better or is easier to use than the
  desktop-fallback version it replaced beyond the structural facts stated above (list/drill-down
  instead of a horizontal tab strip, native tap-target sizing instead of desktop card padding) —
  that is a genuine UX judgment only a real device screen can confirm, and hasn't been.

## Exact files changed

```
src/features/mobile/MobileCommandHome.tsx
src/features/mobile/MobileCommandHome.test.tsx
src/features/mobile/MobileShell.tsx
src/features/mobile/MobileShell.test.tsx
src/features/mobile/screens/MobileSettingsScreen.tsx (new)
src/features/mobile/screens/MobileSettingsScreen.test.tsx (new)
src/features/mobile/screens/MobileSettingsOrganizationPanel.tsx (new)
src/features/mobile/screens/MobileSettingsOrganizationPanel.test.tsx (new)
src/features/mobile/screens/MobileSettingsProfilePanel.tsx (new)
src/features/mobile/screens/MobileSettingsProfilePanel.test.tsx (new)
src/features/mobile/screens/MobileSettingsTeamPanel.tsx (new)
src/features/mobile/screens/MobileSettingsTeamPanel.test.tsx (new)
docs/readiness/MN7_ANDROID_BETA_0_9_SETTINGS_REBUILD_AND_HOME_CLEANUP_CLOSEOUT_2026_08_24.md (this file)
```

## Exact commands run

```
node_modules/.bin/tsc --noEmit -p tsconfig.json
node_modules/.bin/eslint <all 12 changed/new files>
node_modules/.bin/vitest run --pool=forks src/features/mobile
node_modules/.bin/next build
```

## PR / branch / remote state

Branch `feat/mn7-settings-rebuild-and-home-cleanup`, based on
`origin/feat/mn6-p0-signout-and-ai-guard` at `11f7ddf`. Not yet pushed or opened as a PR as of
writing this closeout — see the commit that follows this doc. Because this branch is stacked on
MN-6 (PR #312), the PR for this branch should target `feat/mn6-p0-signout-and-ai-guard`, not
`main`, until MN-6 merges.
