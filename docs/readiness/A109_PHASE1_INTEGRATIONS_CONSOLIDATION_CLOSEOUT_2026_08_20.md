# A-109 Phase 1 -- Integrations Surface Consolidation -- Closeout (2026-08-20)

Governed by: `docs/readiness/CLOSEOUT_TEMPLATE.md`, `CLAUDE.md` (Evidence Chain -- Standing Rule).
Related: `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` row A-109,
`docs/readiness/EKORA_FEEDBACK_AND_A78_A29_CLOSEOUT_2026_08_08.md` (original discovery).

## Scope of this closeout

A-109 has always had two explicitly separate phases in the matrix, and this closeout covers **Phase 1
only**:

- **Phase 1 (this closeout): consolidation.** Remove the duplicate, inconsistent `/settings ->
  Integrations` surface so only one canonical Integrations experience exists.
- **Phase 2 (not part of this closeout, remains open and unscoped): the App-Store-level vision.**
  Integrations as a real, user-level-customizable experience rather than a static catalogue of
  connect-buttons, per the founder's own framing and independently corroborated by the Ekora Hive pilot's
  feedback. This is net-new product work requiring its own scoping pass -- not touched here, and this
  closeout does not claim it is.

## What A-109 was

Discovered 2026-08-08 while investigating an unrelated issue (A-78's "Agent Connections" panel appearing
missing from Settings): `src/app/routing/lazyRoutes.tsx` routed `/integrations` and the Settings
"Integrations" tab to two entirely separate components (`IntegrationsSection.tsx` vs.
`SettingsSection.tsx`'s `IntegrationsQuickConnectPanel`), with no shared implementation. The standalone
`/integrations` page had the real functionality (Email Connector Pilot, `EnterpriseConnectorCredentialsPanel`,
`AgentConnectionsPanel`, connector grids); the Settings tab was a simpler label-and-button catalogue only.
Independently corroborated the same day by the Ekora Hive pilot's own feedback, from a different angle
(the App-Store-level customization point that became Phase 2).

## Closeout Evidence

**Issue ID:** A-109 (Phase 1 only)

**Title:** Consolidate duplicate Integrations surfaces

**Origin plan:** No formal plan doc -- reactive fix, logged same-day as discovery.

**Research artifact:** `docs/readiness/EKORA_FEEDBACK_AND_A78_A29_CLOSEOUT_2026_08_08.md` (2026-08-08).

**Implementation commit(s):** `4d221c6` (`fix(settings): remove duplicate Integrations tab, keep only
sidebar /integrations`).

**PR:** [#213](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/213)

**Files changed (per the fix commit's own intent, re-confirmed by this session's code read):**
`src/features/settings/SettingsSection.tsx` -- `validTabs` no longer includes `"integrations"`; a
code comment records the founder's own words ("No need of the one in 'User Profile', only in
'Integrations' option in sidebar"). The 3 pieces of functionality unique to the old tab
(WhatsApp phone-number-ID field, Facebook login-status hint, Calendly plan-requirement warning) were
migrated into `src/features/integrations/` rather than deleted -- see
`src/features/integrations/WhatsAppPhoneNumberField.tsx` and `useFacebookLoginStatus.ts`.

**Verification result (raw, not paraphrased):**
- Founder-stated, 2026-08-20, verbatim: "The 'Integrations' surface in 'Profile' has been removed."
- Independently re-checked this session, not taken at face value: read `SettingsSection.tsx` directly --
  `export const validTabs = ["profile", "organization", "users", "permissions", ...(isDemoModeForcedByEnv()
  ? ["demo"] : [])];` -- `"integrations"` is genuinely absent from the valid-tabs list, meaning the route
  itself is unreachable, not just visually hidden. This matches the code comment's own stated intent.
- This is a code-level re-confirmation of an already-shipped fix (merged 2026-08-09), not a fresh live
  click-through by this session -- the founder's own live observation is the walkthrough evidence; the
  code read confirms the underlying mechanism matches.

**Deploy evidence:** Shipped via PR #213 on 2026-08-09 -- 11 days before this closeout, already long since
deployed to production through this repo's standard merge-to-`main` deploy pipeline
(`.github/workflows/deploy-production.yml`).

**Final status:** Phase 1 -- Closed / Yes, per `docs/readiness/STATUS_TAXONOMY.md`. Phase 2 remains `No`,
unscoped, and explicitly out of scope for this closeout.

**Remaining risk:** None for Phase 1 itself. Phase 2 (App-Store-level customizable integrations) remains
a real, not-yet-scoped product decision -- recommend a fresh actionable row (not a reopening of A-109) if
and when that work is prioritized, so Phase 1's clean closure isn't muddied by an unrelated, much larger
scope.

**Follow-up issue IDs:** None opened for Phase 2 in this pass -- flagged here as the natural next step,
left for the founder to prioritize and scope rather than opened unilaterally.

## Supersedes / Superseded by / Reopened by

- **Supersedes:** N/A
- **Superseded by:** N/A
- **Reopened by:** N/A
