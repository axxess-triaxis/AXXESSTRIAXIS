# Sprint Log

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
