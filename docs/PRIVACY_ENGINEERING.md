# Privacy Engineering

Sprint 12 adds the privacy engineering foundation required for regulated enterprise pilots.

## Scope

The foundation covers:

- Data access export
- Erasure
- Rectification
- Consent withdrawal
- Retention review
- PII masking
- Deterministic tokenization
- Cascading deletes across application stores

Implementation:

- `src/privacy/privacyEngine.ts`
- `supabase/migrations/202607090001_sprint12_security_compliance_foundation.sql`

## Privacy Request Types

- `access_export`
- `erasure`
- `rectification`
- `consent_withdrawal`
- `retention_review`

## Cascading Actions

Erasure and consent withdrawal must consider:

- Database records
- Private storage
- Vector indexes
- Runtime caches
- Search indexes
- Analytics identifiers

Audit logs should be retained only where legally required and should not expose unnecessary personal data.

## PII Masking

The deterministic local utility masks common emails and phone numbers before logs, analytics, or review exports are produced.

## Tokenization

`tokenizePersonalValue(...)` produces organization-salted tokens. These are suitable for analytics continuity where raw personal identifiers are not needed.

## Operational Gaps

Still required before regulated production:

- DPO/admin review queue.
- Export package signing.
- Erasure certificate generation.
- Storage object deletion job.
- Vector index deletion job.
- Analytics user deletion or suppression integration.
- Legal hold workflow.
