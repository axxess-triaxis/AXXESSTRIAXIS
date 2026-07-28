# Settings & Admin -- Sprint SA-2 Closeout (2026-07-28)

Date: 2026-07-28
Branch: `canonical/sprint-1-35-unified-gitlab`
Governance source: `CLAUDE.md`'s evidence-chain discipline; sprint executed per Codex's formal
"Sprint SA-2: AI Configuration and Permissions Hardening" prompt.
Related: `SETTINGS_ADMIN_SA1_CLOSEOUT_2026_07_28.md`, `TENANT_PARTITIONING_TP1_CLOSEOUT_2026_07_28.md`,
`TENANT_PARTITIONING_TP2_CLOSEOUT_2026_07_28.md`, `ACTIONABLES_READINESS_MATRIX.md` (A-30, A-31),
`QA3_READINESS_KANBAN.md` (Sprint SA-2 section).

## Sprint Objective

Make Settings > AI Configuration and Settings > Permissions behave like real enterprise admin
surfaces -- no fake usage claims, no misleading provider status, no role/capability
over-disclosure, honest blocked/config-required states -- without redesigning the UI, rewriting
architecture, or building new persistence infrastructure this sprint did not require.

## AI Configuration Audit Summary

Read `src/features/settings/SettingsSection.tsx`'s `"ai configuration"` tab, `src/services/ai/router/aiRouter.ts`,
`src/services/ai/tenantModelPolicy.ts`, `src/services/ai/model-routing-policy.ts`,
`src/app/api/ai/model-policy/route.ts`, and `src/services/nlp/modelRegistry.ts`. Classification:

| Item | Classification (before this sprint) |
|---|---|
| 5 "AI Engine Configuration" toggles | Misleading/fake live claim -- active-looking `<button>` switches with **no `onClick` handler at all**, same dead-toggle defect class as SA-1's Security tab fix |
| AI Usage Statistics numbers | Static placeholder, but already honestly labeled ("Illustrative, not yet tenant-tracked") as of Sprint TP-1's `bf3d98e` commit -- not previously credited against A-31 |
| AI Routing & Providers panel | Real provider status (`getAiRouterStatusSnapshot()`), but the "demo" mode badge alone reads as "fake" even though it is a real, behavior-affecting flag |
| Language & NLP Coverage panel | Real config status -- an honest per-language model-readiness registry (`implemented-local`/`adapter-ready`/`provider-gated`/`roadmap`), not a live usage claim |
| `GET /api/ai/model-policy` | Real tenant policy | already exists, already session-scoped, already queries `ai_usage_ledger` by `organization_id` -- simply not wired into this UI before this sprint |

## AI Configuration Fixes

1. **5 dead toggles disabled with honest reasons.** No safe write path exists for any of them --
   `tenantModelPolicy.ts`'s policy object is computed fresh per request and never persisted per
   organization, so there is nothing to toggle against. The 4 always-on items now read "Enforced
   platform default -- not tenant-configurable yet"; the 1 beta/off item reads "Requires admin
   setup" (using the sprint's own suggested vocabulary). This applies identically regardless of
   viewer role, since no one -- admin included -- can actually write to this policy yet; documented
   below as SA-3 scope if persistence is built.
2. **AI Usage Statistics wired to real data.** New `AiUsageStatisticsPanel` fetches `GET
   /api/ai/model-policy` on mount (session-cookie authenticated, same pattern used elsewhere in
   this file). If the fetch succeeds: real counts (events logged, providers used, human-review
   count, estimated cost) computed from the organization's own `recentUsage` rows when any exist;
   an honest "No AI usage logged yet for this organization" empty state when it genuinely has none
   (the expected common case today, this being new instrumentation). If the fetch itself fails: the
   pre-existing, unchanged illustrative-labeled static card, so nothing regresses if the API is
   unreachable.
3. **AI Routing & Providers mode badge clarified, not changed.** Confirmed by code read that
   `status.mode` (`"demo"` by default) is not purely cosmetic -- `model-routing-policy.ts` also uses
   it to decide whether the local provider is force-enabled. Rewriting or hiding it would be an
   architecture change outside this sprint's scope. Instead, added an honest caption tied to the
   real `configuredCount` signal ("No external provider configured -- local deterministic fallback
   active" / "N external provider(s) configured for this deployment"), so the badge no longer reads
   as "this is fake data" on its own.
4. **Language & NLP Coverage panel: no change.** Re-verified it is a real, honest,
   already-accurate model-readiness registry, not a placeholder.

## Permissions Audit Summary

`PermissionsPanel` rendered a hardcoded 6-role capability matrix (Super Admin through Guest) with
**no current-user context, no tenant context, and no role gating whatsoever** -- any viewer, of any
role, saw every other role's capability description. No edit affordances existed to remove (the
panel was read-only from the start). This is exactly what the founder flagged: "We do not want
permission schema for other user categories visible to any user."

## Permissions Fixes

Implemented the sprint's **Preferred** option directly, since it maps cleanly onto the founder's
own stated preference and required no new RBAC primitive -- reused the same
`["Super Admin", "Organization Admin"].includes(role)` check pattern already used elsewhere in this
file (`canManageUsers` in `UserAdministration`, `canConnect` in `IntegrationsQuickConnectPanel`):

- A "Signed in as `<role>`" line now always shows the current viewer's own role.
- Super Admin / Organization Admin see the full matrix, now labeled "Permission Matrix
  (Reference)" so it reads as a reference document, not a live per-tenant control surface.
- Every other role sees only their own row, titled "Your Permissions," plus an honest note: "You
  do not have permission to manage roles. The full permission schema is visible to Organization
  Admins and Super Admins only."

## Role-Aware Behavior After This Sprint

- Super Admin / Organization Admin: full Permission Matrix reference, all 6 Security tab items
  (unchanged from SA-1, already role-agnostic since none are truly editable by anyone), full AI
  Configuration tab (toggles disabled for everyone -- see above).
- Executive / Manager / Employee / Guest: Permissions tab now shows only their own role's row; no
  admin-only edit affordance is exposed anywhere in AI Configuration or Permissions (none existed
  to expose, and the audit above confirms none was newly introduced).

## Files Changed

- `src/features/settings/SettingsSection.tsx` -- AI Engine Configuration toggles disabled with
  reasons; `AiUsageStatisticsPanel` (new) wired to real usage; `AiRoutingProvidersPanel` mode
  caption added; `PermissionsPanel` made role-aware.
- `src/features/settings/SettingsSection.permissions.test.tsx` (new) -- 4 tests.
- `src/features/settings/SettingsSection.aiConfig.test.tsx` (new) -- 4 tests.
- `docs/readiness/SETTINGS_ADMIN_SA2_CLOSEOUT_2026_07_28.md` (this file, new).
- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` -- A-30, A-31 updated.
- `docs/readiness/QA3_READINESS_KANBAN.md` -- Sprint SA-2 section added.

## Tests Added

8 new tests total: 4 in `SettingsSection.permissions.test.tsx`, 4 in
`SettingsSection.aiConfig.test.tsx`.

## Verification Results

- `pnpm run typecheck` -- clean.
- Focused run (`src/features/settings/`, `src/security/rbac.test.ts`,
  `src/services/ai/aiRouter.test.ts`, `src/services/ai/tenantModelPolicy.test.ts`,
  `src/app/api/ai/model-policy/route.test.ts`, `src/app/layout/TopBar.test.tsx`): **10 test files,
  51 tests, all passing.**
- Full verification suite (`lint`, `test`, `build`): run immediately after this closeout was
  written; exact pass/fail counts recorded in the commit's final report.

## A-30 Status

`No (confirmed defect, product decision needed)` -> `Yes (code + test shipped 2026-07-28, pending
HITL live confirmation)`, 85% confidence. The product decision (role-gate vs. redesign) is resolved
by role-gating, directly matching the founder's own words. Not yet HITL-confirmed live.

## A-31 Status

`No (confirmed defect)` -> `Yes (code + test shipped 2026-07-28, pending HITL live confirmation)`,
75% confidence -- set below A-30's because real per-tenant AI usage will show as genuinely empty
for most tenants today (no fabricated substitute exists for that, correctly), and there is still no
persisted, admin-editable AI policy (the 5 toggles are honestly disabled, not wired to a real save
path). Not yet HITL-confirmed live.

## Remaining Settings/Admin Risks

- No per-tenant AI policy persistence exists. The 5 AI Engine Configuration toggles are honestly
  disabled, not functional -- building real persistence (a policy table + an authenticated,
  role-gated PATCH endpoint) is future work, not attempted this sprint per the sprint's own
  non-negotiable against building new architecture.
- `AXXESS_AI_ROUTING_MODE` is unset in production today, so the "demo" badge and its local-fallback
  behavior both apply live -- this is an environment-configuration question for the founder, not a
  code defect; the caption added this sprint makes the real consequence legible without changing
  the underlying behavior.
- A-08 (invite email delivery), A-32/A-33/A-34 (other Settings dead ends), and building real
  destination screens for the SA-1 Security tab items remain untouched, exactly as scoped.
- Real AI usage data will read as empty for essentially every tenant until real production traffic
  accumulates in `ai_usage_ledger` -- this is expected and correct, not a defect to chase.

## Exact HITL Live Checks Needed

1. Sign in as a non-admin role (Employee, Guest, Manager, or Executive) on
   `landing.triaxisventures.com` and confirm Settings > Permissions shows only that role's own row,
   not the full 6-role schema.
2. Sign in as Organization Admin or Super Admin and confirm the full Permission Matrix still
   renders, now labeled "(Reference)".
3. Open Settings > AI Configuration and confirm the 5 toggles read as clearly disabled (not
   clickable), and that AI Usage Statistics shows either real counts or the new honest empty state
   rather than the old "2,847 Queries This Month" style numbers.

## Recommended SA-3 Scope

- Real per-tenant AI policy persistence (a policy table + role-gated write endpoint), so the AI
  Engine Configuration toggles can become genuinely admin-editable rather than permanently
  disabled.
- Resolve `AXXESS_AI_ROUTING_MODE` in production (founder action) so the routing-mode badge and its
  real local-fallback behavior reflect an intentional choice rather than an unset default.
- Continue down the remaining A-32/A-33/A-34 Settings dead-end list from the original SA roadmap.

## Exact File / Commit / PR / Deployment State

Branch: `canonical/sprint-1-35-unified-gitlab`. Commit and push follow immediately after this
closeout, with the sprint's required exact message. Deployment to production follows per the
founder's standing EOD/2x-daily deploy-cadence instruction, pending explicit permission in this
conversation.
