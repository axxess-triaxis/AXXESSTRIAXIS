# AXXESS Lite Doctrine and Product Surface Constitution

Date: 2026-08-05
Sprint: XL-0 -- AXXESS Lite Doctrine and Product Surface Constitution
Program: Codex (product manager/prompt designer), Claude Code (engineer/executor), Sudipta Koushik Sarmah (Founder and Managing Director, HITL authority)
Status: Doctrine and architecture-readiness document. No implementation code was changed to produce this document, per this sprint's explicit non-negotiables.
Companion document: `docs/readiness/AXXESS_LITE_PRODUCT_SURFACE_ROADMAP_2026_08_05.md` (the founder-scoped product/roadmap document this doctrine expands into an execution-grade constitution -- read that document first for the product decision in brief; this document adds the codebase audit, ADR, actionables schema, and the founder-decisions-needed list that the roadmap does not itself carry).

---

## 1. Executive Summary

AXXESS currently has one product surface trying to serve two very different buyers: large, GCC-style enterprise and public-sector organizations on one end, and Indian MSMEs, NGOs, startups, contractors, and local businesses on the other. Pilot User 1 (Prajnyan Ballav Goswami, Proprietor, Imprints Production -- the first real pilot customer to give substantive product feedback in this program) used the live product hands-on and reported, verbatim, in `docs/LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md` entry 2: the current web version is "not currently suitable for small customers," reads like something "a Fortune 500 CEO might be very happy to use personally... Not something an MSME owner needs in India," and needs to be simplified "70-80% before launch" for that segment. The same feedback confirmed the mobile-first direction is correct, named Xiaomi and Vivo compatibility explicitly as an Indian-market bar, and floated a future "web lite" tier for low-spec systems and less technical users. This is product evidence, not generic feedback -- it is the first hands-on, named, dated report from a real pilot customer in this program, and it is being treated as the triggering signal for this doctrine, exactly as instructed.

This doctrine does not respond to that feedback by simplifying the existing product. It responds by splitting the product into separate experience shells built on the same monorepo and the same backend, so the enterprise buyer's product does not get worse while a second, much lighter product is built for the India self-serve buyer. The doctrine's one-sentence architecture principle, already set by the founder in the companion roadmap document, is: **same core, separate experience shells.**

The monorepo remains an advantage under this doctrine, not a liability. A single Supabase project, a single auth/session layer, a single tenant model, and a single set of repositories mean X0 and X Lite customers are never on divergent data models, never require a second migration history, and never risk the tenant-isolation drift that a second repository or a forked backend would introduce. What the monorepo does not justify is shipping the same navigation, dashboard density, onboarding wizard, and admin surface area to every buyer regardless of segment. This document draws the exact line between what is shared (the core) and what must diverge (the shell), and backs that line with a read-only audit of the current codebase (Section 14) so that the boundary is not aspirational -- it names the actual files on each side of it.

---

## 2. Product Surface Definitions

### 2.1 X0 Web

The current, full enterprise console: Executive Dashboard, Tenant Health Command Center, full admin panel set (23 sub-routes under `src/app/admin/`), the 30+ connector integrations catalogue, Agentic MCP tooling, RBAC matrix, audit console, and every other capability already shipped in this repository today. X0 Web is not simplified, degraded, or reduced by this doctrine in any way. It remains the product for GCC enterprise, larger organizations, and government/public-sector-style buyers. Its current Vercel deployment target is `triaxis-www-frontend-import` (`landing.triaxisventures.com`).

### 2.2 X0 Mobile

An enterprise companion app, not a self-serve-first product. Modeled on the Salesforce Mobile pattern: remote login, approvals, notifications, the AI review inbox, quick task/action updates, and a dashboard glance -- a subset of X0 Web's capability surfaced for an already-onboarded enterprise user who needs to act from a phone, not a replacement for the console. X0 Mobile is not the vehicle for India self-serve distribution. Two mobile codebases currently exist in this monorepo (`apps/mobile`, an Expo/React Native app, and `apps/mobile-capacitor`, a Capacitor wrapper around the hosted web app) -- see Section 14.8 for the audit of both. Which of these two currently maps to "X0 Mobile" in intent, and whether both are meant to persist, is listed as an open founder decision in Section 13.

### 2.3 Investor Demo

A separate, fully populated, isolated walkthrough product for investors, sales conversations, and partner demos. Existing Vercel project: `triaxis-product-investor-demo` (`investor.triaxisventures.com`). This doctrine does not change Investor Demo behavior -- it only documents the boundary that must remain true: Investor Demo's seeded dataset and its `isDemoModeEnabled()` gating mechanism (Section 14.10) must never leak into a live X0 tenant or a live X Lite tenant, and X Lite must not accidentally inherit Investor Demo's demo-mode flag or seeded data by reusing the same shared feature-section components without override.

### 2.4 X Lite Web

A new, simplified, self-serve web product surface for India MSMEs, NGOs, startups, contractors, and local businesses -- the segment Pilot User 1 described as needing a 70-80% simpler experience. Built from the same monorepo and the same shared core (auth, tenancy, repositories, audit, payments infrastructure) as X0, but with its own route tree, its own navigation, its own onboarding, and deliberately excluded enterprise surfaces (Section 6). X Lite Web does not exist yet as of this document. No route, page, or component under an `src/app/lite/*` (or equivalent) path exists in the codebase as of this audit (Section 14.1).

### 2.5 X Lite Mobile

A mobile-first, self-serve primary app for the India market, built on a Capacitor base pointed at the X Lite Web route tree once it exists -- not a Capacitor wrapper around the full X0 console. Per Section 14.8's audit, `apps/mobile-capacitor`'s `capacitor.config.ts` already points `server.url` at a hosted web origin rather than bundling a separate native UI, which means an X Lite Mobile target is structurally plausible as a second Capacitor configuration pointing at a different route (e.g. `/lite`) on the same hosted origin, without necessarily requiring a second native Android/iOS project -- this is a structural observation from the audit, not a decision made in this document (see Section 8, ADR, and Section 13).

---

## 3. Market-Motion Mapping

| Market motion | Product surface(s) | Buyer profile |
|---|---|---|
| GCC enterprise / public-sector motion | X0 Web + X0 Mobile | Large organizations, government/public-sector-style buyers, enterprise procurement cycles, GCC market entry (per the founder's own MENA/Dubai strategic framing recorded in `docs/readiness/PITCH_AND_TRACTION_LOG_2026_07_24.md` entry 11) |
| India self-serve motion | X Lite Web + X Lite Mobile | MSMEs, NGOs, startups, contractors, local businesses -- the segment Pilot User 1, Pilot 2 (Ekora Hive), and the Mahanta group of three firms (`docs/LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md` entries 2-6) already represent as real, named pilot relationships |
| Investor/sales motion | Investor Demo | Investors, accelerator/incubator evaluators, partner walkthroughs -- never a live tenant of either product |

This mapping is not exclusive by geography -- it is a mapping by buyer motion and organizational complexity, and a GCC-based small business or an India-based large enterprise could in principle sit on the "wrong side" of the geographic shorthand. The doctrine's line is complexity/segment fit, not a hard geographic gate; "India self-serve" and "GCC enterprise" are the dominant real-world cases observed in this program's pilot/pitch evidence to date, not an architectural constraint baked into the code.

---

## 4. Shared Core Doctrine

The following must be shared across X0 and X Lite -- one implementation, one migration history, one source of truth, consumed by both experience shells:

- **Auth/session** -- `src/auth/` (`AuthProvider.tsx`, `serverSession.ts`), Supabase Auth. One session model, one cookie scheme, for every surface except Investor Demo's separate, non-authorizing demo-session cookie (Section 14.10).
- **Tenant/org model** -- the `organizations` table and the tenant-scoping pattern already enforced via `tenantScopeFromUser()` (`src/repositories/supabaseEnterpriseRepositories.ts`) and applied throughout every shared feature section audited in Section 14.7. X Lite tenants are the same kind of row as X0 tenants -- no second tenant table, no parallel org model.
- **Supabase repositories** -- `applicationServices` (`src/providers/serviceProvider.ts`) and the concrete repository implementations behind it. X Lite consumes the same repository interfaces X0 does; it does not get its own data-access layer.
- **Audit logging** -- every material write from X Lite must produce the same audit-log row shape as an X0 write, through the same audit-logging path already wired into the shared repositories.
- **Tasks** -- `src/features/tasks/` (`TasksSection.tsx`) and its underlying tasks repository. X Lite's task UI is a lighter shell over the same repository, not a separate tasks concept.
- **Meetings/follow-ups** -- `src/features/meetings/` (`MeetingsSection.tsx`) and its repository, same pattern.
- **Documents/extraction** -- the document storage/extraction pipeline behind `src/features/documents/` and `src/features/knowledge-hub/` (both exist as separate feature folders today, per Section 14.7). X Lite's "Files" experience should be a simplified surface over this same storage/extraction layer, not a new upload path.
- **RAG where appropriate** -- the RAG ingestion/query pipeline (`src/services/rag/`) referenced by `KnowledgeHubSection.tsx`. X Lite's "Ask AXXESS" is a simplified UI over the same RAG service, in a reduced mode, per the roadmap's Phase 1 inclusion list -- not a separate model/pipeline.
- **Payments** -- once live, the same Stripe/Paddle/Razorpay-capable billing infrastructure (`enterpriseConnectorVault.ts` per `MONOREPO_ARCHITECTURE_AND_BUSINESS_MODEL.md` S4) serves both surfaces' billing state, with different pricing/plan configuration per surface, not different payment plumbing.
- **Feedback/support** -- the beta-feedback pipeline (`betaFeedbackRepository`, the Feedback Inbox pattern already visible in `src/features/product-analytics/ProductAnalyticsSection.tsx`) is reused, not rebuilt, for X Lite's feedback/support entry point.
- **Analytics, with privacy rules reviewed separately** -- the existing analytics provider abstraction (`src/services/analytics/`, `MixpanelAnalyticsProvider`/`PostHogAnalyticsProvider`/`MockAnalyticsProvider`) is reused, but which events fire, and under what privacy posture, for X Lite's typically less technical, more privacy-sensitive small-business/NGO users, is an explicit open item -- see Section 13.

The test for "does this belong in the shared core": would a change here need to be correct for both an enterprise tenant and a two-person MSME tenant in the same way? Auth, tenancy, storage, and audit logging pass this test unconditionally. Presentation, density, and vocabulary do not.

---

## 5. Experience Shell Separation

The following must diverge between X0 and X Lite -- same underlying data, different presentation and entry points:

- **Route tree** -- X0's route tree is the existing `src/app/{dashboard,tasks,stakeholders,knowledge,documents,meetings,approvals,analytics,integrations,admin/*,...}` set, all of which currently render through the single shared `App.tsx` SPA shell (Section 14.1-14.2). X Lite needs its own top-level route segment(s) that do not import `workspace-page.tsx`/`App.tsx` at all.
- **Navigation** -- X0's navigation is driven by the central `appRoutes` registry in `src/app/routing/routes.ts` (Section 14.3). X Lite needs its own, much smaller navigation manifest -- not a filtered view of `appRoutes`, a separate list, so that adding an X0-only admin route can never silently leak into X Lite's nav by omission-based filtering logic breaking.
- **Dashboard density** -- X0's Executive Dashboard (`src/features/dashboard/DashboardSection.tsx`) is a tiered, scored-tile, criticality-banded operational command center (Section 14.4). X Lite's home screen must be a small, fixed set of daily-use shortcuts (Work, People, Files, Ask AXXESS, Follow-ups, Payments per the roadmap's plain-language naming), not a filtered or de-tiered version of the same component.
- **Onboarding** -- X0's onboarding (`src/features/onboarding/EnterpriseOnboardingPage.tsx`, `src/app/onboarding/{sector,create-organization,join-organization,workspace,security,complete}`) is a multi-step, sector-selection, role-assignment, compliance-notice wizard (Section 14.6). X Lite's onboarding must be a much shorter signup/create-organization/choose-business-type flow, built new, not the enterprise wizard with steps hidden.
- **Default vocabulary** -- X0 uses enterprise/governance language throughout (Tenant Health Command Center, Strategic Objectives, RBAC, Golden Path). X Lite uses the plain-language set the roadmap already specifies: "Work", "People", "Files", "Ask AXXESS", "Follow-ups", "Payments."
- **Mobile build target** -- X0 Mobile is a companion path; X Lite Mobile is a self-serve primary path pointed at the X Lite route tree, per Section 2.5 and Section 7.
- **Deployment/project config** -- X0 Web, Investor Demo, and X Lite Web should each resolve to a clearly identified deployment target once X Lite Web exists (Section 8's ADR addresses whether that is a new Vercel project or a route group within the existing one).
- **QA checklist** -- X0's regression checklist, Investor Demo's isolation checklist, and X Lite's self-serve checklist must be three separate, explicitly named checklists (the roadmap's Section 9 already begins this; Section 9 below extends it for the doctrine-completion gate specifically).

---

## 6. X Lite Inclusion/Exclusion Rules

These lists are carried forward verbatim in substance from the founder-approved roadmap (`AXXESS_LITE_PRODUCT_SURFACE_ROADMAP_2026_08_05.md` Sections 4-5), restated here as the binding constitution for this and future XL sprints, with the audit-confirmed file/module each exclusion maps to.

### 6.1 X Lite includes first

- Simple sign up and login (reuses `src/auth/`, new lightweight UI)
- Create organization (reuses the tenant/org model, new lightweight UI, not `EnterpriseOnboardingPage.tsx`)
- Tasks (reuses the tasks repository behind `src/features/tasks/TasksSection.tsx`, new lightweight UI)
- Reminders/follow-ups (reuses the meetings/follow-ups repository behind `src/features/meetings/MeetingsSection.tsx`)
- Simple meetings
- Files (reuses document storage/extraction behind `src/features/documents/` and/or `src/features/knowledge-hub/`, new lightweight UI, no Knowledge Hub RAG-ingestion-stage complexity exposed)
- Ask AXXESS Lite (reuses the RAG pipeline in a simplified mode, honest about what it can answer per the roadmap's UX checklist item 22)
- Contacts (reuses the stakeholders/CRM repository behind `src/features/stakeholders/StakeholdersSection.tsx`, new lightweight UI)
- Payments/billing path (reuses payments infrastructure once live, plain user-facing path)
- Feedback/support (reuses the beta-feedback pipeline)

### 6.2 X Lite excludes first (named to the exact current module)

- Executive Dashboard -- `src/features/dashboard/DashboardSection.tsx` and its full tile/tier/criticality engine (`src/services/dashboard/{tileScoring,tilePolicies,buildDashboardSnapshot}.ts`)
- Tenant Health Command Center -- `src/components/enterprise/TenantHealthCommandCenter.tsx` (imported directly by `DashboardSection.tsx` per Section 14.4)
- Full admin panels -- the 23 sub-routes under `src/app/admin/` (Section 14.1)
- Deep RBAC matrix -- the role-protected route/access-control layer driven by `requiredRoles` in `src/app/routing/routes.ts`
- 30+ connector catalogue -- the Integrations page and its full provider list
- Agentic MCP admin -- `/api/agents/*`, the Agent Connections settings panel
- Investor demo controls -- anything gated by or exposing `isDemoModeEnabled()`/`demoOrganization`/`demoUserContext` (`src/demo/demoMode.ts`, Section 14.10)
- Public-sector/GCC enterprise copy -- any vocabulary drawn from the current X0 marketing/product copy that assumes a governance/public-sector buyer
- Store release console -- `src/app/admin/mobile-release/`
- Pilot command center -- `src/app/admin/pilot-command-center/`

Additional exclusions confirmed by this sprint's audit, consistent with the roadmap's list: `src/features/beta-readiness/` (internal HITL readiness tracker, Section 14.5), `src/app/admin/audit-logs/` (full audit console), `src/app/admin/product-analytics/`, `src/app/admin/pilot-conversion/`, `src/app/admin/support-ops/`, `src/app/admin/model-policy/`, `src/app/admin/plugin-runtime/`, `src/app/admin/prompt-approvals/`.

If any excluded capability is required later for an X Lite customer that grows into needing it, it must appear as an explicit upgrade path or an admin-only advanced section -- never as a first-run default, per the roadmap's own rule.

### 6.3 Addendum, XL-1 (2026-08-05): founder-provided refined feature scope -- a hard boundary, not an accident

The founder gave this explicit instruction directly: *"This is the AXXESS Lite production scope. It should be documented as a hard boundary: Lite is not 'smaller X0 by accident'; it is a deliberately scoped self-serve product."* This supersedes Sections 6.1/6.2 above where the two disagree in detail -- 6.1/6.2 remain the original XL-0 lists for historical/evidence-chain purposes, but this table is the current source of truth for what Lite includes and excludes, effective 2026-08-05.

**Required (with the founder's own Lite interpretation of each):**

| # | Feature | Lite interpretation |
|---|---|---|
| 1 | Simplified Executive Dashboard | Plain daily summary, not Tenant Health Command Center |
| 2 | Meetings | Create, view, follow up |
| 3 | Tasks | Create, assign, update |
| 4 | Reminders | Lightweight due-date/follow-up loop |
| 5 | Projects | Simple project tracking |
| 6 | Programs | Group projects, but not enterprise portfolio complexity |
| 7 | CRM & Stakeholders | Contacts, notes, follow-ups, basic pipeline |
| 8 | Approvals & Governance | Simple approvals, not deep enterprise governance |
| 9 | Settings | Account, org, plan, users, basic security |
| 10 | Integrations | Only 10-15 useful connectors |
| 11 | AI Workspace | Simple AI help over tasks/docs/meetings |
| 12 | Audit & Compliance | Basic activity log + easy PDF/ZIP export |
| 13 | Documents & Knowledge Hub | Upload, organize, index, ask |
| 14 | Simplified Analytics | Usage/work/progress basics |

**Explicitly not required:**

| # | Excluded | Reason |
|---|---|---|
| 1 | Golden Path | Too enterprise/beta-readiness oriented |
| 2 | Social Alerts | Not core daily self-serve need |
| 3 | Large stakeholder maps | Too heavy for MSME/startup/NGO first use |
| 4 | Complex analytics | Keep plain, actionable metrics |
| 5 | Complex AI/agentic workflows | Lite AI should assist, not orchestrate everything |
| 6 | 40+ integrations | 10-15 practical connectors enough |
| 7 | Complex audit logs | Simple downloadable PDF/ZIP compliance pack |
| 8 | Too many integrated workflows | Avoid workflow overload |

**Product principle (founder's own words):** *"Lite should feel useful in 10 minutes, not impressive after 2 hours."*

**Architecture implication (founder's own words, consistent with, not a change to, this doctrine's Section 4/5 doctrine):** X0 keeps breadth and depth. Lite uses shared backend capabilities but exposes a small, opinionated surface. **Lite navigation should have about 8-10 top-level areas max, not every X0 module.** Advanced X0 concepts can remain hidden, unavailable, or upgrade-gated.

**Reconciliation note, not silently resolved:** the XL-1 shell built this sprint (`src/features/lite/liteNavigation.ts`) has 7 nav items (Home, Work, Files, People, Ask AXXESS, Payments, Help), which is inside the founder's stated 8-10 ceiling but does not yet cover this table's full 14-item required list -- notably, Meetings, Projects, Programs, CRM & Stakeholders (beyond "People"), Approvals & Governance, Settings, Integrations, and Audit & Compliance are not yet distinct nav items. Whether that means (a) some of these 14 features fold into the existing 7 nav areas rather than each getting its own top-level item (e.g. Meetings could live inside "Work"), consistent with the 8-10-area ceiling, or (b) the nav needs to grow toward 8-10 items to give more of these their own area, is a founder product decision, not decided by this addendum. **Not rebuilt in code this sprint** -- this addendum documents the scope; expanding `src/features/lite/` to match it is XL-2 (or a dedicated follow-up) scope, pending that decision.

---

## 7. Mobile Doctrine

- **X0 Mobile is companion/remote access**, not the India self-serve app. It exists to let an already-onboarded enterprise user act on approvals, notifications, tasks, and a dashboard glance from a phone -- the Salesforce Mobile pattern named in the sprint prompt.
- **X Lite Mobile is the self-serve primary app** for the India market -- the app a small business owner installs and uses as their main interface, not a companion to a desktop console they were onboarded through elsewhere.
- **Capacitor must not blindly wrap X0 for India.** Per Section 14.8's audit, `apps/mobile-capacitor/capacitor.config.ts` currently defaults `server.url` to `https://app.axxess.dev` with no route discriminator -- meaning today, any Capacitor build of this app loads the full X0 web experience. Before X Lite Mobile can exist as a real, separate product, either a second Capacitor configuration pointing `server.url` at a distinct X Lite route path, or an equivalent build-time discriminator, must exist. This is not yet true today and is tracked as an actionable (Section 10).
- **Xiaomi/Vivo/common Android device compatibility is a stated QA concern**, not an assumption. Pilot User 1's feedback named these two brands explicitly as a bar for the Indian market. This doctrine requires that any X Lite Mobile QA checklist (Section 9, and the roadmap's Section 9-D) include real-device or real-device-equivalent testing on common mid/low-range Android hardware, not emulator-only verification, before any claim of Xiaomi/Vivo compatibility is marked `Yes` anywhere in this program's evidence-chain documentation.
- Two mobile codebases exist today (`apps/mobile`, Expo/React Native; `apps/mobile-capacitor`, Capacitor). This doctrine does not resolve which of these, if either exactly as-is, becomes X0 Mobile versus the basis for X Lite Mobile -- that decision is listed in Section 13, since it materially affects Sprint XL-3's scope and cannot be responsibly decided by this document alone.

---

## 8. Architecture Decision Record

**ADR-XL-0-01: Same-core, separate-shell architecture for AXXESS Lite**

- **Decision:** AXXESS will ship a second, lightweight self-serve product surface (X Lite Web/Mobile) from the same monorepo and the same backend as X0, implemented as a new, separate route tree and navigation manifest, not as a simplified or filtered view of the existing X0 shell.
- **Context:** Pilot User 1's hands-on feedback (Section 1) is the first named, dated, hands-on report from a real pilot customer stating the current product is unsuitable for the India MSME/NGO/startup/contractor segment, with a specific, numeric simplification ask (70-80%). The founder's own roadmap document already set the "same core, separate experience shells" principle before this sprint began; this ADR formalizes the decision and records the alternatives considered.
- **Options considered:**
  1. *Simplify X0 itself* (hide/collapse existing X0 surfaces for all users). Rejected -- this would degrade the product for the GCC enterprise/public-sector buyer this program has spent the majority of its pitch/pilot effort courting (see `PITCH_AND_TRACTION_LOG_2026_07_24.md`'s enterprise/institutional and incubation entries), and directly violates this sprint's own non-negotiable ("do not simplify or degrade X0 Web").
  2. *Fork a second repository for X Lite.* Rejected -- explicitly forbidden by this sprint's non-negotiables and by the roadmap's Section 3 non-negotiables (no second source of truth for tenant data, no forked backend, no second repository). Would also duplicate every future auth/security/compliance fix across two codebases.
  3. *Build X Lite as a filtered/permission-gated view of the existing X0 shell* (same `App.tsx`, same `appRoutes` registry, with a role or plan flag hiding sections). Rejected as the primary approach -- per the audit (Section 14.2-14.3), `App.tsx` and `routes.ts` are deeply enterprise-shaped (role-protected admin routes, tile-scoring dashboard, sector-based onboarding), and a filtering approach risks exactly the failure this program experienced once already this session with Analytics accidentally re-rendering Executive Dashboard's live tile stack by reusing a shared hook without a boundary -- a filtered-view approach for X Lite would repeat that class of defect at a much larger scale and with real small-business customers as the audience, not just an internal readiness page.
  4. *New route tree + new navigation manifest inside the existing Next.js app, reusing only the audited shared-core layer* (chosen). Matches the audit's finding that no Next.js route groups are in use today and that `layout.tsx` itself is generic enough to be reused unmodified (Section 14.1-14.2), so a new top-level route segment can exist alongside X0's without colliding, provided its `page.tsx` files do not import `workspace-page.tsx`/`App.tsx`.
- **Decision outcome:** Option 4. X Lite gets its own route entry point(s), its own navigation manifest (not derived from `appRoutes`), its own onboarding flow, and its own home/dashboard component -- all consuming the same shared-core repositories/services named in Section 4. The specific route shape (`src/app/lite/*` inside the current Next.js project, versus a separate `apps/lite-web` workspace member) is deferred to the first XL-1 technical spike, per the roadmap's own default recommendation to start with `src/app/lite/*` for speed and extract later only if bundle/routing/deployment separation requires it -- this ADR does not override that roadmap recommendation, it adopts it.
- **Consequences:** X Lite inherits every future auth/tenancy/audit-logging fix automatically (positive). X Lite cannot inherit X0 UI fixes automatically, since its shell is separate by design (expected, not a defect). The `isDemoModeEnabled()` global flag (Section 14.10) threading through most shared feature-section components must be explicitly handled -- either overridden per-surface or the shared components refactored to accept demo-mode as an explicit prop/context rather than a global read -- before X Lite can safely reuse those components without risking Investor Demo data leakage into a real X Lite tenant's screen.
- **Risks:** See Section 12.
- **Reversal conditions:** If, after XL-1's technical spike, `src/app/lite/*` proves to create unacceptable bundle-size, routing-precedence, or deployment-isolation problems for X0 (e.g. X Lite's dependencies materially inflate X0's build, or a single Vercel project cannot safely serve independently-scaled traffic for both surfaces), the decision reverses to the `apps/lite-web` separate-workspace-member alternative already named as the fallback in the roadmap's Section 7 -- this is a pre-agreed reversal path, not a new decision to be made under pressure later.

**Addendum, XL-1 (2026-08-05):** the technical spike ran. `src/app/lite/*` and `src/features/lite/*` were built (route tree, own navigation manifest, own shell, isolation tests -- 15/15 passing, plus the existing X0 regression suite re-run clean at 295/295). No bundle/routing/deployment problem was hit for X0. The spike also resolved a question this ADR had left open: whether "deployment isolation" (the founder's explicit want for a separate Web Lite Vercel project) requires Option B. It does not -- `src/app/lite/*` deployed to its own, independent third Vercel project (proposed `triaxis-product-lite-web`, not yet created; see `docs/readiness/AXXESS_LITE_VERCEL_PROJECT_SETUP_2026_08_05.md`) gives real deploy/build/domain/rollback separation using the same same-repo-multiple-Vercel-projects pattern already proven twice in this program (`triaxis-www-frontend-import`, `triaxis-product-investor-demo`), without Option B's shared-service-layer-extraction risk. One gap was found and is explicitly not yet closed: nothing today stops a request to `<lite-domain>/dashboard` from resolving, since it's the same Next.js app -- closing this needs host-based middleware or a Vercel-level rewrite, tracked as a new follow-up actionable (see `AXXESS_LITE_VERCEL_PROJECT_SETUP_2026_08_05.md`'s "known gap" note), not yet built, not silently claimed done.

---

## 9. Readiness Checklist

This is the doctrine-completion and execution-readiness gate for Sprint XL-0 itself, and the entry gate for XL-1 to begin. It complements, and does not replace, the roadmap document's own 40-item Execution Checklist (`AXXESS_LITE_PRODUCT_SURFACE_ROADMAP_2026_08_05.md` Section 9), which remains the implementation-tracking checklist for XL-1 through XL-4.

### A. Doctrine (this document's own completeness)

| # | Check | Status |
|---|---|---|
| 1 | Pilot User 1 feedback quoted verbatim and cited to its exact source entry | Done -- Section 1, sourced to LOIS log entry 2 |
| 2 | Five product surfaces formally defined with current deployment targets named where they exist | Done -- Section 2 |
| 3 | Market-motion mapping does not conflate geography with architecture | Done -- Section 3 |
| 4 | Shared-core list is testable, not just asserted | Done -- Section 4's "does this belong in the shared core" test |
| 5 | Experience-shell-separation list maps each item to a real, audited file or module | Done -- Section 5 |
| 6 | Inclusion/exclusion rules match the founder-approved roadmap without silent drift | Done -- Section 6, cross-checked against roadmap Sections 4-5 |
| 7 | ADR records real alternatives considered, not just the chosen option | Done -- Section 8 |
| 8 | Every open product/technical decision is named explicitly, not buried in prose | Done -- Section 13 |
| 9 | Document does not claim X Lite is built, started, or scheduled without founder approval | Done -- Section 2.4/2.5 state no Lite code exists yet |
| 10 | Document is cross-referenced with, not duplicative of, the existing roadmap document | Done -- header companion-document note, Section 9 header |

### B. Architecture

| # | Check | Status |
|---|---|---|
| 11 | Current route tree audited and documented with exact paths | Done -- Section 14.1 |
| 12 | Current layout/shell wiring audited (single shell vs. route-group layouts) | Done -- Section 14.2 |
| 13 | Central navigation/route registry located and its X0-only shape documented | Done -- Section 14.3, `src/app/routing/routes.ts` |
| 14 | Confirmed no existing route-group boundary that X Lite could silently ride on incorrectly | Done -- Section 14.1, no `(name)` route groups exist |
| 15 | Shared-core coupling points identified across all five audited shared feature folders | Done -- Section 14.7 |
| 16 | Demo-mode boundary and its current coupling into shared feature sections documented | Done -- Section 14.10 |
| 17 | Mobile codebase audit distinguishes the two existing mobile apps and their real purposes | Done -- Section 14.8 |
| 18 | Capacitor config's `server.url` behavior documented as the basis for an X Lite Mobile target | Done -- Section 14.8 |
| 19 | Workspace/build tooling audited for multi-surface deploy support | Done -- Section 14.9 |
| 20 | Route/app-shell strategy decision recorded with a stated reversal condition (not a permanent, unquestionable choice) | Done -- Section 8 |

### C. UX and Product Surface (readiness to *begin* XL-1, not proof XL-1 is done)

| # | Check | Status |
|---|---|---|
| 21 | Plain-language vocabulary set defined for X Lite | Done -- Section 5, matches roadmap Section 4 |
| 22 | X Lite first-run inclusion list is finite and named | Done -- Section 6.1 |
| 23 | X Lite exclusion list maps to real, currently-shipping modules, not hypothetical ones | Done -- Section 6.2 |
| 24 | Onboarding-flow shape contrast (X0 wizard vs. X Lite target) documented | Done -- Section 14.6, Section 5 |
| 25 | "Ask AXXESS Lite" scope explicitly bounded as simplified-mode, not a new RAG pipeline | Done -- Section 4, Section 6.1 |
| 26 | No X Lite UI has been built or mocked in this sprint (doctrine-only scope respected) | Done -- confirmed via `git status --short` in Section 15 |

### D. Mobile

| # | Check | Status |
|---|---|---|
| 27 | X0 Mobile vs. X Lite Mobile roles distinguished in doctrine | Done -- Section 7 |
| 28 | Confirmed today's Capacitor build would load full X0, not a Lite surface, absent further work | Done -- Section 7, Section 14.8 |
| 29 | Xiaomi/Vivo compatibility named as an explicit, real-device QA requirement, not an emulator-only claim | Done -- Section 7 |
| 30 | Which existing mobile codebase (Expo vs. Capacitor) maps to which product surface is flagged as an open decision, not silently assumed | Done -- Section 13 |

### E. Deployment, Tests, HITL Signoff

| # | Check | Status |
|---|---|---|
| 31 | Deployment-target ambiguity (new Vercel project vs. route group in existing one) is named as an open decision with a stated default and reversal path | Done -- Section 8, Section 13 |
| 32 | No production deploy performed or required by this sprint | Done -- doctrine-only sprint, no deploy step in Section 15 |
| 33 | Lightweight verification (`git status --short`, `pnpm run typecheck`) run and reported, not assumed | Pending -- see Section 15 |
| 34 | No test suite claims are made about X Lite functionality that does not exist | Done -- this document makes no such claims |
| 35 | Actionables for XL-1 through XL-3 each carry an explicit evidence-required field, not just a description | Done -- Section 10 |
| 36 | Founder/HITL decision list is presented as blocking XL-1's *start* where relevant, not blocking this doctrine's completion | Done -- Section 13 |
| 37 | Sprint plan (XL-1/XL-2/XL-3) is consistent with the roadmap's own XL-1/XL-2/XL-3/XL-4 breakdown, not a competing plan | Done -- Section 11 |
| 38 | Risk list names the two most likely near-term failure modes (X0 degradation, demo leakage) first | Done -- Section 12 |
| 39 | This document itself has not been marked "complete" without the founder's own review | Open -- founder review is the actual completion event, not this document's existence |
| 40 | ACTIONABLES_READINESS_MATRIX.md cross-referenced, not duplicated wholesale | Done -- Section 16 |

---

## 10. Actionables

ID prefix `XLA` (AXXESS Lite Actionable) used throughout to avoid collision with both the roadmap's `XL-0`..`XL-4` sprint IDs and the existing `A-XX` IDs in `ACTIONABLES_READINESS_MATRIX.md`.

| ID | Actionable | Surface affected | Owner | Evidence required | Completion criteria | Status |
|---|---|---|---|---|---|---|
| XLA-01 | Founder decision on route/app-shell strategy: `src/app/lite/*` vs. `apps/lite-web` | X Lite Web | Founder (decision), Claude Code (spike) | Written founder decision recorded in this doc or a successor | Decision recorded and cross-referenced in Section 8's ADR | Blocked -- awaiting founder decision |
| XLA-02 | Build the X Lite navigation manifest (separate from `appRoutes`) | X Lite Web | Claude Code | New file (e.g. `src/app/lite/routing/liteRoutes.ts`) with its own type, reviewed against `routes.ts` for zero accidental overlap | File exists, contains only Section 6.1's inclusion list, and a test asserts it contains none of Section 6.2's exclusion list | Planned |
| XLA-03 | Create the first X Lite route entry point that renders independently of `App.tsx` | X Lite Web | Claude Code | New route file(s) under the chosen path from XLA-01 that do not import `workspace-page.tsx` | A test renders the new route and asserts the X0 sidebar/TopBar/DashboardSection are not in the tree | Planned |
| XLA-04 | Design and build the X Lite onboarding flow (signup, create org, choose business type) | X Lite Web | Claude Code | New onboarding component(s), distinct from `EnterpriseOnboardingPage.tsx` | A new tenant can complete X Lite onboarding without touching any `src/app/onboarding/*` enterprise route | Planned |
| XLA-05 | Build the X Lite home/dashboard component | X Lite Web | Claude Code | New component consuming a small, named set of shared repository calls (tasks/meetings/documents counts, not the tile-scoring engine) | Component renders with real tenant data and does not import `DashboardSection.tsx`, `ScoredTile.tsx`, `TileGrid.tsx`, or `TenantHealthCommandCenter.tsx` | Planned |
| XLA-06 | Wire X Lite Tasks screen to the shared tasks repository | X Lite Web | Claude Code | New lightweight component; existing `tasksRepository` reused | Tasks created in X Lite are visible (with correct tenant scope) via the same repository X0 uses -- proven by a shared-repository-level test, not a UI screenshot alone | Planned |
| XLA-07 | Wire X Lite Reminders/Follow-ups to the shared meetings/follow-ups repository | X Lite Web | Claude Code | New lightweight component | Same evidence pattern as XLA-06, for meetings/follow-ups | Planned |
| XLA-08 | Wire X Lite Files to shared document storage/extraction | X Lite Web | Claude Code | New lightweight component, reuses existing upload/extraction endpoints | A file uploaded via X Lite is retrievable and (if extraction is wired) extracted, verified against the same repository X0 uses | Planned |
| XLA-09 | Wire X Lite Contacts to the shared stakeholders/CRM repository | X Lite Web | Claude Code | New lightweight component | Same evidence pattern as XLA-06/07, for contacts | Planned |
| XLA-10 | Build "Ask AXXESS Lite" as a simplified-mode UI over the existing RAG pipeline | X Lite Web | Claude Code | New component; explicit honest-pending-state copy if a given query mode is not wired | Answers are grounded in the same RAG service X0 uses, or the UI honestly states the capability is not yet available -- never a fabricated answer | Planned |
| XLA-11 | Resolve the `isDemoModeEnabled()` global-flag coupling before any shared feature component is reused inside X Lite | X Lite Web, Investor Demo (isolation) | Claude Code | Either a per-surface override mechanism or a refactor of the affected shared components (`TasksSection.tsx`, `DocumentsSection.tsx`, `KnowledgeHubSection.tsx`, `StakeholdersSection.tsx`, and any new equivalents X Lite reuses) to accept demo-mode as an explicit prop/context | A test proves an X Lite tenant session can never observe Investor Demo's seeded dataset or demo-mode banner state, regardless of `localStorage` state on the device | Planned -- **should land before XLA-06 through XLA-10 reuse any shared section component directly**, or those components must be reused only at the repository/service layer, not the section-component layer, until this lands |
| XLA-12 | Decide and configure the X Lite Web deployment target | X Lite Web | Founder (decision), Claude Code (execution) | New Vercel project or a routing/env discriminator on an existing one, documented like the existing three-project architecture already recorded in this program's memory | Deployment target named, and a real deploy of the X Lite route tree succeeds and is reachable at a stated URL | Blocked -- awaiting founder decision (Section 13) |
| XLA-13 | Decide which existing mobile codebase (Expo `apps/mobile` or Capacitor `apps/mobile-capacitor`) maps to X0 Mobile, and whether a second target is needed for either | Both mobile surfaces | Founder (decision) | Written founder decision | Decision recorded in this doc or a successor doctrine update | Blocked -- awaiting founder decision (Section 13) |
| XLA-14 | Add a second Capacitor configuration (or build-time discriminator) pointing `server.url` at the X Lite route path | X Lite Mobile | Claude Code | New Capacitor config or env-driven discriminator in `apps/mobile-capacitor` | A Capacitor build loads the X Lite route tree, not the full X0 shell, verified by inspecting the loaded DOM/route on a real or real-device-equivalent test | Planned -- depends on XLA-03 and XLA-01 |
| XLA-15 | Define the low/mid-range Android device compatibility checklist, explicitly naming Xiaomi and Vivo | X Lite Mobile | Claude Code (checklist), Founder/HITL (execution) | Named device list, real or real-device-equivalent test plan | Checklist document exists and at minimum one Xiaomi and one Vivo device (or an equivalent verified emulator/cloud-device profile) is actually tested against, with results recorded | Planned |
| XLA-16 | Map pricing/trial/free-year rules (roadmap Section 5's cohort table) to exact technical requirements for X Lite's billing path | X Lite Web (payments) | Founder (pricing decision), Claude Code (technical mapping) | Written technical requirements doc (signup-order counter, trial-clock, discount state machine) | Requirements doc exists and is reviewed against `enterpriseConnectorVault.ts`'s current payments-connector capability | Planned |
| XLA-17 | Write the X0 regression checklist that XL-1 must pass before merge | X0 Web (protection) | Claude Code | New checklist document or section, naming the exact X0 pages/flows that must be re-verified unchanged after any X Lite route is added | Checklist exists and is run at the end of XL-1, with pass/fail evidence recorded | Planned |
| XLA-18 | Write the Investor Demo isolation checklist for the X Lite era | Investor Demo (protection) | Claude Code | New checklist document, extending the existing demo-isolation discipline already in `ACTIONABLES_READINESS_MATRIX.md` (A-88 scope note) to explicitly cover X Lite | Checklist exists and is run at the end of XL-1, with pass/fail evidence recorded | Planned |
| XLA-19 | Write the X Lite self-serve test suite proving Section 6.2's exclusions are structurally enforced, not just documented | X Lite Web | Claude Code | Automated tests (e.g. `render()` + `queryByText`/`queryByRole` assertions, and/or a static import-graph check) proving X Lite's bundle/tree never includes `DashboardSection`, `TenantHealthCommandCenter`, `BetaReadinessSection`, any `src/app/admin/*` route, or demo-mode components | Tests exist, pass, and are run in the standard verification suite (`pnpm run test`) alongside every other suite in this repository | Planned |
| XLA-20 | Founder walkthrough of the completed XL-1 slice against Pilot User 1's original critique | X Lite Web | Founder (HITL), Claude Code (facilitation) | Recorded walkthrough notes, explicit founder statement of whether the slice answers the 70-80% simplification ask | Founder sign-off recorded in the XL-1 closeout document | Planned -- gated on XL-1 completion |
| XLA-21 | Add host-based route restriction so the Lite Vercel project cannot serve X0 routes (e.g. `<lite-domain>/dashboard`) even though it's the same Next.js app | X Lite Web, X0 Web (protection) | Claude Code | Middleware change (extending `src/proxy.ts`'s existing host-aware redirect logic) or a Vercel-level rewrite/redirect rule scoped to the Lite project | A request to any non-`/lite` path on the Lite domain redirects or 404s rather than serving X0 content; a test proves this | **Done, code + tests (2026-08-05)** -- `getLiteHostRedirectUrl()` added to `src/proxy.ts`, wired into `proxy()`, 6 new tests in `src/proxy.test.ts` (all pass, alongside the pre-existing 29). **Not yet redeployed** to `triaxis-product-lite-web` as of this update -- the live deployment verified earlier this session still predates this fix. |

Fifteen to twenty-five actionables were requested; twenty-one are listed above (twenty from XL-0, one added during XL-1's own spike), spanning XL-1 (route/nav/shell), XL-2 (daily-use loop wiring), and XL-3 (payments/mobile/deployment) scope, plus the two protective checklists (XLA-17/18) and the founder-facing decisions (XLA-01, XLA-12, XLA-13) that gate the others. As of XL-0 none were marked `Ready` or `Done`, since XL-0 was a doctrine-only sprint; XL-1's own status update is recorded in this document's Section 8 ADR addendum and in `docs/readiness/AXXESS_LITE_PRODUCT_SURFACE_ROADMAP_2026_08_05.md`'s Section 9 checklist, not by rewriting this table's `Status` column sprint-by-sprint (that would require reconciling two sources of status truth; the checklist in the roadmap document is the authoritative per-sprint status tracker going forward, this table remains the actionable definitions).

---

## 11. Sprint Plan

The roadmap document already defines five sprints (XL-0 through XL-4); this doctrine's required structure asks for three implementation sprints after XL-0. These map directly onto the roadmap's XL-1/XL-2/XL-3 (the roadmap's XL-4, "Regression, Evidence, and Founder Walkthrough," is retained as a fourth, final sprint in the roadmap and is not dropped by this document -- it is simply outside the "three sprints after XL-0" scope this doctrine document was asked to summarize).

- **XL-1: Lite shell and navigation.** Actionables XLA-01 through XLA-05, XLA-11 (demo-mode isolation must land in this sprint, not be deferred, per XLA-11's own note), XLA-17, XLA-18, XLA-19. Exit criteria (from the roadmap, unchanged): X0 Web still builds and behaves unchanged; Demo still builds and keeps seeded data isolated; X Lite renders independently with a small navigation footprint.
- **XL-2: Lite daily-use loop.** Actionables XLA-06 through XLA-10. Exit criteria (from the roadmap, unchanged): a small customer can complete one full daily loop without seeing enterprise-only surfaces; each write uses shared repositories and tenant scope; audit logging remains intact for material writes.
- **XL-3: Lite payments, packaging, and mobile target.** Actionables XLA-12 through XLA-16. Exit criteria (from the roadmap, unchanged): X Lite has a deployment plan separate from X0 and Demo; X Lite Mobile is not wrapping the full X0 console; payment path has exact implementation requirements, even if not live yet.
- **(XL-4, carried from the roadmap, not re-scoped here): Regression, Evidence, and Founder Walkthrough.** Actionable XLA-20 and the roadmap's own XL-4 deliverable list.

---

## 12. Risks

- **Accidental X0 degradation.** The single greatest risk given this program's own recent history (this session's own Analytics-page/Executive-Dashboard tile-duplication defect, corrected same-day) is that reusing shared components without a hard boundary silently changes X0's behavior. Mitigated by ADR-XL-0-01 rejecting the "filtered view of X0" approach specifically because of this risk, and by XLA-17's X0 regression checklist.
- **Accidental demo leakage.** `isDemoModeEnabled()`'s global, unscoped nature (Section 14.10) is a structural risk to both X0 and X Lite if not resolved before shared components are reused. Mitigated by XLA-11 and XLA-18.
- **Two products increasing maintenance burden.** A second experience shell is, by definition, more surface area to maintain. Mitigated only partially by the shared-core doctrine (Section 4) -- this is a real, ongoing cost the founder should weigh explicitly, not a risk this document can eliminate.
- **Lite underpowered versus over-simplified.** Pilot User 1's feedback asks for 70-80% simplification, not zero capability -- an X Lite that is too thin to be useful (e.g. "Ask AXXESS Lite" that can never answer anything, or a Files feature with no real extraction) would fail the same customer segment for the opposite reason. XLA-10's honest-pending-state requirement is the specific mitigation for the AI-answer case; the daily-use-loop exit criteria in Sprint XL-2 is the general mitigation.
- **Payments not ready.** X Lite's self-serve commercial motion depends on a billing state machine that does not exist yet (roadmap Section 5, XLA-16). Until XLA-16 lands, X Lite cannot honestly claim a self-serve commercial path, only a self-serve product-usage path.
- **Mobile store credential blockers.** This program's existing, independently-tracked D-U-N-S Number blocker (applied 2026-07-13, ~30-day TAT) already blocks company-name mobile store release generally -- this applies to X Lite Mobile's eventual store release exactly as it applies to X0 Mobile's, and is not a new risk introduced by this doctrine, just one that now also gates a second product surface's store release.
- **Analytics privacy conflict.** Section 4 flags that X Lite's less technical, more privacy-sensitive small-business/NGO users may need a different analytics posture than X0's enterprise users, and this is explicitly not resolved by this document (Section 13).
- **Unclear pricing boundary.** The roadmap's cohort table (Section 5) and the Rs. 5,000/year figure discussed with Pilot User 1 (LOIS log entry 2) versus the ₹12L+/₹60L+ enterprise figures reported to Plug and Play UAE (`PITCH_AND_TRACTION_LOG_2026_07_24.md` entry 10) are two very different price points for two different surfaces -- if X Lite and X0 pricing are not clearly bounded and communicated separately, a self-serve X Lite customer could end up quoted enterprise pricing, or vice versa. Not resolved by this document; listed in Section 13.

---

## 13. Founder/HITL Decisions Needed

These are named explicitly so that no future Claude/Codex session assumes an answer that was never actually given. This document is not blocked on these decisions -- it states the doctrine and boundary so that whichever way each decision goes, the architecture underneath it does not need to be redesigned.

1. **Route/app-shell strategy for X Lite Web:** `src/app/lite/*` inside the current Next.js app (roadmap's default recommendation, adopted by this doctrine's ADR as the starting choice) versus a separate `apps/lite-web` workspace member from the start. XLA-01.
2. **Deployment target for X Lite Web:** a new, fourth Vercel project (parallel to `triaxis-www-frontend-import`, `triaxis-product-investor-demo`, and `axxesstriaxis`, per this program's own already-documented three-project architecture) versus a routing/environment discriminator inside an existing project. XLA-12.
3. **Which existing mobile codebase is X0 Mobile:** `apps/mobile` (Expo/React Native, its own native-UI screens) or `apps/mobile-capacitor` (Capacitor wrapper around the hosted web app) -- and whether both are meant to persist long-term, or one was a superseded experiment. This materially changes what "X Lite Mobile, built on a Capacitor base" (Section 2.5) means in practice if the intended long-term mobile strategy is actually the Expo app. XLA-13.
4. **Analytics privacy posture for X Lite.** Whether X Lite's typically less technical, more privacy-sensitive small-business/NGO/startup users should see a different (likely more conservative) analytics-tracking posture than X0's enterprise users, and if so, what specifically differs.
5. **Pricing boundary communication.** How the Rs. 5,000/year figure already discussed with Pilot User 1 and the much higher enterprise figures discussed with GCC/investor audiences are kept clearly separated in practice once both a self-serve X Lite signup flow and an enterprise sales motion exist side by side in the same product.
6. **X Lite's exact plan/tier structure**, beyond the roadmap's "first 300 signups get 1 year free" cohort rule -- is there a single X Lite price point, or multiple tiers within X Lite itself, and does that interact with the free-year/trial cohort table.
7. **Whether X Lite gets its own support/feedback triage path** or feeds into the same Feedback Inbox/support pipeline X0 uses today, undifferentiated by surface.
8. **Timing relative to X0's own current beta priorities** -- whether XL-1 begins immediately alongside the existing beta-readiness/QA3 program work, or is sequenced after specific X0 milestones the founder considers higher priority right now.

---

## 14. Required Codebase Audit (Read-Only)

This section records the findings of a read-only structural audit performed for this sprint (no files were modified to produce these findings). All paths are relative to the repository root.

### 14.1 `src/app` route tree

Top-level segments under `src/app` (Next.js App Router, file-based): `admin/` (23 role-protected sub-routes: ai-governance, audit-logs, backups, beta-readiness, compliance, departments, execution-runs, invitations, mobile-release, model-policy, organization, pilot-command-center, pilot-conversion, plugin-runtime, privacy, product-analytics, prompt-approvals, roles, support-ops, usage-limits, users, workspaces), `ai-workspace/review-inbox/`, `alerts/`, `analytics/`, `api/` (30+ route groups), `app/`, `approvals/`, `auth/` (forgot-password, login, mfa, reset-password, security, sign-up), `crm/`, `dashboard/`, `documents/`, `integrations/`, `knowledge/`, `layout/` (components, not a route), `layout.tsx` (root layout), `meetings/`, `navigation.ts`, `onboarding/` (complete, create-organization, join-organization, sector, security, workspace), `page.tsx` (marketing/root page), `programs/`, `projects/`, `routing/` (components, not a route), `settings/` (account, privacy, security), `stakeholders/`, `tasks/`, `workflow-records/[recordType]/`.

**No Next.js route groups (`(name)` syntax) exist anywhere in the codebase today.** There is no existing route-group convention to follow or to accidentally collide with.

`src/app/page.tsx` (the root `/`) is a standalone static marketing page with its own copy, linking out to `landing.triaxisventures.com`/`investor.triaxisventures.com` -- it does not import the authenticated app shell at all. Every other top-level segment's `page.tsx` (dashboard, tasks, stakeholders, meetings, documents, knowledge, analytics, settings, crm, projects, programs, alerts, integrations, admin, app) is a one-line re-export of the same `WorkspacePage` component. `src/app/workspace-page.tsx` wraps `AnalyticsProviderShell` + `AuthProvider` + `src/app/App.tsx`, which is a client-side SPA router that swaps in a lazily-loaded feature-section component inside one persistent `AppShell`, based on the active route. So although Next.js sees roughly twenty separate file-route segments, at runtime they render the same React tree. `auth/`, `onboarding/*`, and `settings/account/delete` are the exceptions, each with dedicated page components rather than the shared SPA shell.

There is no existing `/admin` layout-level split -- `admin/page.tsx` also renders `WorkspacePage`/`App.tsx`; admin routes are gated by role checks inside the same shell, not a separate layout.

### 14.2 `src/app/layout`

Contents: `AppShell.tsx`, `Sidebar.tsx` (+test), `TopBar.tsx` (+test). There is exactly one Next.js root layout (`src/app/layout.tsx` -- `<html>/<body>`, metadata, analytics scripts), and it has no knowledge of the sidebar/TopBar. The actual application chrome is wired into `App.tsx` (not into Next.js layout nesting) -- `AppShell.tsx` is a plain composition component (`Sidebar` + `TopBar` + `<main>{children}</main>` + `BetaFeedbackButton`) invoked directly by `App.tsx`.

**Consequence confirmed for this doctrine:** because the shell is hard-wired into `App.tsx`, a new route segment cannot opt out of it via a route group (none are in use) -- it must simply not import `workspace-page.tsx`/`App.tsx` in the first place. `layout.tsx` itself is generic enough to be reused unmodified by a new X Lite route segment.

### 14.3 `src/app/routing`

`routes.ts` is the central route registry (`export const appRoutes: AppRoute[]`), with entries shaped `{ id, section, path, label, module, description, access, requiresAuth, requiredRoles? }`, covering every X0 section including all role-protected `admin/*` routes. It also exports `routeForSection`, `routeForPath`, `sectionFromPath`, `sectionFromHash`, `defaultSectionForRole`. `lazyRoutes.tsx` maps each nav section to a `React.lazy()`-loaded component, consumed by `App.tsx`. `RouteBoundary.tsx` wraps the active section in an error boundary/suspense and renders an access-restricted fallback on failed role checks. `useAppRouting.ts` drives active-section state from the URL.

No separate Lite-specific registry exists, confirming this doctrine's premise that one must be built new (XLA-02), not derived by filtering `appRoutes`.

### 14.4 `src/features/dashboard`

Files: `DashboardSection.tsx` (+tests), `DashboardTier.tsx` (+test), `ScoredTile.tsx`, `TileGrid.tsx` (+test), `TierUrgentBar.tsx` (+test), `UrgentAttentionBarStack.tsx`, `SampleDataBanner.tsx` (+test), `components/KpiCard.tsx`, `data.ts` (+test), `types.ts`, `useDashboardSnapshot.ts`, `dashboardIntelligence.test.ts`. The tile-scoring/policy engine lives in `src/services/dashboard/` (`tileScoring.ts`, `tilePolicies.ts`, `buildDashboardSnapshot.ts`, `mailDashboardSignals.ts`), plus `src/components/ui/CriticalityBadge.tsx`.

`DashboardSection.tsx` imports `EnterpriseWorkflowJourney`, `TenantHealthCommandCenter`, `WorkflowTimelinePanel` (from `src/components/enterprise/`), plus golden-path/guided-demo hooks and `BetaOnboardingChecklist`. This module is named explicitly in Section 6.2 as excluded from X Lite by default.

### 14.5 `src/features/beta-readiness`

Files: `BetaReadinessSection.tsx` (+test), `betaReadinessSnapshot.ts`. Routed at `src/app/admin/beta-readiness/`, role-protected to Super Admin/Organization Admin per `routes.ts`. This is confirmed internal/HITL readiness tooling -- named explicitly in Section 6.2 as never to be imported into a Lite bundle or exposed to Lite customers.

### 14.6 `src/features/onboarding`

Files: `EnterpriseOnboardingPage.tsx` (+test) -- the enterprise onboarding wizard; `BetaOnboardingChecklist.tsx` (+test) -- a dashboard-embedded checklist widget; `onboardingProgress.ts`. Supporting data in `src/onboarding/enterpriseOnboarding.ts` defines `enterpriseOnboardingSteps` matching the `src/app/onboarding/*` route folders (organization, invite_team_member, role_assignment, first_project, upload_document, first_ai_question, first_task, first_approval, view_audit_trail, send_feedback), and imports `axxessBetaRoles`/`axxessSectors`/`requiredOnboardingNotices` from `packages/shared/src`.

Confirmed enterprise-oriented in shape: sector selection, organization creation/joining, a multi-step workspace-setup wizard, role assignment, and compliance-notice gating -- not a lightweight self-serve signup. X Lite's onboarding (XLA-04) must be built new, not derived from this wizard.

### 14.7 Shared feature folders: `tasks`, `meetings`, `documents`, `knowledge-hub`, `stakeholders`

`documents` and `knowledge-hub` are confirmed as two separate, independently existing feature folders (not one folder under two names), each with its own route entry in `routes.ts` (`documents` and `knowledge`).

| Feature | Main file(s) | Key coupling |
|---|---|---|
| `src/features/tasks/TasksSection.tsx` (+agentic test) | `applicationServices`, `tenantScopeFromUser`, `useAnalytics`, `readAndClearAgenticDraft`, `isDemoModeEnabled`, `components/enterprise` (`DataStateBadge`, `DemoDataNotice`, `ModuleHeader`, `PageShell`, `TenantScopeBadge`, `WorkflowStepCard`) |
| `src/features/meetings/MeetingsSection.tsx` (+test) | `applicationServices`, `tenantScopeFromUser`, `useAnalytics`, `readAndClearAgenticDraft` -- lighter, no `components/enterprise` import |
| `src/features/documents/DocumentsSection.tsx` (+test) | `applicationServices`, `tenantScopeFromUser`, `isDemoModeEnabled`, `WorkflowTimelinePanel`, `useWorkflowTimeline` |
| `src/features/knowledge-hub/KnowledgeHubSection.tsx`, `knowledgeHubData.ts` | `applicationServices`, `tenantScopeFromUser`, `isDemoModeEnabled`, `components/enterprise` barrel, `buildRagIngestionRecord`, `ragIndexStages` |
| `src/features/stakeholders/StakeholdersSection.tsx` (+test) | `applicationServices`, `tenantScopeFromUser`, `isDemoModeEnabled`, `demoStakeholderCards`, `components/enterprise`, `readAndClearAgenticDraft` |

Common coupling across all five: `applicationServices`, `tenantScopeFromUser`, `useAuth`, `useAnalytics`, and, in four of the five, the `src/components/enterprise` barrel and `isDemoModeEnabled()`. This confirms Section 4's shared-core layer (`applicationServices`/`tenantScopeFromUser`) is real and reusable, while the `components/enterprise` barrel and the global demo-mode flag are the specific coupling points XLA-11 must resolve before these section components (as opposed to their underlying repositories) can be safely reused inside X Lite.

### 14.8 `apps/mobile` vs. `apps/mobile-capacitor`

Both are real and materially different, not a duplicate/stale pair.

- **`apps/mobile`** -- an Expo/React Native app (`@axxess/mobile`, expo-router), with its own native-UI screens (`app/{_layout,index,ai-workspace,approvals,beta-feedback,dashboard,documents,knowledge,login,notifications,onboarding,privacy,projects,security,settings,sign-up,tasks}.tsx`), depending on `@axxess/shared`. Per its own README, this is a "Sprint 13 Expo beta app scaffold for iOS and Android," built/deployed via EAS -- a genuinely separate native-UI codebase, not a web-app wrapper.
- **`apps/mobile-capacitor`** -- the actual Capacitor wrapper, with real native projects at `apps/mobile-capacitor/android/` and `apps/mobile-capacitor/ios/`. Its `capacitor.config.ts`:
  ```ts
  appId: process.env.CAPACITOR_APP_ID || process.env.ANDROID_APPLICATION_ID || process.env.IOS_BUNDLE_IDENTIFIER || 'com.triaxis.axxess'
  appName: 'AXXESS TRIaxis'
  webDir: '../../dist'
  server: {
    url: process.env.CAPACITOR_SERVER_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://app.axxess.dev',
    cleartext: false,
    allowNavigation: (process.env.CAPACITOR_ALLOWED_HOSTS || 'app.axxess.dev,localhost,127.0.0.1').split(','),
  }
  ```
  `server.url` points at a hosted origin (defaulting to `https://app.axxess.dev`), confirming this Capacitor shell wraps the full deployed web app over the network rather than bundling its own compiled UI -- `server.url` takes precedence over the local `webDir` content per Capacitor's own runtime behavior. Build scripts in `apps/mobile-capacitor/package.json` (`@axxess/mobile-capacitor`, v0.6.0-beta): `sync`/`sync:android`/`sync:ios`, `copy`, `android`/`ios` (`cap open`), `doctor` (`cap doctor`), `build:android`/`build:ios`/`build:all`, `build:android:store`/`build:ios:store`.

**Implication confirmed for Section 2.5/7:** because the Capacitor shell only points `server.url` at a hosted origin, an X Lite Mobile target is structurally plausible as a second Capacitor configuration pointing at a different route path on the same origin, without necessarily requiring a second native Xcode/Android Studio project -- provided a real X Lite route tree exists server-side to point at first (XLA-03 before XLA-14).

### 14.9 Root `package.json` / workspace tooling

Package manager: pnpm workspaces (`packageManager: "pnpm@11.7.0"`). `pnpm-workspace.yaml` spans `.` (root), `apps/*`, `packages/*` -- so `apps/mobile` and `apps/mobile-capacitor` are already first-class workspace members. Root `package.json` name `axxess-enterprise-saas`, version `0.6.0-beta`. Core scripts (`dev`/`build`/`start`) build a single Next.js app -- there is no existing multi-app Next.js build matrix. Extensive `mobile:*` namespaced scripts already exist for both mobile codebases (Capacitor sync/build/store-release, Expo/EAS build/credentials/workflow). Also present: `vercel:deploy:preview`/`vercel:deploy:production`, `release:preflight`, `release:ready`.

**Assessment:** the monorepo tooling already supports building/deploying two mobile surfaces as workspace members, but there is only one deployable Next.js web app today. Adding X Lite Web as a route tree inside the existing app (this doctrine's adopted default, per Section 8's ADR) requires no new workspace/script plumbing; adding it as a fully separate deployable (`apps/lite-web`) would require new scripts, consistent with the ADR's stated reversal-condition framing.

### 14.10 Demo-mode boundary

Lives in `src/demo/demoMode.ts` (plus `demoDashboardSignals.ts`, `demoDataset.ts`, `demoRepositories.ts`, `emptyRepositories.ts`, `demoMode.test.ts`). Key exports: `isDemoModeEnabled()` (env override first, else a client-only `localStorage` flag `axxess.demoMode.enabled`), `demoSessionCookieName` (a non-httpOnly marker cookie recognized by the edge proxy, explicitly never used for real authorization), `demoOrganization`/`demoUserContext` (the seeded Investor Demo tenant, "North East Health Mission," and its seeded admin user), `cleanTenantUserContext` (a separate non-demo seeded context), `getRuntimeMode(isAuthenticated)`, `isDemoLogin(email, password)` (hardcoded demo credential matcher).

Consumers observed calling `isDemoModeEnabled()` directly include `DashboardSection.tsx`, `TasksSection.tsx`, `DocumentsSection.tsx`, `KnowledgeHubSection.tsx`, `StakeholdersSection.tsx`, and `components/demo/GuidedDemoBanner` (used in `App.tsx`) -- i.e., it is threaded through most of the shared feature sections audited in 14.7 directly, not gated behind a single boundary.

**Confirmed structural risk (this is why XLA-11 exists and is gated to land in XL-1, not deferred):** because `isDemoModeEnabled()` is a global, unscoped flag with no tenant/product-surface awareness, and because the shared feature-section components call it directly rather than receiving it via a scoped prop/context, an X Lite surface that reuses these same section components as-is would, by construction, inherit whatever Investor Demo's seeded-data toggle happens to be on that browser/device -- unless this is explicitly intercepted before reuse.

---

## 15. Verification (This Sprint)

Per this sprint's own instruction to run only lightweight verification unless documentation tooling requires more, and per the non-negotiable that no implementation code is to change in this sprint:

- `git status --short` -- run and reviewed both before and after writing this document. This sprint's own changes are exactly three files: this new document, `docs/readiness/AXXESS_LITE_PRODUCT_SURFACE_ROADMAP_2026_08_05.md` (one companion-document cross-reference note added), and `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` (one scope note added). All other untracked files shown by `git status --short` predate this sprint and are not part of it.
- `pnpm run typecheck` -- run: `tsc --noEmit` completed with zero output, i.e. a clean pass. Expected, since no application source file was changed by this sprint -- recorded as actually run, not assumed.
- No `pnpm run test`, `pnpm run lint`, or `pnpm run build` was required or run for this sprint, since no application source file was modified -- only documentation.
- No deploy was performed or requested for this sprint.

---

## 16. Cross-References to Existing Program Documents

- `docs/readiness/AXXESS_LITE_PRODUCT_SURFACE_ROADMAP_2026_08_05.md` -- the founder-scoped product/roadmap document this doctrine expands; not duplicated, only extended with the codebase audit, ADR, and founder-decisions list it did not itself carry.
- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` -- the existing QA3/beta-readiness actionables matrix, which this document does not merge into. A short scope note has been added there (see this sprint's commit) pointing to this doctrine, rather than importing all twenty `XLA-*` actionables into that matrix's own `A-*` numbering and Yes/Blocked/No vocabulary, since XL-0 actionables are pre-implementation planning items, not yet-evidenced product claims in the sense that matrix tracks.
- `docs/LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md` entry 2 -- the exact, verbatim source of Pilot User 1's feedback quoted in Section 1.
- `docs/readiness/PITCH_AND_TRACTION_LOG_2026_07_24.md` entries 10, 11, 29 -- referenced in Sections 3 and 13 for GCC/MENA strategic framing and pricing context.
- `MONOREPO_ARCHITECTURE_AND_BUSINESS_MODEL.md` S4 -- referenced in Section 4 for the payments-connector infrastructure X Lite billing would reuse.
