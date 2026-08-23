# AXXESS TRIaxis -- Mobile-Native Capacitor Sprint Prompts

Date: 2026-08-23

Status: Ready for Claude Code execution. Planning only; no product code changed by this document.

Related roadmap: `docs/readiness/MOBILE_NATIVE_CAPACITOR_RESEARCH_AND_ROADMAP_2026_08_23.md`

## Sprint MN-1 Prompt

```text
Claude Code Prompt -- Mobile Native Sprint MN-1: Capacitor Shell, Navigation, and Product Boundary

You are working on AXXESS TRIaxis by Triaxis Ventures Private Limited.

Canonical workspace:
C:\Users\Sudipta Sarmah\OneDrive - State Bank of India\Documents\AXXESS-TRIAXIS

Sprint name:
Mobile Native Sprint MN-1: Capacitor Shell, Navigation, and Product Boundary

Objective:
Make the current Capacitor Android/iOS surface stop feeling like a wrapped desktop web app by creating a mobile-specific product shell, navigation contract, and boundary guard while retaining Capacitor, the existing backend, tenant isolation, auth, RBAC, RAG/HITL, audit logs, and monorepo architecture.

Do not rewrite native.
Do not fork the backend.
Do not break X0 Web, Investor Demo, AXXESS Lite, or existing mobile build scripts.

Context:
AXXESS has separate product surfaces:
- X0 Web: full enterprise console for GCC/larger organizations.
- X0 Mobile: should become a companion/remote command app for existing enterprise users.
- AXXESS Lite Web/Mobile: India self-serve surface.
- Investor Demo: isolated populated demo surface.

The current Capacitor app feels too web-wrapped because it likely carries too much desktop shell, dashboard density, sidebar behavior, and full X0 feature surface into mobile.

Required reading before coding:
- docs/readiness/MOBILE_NATIVE_CAPACITOR_RESEARCH_AND_ROADMAP_2026_08_23.md
- docs/readiness/MOBILE_RELEASE_READINESS_KANBAN_2026_07_27.md
- docs/readiness/MOBILE_STORE_CREDENTIALS_AND_DUNS_DEPENDENCY_2026_07_24.md
- docs/readiness/AXXESS_LITE_DOCTRINE_AND_SURFACE_CONSTITUTION_2026_08_05.md
- docs/readiness/AXXESS_LITE_CAPACITOR_TARGET_SETUP_2026_08_05.md
- docs/readiness/AXXESS_LITE_XL4_HOST_RUNTIME_GATE_CLOSEOUT_2026_08_05.md
- docs/readiness/XL5_LITE_WORKSPACE_EXTRACTION_PHASE1_CLOSEOUT_2026_08_06.md
- package.json
- pnpm-workspace.yaml
- vite.config.ts
- index.html
- src/main.tsx
- src/app/App.tsx
- src/app/layout/AppShell.tsx
- src/app/layout/TopBar.tsx
- apps/mobile-capacitor/*
- apps/mobile-lite-capacitor/*
- capacitor config files
- existing mobile scripts and tests

If any file is missing, document it and continue.

Product boundary:
X0 Mobile should include:
- Command Home
- Tasks
- Reminders
- Meetings
- Approvals
- AI Workspace mobile ask/catch-up
- Documents and Knowledge Hub mobile access
- Projects and Programs summary/detail
- CRM and Stakeholder quick notes
- Audit and Compliance summary/export
- Settings/profile/account basics
- Notifications and pending reviews

X0 Mobile must exclude:
- full Executive Dashboard
- Golden Path
- Social Alerts
- large stakeholder maps
- complex analytics
- full integration catalogue
- full admin command center
- store release console
- pilot command center
- customer success live ops
- complex audit tables
- heavy agentic control plane
- Investor Demo data or controls
- Lite-only assumptions

Required work:
1. Audit current mobile/Capacitor entrypoints.
   - Identify what route/shell the Capacitor build currently loads.
   - Identify whether it imports the desktop AppShell, TopBar, sidebar, dashboard, or demo code.
   - Document findings in the closeout.

2. Create a mobile product doctrine doc:
   - docs/readiness/MOBILE_NATIVE_CAPACITOR_MN1_SHELL_BOUNDARY_CLOSEOUT_2026_08_23.md
   - Include current state, changed files, boundary decisions, tests run, residual risk, and next sprint recommendation.

3. Add a mobile feature registry.
   Suggested path:
   - src/features/mobile/mobileFeatureRegistry.ts
   It must list the approved X0 Mobile surfaces only.
   Include fields:
   - id
   - label
   - route
   - status: live | scaffold | pending
   - mobileSafe
   - tabletSafe
   - requiresNetwork
   - notes

4. Add a mobile shell.
   Suggested paths:
   - src/features/mobile/MobileShell.tsx
   - src/features/mobile/MobileCommandHome.tsx
   - src/features/mobile/MobileBottomNav.tsx
   - src/features/mobile/MobileHeader.tsx
   - src/features/mobile/mobileRoutes.ts

   Requirements:
   - bottom tab navigation;
   - compact mobile header;
   - safe-area-aware layout;
   - no desktop sidebar;
   - no desktop TopBar dependency unless it is refactored into mobile-safe primitives;
   - no full dashboard route;
   - no demo data;
   - no Golden Path;
   - no Social Alerts.

5. Wire the Capacitor entrypoint to the mobile shell in the safest existing pattern.
   - Preserve root web behavior.
   - Preserve Investor Demo behavior.
   - Preserve Lite behavior.
   - If runtime surface detection already exists, reuse it.
   - If not, add a low-risk helper such as AXXESS_SURFACE/mobile target detection, with tests.

6. Add a mobile boundary guard.
   Suggested path:
   - scripts/mobile-boundary-guard.mjs

   The guard must fail if mobile shell/source imports or references forbidden surfaces:
   - src/features/dashboard
   - Golden Path
   - Social Alerts
   - src/demo
   - demoDataset
   - Investor Preview
   - Pilot Command Center
   - Customer Success Live Ops
   - Store Release Console
   - Agent Connections
   - heavy agentic admin/control plane
   - full integration catalogue
   - desktop AppShell/sidebar if directly imported into mobile shell

7. Add root scripts if missing:
   - mobile:native:guard
   - mobile:native:test
   - mobile:native:typecheck
   - mobile:native:ci

   mobile:native:ci should run the mobile guard and targeted mobile tests.

8. Add tests.
   Tests must prove:
   - mobile feature registry exposes only approved surfaces;
   - MobileShell renders bottom navigation;
   - MobileShell does not render desktop sidebar/topbar text;
   - MobileShell does not expose Golden Path/Social Alerts/Demo;
   - mobile boundary guard catches forbidden imports;
   - route/surface helper chooses mobile shell only for mobile target;
   - X0 Web and Demo paths are not changed.

9. Keep UI restrained and practical.
   - Do not create a marketing page.
   - Do not use a decorative hero.
   - This is a working product shell.
   - Use existing design tokens/components where safe.

Verification:
Run:
- pnpm run typecheck
- pnpm run lint
- pnpm run test
- pnpm run build
- pnpm run mobile:native:ci
- pnpm run mobile:capacitor:doctor if available

If full suite is blocked by memory or local environment, run targeted tests and document the exact blocker.

Git:
Stage only relevant files.
Commit with:
git commit -m "feat(mobile): add native Capacitor shell boundary"

Exit criteria:
- Mobile-specific shell exists.
- Mobile feature registry exists.
- Desktop-only/X0-only/Demo-only forbidden surfaces are guarded.
- Capacitor path can point to mobile shell or has a documented low-risk bridge.
- Tests/guards pass or exact blocker is documented.
- Closeout doc exists.

Do not overclaim:
- Do not claim App Store or Play Store readiness.
- Do not claim fully native UX.
- Do not claim performance improvement unless measured.
- Do not claim no leakage unless guard/tests support it.
```

## Sprint MN-2 Prompt

```text
Claude Code Prompt -- Mobile Native Sprint MN-2: Core Mobile Workflows and Tablet Layout

You are working on AXXESS TRIaxis by Triaxis Ventures Private Limited.

Canonical workspace:
C:\Users\Sudipta Sarmah\OneDrive - State Bank of India\Documents\AXXESS-TRIAXIS

Sprint name:
Mobile Native Sprint MN-2: Core Mobile Workflows and Tablet Layout

Objective:
Turn the mobile shell from MN-1 into a usable daily-work companion by implementing the highest-value mobile workflows: Command Home, Tasks, Reminders, Meetings, Approvals, AI Ask/Catch-up, Documents/Knowledge Hub, Projects/Programs summaries, CRM notes, and tablet two-pane layout.

Do not rebuild the full desktop app.
Do not expose forbidden X0/Demo/Lite/admin surfaces.
Do not silently create records without explicit user action.
Do not weaken tenant scoping, RBAC, HITL, or audit rules.

Required reading:
- docs/readiness/MOBILE_NATIVE_CAPACITOR_RESEARCH_AND_ROADMAP_2026_08_23.md
- docs/readiness/MOBILE_NATIVE_CAPACITOR_MN1_SHELL_BOUNDARY_CLOSEOUT_2026_08_23.md
- src/features/mobile/*
- src/features/tasks/*
- src/features/meetings/*
- src/features/projects/*
- src/features/approvals/*
- src/features/ai-workspace/*
- src/features/documents/*
- src/features/stakeholders/*
- relevant repository/service files used by those features

Required work:

1. Build Mobile Command Home.
   It should show:
   - urgent tasks;
   - due reminders;
   - upcoming meetings;
   - pending approvals;
   - recent AI/HITL items if available;
   - quick actions: Ask AI, Add Task, Add Meeting, Upload Document, Add Stakeholder Note.

   Keep it operational and dense enough for repeated use. No hero section.

2. Build mobile Tasks and Reminders.
   Requirements:
   - task list;
   - status update;
   - due date visibility;
   - reminder representation using existing task/due-date model if no reminder entity exists;
   - create/edit flow via bottom sheet or compact form;
   - explicit Save button;
   - no auto-create without user confirmation.

3. Build mobile Meetings.
   Requirements:
   - upcoming meeting list;
   - meeting detail;
   - create/reschedule/cancel affordances only where supported by existing repositories;
   - compact notes/action-items area;
   - no fake calendar sync unless integration is live.

4. Build mobile Approvals.
   Requirements:
   - pending approvals;
   - approve/reject action;
   - payload summary;
   - risk/criticality if available;
   - confirmation for high-impact decisions;
   - audit-safe routing.

5. Build mobile AI Ask/Catch-up.
   Requirements:
   - ask box;
   - recent answer;
   - citations/confidence visible;
   - "Create actionable" handoff where A-79 exists;
   - no complex agentic admin panel;
   - clear low-confidence/HITL state.

6. Build mobile Documents and Knowledge Hub.
   Requirements:
   - document list/search;
   - upload route if already supported by browser/Capacitor path;
   - extraction/indexing status shown honestly;
   - document detail with citation/source metadata if available;
   - no unsupported file promises.

7. Build mobile Projects/Programs summaries.
   Requirements:
   - project list;
   - program/project labels if program entity exists;
   - status/risk/owner where available;
   - detail screen;
   - no full dashboard.

8. Build mobile CRM/Stakeholder quick notes.
   Requirements:
   - stakeholder list/search;
   - quick note add;
   - recent notes;
   - no large stakeholder map.

9. Add tablet layout.
   Requirements:
   - at tablet width, use two-pane list/detail for at least Tasks, Meetings, Documents, and Approvals;
   - keep phone layout single-column;
   - no stretched desktop tables.

10. Add tests.
   Tests must prove:
   - Command Home renders real sections without forbidden surfaces;
   - task status update uses existing path;
   - approval approve/reject flow routes correctly;
   - AI Ask shows confidence/citation/HITL states;
   - document list/detail handles extraction status;
   - stakeholder note flow calls correct API/repository path;
   - tablet layout switches to two-pane;
   - no Golden Path/Social Alerts/full dashboard appear.

11. Documentation.
   Create:
   - docs/readiness/MOBILE_NATIVE_CAPACITOR_MN2_CORE_WORKFLOWS_CLOSEOUT_2026_08_23.md

   Include:
   - what was implemented;
   - what was deferred;
   - whether each workflow is live, scaffolded, or pending;
   - test results;
   - screenshots/manual QA if performed;
   - exact remaining gaps for MN-3.

Verification:
Run:
- pnpm run typecheck
- pnpm run lint
- pnpm run test
- pnpm run build
- pnpm run mobile:native:ci
- pnpm run mobile:capacitor:doctor if available

Git:
Stage only relevant files.
Commit with:
git commit -m "feat(mobile): add native core workflows"

Exit criteria:
- Mobile daily loop works at code level.
- Phone layout is single-column and usable.
- Tablet layout exists for key flows.
- Existing tenant/workflow services are reused.
- No forbidden mobile surfaces exposed.
- Closeout doc exists.

Do not overclaim:
- Do not claim production mobile readiness without device/HITL proof.
- Do not claim store readiness.
- Do not claim native performance without measurement.
```

## Sprint MN-3 Prompt

```text
Claude Code Prompt -- Mobile Native Sprint MN-3: Native Feel, Performance, Android/Tablet QA, and Release Evidence

You are working on AXXESS TRIaxis by Triaxis Ventures Private Limited.

Canonical workspace:
C:\Users\Sudipta Sarmah\OneDrive - State Bank of India\Documents\AXXESS-TRIAXIS

Sprint name:
Mobile Native Sprint MN-3: Native Feel, Performance, Android/Tablet QA, and Release Evidence

Objective:
Make the Capacitor mobile app feel credible on Android phones and tablets by adding native behavior, performance guardrails, mobile QA evidence, and release-readiness documentation while retaining the Capacitor architecture.

Required reading:
- docs/readiness/MOBILE_NATIVE_CAPACITOR_RESEARCH_AND_ROADMAP_2026_08_23.md
- docs/readiness/MOBILE_NATIVE_CAPACITOR_MN1_SHELL_BOUNDARY_CLOSEOUT_2026_08_23.md
- docs/readiness/MOBILE_NATIVE_CAPACITOR_MN2_CORE_WORKFLOWS_CLOSEOUT_2026_08_23.md
- apps/mobile-capacitor/*
- apps/mobile-lite-capacitor/*
- Capacitor config files
- package.json mobile scripts
- existing mobile readiness docs
- src/features/mobile/*

Non-negotiables:
- Keep Capacitor.
- Do not rewrite native.
- Do not break X0 Web, Investor Demo, Lite Web, or Lite Mobile.
- Do not add autonomous mobile actions without explicit approval.
- Do not claim signed-store readiness without credentials/build evidence.
- Do not hide local environment blockers.

Required work:

1. Native behavior pass.
   Add or verify:
   - status bar handling;
   - splash screen handling;
   - keyboard resize/avoidance behavior;
   - Android back button behavior;
   - safe-area handling;
   - haptics for important confirmations only;
   - app foreground/background revalidation where appropriate;
   - external link handling;
   - file/share behavior only if already safe.

   Use Capacitor plugins already present if possible. Add dependencies only if necessary and low risk.

2. Mobile interaction polish.
   Add:
   - pull-to-refresh on high-value lists;
   - bottom sheets for create/edit actions;
   - action sheets for row actions;
   - clear loading states;
   - clear empty states;
   - clear error states;
   - offline/network-unavailable messaging;
   - retry buttons where safe.

3. Performance and memory guardrails.
   Investigate bundle and runtime risks.
   Add or document:
   - no full desktop dashboard imported into mobile bundle;
   - no complex analytics/large maps/social alerts in mobile bundle;
   - lazy loading for heavy workflow screens if supported;
   - render-count or list virtualization where needed;
   - image/video asset size review;
   - memory-risk notes for low-cost Android devices.

4. Android/tablet QA.
   Add a manual QA checklist for:
   - small Android phone;
   - large Android phone;
   - Android tablet;
   - portrait;
   - landscape;
   - keyboard open/close;
   - back button;
   - slow network;
   - offline;
   - file upload if supported;
   - login/session behavior.

5. Release evidence docs.
   Create:
   - docs/readiness/MOBILE_NATIVE_CAPACITOR_MN3_NATIVE_FEEL_QA_CLOSEOUT_2026_08_23.md
   - docs/readiness/MOBILE_NATIVE_CAPACITOR_ANDROID_TABLET_QA_CHECKLIST_2026_08_23.md
   - docs/readiness/MOBILE_NATIVE_CAPACITOR_RELEASE_EVIDENCE_PACKAGE_2026_08_23.md

   Include:
   - build commands;
   - doctor outputs;
   - tests run;
   - screenshots if available;
   - exact missing credentials;
   - exact store blockers;
   - what is ready for HITL;
   - what is not ready.

6. Tests.
   Add or update tests for:
   - native shell state handling;
   - back-button-safe navigation abstraction where testable;
   - mobile loading/empty/error states;
   - guard against desktop imports;
   - tablet layout behavior;
   - no Golden Path/Social Alerts/full dashboard exposure;
   - mobile CI scripts.

7. Optional only if low-risk:
   - add a mobile screenshot smoke test with Playwright or existing browser tooling;
   - add bundle-size check for mobile entry;
   - add visual regression checklist.

Verification:
Run:
- pnpm run typecheck
- pnpm run lint
- pnpm run test
- pnpm run build
- pnpm run mobile:native:ci
- pnpm run mobile:capacitor:doctor
- pnpm run mobile:capacitor:store:doctor if available

If local Android/iOS native toolchain is missing, do not fake native build proof. Document exact blocker and use existing CI path if available.

Git:
Stage only relevant files.
Commit with:
git commit -m "feat(mobile): polish Capacitor native UX and QA evidence"

Exit criteria:
- Mobile shell feels materially less web-wrapped.
- Native platform behaviors are handled or documented.
- Performance and memory risks are reduced or flagged.
- Android/tablet QA checklist exists.
- Release evidence package exists.
- Store blockers are honestly listed.
- No forbidden surfaces are exposed.

Do not overclaim:
- Do not say Play Store-ready unless a signed artifact exists.
- Do not say iOS TestFlight-ready unless Apple credentials and build evidence exist.
- Do not say native app if it remains Capacitor; say Capacitor app with mobile-native shell and interactions.
```
