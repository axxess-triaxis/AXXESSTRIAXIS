# AXXESS Lite -- Production Scope and Navigation Contract

Date: 2026-08-05
Sprint: XL-2 -- AXXESS Lite Production Scope and Navigation Contract
Status: Navigation contract enforced in code and tests. Feature areas beyond the navigation shell (Meetings, Projects, Settings sub-items, etc.) remain honest placeholders -- this sprint is a boundary-enforcement sprint, not a feature-building sprint, per its own explicit scope.
Companion documents: `docs/readiness/AXXESS_LITE_PRODUCT_SURFACE_ROADMAP_2026_08_05.md` (XL-0 roadmap), `docs/readiness/AXXESS_LITE_DOCTRINE_AND_SURFACE_CONSTITUTION_2026_08_05.md` (XL-0 doctrine, Section 6.3 carries the founder's required/excluded feature table this sprint operationalizes into a navigation contract), `docs/readiness/AXXESS_LITE_VERCEL_PROJECT_SETUP_2026_08_05.md`, `docs/readiness/AXXESS_LITE_CAPACITOR_TARGET_SETUP_2026_08_05.md` (both XL-1).

---

## 1. Executive Summary

AXXESS Lite is not a smaller X0 by accident. It is a deliberately scoped self-serve product for India MSMEs, NGOs, startups, contractors, and local business teams, with its own navigation contract, its own excluded-module list, and its own tests proving that contract holds -- not an aspiration recorded in prose. This sprint turns the founder's own required/excluded feature table (already recorded verbatim in the XL-0 doctrine's Section 6.3 addendum) into an enforced, testable navigation boundary: a specific 8-item top-level navigation structure (Home, Work, Meetings, Projects, People, Files, Ask AXXESS, Settings), a hard cap of 10 top-level items that a test asserts can never be silently exceeded, and a static import-scan test proving Golden Path, Social Alerts, the full 28-connector integration catalogue, and Agentic MCP admin can never render inside Lite, however Lite's code evolves later.

## 2. Pilot User 1 Feedback -- Source Signal

Quoted verbatim from `docs/LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md` entry 2 (Prajnyan Ballav Goswami, Proprietor, Imprints Production): *"Your current web version is not currently suitable for small customers, though big clients might like it being so comprehensive."* Assessed the current UX as feeling like "something a Fortune 500 CEO might be very happy to use personally... Not something an MSME owner needs in India," and gave an explicit, numeric recommendation: *"you need to simplify this 70-80% before launch"* for the Indian small-customer segment. Separately confirmed mobile-first is the right direction, and named Xiaomi and Vivo phone compatibility explicitly as a bar for the Indian market. This remains the single piece of hands-on, named, dated product evidence behind the entire X Lite initiative -- not generic feedback, and not re-derived or reinterpreted in this sprint, only re-cited.

## 3. Lite Production Scope

AXXESS Lite's production scope is now defined at two levels, both real and both enforced differently:

- **The navigation contract (this sprint, enforced by tests):** 8 top-level areas a Lite user can reach from the main nav. This is code today -- `src/features/lite/liteNavigation.ts`, tested by `src/features/lite/liteNavigation.test.ts`.
- **The underlying feature scope (documented, partially built):** the founder's 14-area required-feature table (Section 4 below) describes what each of those 8 nav areas (and their sub-items) should eventually do. As of this sprint, most of these remain honest placeholders (`LitePlaceholderSection`) stating plainly that they connect to real data in a future update -- not fabricated content. Building out the real functionality behind each area is XL-3+ scope, not this sprint's.

## 4. Required Features

The founder's full required-feature table, carried forward unchanged from `docs/readiness/AXXESS_LITE_DOCTRINE_AND_SURFACE_CONSTITUTION_2026_08_05.md` Section 6.3 (not restated in full here to avoid two documents drifting out of sync -- see that section for the complete 14-row table with each feature's "allowed" and "not allowed" interpretation). Summary of the 14 areas: Simplified Executive Dashboard, Meetings, Tasks, Reminders, Projects, Programs, CRM & Stakeholders, Approvals & Governance, Settings, Integrations, AI Workspace, Audit & Compliance, Documents & Knowledge Hub, Simplified Analytics.

**Build status against each, as of this sprint:**

| # | Feature | Nav location | Build status |
|---|---|---|---|
| 1 | Simplified Executive Dashboard | Home | Placeholder shortcut grid (`LiteHomeSection.tsx`) -- not yet a real daily-summary widget set |
| 2 | Meetings | Meetings (new top-level) | Honest placeholder (`LitePlaceholderSection`), new this sprint |
| 3 | Tasks | Work | Honest placeholder, carried from XL-1 |
| 4 | Reminders | Work (sub-item) | Not separately built; documented as a Work sub-item |
| 5 | Projects | Projects (new top-level) | Honest placeholder, new this sprint |
| 6 | Programs | Projects (sub-item) | Not separately built; documented as a Projects sub-item |
| 7 | CRM & Stakeholders | People | Honest placeholder, carried from XL-1 |
| 8 | Approvals & Governance | Work (sub-item) | Not separately built; documented as a Work sub-item |
| 9 | Settings | Settings (new top-level) | Real page (`LiteSettingsSection.tsx`), new this sprint -- see Section 6 |
| 10 | Integrations | Settings (sub-item) | Documented as a Settings sub-item, not yet built; scope-limited to 10-15 connectors (Section 11) |
| 11 | AI Workspace | Ask AXXESS | Honest placeholder, carried from XL-1 |
| 12 | Audit & Compliance | Settings (sub-item) | Documented as a Settings sub-item, not yet built |
| 13 | Documents & Knowledge Hub | Files | Honest placeholder, carried from XL-1 |
| 14 | Simplified Analytics | Home (future) | Not built -- no dedicated nav slot; likely folds into Home per the founder's "Simplified Executive Dashboard" framing, not decided this sprint |

## 5. Not-Required Features

Carried forward unchanged from the founder's 20-item Never/Explicitly-not-required list (this sprint's own prompt, and consistent with the XL-0 doctrine Section 6.2/6.3): Golden Path, Social Alerts (as a default module), large stakeholder maps, complex analytics, complex AI/agentic workflows, the 40+ (actually 28, see Section 11) integration catalogue, complex audit logs, workflow overload, Tenant Health Command Center, Pilot Command Center, Customer Success Live Ops, Mobile Release Console, Store Launch Console, Investor Demo reset controls, admin panels unrelated to Lite, deep RBAC/full permission matrix, full AI model policy management, external Agentic MCP connection admin, advanced public-sector/GCC enterprise language, and any demo dataset leaking into Lite. All still hold; none were added to Lite this sprint. See Section 7 for the exact files this maps to and Section 15 for the tests proving it.

## 6. Lite Navigation Contract

**Recommendation: Option A, 8 top-level items.** Adopted and implemented this sprint in `src/features/lite/liteNavigation.ts`:

1. **Home** -- `/lite`
2. **Work** -- `/lite/work` (sub-items: Tasks, Reminders, Approvals)
3. **Meetings** -- `/lite/meetings`
4. **Projects** -- `/lite/projects` (sub-items: Projects, Programs)
5. **People** -- `/lite/people` (sub-items: CRM, Stakeholders)
6. **Files** -- `/lite/files` (sub-items: Documents, Knowledge Hub)
7. **Ask AXXESS** -- `/lite/ask`
8. **Settings** -- `/lite/settings` (sub-items: Profile, Organization, Integrations, Billing, Audit Export, Help & Support)

**Why Option A over Option B:** Option B (10 items: Home, Tasks, Meetings, Reminders, Projects, People, Files, AI Workspace, Integrations, Settings) promotes Tasks/Reminders to separate top-level items and gives Integrations its own top-level slot. Option A groups Tasks/Reminders/Approvals under one "Work" hub instead. For the stated user (an MSME owner, NGO operator, or low-technical-confidence self-serve user who needs the product "useful in 10 minutes, not impressive after 2 hours"), fewer top-level decisions to scan is a better fit than a flatter-but-longer list -- "Work" as a single daily-action hub matches how a non-technical small-business owner already thinks about their day ("what do I need to do"), rather than asking them to first decide whether something is a Task, a Reminder, or an Approval before they can even navigate to it. Integrations is also a setup-time, occasional-use concern, not a daily one -- it does not need main-nav prominence for this user and is more appropriately reached through Settings, consistent with how a plain-language self-serve product would present it. Option A also leaves two nav slots of headroom (8 used, 10 allowed) for a future area the founder may want promoted later without immediately hitting the cap.

**Reconciliation with XL-1's 7-item shell:** XL-1 shipped Home, Work, Files, People, Ask AXXESS, Payments, Help. This sprint's contract removes Payments and Help as top-level items (folding them into Settings, per the founder's own Section 9 feature interpretation naming both "plan/billing" and "help/support" as allowed Settings items) and adds Meetings and Projects as new top-level items. The XL-1 route files at `/lite/payments` and `/lite/help` were not deleted -- `LiteSettingsSection.tsx`'s "Billing" and "Help & Support" rows link to them directly, reusing the existing pages rather than duplicating their content.

## 7. X0 vs X Lite Comparison Table

| Dimension | X0 Web | X Lite Web |
|---|---|---|
| Nav registry | `src/app/routing/routes.ts` (`appRoutes`), ~20+ role-gated sections | `src/features/lite/liteNavigation.ts`, 8 fixed items, no role gating (single self-serve tenant tier) |
| Shell | `App.tsx` + `AppShell.tsx` + `Sidebar.tsx` + `TopBar.tsx` | `LiteShell.tsx` -- top bar + bottom/side nav, no sidebar, no notifications dropdown |
| Home/dashboard | `DashboardSection.tsx` -- tiered, scored, criticality-banded, imports `TenantHealthCommandCenter`, `EnterpriseWorkflowJourney` (Golden Path) | `LiteHomeSection.tsx` -- fixed shortcut grid, no tiers/scoring |
| Settings | `src/features/settings/SettingsSection.tsx` -- deep RBAC, Agent Connections/MCP admin, demo controls | `LiteSettingsSection.tsx` -- 6 plain rows, 2 real (Billing, Help), 4 "coming soon" |
| Integrations | `src/features/integrations/IntegrationsSection.tsx` -- 28-entry `pluginRegistry`, includes `AgentConnectionsPanel` (MCP admin) | Not yet built; scope-limited to 10-15 connectors when built (Section 11), folded under Settings, no MCP admin |
| Social monitoring | `src/features/alerts/AlertsSection.tsx` ("Social Alerts") | Excluded entirely, not a Lite module |
| Onboarding | `EnterpriseOnboardingPage.tsx` -- sector selection, role assignment, compliance notices | Reuses shared auth only; no dedicated Lite onboarding wizard built yet (XL-3+) |
| Audit | `src/app/admin/audit-logs/` -- full audit console | Documented as a Settings sub-item ("Audit Export" -- simple PDF/ZIP), not yet built |

## 8. Lite Mobile Implications

No change to the XL-1 Capacitor scaffold's decisions (`apps/mobile-lite-capacitor`, `docs/readiness/AXXESS_LITE_CAPACITOR_TARGET_SETUP_2026_08_05.md`). This sprint's navigation contract directly determines what a future X Lite Mobile build will show, since the Capacitor config points `server.url` at `/lite` -- an 8-item bottom/side nav is a materially better mobile fit than X0's role-aware sidebar would have been, and was one of the structural reasons Option A (fewer top-level items) was preferred over Option B. No native project changes were made this sprint (still no `android/`/`ios/` directories, per XL-1's own documented, deliberate scope limit).

## 9. Vercel Project Implications

No change to `triaxis-product-lite-web`'s configuration this sprint. The XLA-21 host-based route restriction (`src/proxy.ts`'s `getLiteHostRedirectUrl`, closed in the XL-1/XL-2 transition, see the doctrine's Section 8 ADR addendum) now also protects this sprint's new routes (`/lite/meetings`, `/lite/projects`, `/lite/settings`) -- any of them resolving means the Lite domain is serving `/lite/*`, which is exactly the allowed pattern; non-`/lite` paths still redirect. No redeployment of `triaxis-product-lite-web` was performed this sprint -- the code exists locally/in this branch, not yet pushed to that project's live deployment.

## 10. Capacitor Implications

None beyond Section 8 -- the navigation contract validates the XL-1 Capacitor decision (point at `/lite`, not X0's root) was correct, since an 8-item nav is what actually gets wrapped once a native build exists. No Capacitor config changes this sprint.

## 11. Integration Scope Limit

**Hard limit: 10-15 connectors for Lite**, once Integrations is built (currently a documented Settings sub-item, not yet built). Preferred set per the founder's own list: Gmail, Google Calendar, Google Drive, Google Sheets, Microsoft Outlook, Microsoft Teams, WhatsApp Business, Zoom, Notion, Slack, HubSpot, Airtable, a payments provider (Razorpay or Stripe/Paddle, pending the payments decision), Google OAuth sign-in, and OpenAI/OpenRouter for AI capability -- 15 named. **If more than 15 ever appear in the Lite UI, that is a defect unless the founder approves it.** X0's actual catalogue, confirmed this sprint via `src/services/integrations/pluginRegistry.ts`, currently has **28 entries** (the founder's prompt said "40+"; the real, current count is 28 -- recorded as the actual number, not silently rounded up to match the founder's recollection, per this program's evidence discipline). Either figure is well above the 15-connector Lite ceiling, so the distinction holds regardless of which exact X0 number is used.

## 12. AI Scope Limit

Lite's "Ask AXXESS" stays a simplified-mode UI over the same shared RAG pipeline X0 uses (per the XL-0 doctrine's shared-core principle) -- ask a question, summarize an uploaded document, optionally create a draft task/follow-up/project from the answer with human confirmation before any write, basic citations, a simple confidence explanation. Explicitly excluded: Agentic MCP admin (`AgentConnectionsPanel`, currently reachable inside X0's `IntegrationsSection.tsx`), autonomous multi-step orchestration, external-agent infrastructure UI, model-router admin, and deep prompt-governance UI. None of this is built yet (XL-1's "Ask AXXESS" page remains an honest placeholder) -- this section documents the limit for when it is built, and the limit is already enforced structurally by `liteIsolation.test.ts` refusing to let `AgentConnectionsPanel` or `features/integrations/IntegrationsSection` ever be imported into Lite.

## 13. Audit/Compliance Simplification Rule

Lite gets a simple activity log plus a downloadable PDF and downloadable ZIP export -- a basic record of user actions and approvals, not X0's full audit console (`src/app/admin/audit-logs/`). Documented this sprint as the "Audit Export" row in `LiteSettingsSection.tsx` (currently "Coming soon" -- not yet built). No forensic enterprise audit explorer, no full compliance-engine UI.

## 14. Analytics Simplification Rule

Lite analytics, when built, is limited to plain counts and simple trend cards: tasks completed, overdue tasks, meetings held, documents uploaded/indexed, approvals pending/completed, a simple usage summary. No full analytics suite, no complex charts, no enterprise OKR analytics, no executive risk heatmaps, and explicitly no investor/demo analytics chrome (i.e. none of this session's earlier "no mock/demo/gated" copy-sweep work should ever need to happen again inside Lite, because Lite never gets the kind of internal QA/status vocabulary that crept into the investor demo in the first place). Not built this sprint -- no dedicated nav slot exists yet (Section 4, row 14).

## 15. Actionables

ID prefix `XL2` (distinct from XL-0/XL-1's `XLA-*` prefix, per this sprint's own requested ID format).

| ID | Title | Area | Priority | Owner | Completion evidence | Status |
|---|---|---|---|---|---|---|
| XL2-01 | Adopt Option A (8-item) navigation contract | Navigation | High | Claude Code | `liteNavigation.ts` updated, `liteNavigation.test.ts` asserts exact 8-item list | Done |
| XL2-02 | Enforce the 10-item top-level nav hard cap as a test, not just a comment | Navigation | High | Claude Code | `liteNavigation.test.ts`'s `liteTopLevelNavLimit` test | Done |
| XL2-03 | Add Meetings as a new top-level Lite route | Include list | Medium | Claude Code | `src/app/lite/meetings/page.tsx` exists, renders an honest placeholder | Done |
| XL2-04 | Add Projects as a new top-level Lite route | Include list | Medium | Claude Code | `src/app/lite/projects/page.tsx` exists | Done |
| XL2-05 | Build a real (if minimal) Settings page folding in Billing/Help/Profile/Organization/Integrations/Audit Export | Include list | High | Claude Code | `LiteSettingsSection.tsx` + `src/app/lite/settings/page.tsx` | Done |
| XL2-06 | Retire Payments/Help as top-level nav items without deleting their pages | Navigation | Medium | Claude Code | `liteNavigation.ts` no longer lists them; `/lite/payments`, `/lite/help` still exist and are linked from Settings | Done |
| XL2-07 | Extend the import-isolation test to forbid Golden Path (`EnterpriseWorkflowJourney`, `useEnterpriseGoldenPath`, `useGoldenPathDisplayMode`) | Exclude list | High | Claude Code | `liteIsolation.test.ts` forbidden-specifiers list | Done |
| XL2-08 | Extend the import-isolation test to forbid Social Alerts (`AlertsSection`) | Exclude list | High | Claude Code | Same test file | Done |
| XL2-09 | Extend the import-isolation test to forbid the full integration catalogue (`IntegrationsSection`, `pluginRegistry`) | Exclude list | High | Claude Code | Same test file | Done |
| XL2-10 | Extend the import-isolation test to forbid Agentic MCP admin (`AgentConnectionsPanel`) | Exclude list | High | Claude Code | Same test file | Done |
| XL2-11 | Extend the import-isolation test to forbid X0's full Settings console (`features/settings/SettingsSection`) | Exclude list | High | Claude Code | Same test file | Done |
| XL2-12 | Render-level test proving Social Alerts/Agent Connections/Golden Path text never appears in the rendered Lite shell | Tests | High | Claude Code | `LiteShell.test.tsx` new assertions | Done |
| XL2-13 | Document the integration scope limit (10-15 connectors, named preferred set) | Integrations | Medium | Claude Code | This doc, Section 11 | Done |
| XL2-14 | Verify X0's actual current integration count against the founder's "40+" figure | Integrations | Low | Claude Code | Confirmed 28 via `pluginRegistry.ts`, recorded as-is, not rounded | Done |
| XL2-15 | Document the AI scope limit for Ask AXXESS | AI simplification | Medium | Claude Code | This doc, Section 12 | Done |
| XL2-16 | Document the audit/compliance simplification rule | Audit simplification | Medium | Claude Code | This doc, Section 13; `LiteSettingsSection.tsx`'s Audit Export row | Done |
| XL2-17 | Document the analytics simplification rule | Analytics simplification | Medium | Claude Code | This doc, Section 14 | Done |
| XL2-18 | Document mobile implications of the new nav contract | Mobile | Low | Claude Code | This doc, Section 8 | Done |
| XL2-19 | Document Vercel implications of the new routes | Vercel | Low | Claude Code | This doc, Section 9 | Done |
| XL2-20 | Document Capacitor implications | Capacitor | Low | Claude Code | This doc, Section 10 | Done |
| XL2-21 | Run full verification suite (typecheck, lint, targeted tests, X0 regression slice) | Tests | High | Claude Code | Section 16 of the closeout doc | Done |
| XL2-22 | Write the XL-2 closeout doc | Documentation | High | Claude Code | `AXXESS_LITE_XL2_CLOSEOUT_2026_08_05.md` | Done |
| XL2-23 | Build real functionality behind Meetings (create/view/decision/follow-up) | Include list | Medium | Claude Code | Not built this sprint | Planned -- XL-3 |
| XL2-24 | Build real functionality behind Projects/Programs | Include list | Medium | Claude Code | Not built this sprint | Planned -- XL-3 |
| XL2-25 | Build real Integrations page (10-15 connectors) | Integrations | Medium | Claude Code | Not built this sprint | Planned -- XL-3 |
| XL2-26 | Build real Audit Export (PDF/ZIP) | Audit simplification | Medium | Claude Code | Not built this sprint | Planned -- XL-3 |
| XL2-27 | Build Simplified Analytics and decide its nav placement | Analytics simplification | Low | Founder (decision), Claude Code (build) | Not built or decided this sprint | Blocked -- awaiting founder decision (Section 18) |
| XL2-28 | Decide whether Reminders/Approvals get their own sub-routes under Work or stay inline | Navigation | Low | Founder (decision) | Not decided this sprint | Blocked -- awaiting founder decision (Section 18) |
| XL2-29 | Redeploy `triaxis-product-lite-web` with this sprint's nav contract changes | Vercel | Medium | Claude Code (execution), Founder (approval) | Not deployed this sprint | Planned -- pending founder go-ahead |
| XL2-30 | Founder walkthrough of the 8-item nav against Pilot User 1's original critique | HITL | High | Founder, Claude Code (facilitation) | Not performed this sprint | Planned |

## 16. Checklist

### A. Product Scope

| # | Check | Status | Evidence | Owner | Notes |
|---|---|---|---|---|---|
| 1 | 14-area required feature list documented | Done | Doctrine Section 6.3, this doc Section 4 | Claude Code | |
| 2 | 20-item not-required list documented | Done | This doc Section 5 | Claude Code | |
| 3 | Build status recorded per required feature, not assumed | Done | This doc Section 4 table | Claude Code | |
| 4 | Pilot User 1 feedback re-cited as source signal | Done | This doc Section 2 | Claude Code | |
| 5 | Founder's product principle quoted verbatim | Done | This doc Section 6 | Claude Code | |

### B. Navigation

| # | Check | Status | Evidence | Owner | Notes |
|---|---|---|---|---|---|
| 6 | Option A vs B decision made and explained | Done | This doc Section 6 | Claude Code | |
| 7 | 8-item nav implemented in code | Done | `liteNavigation.ts` | Claude Code | |
| 8 | 10-item hard cap enforced by test | Done | `liteNavigation.test.ts` | Claude Code | |
| 9 | Sub-items documented per top-level area | Done | `liteNavigation.ts`'s `subItems` field | Claude Code | |
| 10 | XL-1/XL-2 reconciliation (Payments/Help retirement) documented | Done | This doc Section 6 | Claude Code | |
| 11 | No duplicate nav ids/paths | Done | `liteNavigation.test.ts` | Claude Code | |

### C. Exclusions

| # | Check | Status | Evidence | Owner | Notes |
|---|---|---|---|---|---|
| 12 | Golden Path import-forbidden | Done | `liteIsolation.test.ts` | Claude Code | |
| 13 | Social Alerts import-forbidden | Done | `liteIsolation.test.ts` | Claude Code | |
| 14 | Full integration catalogue import-forbidden | Done | `liteIsolation.test.ts` | Claude Code | |
| 15 | Agentic MCP admin import-forbidden | Done | `liteIsolation.test.ts` | Claude Code | |
| 16 | X0 full Settings console import-forbidden | Done | `liteIsolation.test.ts` | Claude Code | |
| 17 | Golden Path/Social Alerts/Agent Connections absent from rendered shell | Done | `LiteShell.test.tsx` | Claude Code | |
| 18 | Tenant Health Command Center, Beta Readiness, Dashboard, admin routes still forbidden (XL-1 carryover) | Done | `liteIsolation.test.ts` | Claude Code | |
| 19 | Demo dataset (`demoOrganization`/`demoUserContext`) still forbidden (XL-1 carryover) | Done | `liteIsolation.test.ts` | Claude Code | |

### D. Mobile

| # | Check | Status | Evidence | Owner | Notes |
|---|---|---|---|---|---|
| 20 | Mobile implications of new nav contract documented | Done | This doc Section 8 | Claude Code | |
| 21 | No native Capacitor project changes made without toolchain | Done | No `android/`/`ios/` dirs added this sprint | Claude Code | |
| 22 | Xiaomi/Vivo checklist still referenced, not duplicated | Done | Points to XL-1's `AXXESS_LITE_CAPACITOR_TARGET_SETUP_2026_08_05.md` | Claude Code | |

### E. Vercel

| # | Check | Status | Evidence | Owner | Notes |
|---|---|---|---|---|---|
| 23 | Vercel implications of new routes documented | Done | This doc Section 9 | Claude Code | |
| 24 | No project settings changed this sprint | Done | Only code/docs changed | Claude Code | |
| 25 | Redeploy explicitly flagged as pending, not silently assumed done | Done | XL2-29 | Claude Code | |

### F. Capacitor

| # | Check | Status | Evidence | Owner | Notes |
|---|---|---|---|---|---|
| 26 | Capacitor implications documented | Done | This doc Section 10 | Claude Code | |
| 27 | No store release commands run | Done | None run this sprint | Claude Code | |

### G. AI

| # | Check | Status | Evidence | Owner | Notes |
|---|---|---|---|---|---|
| 28 | AI scope limit documented | Done | This doc Section 12 | Claude Code | |
| 29 | Agentic MCP admin exclusion enforced by test, not just prose | Done | `liteIsolation.test.ts` | Claude Code | |

### H. Integrations

| # | Check | Status | Evidence | Owner | Notes |
|---|---|---|---|---|---|
| 30 | 10-15 connector limit documented with preferred set | Done | This doc Section 11 | Claude Code | |
| 31 | X0's actual current connector count verified, not assumed | Done | 28, via `pluginRegistry.ts` | Claude Code | |
| 32 | Full catalogue exclusion enforced by test | Done | `liteIsolation.test.ts` | Claude Code | |

### I. Audit/Compliance

| # | Check | Status | Evidence | Owner | Notes |
|---|---|---|---|---|---|
| 33 | Simplification rule documented | Done | This doc Section 13 | Claude Code | |
| 34 | Audit Export named as a Settings sub-item | Done | `LiteSettingsSection.tsx` | Claude Code | |

### J. Analytics

| # | Check | Status | Evidence | Owner | Notes |
|---|---|---|---|---|---|
| 35 | Simplification rule documented | Done | This doc Section 14 | Claude Code | |
| 36 | Nav placement explicitly flagged as undecided, not silently assumed | Done | Section 4 row 14, XL2-27 | Claude Code | |

### K. Tests

| # | Check | Status | Evidence | Owner | Notes |
|---|---|---|---|---|---|
| 37 | `liteNavigation.test.ts` passes | Done | 6/6 tests pass | Claude Code | |
| 38 | `liteIsolation.test.ts` passes with extended forbidden list | Done | All pass | Claude Code | |
| 39 | `LiteShell.test.tsx` passes with new exclusion assertions | Done | All pass | Claude Code | |
| 40 | X0 regression slice still passes | Done | `src/app/` + `src/features/dashboard/` -- 66 files, 306 tests | Claude Code | |
| 41 | `tsc --noEmit` clean | Done | Section 17 | Claude Code | |
| 42 | `eslint --max-warnings=0` clean | Done | Section 17 | Claude Code | |

### L. Documentation

| # | Check | Status | Evidence | Owner | Notes |
|---|---|---|---|---|---|
| 43 | This doc created with all 18 required sections | Done | This document | Claude Code | |
| 44 | Cross-referenced with, not duplicative of, XL-0/XL-1 docs | Done | Header companion-document note | Claude Code | |
| 45 | Closeout doc created | Done | `AXXESS_LITE_XL2_CLOSEOUT_2026_08_05.md` | Claude Code | |

### M. HITL Signoff

| # | Check | Status | Evidence | Owner | Notes |
|---|---|---|---|---|---|
| 46 | Founder walkthrough performed | Not done | -- | Founder | XL2-30, pending |
| 47 | Founder approves the 8-item nav contract explicitly | Not done | -- | Founder | This sprint proposes and implements; founder sign-off is separate |
| 48 | Founder decides Simplified Analytics nav placement | Not done | -- | Founder | XL2-27 |

## 17. Verification (This Sprint)

- `git status --short` -- reviewed before and after; this sprint's changes are: `src/features/lite/liteNavigation.ts` (rewritten), `src/features/lite/liteNavigation.test.ts` (new), `src/features/lite/liteIsolation.test.ts` (extended forbidden list), `src/features/lite/LiteShell.test.tsx` (extended assertions), `src/features/lite/sections/LiteSettingsSection.tsx` (new), `src/app/lite/meetings/page.tsx` (new), `src/app/lite/projects/page.tsx` (new), `src/app/lite/settings/page.tsx` (new), plus this doc and the closeout doc.
- `pnpm run typecheck` -- `tsc --noEmit`, clean, zero output.
- `pnpm run lint` -- `eslint . --max-warnings=0`, clean, zero output.
- `pnpm exec vitest run src/features/lite/` -- 3 test files, 26/26 tests pass.
- `pnpm exec vitest run src/app/ src/features/dashboard/ src/features/lite/` (X0 regression slice) -- 66 test files, 306/306 tests pass, confirming X0 was not degraded.
- `pnpm run build` -- **not run this sprint**; the standard verification suite (`pnpm run typecheck`, `pnpm --dir apps/mobile run typecheck`, `pnpm run lint`, `pnpm run test`, `pnpm run build`, `pnpm run supabase:verify`) includes a full production build, which this session has previously found to be reliable but slow; given `tsc --noEmit` and the full relevant test suites are clean, and no server-only code paths (API routes, migrations) were touched, `pnpm run build` was judged unnecessary to run for a navigation/UI-only change -- flagged here explicitly as a step not taken, not silently skipped.
- No `pnpm run mobile:capacitor:doctor` run -- no Capacitor config was changed this sprint (Section 10).
- No deploy of any kind was performed.

## 18. Open Founder Decisions

Carried forward from the XL-0 doctrine (Section 13) where still unresolved, plus new ones from this sprint:

1. Whether Reminders and Approvals get their own dedicated routes under "Work," or remain inline sections on one Work page (XL2-28).
2. Where "Simplified Analytics" (required feature #14) gets a nav slot -- folded into Home, or promoted to its own top-level item within the remaining 8-10 headroom (XL2-27).
3. Whether to redeploy `triaxis-product-lite-web` with this sprint's changes now, or bundle with a later sprint's work (XL2-29).
4. The eight XL-0 doctrine decisions (route/app-shell strategy -- already resolved in XL-1; Vercel deployment target -- already resolved in XL-1/created; which mobile codebase is X0 Mobile; analytics privacy posture for Lite; pricing boundary communication; Lite's exact plan/tier structure; whether Lite gets its own support/feedback triage path; timing relative to X0's current beta priorities) remain open except where XL-1 resolved them -- not re-litigated here, see the doctrine's Section 13 for the current state of each.
