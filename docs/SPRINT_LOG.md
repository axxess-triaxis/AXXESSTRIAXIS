# Sprint Log

## Sprint 30 - Customer-Success Live Operations And Workflow Records

Sprint 30 turns pilot acceptance into an operator-ready customer-success layer. It focuses on stuck-step recovery, SLA timers, regional key policy posture, workflow action records, and live Microsoft mailbox selection.

### Completed

- Added a customer-success live-ops snapshot service that combines golden-path, pilot acceptance, live workspace, SLA, and regional key evidence.
- Added `customer_success_live_ops_snapshots`, `customer_success_recovery_items`, `customer_success_sla_timers`, and `regional_key_policies` Supabase tables with tenant-scoped RLS and explicit grants.
- Added role-protected `GET /api/admin/customer-success/live-ops` and `POST /api/admin/customer-success/live-ops`.
- Replaced the generic Support Operations panel with a Customer-Success Live Operations cockpit for recovery items, SLA timers, regional key posture, and snapshot recording.
- Added workflow record list/detail pages for approval requests, stakeholder notes, and project updates at `/workflow-records`.
- Added live Microsoft Graph mailbox listing service and API, then wired Integrations to load real Microsoft inbox summaries before selected-message import.
- Added focused tests for customer-success scoring, RLS expectations, admin API source guards, Microsoft mailbox parsing/fetching, and workflow record routes.

### Live

- Organization Admins can review customer-success recovery items from `/admin/support-ops`.
- Operators can record a live-ops snapshot when Supabase service-role runtime is configured.
- Workflow action records are visible through direct list/detail pages with source AI review and audit metadata.
- Microsoft mailbox listing remains provider-gated until OAuth, token vault, and Supabase admin runtime are configured, while the UI remains stable.

### Provider-Gated

- Live snapshot persistence requires Supabase service-role runtime.
- Microsoft mailbox listing requires Microsoft OAuth credentials, an active encrypted token vault record, and `AXXESS_TOKEN_VAULT_KEY`.
- Regional key policies are posture records; external KMS/BYOK automation remains a follow-up.

### Recommended Sprint 31

- Add editable owner assignment and resolution state for recovery items.
- Add regional KMS/BYOK provider adapters behind the key policy posture.
- Add workflow record mutations for approval decisioning, stakeholder note edits, and project update application.
- Add Microsoft import audit timeline drilldowns from workflow record pages.
- Promote customer-success live-ops checks into pilot release gates.

## Sprint 29 - Pilot Tenant Acceptance And Live Operations

Sprint 29 converts the executable pilot workflow into a customer-success acceptance and live-operations process. The focus is making a real pilot tenant reviewable, sign-off ready, and operable after the first governed workflow is completed.

### Completed

- Added a pilot tenant acceptance engine that combines golden-path progress, pilot health, command-center evidence, and live workspace metrics.
- Added a Pilot Command Center acceptance panel with score, checklist, blockers, evidence gaps, live-ops handoffs, and operator actions.
- Added role-protected `GET /api/admin/pilot-acceptance` and `POST /api/admin/pilot-acceptance`.
- Added `pilot_tenant_acceptance_runs`, `pilot_acceptance_checklist_items`, and `pilot_live_ops_events` Supabase tables with tenant-scoped RLS and explicit grants.
- Added acceptance persistence that records runs, checklist rows, live-ops events, and audit evidence when Supabase admin runtime is configured.
- Extended the Pilot Golden Path Release Gate to include Sprint 29 acceptance Playwright coverage.
- Added focused unit, route, RLS, and seed-gated E2E coverage for pilot acceptance.

### Live

- Organization Admins can review pilot acceptance status from `/admin/pilot-command-center`.
- Customer-success operators can see what evidence is accepted, ready, missing, or blocked before a pilot is marked live.
- Operator handoffs connect sponsor review, stuck-step recovery, selected-message connector operations, AI review monitoring, RAG release gates, and audit evidence.
- Demo and provider-gated environments still render a clean acceptance panel without leaking technical errors to users.

### Provider-Gated

- Acceptance persistence requires Supabase service-role runtime.
- Live readiness event history requires the Sprint 16 pilot readiness migration.
- Connector and token-vault evidence depends on OAuth provider credentials and encrypted token vault runtime.
- Branch protection should require `Pilot Golden Path Release Gate / Sprint 27/29 Pilot Acceptance Gate` after the workflow is observed on `main`.

### Recommended Sprint 30

- Add customer-success stuck-step drilldowns with owner assignment and SLA timers.
- Add approval-request, stakeholder-note, and project-update list/detail pages.
- Add live Microsoft Graph mailbox message picker UI backed by provider message listing.
- Add regional key policy/BYOK foundations for pilot tenants.

## Sprint 28 - Pilot Release Gates, Microsoft Import Parity, And Timeline Evidence

Sprint 28 hardens the Sprint 27 golden path for pilot release review. It gives approved AI actions their own business records, brings Microsoft Graph selected-message import to parity with Gmail, links command-center dashboard movement to timeline evidence, and makes the golden-path E2E a dedicated release gate.

### Completed

- Added `approval_requests`, `stakeholder_notes`, and `project_updates` Supabase tables with tenant-scoped RLS.
- Added workflow action repositories for approval requests, stakeholder notes, and project updates.
- Updated AI Review Inbox action creation so approved outputs can create dedicated records instead of routing every action through tasks.
- Added live Microsoft Graph selected-message import API with encrypted token vault access, preview/confirm workflow, document ingestion, task creation, audit events, and workflow timeline writes.
- Added `microsoft_selected_message_imports` evidence table with RLS.
- Added dashboard snapshot delta persistence for Pilot Command Center snapshots and linked each delta to workflow timeline evidence.
- Added audit-export timeline link persistence through `audit_export_timeline_links`.
- Added a dedicated `Pilot Golden Path Release Gate` GitHub Actions workflow for `tests/e2e/sprint27-golden-path.spec.ts`.
- Added focused tests for Microsoft selected-message parsing/fetching, dashboard delta math, dedicated review action records, audit export linkage source checks, and Sprint 28 RLS expectations.

### Live

- A reviewed AI answer can now create an approval request, stakeholder note, project update, task, or meeting follow-up.
- Microsoft selected-message import follows the same governed pattern as Gmail: connect, select one message, preview extraction, confirm, then create tenant records.
- Command-center snapshots now produce delta evidence that can be shown in release reviews and customer-success operations.
- Audit exports can link exported logs to the workflow timeline evidence that explains how the action happened.

### Provider-Gated

- Microsoft Graph import requires Microsoft OAuth credentials, Supabase service-role runtime, and `AXXESS_TOKEN_VAULT_KEY`.
- Dashboard delta persistence requires Supabase service-role runtime on snapshot routes.
- GitHub branch protection must mark `Pilot Golden Path Release Gate / Sprint 27 Golden Path Gate` as required after the workflow lands on `main`.

### Recommended Sprint 29

- Add customer-success views for stuck golden-path steps and timeline deltas.
- Add BYOK/KMS key hierarchy and regional tenant key policy foundations.
- Add Microsoft mailbox message picker UI backed by live Graph message listing.
- Add approval-request, stakeholder-note, and project-update list/detail pages.

## Sprint 27 - Live Tenant Workflow Execution And Pilot Usability

Sprint 27 makes the golden path executable for a real pilot organization. It turns Sprint 26’s unified journey into tenant progress persistence, review-to-work execution, selected-message import UX, workflow timelines, and customer-facing tenant health.

### Completed

- Added `enterprise_workflow_progress` and `workflow_timeline_events` Supabase tables with tenant-scoped RLS.
- Added live tenant workflow services for progress persistence, timeline evidence, and approved AI review action creation.
- Added “Approve and create” to AI Review Inbox so approved cited answers can create tasks or meeting follow-ups through existing repositories.
- Added workflow timeline writes to document ingestion, selected email import, live Gmail import, RAG review, and AI review decisions.
- Added Tenant Health Command Center to the Executive Dashboard.
- Added workflow timeline panels to Dashboard, AI Review Inbox, Projects, Tasks, Documents, and Approvals.
- Added selected Gmail/Microsoft mailbox message picker UI with preview and confirmation before records are created.
- Added focused unit/component tests and a seed-gated Playwright golden-path smoke test.

### Live

- A pilot tenant can move from knowledge ingestion or selected-message import into reviewed AI output, approved work creation, dashboard health, timeline evidence, and audit trail.
- The dashboard now shows onboarding completion, active users, documents indexed, pending AI reviews, open tasks, approval SLA risk, integration health, and audit coverage.
- Core workflow pages no longer behave like isolated modules; each screen can show evidence of the source, answer, decision, action, actor, timestamp, and audit record.

### Provider-Gated

- Live Gmail import still requires Google OAuth credentials, Supabase service-role runtime, and token vault key material.
- Production timeline persistence requires Supabase service-role availability on server routes.
- Dedicated approval/stakeholder/project update repositories remain follow-up work; Sprint 27 routes these action types through existing task/meeting repositories.

### Recommended Sprint 28

- Add dedicated approval request, stakeholder note, and project update write repositories.
- Add Microsoft Graph selected-message live import parity.
- Promote Sprint 27 golden-path E2E into a required pilot release gate.
- Add timeline-backed dashboard snapshot deltas and audit export linkage.
- Add customer-success admin views for stuck golden-path steps.

## Sprint 26 - Enterprise Workflow Unification And Production UX Hardening

Sprint 26 connects the strongest AXXESS modules into one visible enterprise operating journey. It focuses on production UX, real-life workflows, role-aware next actions, and a coherent path from tenant setup through governed AI review into work, dashboards, notifications, and audit evidence.

### Completed

- Added an enterprise golden-path service for onboarding, team provisioning, Knowledge Hub, governed questions, AI Review Inbox, workflow action creation, dashboard feedback, and audit evidence.
- Added a reusable Enterprise Workflow Journey component with readiness score, completion percentage, role-aware locks, status badges, next-best action, and workflow-aware action queue.
- Added the journey to the Executive Dashboard as a command-center control surface.
- Added the same journey to AI Workspace so cited AI answers connect to review, tasks, dashboards, and audit trails.
- Replaced static dashboard priority actions with tenant workflow-derived next steps.
- Added focused tests for golden-path sequencing, blocked prerequisites, RBAC-aware action visibility, and component rendering.

### Live

- Pilot users can see the full journey from tenant setup to governed workflow action.
- AI Review Inbox is now visibly part of the operational workflow rather than a disconnected route.
- Dashboard actions reflect the next enterprise workflow step instead of static demo links.

### Recommended Sprint 27

- Persist golden-path progress per tenant.
- Add workflow timelines to projects, tasks, approvals, and documents.
- Add a selected Gmail/Microsoft message picker UI that creates reviewed workflow actions.
- Expand E2E coverage for the full sign-up to approved AI action journey.

## Sprint 25 - Token Vault, Gmail Import, Snapshot Fan-Out, And RAG Release Gates

Sprint 25 hardens Sprint 24 live operations by securing connector token storage, making selected Gmail import real, expanding scheduled snapshot persistence across tenants, and turning RAG evaluation into a production release check.

### Completed

- Added encrypted OAuth token vault service with AES-GCM sealed bundles and keyed token fingerprints.
- Added service-role-only `oauth_token_vault` table with no authenticated grant.
- Added live Gmail selected-message import API that fetches exactly one Gmail message and reuses the preview/confirm workflow.
- Added `gmail_selected_message_imports` evidence table with tenant-scoped RLS.
- Added all-tenant scheduled Pilot Command Center snapshot fan-out and `command_center_snapshot_runs` evidence.
- Added AI Workspace link to the tenant AI Review Inbox.
- Added `pnpm run rag:release-gate` and GitHub Actions `RAG Release Gate` workflow.
- Added repo-local Supabase CLI integration with pinned CLI, config, migration verification script, package scripts, CI workflow, and local database drill runbook.
- Added focused tests for token vault, Gmail import parsing/fetching, scheduler fan-out, OAuth vault handoff, and Sprint 25 RLS expectations.

### Live

- Gmail OAuth connections can store token material in an encrypted server-only vault when provider credentials and `AXXESS_TOKEN_VAULT_KEY` are configured.
- Tenants can import a selected Gmail message into AXXESS only after preview and confirmation.
- Scheduled snapshots can fan out across all active tenants instead of one configured tenant.
- RAG release checks can run in CI without external model credentials.
- Supabase migration verification can run in CI without a globally installed CLI.

### Provider-Gated

- Production Gmail import requires Google OAuth credentials, Supabase service-role runtime, and token vault key material.
- Branch protection must mark `Required RAG Release Gate` required after GitHub observes the workflow.
- Token rotation and refresh-token renewal are ready for follow-up hardening but are not yet automated.

### Sprint 26 Recommendations

- Add OAuth token refresh/rotation jobs and vault key rotation runbooks.
- Add Gmail message picker UI and Microsoft Graph selected-message parity.
- Persist command-center snapshot fan-out health to admin dashboards.
- Add production RAG fixture corpus backed by tenant-safe golden documents.

## Sprint 24 - Live AI Review, OAuth, Sandbox Runner, And RAG Release Gates

Sprint 24 closes the loop from the Pilot Command Center into tenant-facing operations. It adds a real review inbox, OAuth callback/token exchange, scheduled snapshot persistence, approved sandbox execution evidence, and RAG release gates.

### Completed

- Added tenant-facing AI Review Inbox at `/ai-workspace/review-inbox`.
- Added AI review APIs for queue reads and approve/edit/reject/escalate decisions.
- Added signed OAuth state, callback verification, token exchange, connection upsert, and token-reference storage.
- Added daily Vercel Cron route for command-center snapshots.
- Added approved sandbox runner API behind policy attestation.
- Added RAG release gate evaluator and persistence API.
- Added Sprint 24 migration for OAuth states, sandbox invocations, and RAG release gates with RLS.

### Live

- Tenants can review governed AI outputs before consequential workflow actions.
- Gmail/Microsoft OAuth callback path can complete when provider secrets are configured.
- Admins can persist command-center snapshots manually or through Vercel Cron.
- Sandbox jobs can move from attestation to approved dry-run invocation.

### Provider-Gated

- OAuth token vault storage requires a managed secret store.
- Live Gmail message import requires provider API credentials and selected-message sync workers.
- Non-dry-run sandbox execution requires an approved runner integration.

### Sprint 25 Recommendations

- Add encrypted token vault integration.
- Complete Gmail selected-message import from live provider APIs.
- Add all-tenant scheduled snapshot fan-out.
- Promote RAG gates into required release checks.

## Sprint 23 - Governed AI Operations, Sandbox Evidence, And RAG Evaluation

Sprint 23 hardens the AI operating layer by turning cited AI outputs, sandbox policy attestations, and RAG evaluation fixtures into reviewable pilot evidence.

### Completed

- Added governed AI operation review evidence for restricted or consequential AI outputs.
- Added sandbox policy attestation primitives for Kubernetes-grade, Vercel Sandbox, Docker, CI, and local execution environments.
- Added RAG evaluation run persistence for source coverage, confidence thresholds, and permission regression checks.
- Added focused tests for command-center behavior and RLS expectations.

### Live

- Admins can inspect AI review, sandbox, and RAG evaluation readiness from the Pilot Command Center.

### Provider-Gated

- Actual sandbox execution still requires a configured runner and approved tenant policy.
- Persistent RAG evaluation runs require the Sprint 22/23 migration in Supabase.

### Sprint 24 Recommendations

- Add a tenant-facing AI review inbox.
- Connect one real sandbox runner behind attestation approval.
- Convert RAG evaluation fixtures into CI and release gates.

## Sprint 22 - Pilot Command Center And Connector Execution Queue

Sprint 22 creates a unified operating surface for pilot readiness by composing existing readiness, usage, plugin, connector, sandbox, RAG, and audit primitives.

### Completed

- Added Pilot Command Center service and admin API.
- Added role-protected `/admin/pilot-command-center` route using the existing enterprise admin layout.
- Added connector execution queue semantics for tenant-owned plugin actions and approval-gated writes.
- Added Supabase migration for command-center snapshots and connector execution evidence with tenant-scoped RLS.

### Live

- Organization administrators can review pilot command score, queued connector actions, governed AI review state, sandbox policy posture, RAG evaluation evidence, and next actions.

### Provider-Gated

- Live connector execution requires OAuth credentials, encrypted token references, and provider sync workers.

## Sprint 21 - Enterprise Usage, Readiness, And Support Operations

Sprint 21 adds live-platform operating controls on top of Sprint 20. It introduces usage limits, readiness scoring, support incident primitives, and admin panels for platform review.

### Completed

- Added tenant usage limits for AI requests, document ingestion, plugin actions, sandbox runs, RAG queries, and audit exports.
- Added readiness scoring across auth, tenant, AI, plugin, sandbox, audit, and support controls.
- Added support incident primitives for auth, AI, RAG, integrations, mobile, and deployment operations.
- Added Organization Admin panels for Usage Limits and Support Operations.
- Added `GET /api/admin/platform-readiness` for admin-only readiness snapshots.
- Added focused tests for usage-limit evaluation, route metadata, and admin RBAC.

### Live

- Organization administrators can inspect platform readiness controls without modifying tenant data.
- Usage-limit and support-control primitives are ready for Supabase persistence.

### Provider-Gated

- Customer-facing SLA automation requires support workflow configuration.
- Usage writebacks require production traffic from AI, plugin, RAG, and sandbox routes.

### Sprint 22 Recommendations

- Add support ticket creation and SLA timers.
- Persist readiness snapshots from daily scheduled jobs.
- Add customer-facing usage dashboard and billing-plan mapping.

## Sprint 20 - Plugin Runtime, Multi-Model Routing, And Sandbox Readiness

Sprint 20 adds the governed platform layer for live plugins, provider-neutral AI routing, and controlled execution environments.

### Completed

- Added tenant model policy selection with provider allowlists, fallback chains, cost estimates, gateway tags, and human-review reasons.
- Extended the AI router output with policy id, fallback chain, estimated cost, and approval metadata.
- Added a reusable plugin runtime contract with tenant ownership, OAuth scopes, sync mode, webhook posture, write approval, retry policy, revocation, and audit metadata.
- Added controlled execution job services with dry-run output, policy blocking, and Kubernetes-ready specs.
- Added authenticated API routes for plugin runtime, model-policy preview, and execution job preparation.
- Added Supabase migration for plugin runtime, model policies, usage ledger, execution jobs, readiness controls, usage limits, and support incidents.
- Added tests for model policy, plugin runtime, sandbox execution, and route protection.

### Live

- A tenant can evaluate plugin actions before execution.
- A tenant can preview model routing and human-review policy.
- A tenant can prepare sandbox execution specs without running untrusted work.

### Provider-Gated

- Live OAuth sync workers require provider credentials and encrypted token references.
- Live external model calls require provider or gateway credentials.
- Real sandbox execution requires approved runner integration.

## Sprint 19 - Functional Enterprise AI Journey

Sprint 19 converts the polished enterprise beta into a usable external-organization workflow. It preserves the existing UI and architecture while adding live onboarding, profile persistence, tenant selection, document ingestion, governed RAG, human review, and selected-email import.

### Completed

- Added live profile read/update and tenant provisioning APIs backed by Supabase service-role server routes.
- Added reset-password finalization through a verified Supabase recovery token.
- Added tenant selection API that verifies organization membership before switching the active tenant.
- Added document text ingestion from the Documents screen with metadata, document version, activity, chunking, local embeddings, persistent RAG chunks, and audit events.
- Added governed RAG query and review APIs with permission-aware retrieval, citations, AI output audit records, and approve/reject workflow action records.
- Hardened the generic AI API so tenant context comes from the server session instead of a client-supplied organization id.
- Added Gmail/Microsoft connector contract, OAuth start route, selected email import preview, confirmation-before-create behavior, and audit logging.
- Added Sprint 19 Supabase migration for user profile metadata, AI conversations, workflow action reviews, connector sync logs, and RAG chunk metadata.
- Added focused tests for provisioning helpers, connector preview logic, and tenant RAG ingestion/query behavior.

### Live

- A signed-in user can create a clean tenant from onboarding.
- A user can paste document text, index it, ask a cited tenant-scoped question, and approve or reject the answer.
- A selected email can be previewed for tasks, decisions, stakeholders, and then confirmed into workspace records.

### Provider-Gated

- OAuth callback and token exchange require Gmail/Microsoft credentials.
- Full binary file parsing requires a storage extraction worker.
- Production-grade remote embeddings require provider keys and vector search configuration.

### Sprint 20 Recommendations

- Complete OAuth callback/token exchange and encrypted token storage.
- Add binary document extraction for PDF, DOCX, XLSX, and email attachments.
- Add persistent stakeholder and approval repositories.
- Add active tenant session cookie instead of updating the primary user tenant row.
- Add E2E tests for sign-up to RAG approval journey against a seeded Supabase branch.

## Sprint 18 - Pilot Conversion, Audit Exports, And Delivery Evidence

Sprint 18 converts the Sprint 17 pilot operations foundation into a sponsor-review workflow. It adds pilot health scoring, governed export records, invitation delivery evidence, and mobile screenshot automation while preserving the existing AXXESS UI architecture.

### Completed

- Added Pilot Conversion as an admin-only governance route.
- Added pilot health scoring from `pilot_readiness_events` with demo fallback for investor preview continuity.
- Added `GET /api/pilot-readiness-events` for tenant-scoped conversion dashboards.
- Added `POST /api/audit-exports` for server-generated CSV exports with hashed tokens, CSV hashes, immutable metadata, and audit logging.
- Added `POST /api/webhooks/resend` for signed invitation delivery event ingestion.
- Added non-sensitive Resend tags to invitation emails for tenant and invitation correlation.
- Added Supabase migration for `audit_exports` and `invitation_delivery_events` with admin-scoped RLS.
- Added mobile visual regression screenshot workflow for Organization Admin, Audit Logs, and Pilot Conversion.
- Added unit/source tests for scoring, routes, webhook verification, RLS policy expectations, RBAC, and route metadata.

### Live

- Admins can review pilot conversion health from a dedicated route.
- Audit CSV export now attempts a governed server export before falling back to the previous local CSV.
- Invitation email delivery can be joined back to a tenant when signed webhooks are configured.

### Provider-Gated

- `audit_exports` and `invitation_delivery_events` require the Sprint 18 migration.
- Resend delivery evidence requires `RESEND_WEBHOOK_SECRET` and provider webhook configuration.
- Mobile screenshot artifacts require the GitHub Actions workflow to run.

### Sprint 19 Recommendations

- Add customer-facing pilot account-owner notes and sponsor decision records.
- Add export download endpoint that validates the short-lived export token before retrieval.
- Add dashboard cards for invitation delivery status and bounce triage.
- Add screenshot baseline comparison once approved reference images are captured.
- Expand pilot health scoring with usage frequency, stakeholder engagement, and AI/RAG value signals.

## Sprint 17 - Pilot Event Persistence, Mobile Admin Review, And Invitation Delivery

Sprint 17 completes the immediate follow-up items from Sprint 16 by moving pilot onboarding completion into a server route, adding optional real invitation email delivery, and improving mobile review of administrator and audit surfaces.

### Completed

- Added `/api/pilot-readiness-events` for tenant-scoped pilot onboarding event persistence.
- Ensured pilot readiness inserts use the signed-in user's Supabase access token so RLS remains active.
- Sanitized pilot event metadata and added lightweight audit logging for event capture.
- Added optional Resend-compatible invitation email delivery with idempotent provider calls.
- Preserved manual invitation acceptance URL fallback when email delivery is not configured.
- Added mobile card layouts for Organization Admin and Audit Logs review surfaces.
- Added unit/source tests for pilot events, invitation email delivery, onboarding persistence, and route metadata.
- Added seed-gated Playwright coverage for Sprint 17 admin/audit/onboarding flows.

### Live

- Pilot onboarding completion now attempts server persistence.
- Invitation creation can send real transactional emails when `RESEND_API_KEY` is configured.
- Admin and audit surfaces have phone-friendly review layouts.

### Provider-Gated

- Email delivery requires `RESEND_API_KEY` and a verified/allowed sender.
- Pilot event persistence requires the Sprint 16 migration to be applied to Supabase.
- Playwright Sprint 17 flows require seeded Supabase data.

### Sprint 18 Recommendations

- Add a Pilot Conversion dashboard powered by `pilot_readiness_events`.
- Add signed server-side audit exports with immutable export records.
- Add invitation delivery webhooks for delivered/bounced/suppressed states.
- Add organization-level pilot health scoring and account-owner notes.
- Add visual regression screenshots for mobile admin/audit views in CI.

## Sprint 16 - Pilot Readiness, Admin Hardening, And Tenant Workflows

Sprint 16 turns the polished enterprise demo surface into a stronger pilot-readiness path for real institutions. It focuses on first-tenant setup, administrator confidence, audit review, and clean handoff between investor preview and live pilot use.

### Completed

- Added Organization Admin as a dedicated tenant setup surface for pilot users, roles, departments, invitations, audit coverage, and conversion next actions.
- Added Audit Logs as a dedicated governance surface with filters, export readiness, metrics, and review trail context.
- Expanded Pilot Onboarding from a simple beta checklist into a first-10-minutes activation path covering organization setup, invitations, roles, projects, documents, AI/RAG, tasks, approvals, audit review, and feedback.
- Added navigation, routing, lazy loading, and RBAC coverage for the new admin and audit surfaces.
- Added analytics events for admin surface views, audit review/export, and pilot onboarding completion.
- Added Supabase migration for tenant-scoped pilot readiness events and audit-log indexes for filtered review and export.
- Added focused tests for routing, RBAC, onboarding copy, and RLS expectations.

### Live

- Pilot onboarding state, admin route protection, tenant-scoped repository reads, audit-log CSV export in browser, and provider-safe UI state labels.

### Demo-Seeded

- Investor Preview can show users, departments, invitations, and audit trail context through the existing demo repository layer.

### Provider-Gated

- Real invitation sending, persisted pilot readiness analytics, and production audit exports depend on connected Supabase functions and deployment secrets.

### Sprint 17 Recommendations

- Persist pilot readiness events from the onboarding UI into Supabase through a server route.
- Add a mobile card layout for wide admin/audit tables.
- Add Playwright coverage for admin navigation, audit filters, and pilot onboarding links.
- Add customer-facing pilot workspace creation and invite email delivery.
- Add Vercel preview screenshots for dashboard, admin, audit logs, and onboarding.

## Sprint 15 - Enterprise Frontend Coherence And Guided Demo Polish

Frontend-focused sprint to make AXXESS feel like a serious enterprise SaaS beta for investors, pilots, and institutional partners.

### Completed

- Added shared enterprise frontend primitives.
- Added guided demo workflow state, banner, and progress indicator.
- Added coherent frontend seed slices for metrics, activity, documents, stakeholders, approvals, and workflow steps.
- Polished Executive Dashboard, AI Workspace, Knowledge Hub, Approvals, CRM, Projects, Tasks, and Analytics.
- Added live/demo/provider-gated state labels.
- Added `?screenshot=true` mode.
- Reorganized navigation into investor-friendly module groups.
- Added Sprint 15 audit, walkthrough, frontend architecture, and screenshot documentation.

### Live

- App shell, route mapping, lazy feature modules, role-aware navigation, repository contracts, CRUD-style project/task/document workflows, and analytics abstraction.

### Demo-Seeded

- North East Health Mission guided demo narrative, institutional activity, approvals, stakeholder cards, RAG-stage explanations, and screenshot states.

### Provider-Gated

- Production AI providers, embeddings/vector search, report export, external social/provider integrations, and production analytics dashboards.

### Sprint 16 Recommendations

- Deep provider integrations.
- Paid subscription and payments.
- Real pilot tenant onboarding.
- Production Supabase hardening.
- Android beta delivery.
- Customer feedback analytics.
- Visual regression and guided-demo E2E coverage.
