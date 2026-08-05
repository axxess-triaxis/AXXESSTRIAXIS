# AXXESS Lite Product Surface Roadmap and Checklist

Date: 2026-08-05

Status: Founder-scoped product and architecture roadmap, not yet implemented.

**Companion document (added 2026-08-05, Sprint XL-0):** `docs/readiness/AXXESS_LITE_DOCTRINE_AND_SURFACE_CONSTITUTION_2026_08_05.md` extends this roadmap into an execution-grade doctrine -- it adds a read-only codebase audit (exact files/modules on each side of the X0/X Lite boundary), an Architecture Decision Record with alternatives considered, a founder-decisions-needed list, and a 20-item actionables table (`XLA-01` through `XLA-20`) spanning XL-1 through XL-3. This roadmap remains the source of record for the product decision itself; the doctrine document does not restate it, only builds on it.

Source signal: Pilot User 1 Feedback 1 from Prajnyan Ballav Goswami, Proprietor, Imprints Production, logged in `docs/LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md` entry 2. The feedback said the current web version looks sophisticated and stable, but is too complex for Indian MSMEs, NGOs, contractors, startups, and local businesses. It explicitly recommended simplifying the small-customer product by 70-80% before launch, while keeping the larger enterprise ambition intact.

## 1. Product Decision

AXXESS should not try to make one product surface serve every market.

The current enterprise web product remains the full X0 surface for GCC enterprise and larger organizations. A new AXXESS Lite surface should be created for the India self-serve market.

The core principle is:

**Same core, separate experience shells.**

This means shared auth, tenancy, storage, audit, payments, workflow, document, RAG, analytics, and integration foundations where appropriate, but separate route trees, navigation, onboarding, dashboard density, and mobile packaging by market motion.

## 2. Product Surfaces

| Surface | Product role | Build shape | Market |
|---|---|---|---|
| X0 Web | Current full enterprise console | Existing full web app | GCC enterprise, larger organizations, government/public-sector style buyers |
| X0 Mobile | Enterprise companion app | Selected mobile-accessible enterprise modules, not full self-serve setup | GCC enterprise users already onboarded through X0 Web |
| Investor Demo | Separate populated walkthrough | Existing demo project, isolated dummy data | Investors, sales, demos, partner walkthroughs |
| X Lite Web | New simplified self-serve web app | New lightweight route/app shell in the monorepo | India MSMEs, NGOs, startups, contractors, local businesses |
| X Lite Mobile | Mobile-first self-serve app | Capacitor wrapper of X Lite, not of the full X0 console | India self-serve and mass-market app-store motion |

Current Vercel projects already known:

- X0 Web / Live beta: `triaxis-www-frontend-import`
- Investor Demo: `triaxis-product-investor-demo`
- X Lite Web: not created yet

## 3. Non-Negotiables

1. Do not degrade or simplify X0 Web while building X Lite.
2. Do not wrap the full X0 console as the India self-serve mobile product.
3. Do not duplicate the backend or fork the repository.
4. Do not create a second source of truth for tenant data.
5. Do not let X Lite import X0's full dashboard, sidebar, admin panels, integration catalogue, investor-demo data, or enterprise readiness surfaces by accident.
6. Do not mark X Lite production-ready until onboarding, payment path, daily-use loop, and mobile packaging are verified separately.
7. Keep demo data isolated from both X0 live tenants and X Lite live tenants.
8. Any founder-stated market or pricing claim must be tagged as founder-stated unless source artifacts exist.

**Superseded, 2026-08-05 (XL-1):** the founder gave a more detailed, explicitly-stated required/excluded feature table after XL-1 shipped its first shell, framed as a hard boundary ("Lite is not 'smaller X0 by accident'; it is a deliberately scoped self-serve product"). That table is the current source of truth for Sections 4-5 below where they disagree in detail -- see `docs/readiness/AXXESS_LITE_DOCTRINE_AND_SURFACE_CONSTITUTION_2026_08_05.md` Section 6.3. Sections 4-5 here remain as the original XL-0-era scoping for historical record.

## 4. What X Lite Includes First

X Lite should start from the daily workflows a small organization can understand without training.

Phase 1 inclusion list:

- Simple sign up and login
- Create organization
- Choose business type
- Minimal home screen
- Tasks
- Reminders
- Meetings / follow-ups
- Basic documents
- Simple AI assistant over uploaded notes/documents
- Basic customer/stakeholder contacts
- Simple notifications
- Simple usage/billing status
- Feedback/support

Phase 1 should avoid enterprise vocabulary where possible. Use plain language such as "Work", "People", "Files", "Ask AXXESS", "Follow-ups", and "Payments" unless the existing design system forces otherwise.

## 5. What X Lite Hides First

These capabilities may remain in the shared core, but should not appear in the first X Lite shell by default:

- Full Executive Dashboard
- Tenant Health Command Center
- Strategic objectives
- Risk heatmap
- Full admin panels
- Deep RBAC matrix
- Agentic MCP connections
- 30+ connector catalogue
- Store release console
- Pilot command center
- Customer success live ops
- Full audit log console
- Investor-demo controls
- Complex governance language
- Multi-model routing controls
- Public-sector/GCC enterprise positioning

If any of these are required later, they should appear as upgrade paths or admin-only advanced sections, not first-run defaults.

## 6. Shared Core Boundaries

X Lite should reuse:

- Auth and session infrastructure
- Tenant/organization model
- Supabase data layer
- Audit logging where writes occur
- Tasks repository
- Meetings repository
- Documents/Knowledge Hub storage and extraction where feasible
- RAG pipeline in a simplified mode
- Notifications
- Payments infrastructure once live
- Feedback pipeline
- Analytics framework, with privacy rules reviewed separately

X Lite should not reuse by default:

- X0 sidebar/navigation
- X0 Executive Dashboard layout
- X0 admin section map
- Investor demo dataset
- Demo-mode toggles
- GCC enterprise copy
- Heavy readiness dashboards

## 7. Architecture Target

Preferred implementation shape:

1. Add a dedicated X Lite route group or app shell inside the existing Next.js app.
2. Add a small X Lite navigation model separate from the X0 navigation registry.
3. Add an X Lite home/dashboard component that uses a small set of shared repository calls.
4. Add an X Lite onboarding flow separate from the enterprise onboarding wizard.
5. Add a build/deploy discriminator so X0, Demo, and X Lite can be deployed independently from the same repo.
6. Add a separate Capacitor configuration or build target for X Lite Mobile.
7. Keep X0 Mobile as an enterprise companion path, not as the India self-serve app.

The first technical spike should decide between:

- `src/app/lite/*` route group in the current Next.js project; or
- a separate workspace app under `apps/lite-web` that imports shared packages/components.

Default recommendation: start with `src/app/lite/*` for speed, then extract to `apps/lite-web` only if bundle, routing, or deployment separation requires it.

## 8. Roadmap

### Sprint XL-0: Discovery and Product Surface Definition

Goal: define exactly what X Lite is before coding.

Deliverables:

- X Lite module map
- X Lite hidden/excluded module list
- X0/X Lite shared-core matrix
- User journey for Indian self-serve first run
- Mobile-first journey for X Lite Mobile
- X0 Mobile companion-scope definition
- Deployment target proposal
- Capacitor target proposal

Exit criteria:

- Founder approves X Lite's first-sprint scope.
- The roadmap explicitly says what will not be built.
- Pilot User 1 feedback is cited as the source signal.

### Sprint XL-1: X Lite Shell and Navigation

Goal: create a lightweight surface without touching X0.

Deliverables:

- New X Lite route entry
- X Lite home screen
- X Lite navigation model
- First-run empty states
- Links to tasks, reminders/follow-ups, files, contacts, and Ask AXXESS
- Tests proving X Lite does not render X0 sidebar/dashboard/admin/demo components

Exit criteria:

- X0 Web still builds and behaves unchanged.
- Demo still builds and keeps seeded data isolated.
- X Lite renders independently with a small navigation footprint.

### Sprint XL-2: X Lite Daily-Use Loop

Goal: make X Lite useful for a small customer.

Deliverables:

- Create/edit task
- Create reminder or follow-up
- Add contact/stakeholder
- Upload simple document/note
- Ask AXXESS against simple uploaded content, or honest pending state if not wired
- Simple notification/update state
- Feedback/support entry

Exit criteria:

- A small customer can complete one full daily loop without seeing enterprise-only surfaces.
- Each write uses shared repositories and tenant scope.
- Audit logging remains intact for material writes.

### Sprint XL-3: X Lite Payments, Packaging, and Mobile Target

Goal: prepare X Lite for self-serve commercial motion and mobile wrapping.

Deliverables:

- Payment readiness decision for Stripe/Paddle/Razorpay path
- Pricing/trial/free-year rules mapped to technical requirements
- X Lite deployment project plan
- X Lite Capacitor target plan
- Android/iOS build strategy for X Lite Mobile
- Lightweight app-store screen list
- Mobile device compatibility checklist, including low/mid-range Android devices such as Xiaomi and Vivo

Exit criteria:

- X Lite has a deployment plan separate from X0 and Demo.
- X Lite Mobile is not wrapping the full X0 console.
- Payment path has exact implementation requirements, even if not live yet.

### Sprint XL-4: Regression, Evidence, and Founder Walkthrough

Goal: prove the split is real.

Deliverables:

- X0 regression checklist
- Demo isolation checklist
- X Lite self-serve checklist
- X Lite Mobile packaging checklist
- Pilot User 1 feedback traceability note
- Founder walkthrough script
- Closeout doc with pass/fail evidence

Exit criteria:

- Founder can say whether X Lite answers Pilot User 1's simplification critique.
- X0 remains strong for GCC enterprise.
- X Lite has its own measurable readiness state.

## 9. Execution Checklist

### A. Product Definition

| # | Check | Status | Notes |
|---|---|---|---|
| 1 | X0 Web formally named as GCC enterprise full console | [x] | XL-0 doctrine Section 2.1 |
| 2 | X0 Mobile formally scoped as enterprise companion app | [x] | XL-0 doctrine Section 2.2 |
| 3 | Investor Demo kept separate from X0 and X Lite | [x] | XL-0 doctrine Section 2.3; XL-1 did not touch Investor Demo behavior or code |
| 4 | X Lite Web formally scoped as India self-serve surface | [x] | XL-0 doctrine Section 2.4 |
| 5 | X Lite Mobile formally scoped as the India app-store product | [x] | XL-0 doctrine Section 2.5 |
| 6 | Pilot User 1 feedback cited as source signal | [x] | XL-0 doctrine Section 1, quoted verbatim from LOIS log entry 2 |
| 7 | X Lite first-run user journey written | [ ] | Inclusion/exclusion lists exist (doctrine Section 6); a narrative first-run journey has not been separately written -- flagged, not silently claimed done |
| 8 | X Lite excluded/hidden module list written | [x] | XL-0 doctrine Section 6.2 |

### B. Architecture

| # | Check | Status | Notes |
|---|---|---|---|
| 9 | X Lite route/app-shell strategy chosen | [x] | XL-1 decision: Option A (`src/app/lite/*`) deployed to an independent third Vercel project, not merged into X0's -- see `AXXESS_LITE_VERCEL_PROJECT_SETUP_2026_08_05.md`'s "Required Technical Decision" section |
| 10 | X Lite navigation registry separate from X0 sidebar | [x] | `src/features/lite/liteNavigation.ts`, independently authored, not filtered from `src/app/routing/routes.ts` or `src/app/navigation.ts` |
| 11 | Shared repository/service boundaries defined | [x] | XL-0 doctrine Section 4; not yet exercised by real writes (XL-2's job) |
| 12 | X Lite does not import full X0 dashboard by default | [x] | Proven by `src/features/lite/liteIsolation.test.ts` (static import scan) and `LiteShell.test.tsx` (render assertion) |
| 13 | X Lite does not import investor-demo dataset | [x] | Same tests check for `demoOrganization`/`demoUserContext` |
| 14 | X Lite tenant scope uses same auth/tenant rules | [x] | `src/app/lite/layout.tsx` reuses `AuthProvider` unmodified; no separate auth path introduced |
| 15 | X Lite write actions preserve audit logging | [ ] | No write actions exist yet in XL-1 (shell/nav only) -- not applicable until XL-2 wires real repositories |
| 16 | X Lite deployment target defined | [x] | Proposed (`triaxis-product-lite-web`) in `AXXESS_LITE_VERCEL_PROJECT_SETUP_2026_08_05.md` -- **not yet created**; founder approval pending, see that doc's CLI-commands section |
| 17 | X Lite Capacitor target defined | [x] | `apps/mobile-lite-capacitor/capacitor.config.ts` scaffold created -- **no native project generated yet**, see `AXXESS_LITE_CAPACITOR_TARGET_SETUP_2026_08_05.md` |

### C. UX and Product Surface

| # | Check | Status | Notes |
|---|---|---|---|
| 18 | X Lite home screen is simple and mobile-friendly | [x] | `src/features/lite/sections/LiteHomeSection.tsx` -- fixed shortcut grid, no tiles/tiers/criticality |
| 19 | X Lite avoids enterprise/admin-heavy language | [x] | Home/Work/Files/People/Ask AXXESS/Payments/Help, matching this doc's Section 4 vocabulary |
| 20 | Tasks/follow-ups are first-class | [ ] | "Work" nav item and route exist as an honest placeholder; real task wiring is XL-2 |
| 21 | Files/documents are understandable without Knowledge Hub complexity | [ ] | "Files" placeholder exists; real wiring is XL-2 |
| 22 | Ask AXXESS is simple and honest about what it can answer | [ ] | "Ask AXXESS" placeholder exists and is explicit that it is not yet wired; real RAG wiring is XL-2 |
| 23 | Contacts/people flow is lightweight | [ ] | "People" placeholder exists; real wiring is XL-2 |
| 24 | Payments/billing has a plain user-facing path | [ ] | "Payments" placeholder exists; real billing state machine is XL-3 (XLA-16) |
| 25 | Feedback/support is visible | [ ] | "Help" placeholder exists; real feedback-pipeline wiring is XL-2 |

### D. Mobile and Packaging

| # | Check | Status | Notes |
|---|---|---|---|
| 26 | X0 Mobile companion scope documented | [x] | XL-0 doctrine Section 2.2/7 |
| 27 | X Lite Mobile self-serve scope documented | [x] | `AXXESS_LITE_CAPACITOR_TARGET_SETUP_2026_08_05.md` |
| 28 | Capacitor does not wrap the full X0 UI for India self-serve | [x] | New config's `server.url` defaults to `${NEXT_PUBLIC_APP_URL}/lite`, not the X0 root |
| 29 | X Lite mobile route/start URL defined | [x] | Same as above |
| 30 | Low/mid-range Android compatibility checklist exists | [x] | `AXXESS_LITE_CAPACITOR_TARGET_SETUP_2026_08_05.md`'s checklist section -- not yet executed |
| 31 | Xiaomi/Vivo compatibility explicitly included | [x] | Named explicitly in the same checklist |
| 32 | iOS/Android app-store positioning separated by product surface | [ ] | Not addressed this sprint -- store listing copy/positioning is a later-sprint concern |

### E. Verification

| # | Check | Status | Notes |
|---|---|---|---|
| 33 | X0 regression test passes | [x] | `pnpm exec vitest run src/app/ src/features/dashboard/ src/features/lite/` -- 65 files, 295 tests, all pass |
| 34 | Demo isolation test passes | [x] | Covered by the same isolation tests (checks for `demoOrganization`/`demoUserContext`) |
| 35 | X Lite shell test passes | [x] | `src/features/lite/LiteShell.test.tsx` -- 15/15 tests pass |
| 36 | X Lite daily-use loop test passes | [ ] | No daily-use loop exists yet -- XL-2 |
| 37 | X Lite does not expose X0 admin/dashboard/demo controls | [x] | `liteIsolation.test.ts` |
| 38 | X Lite Mobile build target validates | [ ] | No native project exists yet to validate a build against -- see Capacitor doc |
| 39 | Founder walkthrough completed | [ ] | Not performed this sprint |
| 40 | Closeout doc created and signed off | [ ] | |

## 10. Claude Code Sprint Prompt Seed

Use the following prompt seed for the first Claude Code execution pass:

> You are working on AXXESS TRIaxis. Read `docs/readiness/AXXESS_LITE_PRODUCT_SURFACE_ROADMAP_2026_08_05.md`, `docs/LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md` entry 2, and the current app/mobile structure. Your job is not to simplify X0. Your job is to define and begin the AXXESS Lite product surface: a separate lightweight India self-serve web/mobile experience built from the same monorepo/shared core. First, audit the current route/app/mobile structure. Then propose and implement only the safest first slice: X Lite route/app shell, minimal navigation, and tests proving it does not import the full X0 dashboard/sidebar/admin/demo dataset. Do not change X0 behavior. Do not change Investor Demo behavior. Do not create a duplicate repository. End with a closeout that maps Pilot User 1 feedback -> product decision -> files changed -> tests run -> remaining gaps.

## 11. Completion Definition

This program is not complete when a route exists.

It is complete only when:

1. X0 Web remains full enterprise.
2. X0 Mobile is companion-scoped.
3. Investor Demo remains isolated.
4. X Lite Web exists as a lighter self-serve surface.
5. X Lite Mobile can be packaged separately from the full X0 UI.
6. Pilot User 1's 70-80% simplification critique has a direct product response.
7. The founder can run a walkthrough and confirm whether the simplified experience fits Indian MSMEs, NGOs, startups, contractors, and local businesses better than the X0 web console.

