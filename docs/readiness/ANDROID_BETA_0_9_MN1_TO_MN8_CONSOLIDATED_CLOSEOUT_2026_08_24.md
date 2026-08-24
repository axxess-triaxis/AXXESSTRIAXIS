# AXXESS TRIaxis Android Beta 0.9 — MN-1 Through MN-8 Consolidated Closeout

**Date:** 2026-08-24. **Scope:** the full eight-sprint Android Capacitor mobile-native arc,
covering two real device walkthroughs (Version 2 and Version 3 of the Android beta build) by the
same tester. This document supersedes the narrower `MN1_TO_MN5_MOBILE_NATIVE_SPRINT_CONSOLIDATED_
CLOSEOUT_2026_08_23.md` as the single evidence trail for the whole arc — that document is kept,
not deleted, as the detailed MN-1–5 record; this one adds MN-6 through MN-8 and the full tester
identity per the founder's explicit request to consolidate.

## Tester identity — Tester 1

**Ritashree Mahanta**, Co-Founder, Vertical Head, and COO at Triaxis Ventures Private Limited and
its product AXXESS TRIaxis. Per this repo's own `README.md`, she is also the company's first
investor and a contributor to product strategy and beta-feedback collection. Across this arc she
provided nearly 50 screenshots and oral feedback, split across two real-device walkthroughs of two
different Android build versions (see below). Her personal contact details are intentionally not
recorded in this document or anywhere else in this repository — this repo is public, and per this
program's own standing PII-masking rule, personal emails/phones do not belong in tracked docs.

**Flagged separately, not fixed in this document:** `docs/readiness/MN1_TO_MN5_MOBILE_NATIVE_SPRINT_
CONSOLIDATED_CLOSEOUT_2026_08_23.md` (already merged to `main`) contains Ritashree's personal email
address in plain text. This is a real PII exposure on a public repo, found while writing this
closeout — it needs a follow-up redaction commit, called out to the founder directly rather than
silently fixed as a drive-by edit inside this unrelated PR.

## Two walkthroughs, two build versions

- **Version 2** — the pre-MN-1 build. 17 screenshots, documented in `docs/readiness/ANDROID_BETA_
  0_9_TESTER_FEEDBACK_RITASHREE_2026_08_23.md`. Real tenant-scoped account (The North Eastern
  Policy, Development and Strategic Initiatives Collective), Super Admin role. Finding: no crashes,
  no broken pages; the one reproducible bug was the desktop sidebar never collapsing on mobile
  (~45% of screen width, overlapping titles, clipped fields). Founder-relayed broader verdict: the
  app felt **"too much webwrappy"** — a website in an app shell, not a native one. This is what
  motivated MN-1 through MN-5.
- **Version 3** — the build carrying MN-1 through MN-5's hardening. 30 screenshots, deduped to 19
  unique screens, documented in `docs/readiness/ANDROID_BETA_0_9_V3_WALKTHROUGH_TRIAGE_2026_08_24.md`.
  This full founder walkthrough found 14 distinct issues, triaged into P0/P1/P2 plus two new
  feature requests — the direct origin of MN-6 through MN-8.

Combined, both walkthroughs account for the ~50 screenshots and oral feedback referenced by the
founder for this consolidated closeout.

## What shipped, sprint by sprint

**MN-1 — Native Shell** ([PR #305](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/305)): a
real mobile-native shell (`MobileShell`, bottom tab bar, compact header) replacing the desktop
sidebar/TopBar entirely inside the Capacitor app, gated on `window.Capacitor.isNativePlatform()`.

**MN-2 — Core Mobile Workflows** ([PR #306](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/306)):
8 real native screens (Home, Tasks+Reminders, Meetings, Projects, Approvals, Knowledge Hub, Ask AI,
CRM quick notes), each reading/writing through the same tenant-scoped repositories/routes desktop
already uses.

**MN-3**: never separately executed — its planned scope was absorbed into MN-4 (confirmed via
search during the MN-1–5 closeout).

**MN-4 — App Hardening** ([PR #307](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/307)):
real Android hardware back-button handling, an offline banner, sparing haptics, a full Android
runtime + permissions audit.

**MN-5 — Security Hardening** ([PR #308](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/308)):
session replay disabled inside the native app, sensitive sessionStorage drafts cleared on logout, a
secret-exposure audit script, a tenant-override rejection test.

*(MN-1 through MN-5 released to Google Play as version code 3 on 2026-08-23 — Internal testing full
rollout, Open testing submitted for review. Full release/deploy narrative, including a real
CI-vs-Play-Console discrepancy that was surfaced and resolved rather than assumed away, is in the
MN-1–5 closeout referenced above; not repeated here.)*

**MN-6 — P0 Fixes** ([PR #312](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/312), merged):
items 1–2 from the Version 3 triage. (1) A real, reachable Sign Out control added to
`MobileMorePanel.tsx` — MN-1 had replaced `TopBar.tsx` (the only prior home of sign-out) and never
carried the control forward, leaving the native app with no way to sign out at all. (2) Guarded
"Create task from this answer" in `MobileAskAiScreen.tsx` against firing on a genuine 0%-confidence/
zero-source AI non-answer, which previously produced a garbage task pre-filled with the rejection
text as its title.

**MN-7 — Settings Rebuild + Home Cleanup** ([PR #313](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/313),
merged): items 5, 6, 9, 11. Replaced the reused desktop `SettingsSection` tab-strip fallback with a
real native Settings screen (`MobileSettingsScreen.tsx` + Profile/Organization/Team & Access
drill-down panels), dropping Permissions entirely from mobile (item 11 — it was always a static
read-only reference table). Removed Home's "Quick Links" grid, which duplicated 100% of the bottom
tab bar and More panel (item 6) — the real `summaryCards` data already covered the "what needs my
attention" need.

**MN-8 — Item 10 Review + Org Logo Upload (Item 13) + User DP & Availability (Item 14)** (branch
`feat/mn8-profile-fix-logo-dp-status`, PR opened as part of this closeout):

- **Item 10**: the founder clarified this as tapping "Profile" opening nothing at all — a
  functional bug on the pre-MN-7 desktop-tab-strip-squeezed-onto-mobile UI. MN-7 already replaced
  that entire mechanism; the current "Profile" row is a tested, working drill-down
  (`MobileSettingsScreen.test.tsx`'s "drills into a panel on tap" test exercises exactly this). No
  separate code fix was needed — evidence-based, not device-confirmed.
- **Item 13**: organization logo upload in Settings → Organization (both web and mobile), gated to
  Super Admin/Organization Admin via `canManageOrganization` (`src/security/rbac.ts`).
- **Item 14**: user display picture upload in Settings → Profile (every role, no RBAC gate) and an
  availability selector (Public/Private/Inactive). Founder-confirmed scope: availability is a
  self-reported label only (no visibility/access-control logic reads it anywhere) and user-set
  manually (no activity-based inference).

## MN-8 — full evidence chain (the newest work in this consolidation)

### What changed

Genuinely green-field backend work, confirmed via direct code investigation before building
anything: `OrganizationsRepository` had no `update()` method at all; the generic write route
403'd `"organizations"` for every role including Super Admin; no `avatar_path`/`logo_path` column
existed on `users`/`organizations`.

- **Migration** `supabase/migrations/20260824120000_profile_media_avatar_logo.sql`: adds
  `users.avatar_path`, `users.availability` (lowercase enum, distinct from the existing lifecycle
  `status` field), `profiles.avatar_path`, `organizations.logo_path`. New dedicated storage bucket
  `axxess-avatars` (public=true — the one public bucket in this schema, a deliberate flagged
  tradeoff, see Risks below), with RLS policies gating avatar writes to the caller's own userId
  subfolder (any role) and logo writes to Super Admin/Organization Admin (same-tenant only).
- **Domain/repository layer**: `Organization.logoPath`/`User.avatarPath`/`User.availability` added
  to `packages/core/src/domain/entities.ts`; `OrganizationsRepository.update()` added with a
  dedicated narrow input type (not the generic `TenantUpdateInput<Organization>`, since
  `Organization` has no `organizationId` field — its own `id` *is* the tenant id, so it can't
  satisfy that generic's bound). `emptyRepositories.ts`, `demoRepositories.ts`,
  `serviceProvider.ts`'s resilient wrapper all implement the new method.
- **A real, pre-existing latent bug found and fixed as part of this work**: the shared
  `updateResource()` helper in `supabaseEnterpriseRepositories.ts` added an `organization_id`
  filter for any non-Super-Admin caller — but `organizations` has no such column. This exact
  problem was already solved once for reads (`applyRepositoryQuery`'s `config.table !==
  "organizations"` guard) but never for writes, since no write existed until now. Resolved by
  giving `organizationsRepository.update` its own dedicated function
  (`updateOrganization`/`organizationUpdateMutation`) rather than forcing the shared generic to
  accommodate the one resource that doesn't fit its assumptions — and the calling route
  (`/api/organizations/logo`) itself verifies the caller's own org via `canManageOrganization`
  before ever calling it, since the id filter alone doesn't stop a cross-tenant write.
- **Upload mechanism**: two new routes, `POST /api/profile-media/avatar` (any role, path always
  computed server-side from the session, never client-supplied) and `POST /api/organizations/logo`
  (RBAC-gated, persists `logoPath` in the same request). Single-shot, not chunked like the
  document-upload flow — the 4MB bucket cap stays safely under Vercel's ~4.5MB body limit, so the
  chunking machinery documents need for larger files is unnecessary complexity here.
- **Profile update wiring**: `src/app/api/profile/route.ts`'s whitelist, `src/auth/provisioning.ts`'s
  `updateTenantProfile` (writes both `profiles` and `users` for avatarPath, `users` only for
  availability, with a server-side allowlist check — never trust the client value verbatim),
  `src/auth/localProfile.ts`'s demo-mode path, and all four call sites inside
  `src/auth/AuthProvider.tsx` that were individually named and fixed (missing even one would
  silently drop the new fields on next page refresh).
- **Shared UI primitive**: `src/components/forms/ImageUploadField.tsx` (one component for all four
  call sites — desktop and mobile, Profile and Organization), `Avatar.tsx` gaining optional
  `imageUrl` with an `onError` fallback to the existing initials div.
- **UI wired into all four call sites**: desktop `ProfilePanel`/`OrganizationPanel`
  (`SettingsSection.tsx`) and mobile `MobileSettingsProfilePanel.tsx`/
  `MobileSettingsOrganizationPanel.tsx`.

### A second real bug found and fixed during this pass, unrelated to the new feature itself

While testing, `SettingsSection.tsx`'s `ProfilePanel` (desktop) — and the equivalent mobile panel —
was found to have a genuine infinite-render-loop bug: its `useEffect(() => {...}, [user])`
depended on the `user` object *reference* rather than stable primitive fields. Any caller that
hands back a fresh `session.user` object on every render (the real `AuthProvider`'s memoized
context value happens to stay stable, but nothing in React guarantees every caller will, and this
codebase's own simple test mocks — `useAuth: () => ({...})` — do exactly this) causes the effect's
unconditional `setForm` call to re-fire every render, forever. `OrganizationPanel` in the same file
already avoided this correctly (`user?.organizationId`, a primitive, not `user` itself). This bug
was almost certainly always latent in this codebase, not introduced by MN-8 — but MN-8's added
fields/JSX made each loop iteration heavier, which is what turned a previously-silent inefficiency
into a reproducible test-runner crash, surfacing and forcing the fix. Both the desktop and mobile
`ProfilePanel`/`MobileSettingsProfilePanel` now depend on primitive fields, matching
`OrganizationPanel`'s existing correct pattern.

### What did not change

- No visibility/access-control logic reads `availability` anywhere — confirmed founder scope is
  label-only, and no code in this pass adds any such branch.
- No activity-based inference for "Inactive" — confirmed founder scope is user-set only.
- No client-side image resizing/cropping — deferred, not part of the founder's stated ask.
- Desktop `SettingsSection.tsx`'s Permissions tab, demo-mode branch, and every other pre-existing
  panel — untouched beyond the two panels this feature actually extends.

### What was verified

Run from `.cache/worktrees/mn8-item10-and-profile-dp` via this repo's established direct-binary
workaround:

- **Typecheck**: `node_modules/.bin/tsc --noEmit -p tsconfig.json` — 0 errors, run repeatedly
  through the build, staying clean throughout.
- **Lint**: `node_modules/.bin/eslint --max-warnings=0` on every new/changed file — 0 errors,
  0 warnings (matching the real `pnpm run lint` gate exactly, not a looser local check).
- **Tests**: **405+ tests passing** across every touched directory, run in scoped batches per
  directory rather than one repo-wide invocation, due to a real environment memory constraint on
  this session's machine (7.7GB total RAM) that was diagnosed and worked around (see below):
  - `src/features/settings` — 29 tests (5 files), including 3 new RBAC-gating tests.
  - `src/features/mobile` — 98 tests (17 files), including 5 new/extended mobile Settings tests.
  - `src/auth` + `src/demo` — 48 tests (7 files).
  - `src/repositories` + `src/security` — 162 tests (36 files), including the new
    `organizationsRepository.update` regression test and the new migration RLS test.
  - `src/components` + `src/app/api/profile` — 68 tests (13 files), including the new `Avatar.tsx`
    image/fallback test.
  - New test files this pass: `src/security/mn8ProfileMediaRls.test.ts`,
    `src/repositories/organizationsRepository.update.test.ts`, `src/components/ui/Avatar.test.tsx`;
    extended: `OrganizationPanel.test.tsx` (+3 RBAC tests),
    `MobileSettingsOrganizationPanel.test.tsx` (+2 RBAC tests),
    `MobileSettingsProfilePanel.test.tsx` (+ DP/availability assertions from the same pass).
- **Build**: `node_modules/.bin/next build` — exit code 0, full route manifest emitted, no
  error/failed lines.
- **`supabase:verify`**: `node scripts/verify-supabase-migrations.mjs` — status `passed`, 45
  migrations, 114 RLS-protected tables (the new migration adds no new table, only columns +
  storage policies, so this count is unchanged from before).
- **`apps/mobile` typecheck**: not run this pass. Direct invocation failed with pre-existing,
  unrelated module-resolution errors (`expo`/`react-native`/`@axxess/shared` not resolvable) — this
  worktree's `node_modules` junction only covers the root workspace, not `apps/mobile`'s own
  dependency tree, and MN-8 touches zero files under `apps/mobile`. Confirmed this is an
  environment-setup gap in this session's workaround, not a regression this diff introduced.

### A real environment issue diagnosed and fixed during this pass, worth recording

Every settings-test run OOM-crashed for over an hour of wall-clock time before the actual root
cause (the `ProfilePanel` effect-dependency bug above) was found. Two separate things were
happening, both now understood:

1. **The machine has only 7.7GB total RAM**, and Vitest's default V8 heap ceiling (~2GB per
   worker fork) combined with running multiple test files in parallel repeatedly exhausted
   available memory — capping the heap (`NODE_OPTIONS="--max-old-space-size=1024"`) and running
   one file at a time made this symptom go away, but it was masking the real problem, not fixing
   it: even capped, `SettingsSection.linkedPhone.test.tsx` (a file MN-8 never touched) still
   crashed reproducibly.
2. **The real cause** was the `ProfilePanel`/`MobileSettingsProfilePanel` `[user]`-dependency
   infinite-loop bug described above — this test file happened to be the first one whose mock
   shape (`useAuth: () => ({...fresh object...})`) triggered it. Once that was fixed, every test
   file — including ones run without any heap cap or single-file restriction — passed in single-
   digit seconds.

## Verification, aggregated across all eight sprints

MN-1/2/4/5: typecheck clean, lint clean (one real `react-hooks/rules-of-hooks` violation found and
fixed mid-MN-4), 660+ cumulative targeted test runs with zero regressions, production build
succeeded on every PR. MN-6/7: typecheck/lint/build clean, 11 and 96 tests passing respectively.
MN-8: typecheck/lint/build/supabase:verify clean, 405+ tests passing, plus one real latent bug
found and fixed as a direct result of this pass's own testing rigor.

**No claim is made across any of the eight sprints**: Play Store readiness beyond what's evidenced
above, iOS readiness, complete performance resolution, or a completed device walkthrough of the
post-MN-6-through-MN-8 build. Every sprint's own closeout states its verification status precisely;
this consolidation does not upgrade any of them.

## What remains open, across the whole arc

- **No walkthrough of the post-MN-6-through-MN-8 build has happened yet.** The Version 3
  walkthrough (19 screenshots) is what drove MN-6 through MN-8; a fresh walkthrough of whatever
  build eventually ships MN-6/7/8 (a future "Version 4") is the real closing evidence for this
  entire arc, more so than for any single sprint in isolation, since items 5/6/9/11/13/14 are all
  layout/IA/feature changes a screenshot-based re-test would catch issues in that code review alone
  cannot.
- **MN-8 has not been built into a new Capacitor Android bundle or uploaded to Google Play** — this
  exists in its branch/PR only until a version-code bump and CI release run happen, matching the
  same open item every prior sprint in this arc has carried.
- **Triage doc items 3, 4, 7, 8, 12 remain unaddressed** — not part of MN-6/7/8's scope, no founder
  sequencing decision made on them yet.
- **The MN-1–5 closeout's PII leak** (Ritashree's personal email, flagged above) needs a follow-up
  redaction commit — not fixed here since it's out of scope for this PR.
- **OAuth-in-Capacitor redirect behavior**: still genuinely untested (carried over from the MN-1–5
  closeout, unchanged).
- **Open testing review outcome for version code 3**: still not resolved either way as of this
  writing (carried over, unchanged).

## Decision Ledger

**Decision:** Consolidate the full MN-1 through MN-8 Android Capacitor mobile-native arc into one
closeout, spanning two real device walkthroughs (Version 2, Version 3) by the same tester,
Ritashree Mahanta, at the founder's explicit request.
**Why:** The founder wanted one document tracing both walkthroughs' ~50 screenshots and oral
feedback through to the eight sprints they drove, rather than the narrower five-sprint document
already on record.
**What changed:** Items 1–2 (MN-6), 5/6/9/11 (MN-7), and 10/13/14 (MN-8) from the Version 3 triage
are now closed with real, tested code — a native Settings screen, sign-out, an AI-answer guard, a
Home cleanup, organization logo upload, and user DP + availability. A real pre-existing infinite-
render-loop bug in `ProfilePanel` was also found and fixed as a direct result of this pass's own
test rigor, independent of the founder's original ask.
**Architecture boundary:** the MN-1 mobile/desktop isolation boundary held across every subsequent
sprint (MN-6/7/8 included) with zero violations — `mobileIsolation.test.ts` re-verified clean at
every stage, including after MN-8's new files.
**Product boundary:** no forbidden desktop/demo/admin surface reached mobile at any point across
all eight sprints; MN-8's new Organization panel explicitly never renders demo-mode data, per the
roadmap's own Mobile Surface Contract.
**Verification:** exact typecheck/lint/test/build counts stated per sprint and in aggregate above,
not "should work" — including the one item genuinely not run this pass (`apps/mobile` typecheck)
and why.
**Outcome:** MN-1–5 released to Google Play as version code 3 (documented in the earlier closeout,
unchanged here); MN-6–7 merged to `main`; MN-8 verified and ready for PR, not yet merged as of this
document's writing.
**Follow-up:** a fresh device walkthrough of the eventual "Version 4" build (once MN-6–8 reach a
Capacitor release); redact the PII leak in the MN-1–5 closeout; found sequencing decisions on
triage items 3/4/7/8/12; watch Google's Open testing review outcome for version code 3.
