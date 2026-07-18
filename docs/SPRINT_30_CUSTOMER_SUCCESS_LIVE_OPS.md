# Sprint 30 - Customer-Success Live Operations And Workflow Records

Sprint 30 moves AXXESS from pilot acceptance into customer-success live operations. The sprint adds operator recovery surfaces, SLA timing, regional key posture, workflow record drilldowns, and live Microsoft mailbox listing.

## Product Goal

A customer-success operator should be able to open a pilot tenant, see what is stuck, know who owns the next step, understand SLA risk, inspect key policy posture, and drill into the workflow records created from governed AI review.

## Added Capabilities

- Customer-success live-ops snapshot scoring.
- Stuck-step recovery items derived from the enterprise golden path.
- SLA timers derived from pilot handoff obligations and live tenant metrics.
- Regional key policy posture for India tenant data, connector token vaults, and investor preview isolation.
- Admin cockpit at `/admin/support-ops`.
- Role-protected live-ops API for snapshot reads and persistence.
- Workflow record pages for approval requests, stakeholder notes, and project updates.
- Microsoft Graph mailbox listing service and API.
- Integrations UI action for loading live Microsoft inbox summaries before selected-message import.

## Database Schema

Sprint 30 adds:

- `customer_success_live_ops_snapshots`
- `customer_success_recovery_items`
- `customer_success_sla_timers`
- `regional_key_policies`

All tables include organization ownership, Row Level Security, explicit authenticated grants, and service-role grants for server-side persistence.

## Customer-Success Flow

1. Admin opens `/admin/support-ops`.
2. AXXESS builds a live-ops snapshot from golden path, pilot acceptance, workspace metrics, and regional key posture.
3. The operator reviews stuck-step recovery items and SLA timers.
4. The operator records a live-ops snapshot.
5. AXXESS persists snapshot, recovery, SLA, key posture, and audit evidence when Supabase admin runtime is configured.

## Workflow Record Flow

1. A reviewed AI output creates an approval request, stakeholder note, or project update.
2. The operator opens `/workflow-records`.
3. AXXESS shows tenant-backed records when authenticated and configured.
4. Investor/demo mode shows coherent North East Health Mission fallback records.
5. Each detail view shows source AI review, audit evidence, and metadata.

## Microsoft Mailbox Flow

1. User connects Microsoft through OAuth.
2. Token material is sealed in the encrypted token vault.
3. User opens Integrations and selects `Load Microsoft inbox`.
4. AXXESS lists recent inbox summaries through Microsoft Graph.
5. User selects one message, previews extraction, and confirms import through the existing governed selected-message workflow.

## Provider Gates

- Supabase service-role runtime is required for live-ops snapshot persistence.
- `AXXESS_TOKEN_VAULT_KEY` is required for Microsoft mailbox listing.
- Microsoft OAuth credentials and a connected account are required before live mailbox messages can be listed.
- Regional key policy records do not yet provision external KMS/BYOK keys.

## Verification

Sprint 30 adds focused tests for:

- Customer-success live-ops snapshot behavior.
- Sprint 30 RLS migration expectations.
- Customer-success admin API guards and audit persistence.
- Microsoft Graph mailbox parsing and fetch parameters.
- Microsoft mailbox list API provider-gated behavior.
- Workflow record route/type coverage.

