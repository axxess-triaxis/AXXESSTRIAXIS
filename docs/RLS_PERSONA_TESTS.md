# RLS Persona Tests

Sprint 13 adds:

- `supabase/tests/persona_fixtures.sql`
- `supabase/tests/rls_persona_tests.sql`

## Personas

- `org_admin_alpha`
- `executive_alpha`
- `manager_alpha`
- `employee_alpha`
- `consultant_alpha`
- `guest_alpha`
- `org_admin_beta`
- `guest_beta`

## Required Assertions

- Alpha users cannot see beta tenant records.
- Guest cannot approve prompts.
- Consultant cannot read restricted documents unless explicitly permitted.
- Organization admin can inspect tenant governance evidence.
- Client flows do not require service-role bypass.

## Runbook

1. Start local Supabase or connect to staging.
2. Apply migrations.
3. Seed auth users and matching public persona records.
4. Run persona fixtures.
5. Run `rls_persona_tests.sql`.
6. Attach output to PR or release notes.

The checked-in SQL is intentionally non-destructive and wrapped in a transaction.
