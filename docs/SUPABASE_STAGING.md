# Supabase Staging

Sprint 13 adds staging-ready migration and RLS persona test artifacts.

## Migration Order

Apply existing migrations in order, ending with:

- `202607090001_sprint12_security_compliance_foundation.sql`
- `202607090002_sprint13_onboarding_rls_persona_readiness.sql`

## Required Configuration

- Supabase Auth email/password enabled.
- Email verification configured.
- MFA factors enabled before MFA routes move from beta blocker to live.
- OAuth providers configured in Supabase dashboard before provider buttons are exposed.
- Passkeys/WebAuthn configured before passkey routes are enabled.
- Private `axxess-documents` storage bucket policies applied.

## Service Role

The service-role key is server-only. It must never be used in browser or mobile code.

## Staging Checks

1. Apply migrations.
2. Load persona fixtures.
3. Run `supabase/tests/rls_persona_tests.sql`.
4. Validate private storage signed URL flow.
5. Validate onboarding tenant creation with a disposable organization.
6. Validate audit logs for provisioning, auth, document, and AI actions.
