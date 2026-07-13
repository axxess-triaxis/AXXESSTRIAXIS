# Productivity Plugin Registry

Sprint 14 adds adapter metadata for the first AXXESS productivity integration layer.

## Covered Systems

The registry covers email, calendar, storage, messaging, project management, CRM, database, document, and finance systems including Google Workspace, Microsoft 365, Slack, WhatsApp Business, Notion, Jira, Trello, Asana, Linear, GitHub, HubSpot, Salesforce, Zoho, Airtable, DocuSign, and Razorpay.

## Behavior

- Plugins remain provider-gated until credentials are configured.
- OAuth scopes are recorded in code for review.
- Required roles define who may connect each system.
- Audit event names define future logging contracts.
- Demo connectors are isolated from production tenants.

## Current State

Sprint 14 provides the registry, status cards, and health summary. OAuth handshakes and webhook handlers should be implemented provider by provider after security review.
