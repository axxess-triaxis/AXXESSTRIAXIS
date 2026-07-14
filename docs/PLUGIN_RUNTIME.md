# Plugin Runtime

AXXESS uses a reusable plugin runtime contract instead of one-off connector code.

Each plugin records:

- Tenant ownership.
- OAuth or provider scope requirements.
- Sync mode.
- Webhook posture.
- Secret scope.
- Retry policy.
- Approval requirement for writes.
- Revocation readiness.
- Audit event names.

## Core Files

- `src/services/plugins/pluginRuntime.ts`
- `src/app/api/plugins/runtime/route.ts`
- `supabase/migrations/202607140002_sprint20_21_live_ai_platform.sql`

## Runtime Rules

- Plugins belong to an organization.
- Provider credentials are configuration-gated.
- Missing provider credentials do not break the UI.
- External writes, exports, and messages require human approval when policy requires it.
- Plugin actions are evaluated before execution and recorded in audit metadata.
- Sync runs should record retry count, error message, source reference, and created records.

## Initial Plugin Families

- Email: Gmail, Outlook.
- Calendar: Google Calendar.
- Storage: Google Drive.
- Messaging: Slack, Teams, WhatsApp Business.
- Project management: Jira, Trello, Asana, Linear, GitHub.
- CRM: HubSpot, Salesforce, Zoho CRM.
- Data/document/finance: Airtable, Google Sheets, DocuSign, Razorpay.

## Next Implementation Layer

Sprint 22 should complete provider callback token exchange, encrypted token references, provider-specific sync workers, and webhook verification.
