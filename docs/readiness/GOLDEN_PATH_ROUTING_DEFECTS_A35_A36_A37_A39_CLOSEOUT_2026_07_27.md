# Golden Path Routing Defects A-35/A-36/A-37/A-39 -- Closeout (2026-07-27)

Date: 2026-07-27
Branch: `canonical/sprint-1-35-unified-gitlab`
Governance source: `CLAUDE.md`'s evidence-chain discipline (External signal -> product decision ->
shipped artifact -> verification -> current status)
Related: `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` A-35, A-36, A-37, A-39 (A-38 is a separate,
still-open, related-but-distinct "Back" navigation defect, not touched by this closeout);
`docs/readiness/PAXEL_YC_PILOT_EVIDENCE_FORMALIZATION_2026_07_27.md`

## Summary

Four Golden Path routing defects were logged 2026-07-25 from a live HITL walkthrough and left
unfixed under the founder's own "log only, don't act yet" instruction at the time. They became
directly relevant again on 2026-07-27 when reconciling a Y Combinator assessment tool's
("Paxel") pilot-readiness narrative against this repository's tracked evidence: the narrative's
claim that tenant-scoped workflows are "almost fully" used did not match the matrix's own recorded
6-of-10 correct / 4-confirmed-broken state for these Golden Path items. The founder approved
starting the fixes the same day ("Both" -- commit the reconciliation doc and start on A-35/36/37/39).
All four are now root-caused, fixed, and test-verified.

## External Signal

HITL, 2026-07-25 (all four items from the same walkthrough, recorded verbatim in the matrix at the
time):

1. **A-35**: "Submit feedback" allows submission with no error, but there is no mapped
   inbox/destination where a submitted item can actually be reviewed.
2. **A-36**: Clicking "Invite Pilot Team" in the Golden Path checklist lands on the Security tab --
   founder's own words, "fully incorrect path."
3. **A-37**: Clicking "Assign Roles" in the Golden Path checklist also lands on the Security tab --
   same symptom as A-36.
4. **A-39**: Clicking "Send feedback/request support" lands back at the Executive Dashboard, not a
   feedback destination -- confirmed incorrect by the founder.

## Root Cause (Each Item)

- **A-36 and A-37 share one root cause.** `src/app/admin/invitations/page.tsx` and
  `src/app/admin/roles/page.tsx` are both thin Next.js redirect pages that send the visitor to bare
  `/settings` (a deliberate 2026-07-25 decision to avoid building a second, competing
  invitation/role-management surface, since `SettingsSection.tsx` already has real, tested UI for
  both). The gap: `SettingsSection.tsx` (`src/features/settings/SettingsSection.tsx:23`) had an
  unconditional `const [tab, setTab] = useState("security")` -- every redirect into `/settings`
  landed on the Security tab regardless of why the visitor was sent there.
- **A-37 additionally surfaced a second, more specific defect while root-causing it**: the real,
  functional role-change control (a per-user role `<select>` inside `UserAdministration`, calling
  `usersRepository.update()` and firing a `role_changed` analytics event on change) lives in the
  **Users** tab, not the Permissions tab. The Permissions tab (`PermissionsPanel`, lines 400-426)
  is a static, hardcoded, read-only role/access matrix with no assignment capability at all -- so
  even a hypothetical fix that pointed A-37 at "Permissions" would still have been wrong.
- **A-39**: `src/features/onboarding/BetaOnboardingChecklist.tsx`'s `steps` array had
  `{ id: "send_feedback", ..., route: "/dashboard" }` -- a plain hardcoded href to the Executive
  Dashboard, which has no feedback-submission surface of any kind.
- **A-35**: the submission side was never broken -- `BetaFeedbackModal.tsx`'s `submitFeedback()`
  correctly calls `applicationServices.betaFeedbackRepository.create(...)`, which is a real,
  tenant-scoped repository write (`src/repositories/supabaseEnterpriseRepositories.ts:1559`). The
  defect was entirely on the read side: `betaFeedbackRepository.list()` was already being called in
  two places (`ProductAnalyticsSection.tsx`, `BetaReadinessSection.tsx`) but in both cases the
  result was immediately reduced to `feedback.value.length` for a metric card -- no individual
  submission (type, module, rating, message, submitter) was ever rendered anywhere in the product.
  There was genuinely no destination where a submitted item could be reviewed, exactly as the HITL
  reported.

## What Changed

- **`src/features/settings/SettingsSection.tsx`**: added `initialTabFromLocation()` (exported for
  testing), which reads `?tab=` from `window.location.search` on mount via a lazy `useState`
  initializer, validates it against a fixed `validTabs` list, and falls back to `"security"` for no
  value or an unrecognized one. No `useSearchParams()` / Suspense-boundary dependency introduced --
  reads `window.location` directly, guarded for the server-render pass (`typeof window ===
  "undefined"`).
- **`src/app/admin/invitations/page.tsx`**: redirect target changed from `/settings` to
  `/settings?tab=users`.
- **`src/app/admin/roles/page.tsx`**: redirect target changed from `/settings` to
  `/settings?tab=users` (not `?tab=permissions` -- see root cause above).
- **`src/components/feedback/BetaFeedbackButton.tsx`**: added `id="beta-feedback-trigger"` to the
  always-mounted floating button (rendered globally in `AppShell.tsx` on every authenticated page).
- **`src/features/onboarding/BetaOnboardingChecklist.tsx`**: the `send_feedback` step gained an
  `action: "open-feedback"` field; the step-card renderer now branches on it -- that one step
  renders a `<button>` that calls `document.getElementById("beta-feedback-trigger")?.click()`
  instead of an `<a href>`, opening the real feedback modal in place rather than navigating away.
  Every other step is unchanged (still a real `<a href={step.route}>`).
- **`src/features/product-analytics/ProductAnalyticsSection.tsx`**: added a "Feedback Inbox" card
  below the existing metric cards, listing every `BetaFeedback` record (type, module, rating,
  status, full message, submitter name + email via the already-fetched users list, timestamp),
  newest first, with an explicit "No feedback submitted yet." empty state. This page is already
  role-gated to Super Admin/Organization Admin (`admin/product-analytics` route,
  `requiredRoles: ["Super Admin", "Organization Admin"]` in `routes.ts`).

## What Did Not Change

- No new database tables, columns, or RLS policies -- `beta_feedback` already existed and was
  already being written to correctly.
- No change to `BetaFeedbackModal.tsx`'s submission logic -- it was already correct.
- `BetaReadinessSection.tsx` still only shows a feedback *count*, not the full list -- left as-is;
  `ProductAnalyticsSection.tsx` is the one now-real inbox destination. Consolidating both into one
  surface is out of scope for this pass.
- The separate, static `PermissionsPanel` matrix (Permissions tab) was not made interactive -- it
  remains a read-only reference table, which is what A-30 (a different, still-open actionable)
  already flags as a distinct concern.
- A-38 (the "Back" arrow from Security exiting to "Continue to Workspace") is a related but distinct
  navigation defect, not touched by this closeout.
- The 8-step `useEnterpriseGoldenPath`/`buildEnterpriseGoldenPathSnapshot` workflow shown on the
  Executive Dashboard (a *different* "golden path" surface from the 10-step
  `BetaOnboardingChecklist` these actionables describe) was read and confirmed unaffected by this
  defect -- its own "Invite team and assign roles" step already routes to `/admin/organization`
  directly, and its "Reflect work in command center" step is about dashboard/metrics reflection, not
  feedback submission.

## What Was Verified

- **Targeted tests, 4 files, 16/16 passing**: `SettingsSection.test.ts` (4 new tests for
  `initialTabFromLocation`), `BetaOnboardingChecklist.test.tsx` (2 new tests: the feedback step
  triggers the real button and does not navigate; every other step still uses a real link),
  `ProductAnalyticsSection.test.tsx` (new file, 2 tests: individual feedback renders with full
  detail; explicit empty state when there is none), `adminRedirectPages.test.ts` (new file, 2 tests:
  both redirect pages target `/settings?tab=users` exactly).
- **Full verification suite, run 2026-07-27:**
  - `pnpm run typecheck` -- clean, no errors.
  - `pnpm run lint` (`eslint . --max-warnings=0`) -- clean, zero warnings.
  - `pnpm run test` -- **152 test files passed, 605 tests passed** (up from 150 files/595 tests
    before this change).
  - `pnpm run build` -- see exact result in "Exact File / Commit / PR / Deployment State" below.
- **Not verified**: no HITL live walkthrough of these four fixes in production has occurred yet.
  Per this repo's own status vocabulary, all four are recorded as
  `Yes (code + test shipped 2026-07-27, pending HITL live confirmation)` in
  `ACTIONABLES_READINESS_MATRIX.md` -- the same vocabulary already used for A-50/51/56/57 --
  not silently upgraded to a plain `Yes`.

## What Remains Partial or Blocked

- **Live HITL confirmation** that clicking "Invite Pilot Team" and "Assign Roles" in the real,
  deployed Golden Path checklist now lands on the Users tab (not Security), that "Send feedback"
  now opens the real modal in place, and that a real submitted feedback item now appears in the new
  Product Analytics Feedback Inbox. This requires a deployment to production plus a real HITL
  session -- both outside this agent's own authority to perform unprompted per this repo's
  deployment discipline.
- **A-38** (the adjacent "Back" navigation defect from the Security landing) remains open and
  unfixed -- explicitly out of scope for this pass.
- **`BetaReadinessSection.tsx`'s feedback metric** remains count-only; not consolidated with the new
  inbox in `ProductAnalyticsSection.tsx`.

## Exact File / Commit / PR / Deployment State

Files changed (6 source, 4 test):
- `src/features/settings/SettingsSection.tsx`
- `src/app/admin/invitations/page.tsx`
- `src/app/admin/roles/page.tsx`
- `src/components/feedback/BetaFeedbackButton.tsx`
- `src/features/onboarding/BetaOnboardingChecklist.tsx`
- `src/features/product-analytics/ProductAnalyticsSection.tsx`
- `src/features/settings/SettingsSection.test.ts` (expanded)
- `src/features/onboarding/BetaOnboardingChecklist.test.tsx` (expanded)
- `src/features/product-analytics/ProductAnalyticsSection.test.tsx` (new)
- `src/app/admin/adminRedirectPages.test.ts` (new)

Docs updated same pass: `ACTIONABLES_READINESS_MATRIX.md` (A-35/A-36/A-37/A-39 moved `No` ->
`Yes (code + test shipped 2026-07-27, pending HITL live confirmation)`; tally corrected from
32/19/16 to 36 Yes / 19 Blocked / 12 No), `PAXEL_YC_PILOT_EVIDENCE_FORMALIZATION_2026_07_27.md`
(Question 4 updated with this fix, recommended formal statement revised),
`QA3_EXECUTIVE_SUMMARY_2026_07_26.md` (actionables and test-count rows refreshed).

Branch: `canonical/sprint-1-35-unified-gitlab`. Not yet committed as of this document's writing --
commit and push (to `origin` and `gitlab`, per this repo's established dual-remote practice) follow
in the same session. No deployment to production has been performed or requested in this pass;
per `CLAUDE.md`'s git/deployment discipline, that requires explicit confirmation in the current
conversation.
