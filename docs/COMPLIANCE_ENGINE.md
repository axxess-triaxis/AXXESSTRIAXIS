# Compliance Engine

Sprint 12 introduces a configurable compliance control layer for regulated pilots. This is not legal advice. It is an engineering foundation for evidence capture, review workflow, and jurisdiction-specific control mapping.

## Supported Jurisdictions

The initial control catalog is implemented in `src/compliance/complianceEngine.ts`.

Jurisdictions:

- EU GDPR
- EU AI Act
- UAE ADGM/DIFC
- Saudi PDPL
- Singapore AI Governance Framework
- India DPDP

## Control Categories

- Privacy
- Security
- AI governance
- Audit
- Data residency
- Human review

## Evidence Model

Compliance controls map to evidence artifacts such as:

- Privacy request
- Export manifest
- Erasure certificate
- Consent record
- Notice version
- Retention policy
- Prompt version
- Source citations
- Confidence score
- Human review status
- Immutable audit chain
- AI use-case register

## Database Foundation

The Sprint 12 migration adds:

- `compliance_policies`
- `privacy_requests`
- `privacy_consents`
- `retention_policies`
- `security_audit_events`
- `prompt_registry`
- `prompt_versions`
- `ai_output_audit`

All tables are tenant-scoped and RLS-protected.

## Decision Flow

`resolveComplianceDecision(...)` accepts:

- Jurisdictions
- Data classifications
- High-impact AI flag
- Data residency sensitivity

It returns:

- Matching controls
- Human review requirement
- Data residency requirement

## Reference Links

- EU GDPR official text: https://eur-lex.europa.eu/eli/reg/2016/679/oj
- EU AI Act official text: https://eur-lex.europa.eu/eli/reg/2024/1689/oj

Additional jurisdictional interpretations should be reviewed by counsel before pilot contracts.
