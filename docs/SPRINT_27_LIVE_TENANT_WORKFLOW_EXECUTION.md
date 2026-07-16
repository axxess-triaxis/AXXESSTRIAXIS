# Sprint 27 - Live Tenant Workflow Execution & Pilot Usability

Sprint 27 converts the Sprint 26 golden-path UX into executable pilot workflow behavior. The product journey is now:

`sign up -> create organization -> invite user -> upload/import knowledge -> ask AXXESS -> review cited answer -> approve action -> create work -> verify dashboard, audit log, and activity timeline evidence`

## Completed

- Added tenant-scoped `enterprise_workflow_progress` persistence for golden-path step status.
- Added tenant-scoped `workflow_timeline_events` persistence for source, AI answer, human decision, workflow action, dashboard, and audit evidence.
- Added a live workflow execution service that converts approved AI review decisions into tasks or meeting follow-ups through existing repositories.
- Added workflow timeline recording to manual document ingestion, selected email import, live Gmail import, AI Review Inbox decisions, and governed RAG review.
- Added a tenant health command center to the Executive Dashboard.
- Added reusable workflow timeline panels to Dashboard, AI Review Inbox, Projects, Tasks, Documents, and Approvals.
- Added selected Gmail/Microsoft mailbox message picker UI for preview and confirmation before tenant records are created.
- Added Sprint 27 unit, component, and seed-gated Playwright coverage.

## Database

New migration:

```text
supabase/migrations/20260716091356_sprint27_live_tenant_workflow_execution.sql
```

New tables:

- `enterprise_workflow_progress`
- `workflow_timeline_events`

Both tables are tenant-scoped, RLS-protected, and exposed only through explicit grants. Policies use organization membership and role helpers already present in the repository.

## Workflow Behavior

Approved AI review outputs can now create:

- task
- approval-style task
- project update task
- stakeholder note task
- meeting follow-up

Each action records:

- source review
- cited answer context
- human decision
- created work
- notification intent
- timeline event
- audit event
- golden-path progress update

## Pilot UX Impact

- Pilot users can see tenant health from the dashboard.
- Imported knowledge and reviewed AI answers now create traceable workflow evidence.
- The AI Review Inbox has an explicit “Approve and create” path.
- Tasks and Projects show linked workflow timelines in detail panels.
- Documents and Approvals show tenant-wide workflow evidence.
- New tenants still get fallback timelines rather than broken empty panels.

## Verification

Focused Sprint 27 verification:

```bash
pnpm run typecheck
vitest run src/services/workflows/workflowEvidence.test.ts src/services/workflows/liveTenantWorkflow.test.ts src/components/enterprise/enterpriseComponents.test.tsx
```

Full release verification remains:

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
pnpm run supabase:verify
```

## Remaining Risks

- Production persistence requires the Supabase service role runtime for server-side timeline writes.
- Live Gmail import still requires OAuth credentials, token vault key material, and connected Gmail accounts.
- Approval request, stakeholder note, and project update creation currently route through existing task/meeting repositories until dedicated write repositories are introduced.
- E2E golden-path execution is seed-gated and should be promoted to live test tenants once stable pilot credentials are available.

## Recommended Sprint 28

- Add dedicated approval request and stakeholder note repositories.
- Add Microsoft Graph selected-message parity with live token vault usage.
- Persist workflow timeline events into audit log exports.
- Add dashboard snapshot deltas from workflow timeline events.
- Promote the Sprint 27 golden-path Playwright test into a required pilot release gate.
