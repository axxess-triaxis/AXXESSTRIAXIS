# Settings & Admin -- Sprint SA-1 Closeout (2026-07-28)

Date: 2026-07-28
Branch: `canonical/sprint-1-35-unified-gitlab`
Governance source: `CLAUDE.md`'s evidence-chain discipline; sprint executed per Codex's formal
"Sprint SA-1: Profile, Organization and Obvious Settings Dead Ends" prompt.
Related: `TENANT_PARTITIONING_TP1_CLOSEOUT_2026_07_28.md`, `TENANT_PARTITIONING_TP3_CLOSEOUT_2026_07_28.md`,
`ACTIONABLES_READINESS_MATRIX.md` (A-08, A-28, A-29), `QA3_READINESS_KANBAN.md` (Sprint SA-1 section).

## Objective

Close the most obvious, founder-reported dead ends in Settings and top-bar navigation without
overstating what was actually built -- per this sprint's own explicit fix definition for items
with no real destination screen (disable with honest copy, do not fabricate a destination).

## 1. Avatar / Profile Fix

**Problem:** the top-right avatar in `src/app/layout/TopBar.tsx` was a purely decorative `<Avatar>`
with no click handler, no `<a>`/`<button>` wrapper -- nothing. The single most standard "open my
profile" affordance in enterprise SaaS did nothing.

**Fix:** wrapped it in a `next/link` `Link` to `/settings?tab=profile` (the existing, already-real
Profile tab), matching this file's own typed-route `Link` usage pattern elsewhere in the app.
`aria-label="Open profile"` for accessibility; Sign Out button left untouched, sitting adjacent.

**Tests:** `src/app/layout/TopBar.test.tsx` (new, 3 tests) -- confirms it renders as a real,
accessible `<a href="/settings?tab=profile">` (not a decorative `<div>`), still shows the user's
avatar initials, and that Sign Out remains present and unaffected.

## 2. Organization Tab Regression Check

Not modified this sprint. Re-ran the existing `src/features/settings/OrganizationPanel.test.tsx`
suite (4 tests, from Sprint TP-1's A-28 fix) as a regression check before touching adjacent
Settings code -- **all 4 pass, unchanged.** No new live-HITL evidence gathered; A-28's status and
confidence are unchanged from TP-3.

## 3. Security Tab Dead-End Fix

**Problem:** each of the 6 "Configure" buttons in the Security tab (`SettingsSection.tsx`) --
Multi-Factor Authentication, Single Sign-On (SAML 2.0), Audit Logging, End-to-End Encryption, IP
Allowlisting, Session Timeout -- rendered as a plain `<button>` with **no `onClick` handler at
all**. Confirmed by direct code read, not inference. Also confirmed no real destination exists to
wire them to: `src/app/settings/security/page.tsx` renders `<EnterpriseAuthFlowPage kind="security"
/>`, whose own `submit()` for `kind === "security"` just calls
`window.location.assign("/settings/security")` -- a self-referential redirect to the same route,
not a real configuration screen.

**Fix, per this sprint's explicit instruction** ("if a feature is not live, disable it with clear
short copy... no visibly clickable button should do nothing... do not add long explanatory
banners"): each button is now `disabled`, with `aria-disabled="true"` and a short, honest reason
as both its visible label and `title`:

| Item | Reason shown |
|---|---|
| Multi-Factor Authentication | Pending production security configuration |
| Single Sign-On (SAML 2.0) | Managed by tenant policy |
| Audit Logging | Managed by tenant policy |
| End-to-End Encryption | Managed by tenant policy |
| IP Allowlisting | Requires organization admin setup |
| Session Timeout | Pending production security configuration |

A single, uniform reason per item was deliberately not fabricated with false per-item precision --
these are the sprint's own suggested example strings, chosen per item only on the general
distinction between "platform-managed" items (SSO, audit retention, encryption -- not realistically
a self-service toggle) and "not yet built, needs future work" items (MFA, session policy, and IP
allowlisting, the one item already shown as literally "Not configured").

**What this does not claim:** this does not satisfy A-29's original literal acceptance criterion
("each Configure button leads to a real settings screen") -- no such screen was built this sprint,
because none exists to route to. Only the dead-click/no-op UX defect is resolved.

**Also checked, not changed:** the same actionable (A-29) originally also reported the adjacent
Role-Based Permissions table rendering with empty cells for every role/capability combination.
Re-reading `SettingsSection.tsx` this sprint, the table renders real (if static and identical for
every tenant) `Check`/`X` icons per role -- it does **not** currently reproduce an empty-cells
state. This half of the original report appears stale relative to current code; no fix was applied
here, and the table's staticness remains a separate, already-tracked concern adjacent to A-30.

**Tests:** `src/features/settings/SettingsSection.security.test.tsx` (new, 2 tests) -- confirms all
6 Configure controls render `disabled`, and that each carries its specific honest reason as its
accessible name rather than a bare "Configure" label.

## 4. Profile Tab Confirmation

Not modified. Confirmed by code read: `ProfilePanel` (`SettingsSection.tsx`) reads from
`useAuth().session.user` and calls a real `updateProfile()` on save -- not demo-fallback data. This
is also now the new avatar link's destination (see item 1).

## 5. Users Tab / Email Delivery Status

Not modified, and not attempted this sprint per the sprint's own instruction ("keep honest, do not
attempt to fix email delivery"). Confirmed by code read that the 2026-07-27 fix (A-08) is intact:
`inviteUser()` in `UserAdministration` calls `POST /api/invitations` as its only path and surfaces
the real `emailDelivery` status (`sent` / `not-configured` / `failed`) to the admin via toast,
rather than a blanket success message. A-08 remains `Blocked` on `RESEND_API_KEY` (A-65, a founder
action) and `NEXT_PUBLIC_APP_URL`; no evidence changed, so its matrix row was left untouched.

## Files Changed

- `src/app/layout/TopBar.tsx` -- avatar wrapped in a `Link` to `/settings?tab=profile`.
- `src/app/layout/TopBar.test.tsx` (new) -- 3 tests.
- `src/features/settings/SettingsSection.tsx` -- 6 Security tab "Configure" buttons disabled with
  honest per-item reason copy.
- `src/features/settings/SettingsSection.security.test.tsx` (new) -- 2 tests.
- `docs/readiness/SETTINGS_ADMIN_SA1_CLOSEOUT_2026_07_28.md` (this file, new).
- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` -- A-28 (regression-check note), A-29 (status
  updated) touched.
- `docs/readiness/QA3_READINESS_KANBAN.md` -- Sprint SA-1 section added.

## Tests Added

5 new tests total: 3 in `TopBar.test.tsx`, 2 in `SettingsSection.security.test.tsx`.

## Verification Results

- Focused run (`TopBar.test.tsx`, `SettingsSection.security.test.tsx`,
  `OrganizationPanel.test.tsx` together): **3 test files, 9 tests, all passing.**
- Full verification suite (`typecheck`, `lint`, `test`, `build`): run immediately after this
  closeout was written; exact pass/fail counts recorded in the commit's final report.

## Actionables Updated

- **A-29**: `No (confirmed defect)` -> `Partially fixed (code + test shipped 2026-07-28, pending
  HITL live confirmation)`, confidence 70% (code). The dead-click UX defect is resolved; the
  literal "leads to a real settings screen" criterion remains unmet by design, since no such
  screens exist yet to build toward.
- **A-28**: status/confidence unchanged (`Yes (code + test shipped 2026-07-28, pending HITL live
  confirmation)`, 88%). Regression-confirmed only -- no new live evidence.
- **A-08**: not touched, not re-scored. Confirmed intact by code read only.

## Remaining SA-2 / SA-3 Scope (Not This Sprint)

Per the founder's own roadmap structure (referenced in the SA-1 prompt but not detailed here since
it was not pasted in full this session), the following remain explicitly out of scope for SA-1 and
are not claimed as done:

- A-30 (Permissions tab discloses the full cross-role schema to every viewer) -- unresolved,
  needs a product/security decision per the founder's own words ("we do not want permission schema
  for other user categories visible to any user"), not a pure UI fix.
- The Role-Based Permissions table's staticness (same data for every tenant) -- unresolved,
  adjacent to but distinct from A-30.
- A-31 (AI Configuration tab fully placeholder), A-32 (Demo tab inside live beta Settings), A-33
  (Review Roles lands on Security tab by default), A-34 (View Executive Risk redundant step) --
  none touched this sprint.
- Building real destination screens for any of the 6 Security tab items (MFA, SSO, audit
  retention, encryption, IP allowlisting, session timeout) -- not attempted; SA-1's own scope was
  the dead-click UX defect, not net-new security configuration surface area.

## Exact HITL Actions Required

1. Live-confirm on `landing.triaxisventures.com`: clicking the top-right avatar opens the Profile
   tab.
2. Live-confirm the Security tab's 6 controls now read clearly as disabled-with-reason, not as
   dead links (a UX/copy judgment call that automated tests cannot make).

## Exact File / Commit / PR / Deployment State

Branch: `canonical/sprint-1-35-unified-gitlab`. Commit and push follow immediately after this
closeout, with the sprint's required exact message. Deployment to production follows per the
founder's standing EOD/2x-daily deploy-cadence instruction, pending explicit permission in this
conversation.
