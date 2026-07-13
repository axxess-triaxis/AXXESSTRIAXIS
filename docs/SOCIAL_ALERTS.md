# Social Alert Ingestion

Sprint 14 adds the architecture for governed external signal ingestion.

## Providers

- X
- Facebook
- RSS
- Manual intake
- Demo signals

## Governance

Provider credentials are optional and gated. External signals produce recommendations and workflow targets, not automatic outbound actions. Human review is required before converting sensitive alerts into stakeholder outreach or approval packets.

## Data Model

The Sprint 14 migration adds organization-scoped alert rules and alert events with RLS enabled. Alert events include provider, source account, sentiment, urgency, action targets, and review metadata.
