# AXXESS TRIaxis -- Mobile-Native Capacitor Research, Roadmap, and Checklist

Date: 2026-08-23

Status: Planning artifact only. No product code changed in this document.

Purpose: Founder asked how to make the current Android/iOS Capacitor beta feel more mobile/tablet-native while retaining Capacitor. This document records the research synthesis, product decision, roadmap, checklist, and sprint sequencing before Claude Code execution.

## Executive Decision

Keep Capacitor.

Do not rebuild native apps from scratch.

Do not keep wrapping the full X0 desktop console unchanged.

AXXESS mobile should become a mobile-specific product surface using the same repository, backend, auth, tenant isolation, RBAC, audit model, RAG/HITL services, and deployment discipline, but with its own mobile shell, navigation, screen density, and workflow order.

The desired direction is:

| Surface | Role |
|---|---|
| X0 Web | Full enterprise console for GCC/larger organizations. |
| X0 Mobile | Enterprise companion app for existing users: catch-up, tasks, meetings, approvals, AI ask, documents, CRM notes, audit proof. |
| AXXESS Lite Web | India self-serve web product for MSMEs, NGOs, startups, contractors, and local businesses. |
| AXXESS Lite Mobile | Mobile-first self-serve app based on Lite, not a wrapper of X0. |

Short version: **same core, different product shells.**

## Research Sources And Takeaways

| Source | Observed pattern | AXXESS implication |
|---|---|---|
| Salesforce Mobile / Agentforce | Mobile is positioned as real-time access to business data, tasks, CRM, AI agents, voice/dictation, shortcuts, and mobile actions. | AXXESS X0 Mobile should behave like a command companion, not a smaller desktop dashboard. |
| ServiceNow Now Mobile | Native mobile focuses on routine employee actions, approvals, knowledge, chatbot/live chat, global search, and branded enterprise apps. | AXXESS should prioritize task completion, approvals, knowledge access, and ask/catch-up loops on mobile. |
| ServiceNow native mobile structure | Navigation is task-based: bottom navigation, search, stacked detail screens, cards, and contextual actions. | Replace desktop sidebar/topbar behavior with mobile bottom tabs, compact headers, and detail screens. |
| Microsoft 365 Copilot Mobile | Mobile AI centers on catching up, summarizing email/meetings/chats, creating drafts, and answering from files/messages. | AXXESS AI mobile should start with catch-up, summarize, ask, and action follow-through. |
| ServiceNow AI agent governance with Microsoft | Enterprise AI agents need visibility, controls, identity, permissions, accountability, and admin policy. | Mobile agentic features must remain governed and visible; do not ship hidden autonomous actions. |
| Thoughtworks enterprise AI operating model | Enterprise AI adoption fails without governance, accountability, measurement, observability, and learning loops. | The mobile app must keep the HITL/audit model visible, not bury governance under convenience. |
| CNCF autonomous enterprise forecast | Human-in-the-loop review and risk-scored approvals are strategic controls, not friction to remove. | AXXESS should make approvals fast on mobile while keeping high-risk decisions explicit. |

## Product Synthesis

The relevant competitor pattern is not "make the whole web app responsive." It is:

- mobile-first navigation;
- task-based screens;
- fast approval and review loops;
- AI catch-up and summary flows;
- short creation forms;
- document access and lightweight upload;
- voice/dictation where useful;
- tablet two-pane layouts;
- admin-visible governance;
- strong separation from full desktop admin complexity.

For AXXESS, the mobile product should be called internally:

**AXXESS Command Companion**

That means:

- show what needs attention now;
- let a user approve, assign, note, ask, upload, search, and audit quickly;
- avoid large desktop dashboards and sprawling admin panels;
- preserve tenant boundaries, audit logs, HITL review, and policy controls.

## Mobile Surface Contract

### Include In X0 Mobile

- Today / Command Home
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

### Exclude From X0 Mobile

- Full Executive Dashboard
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

### Include Later Only After Policy Sprint

- push notifications;
- offline drafts;
- background sync;
- voice dictation;
- mobile file picker;
- share-sheet ingestion;
- autonomous agent actions;
- mobile payment actions.

## Roadmap

### MN-1 -- Mobile Shell, Navigation, And Product Boundary

Goal: stop the app feeling web-wrapped by creating a mobile-specific shell and guardrail layer.

Outputs:

- mobile product doctrine;
- mobile feature registry;
- mobile shell;
- bottom tabs;
- compact top header;
- safe-area handling;
- no desktop sidebar/topbar in mobile;
- mobile route/entrypoint boundary;
- guard tests proving forbidden X0/Demo/Lite surfaces are not exposed.

### MN-2 -- Core Mobile Workflows And Tablet Layout

Goal: make the core daily-use workflows feel native.

Outputs:

- Command Home;
- mobile Tasks;
- mobile Reminders;
- mobile Meetings;
- mobile Projects/Programs;
- mobile Approvals;
- mobile AI Ask/Catch-up;
- mobile Knowledge Hub;
- mobile CRM notes;
- tablet two-pane layout;
- draft/action handoff patterns;
- route and data tests.

### MN-3 -- Native Feel, Performance, QA, And Release Evidence

Goal: make the Capacitor app behave like a proper mobile/tablet app.

Outputs:

- status bar/splash/keyboard/back-button/haptics handling;
- pull-to-refresh;
- offline/error/loading states;
- Android tablet validation;
- bundle and memory guardrails;
- performance cleanup;
- visual QA screenshots;
- release readiness evidence;
- mobile closeout doc.

## Checklist

### Architecture

- [ ] Same repository retained.
- [ ] Same backend retained.
- [ ] No Supabase schema fork.
- [ ] No tenant/RLS bypass.
- [ ] No separate auth model.
- [ ] X0 Mobile and Lite Mobile remain separate surfaces.
- [ ] Mobile does not import desktop-only navigation or dashboards.

### Product Boundary

- [ ] Mobile feature registry exists.
- [ ] Included surfaces are explicit.
- [ ] Forbidden surfaces are explicit.
- [ ] Tests prove Golden Path is not exposed.
- [ ] Tests prove Social Alerts is not exposed.
- [ ] Tests prove Demo data is not exposed.
- [ ] Tests prove X0 admin command centers are not exposed.
- [ ] Tests prove Lite-only assumptions do not leak into X0 Mobile.

### UI And Interaction

- [ ] Bottom navigation exists.
- [ ] Mobile header exists.
- [ ] Large tap targets.
- [ ] Safe area respected.
- [ ] Mobile forms are short and task-based.
- [ ] Cards/lists do not overflow.
- [ ] Tablet layout uses two panes where useful.
- [ ] No desktop sidebar in mobile shell.
- [ ] No dense desktop tables in phone views.

### Core Workflows

- [ ] Command Home shows urgent items.
- [ ] Tasks can be viewed and updated.
- [ ] Reminders can be created/edited or represented through task due dates.
- [ ] Meetings can be viewed and created.
- [ ] Approvals can be reviewed quickly.
- [ ] AI answer can lead to action.
- [ ] Documents can be found and opened.
- [ ] Knowledge Hub can upload or route safely to upload.
- [ ] CRM notes can be added.
- [ ] Audit summary/export is available.

### Native Feel

- [ ] Status bar configured.
- [ ] Splash screen configured.
- [ ] Keyboard behavior handled.
- [ ] Android back button handled.
- [ ] Haptics used sparingly for key actions.
- [ ] Pull-to-refresh supported where appropriate.
- [ ] Loading/empty/error/offline states exist.
- [ ] App does not feel like a desktop iframe.

### Governance

- [ ] HITL review remains visible.
- [ ] Critical actions still require approval where applicable.
- [ ] Audit logs remain tenant-scoped.
- [ ] No hidden agentic action execution.
- [ ] Mobile AI does not claim unsupported autonomy.

### Verification

- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Tests pass or blockers documented.
- [ ] Build passes.
- [ ] Capacitor doctor passes or blocker documented.
- [ ] Mobile-specific guard passes.
- [ ] Android visual smoke test performed.
- [ ] Tablet visual smoke test performed.
- [ ] Closeout document written.

## Hard Boundaries

- Do not rewrite the app in native iOS/Android now.
- Do not wrap the full desktop X0 shell unchanged.
- Do not build a second backend.
- Do not duplicate tenant logic.
- Do not remove X0 functionality.
- Do not change Investor Demo behavior.
- Do not weaken auth, RBAC, RLS, audit, or HITL.
- Do not claim App Store / Play Store readiness until real signed-store evidence exists.
- Do not ship mobile-only autonomous actions without a separate governance sprint.

## Success Definition

This program is successful when the Android/iOS Capacitor app feels like a mobile enterprise command companion:

1. A user can open the app and immediately see what needs attention.
2. A user can complete the daily loop without desktop navigation.
3. A user can ask AI, review output, and create follow-up work.
4. A user can approve or reject governed work from mobile.
5. A user can access documents and stakeholder context quickly.
6. A tablet user gets a better layout than a stretched phone view.
7. The product remains tenant-safe, audit-safe, and HITL-safe.

## Status

This document is ready to feed into Claude Code execution. Implementation should begin with MN-1.
