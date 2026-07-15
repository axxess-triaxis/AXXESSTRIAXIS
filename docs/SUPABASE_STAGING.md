# Supabase Staging

AXXESS uses a repo-local Supabase CLI. See `docs/SUPABASE_CLI.md` before applying or creating migrations.

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

1. Run `pnpm install`.
2. Run `pnpm run supabase:version`.
3. Run `pnpm run supabase:verify`.
4. Link the target project with `pnpm run supabase:link -- --project-ref <project-ref>`.
5. Run `pnpm run supabase:db:dry-run`.
6. Apply migrations only after dry-run review.
7. Load persona fixtures.
8. Run `supabase/tests/rls_persona_tests.sql` or `pnpm run supabase:test:rls` against a local stack.
9. Validate private storage signed URL flow.
10. Validate onboarding tenant creation with a disposable organization.
11. Validate audit logs for provisioning, auth, document, and AI actions.
