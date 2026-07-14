# Sprint 20 and 21 - Live AI Platform Controls

Sprint 20 and Sprint 21 move AXXESS beyond a functional AI workflow into a governed operating layer for plugins, model routing, controlled execution, usage limits, and support readiness.

The implementation preserves the existing UI and architecture. It adds platform services, authenticated APIs, admin control surfaces, tests, and Supabase tables that prepare AXXESS for live enterprise pilots.

## Sprint 20 - Plugin Runtime, Multi-Model Routing, And Sandbox Readiness

### Completed

- Added tenant model policy service for provider allowlists, fallback chains, spend guardrails, gateway tags, and human-review triggers.
- Extended the AI router to emit policy id, fallback chain, estimated cost, gateway tags, and approval reason.
- Added plugin runtime contracts for tenant ownership, OAuth scopes, write approvals, webhook posture, sync mode, retry policy, revocation, and audit events.
- Added sandbox execution runtime for plugin sync, AI tools, document extraction, webhooks, and report exports.
- Added Kubernetes-ready execution specs while keeping actual execution as dry-run/policy-gated until credentials and cluster controls are approved.
- Added authenticated API routes for plugin action evaluation, model-policy previews, and controlled execution job preparation.

### Provider-Gated

- Live model calls remain behind provider credentials and tenant policy approval.
- Real sandbox execution requires a configured Kubernetes, Vercel Sandbox, Docker, or CI runner integration.
- OAuth token storage and provider callback completion remain gated by connected provider secrets.

## Sprint 21 - Usage Limits, Readiness Controls, And Support Operations

### Completed

- Added tenant usage limit evaluation for AI requests, document ingestion, plugin actions, sandbox runs, RAG queries, and audit exports.
- Added enterprise readiness scoring across auth, tenant, AI, plugin, sandbox, audit, and support controls.
- Added support-incident primitives for auth, AI, RAG, integrations, mobile, and deployment operations.
- Added admin panels for Plugin Runtime, Model Policy, Execution Runs, Usage Limits, and Support Operations.
- Added an authenticated platform readiness API for organization administrators.
- Added focused tests for plugin policy, AI routing policy, sandbox guardrails, route metadata, RBAC, and readiness scoring.

## Database Schema

Migration:

- `supabase/migrations/202607140002_sprint20_21_live_ai_platform.sql`

New tables:

- `plugin_installations`
- `plugin_action_requests`
- `plugin_sync_runs`
- `tenant_model_policies`
- `ai_usage_ledger`
- `execution_environments`
- `execution_jobs`
- `execution_runs`
- `execution_artifacts`
- `enterprise_controls`
- `tenant_usage_limits`
- `support_incidents`

All tables are tenant-scoped with RLS policies and service-role write paths for server-only routes.

## API Surface

- `GET /api/plugins/runtime`
- `POST /api/plugins/runtime`
- `GET /api/ai/model-policy`
- `POST /api/ai/model-policy`
- `GET /api/execution/jobs`
- `POST /api/execution/jobs`
- `GET /api/admin/platform-readiness`

## Definition Of Done

A tenant administrator can now review plugin readiness, preview AI model routing, prepare a controlled execution job, evaluate usage limits, and inspect enterprise readiness controls. Actual external writes and sandbox execution remain approval-gated.

## Sprint 22 Recommendations

- Complete encrypted OAuth token storage and provider callback token exchange.
- Add real plugin sync workers for Gmail, Outlook, Google Drive, Slack, and CRM imports.
- Add a live AI Gateway integration with provider failover and actual usage writebacks.
- Add binary extraction workers for PDF, DOCX, XLSX, PPTX, and email attachments.
- Add sandbox runner integration behind tenant policy approval.
- Add customer-facing support ticket creation and SLA dashboard.
