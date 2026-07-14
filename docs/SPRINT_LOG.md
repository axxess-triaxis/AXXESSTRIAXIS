# Sprint Log

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
