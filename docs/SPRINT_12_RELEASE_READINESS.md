# Sprint 12 Release Readiness

## Completed In Repository

- Enterprise IAM policy model.
- Tenant resource guard.
- Immutable audit hash-chain utility.
- Privacy request planning, masking, and tokenization utilities.
- Compliance control resolver.
- AI prompt registry and output audit model.
- PostHog-ready observability adapter and event taxonomy.
- Supabase migration for security, privacy, compliance, AI governance, and vector manifests.
- GitHub security workflow with CodeQL, dependency review, pnpm audit, and Gitleaks.
- Tests for Sprint 12 policy and governance utilities.
- Security, compliance, privacy, AI governance, observability, DevSecOps, backup/DR, API, schema, admin, and mobile release docs.

## Cloud Configuration Required

- Enable Supabase MFA and OAuth providers.
- Configure passkeys/WebAuthn.
- Apply Sprint 12 migration to staging.
- Enable GitHub branch protections and Advanced Security features where available.
- Configure PostHog project key and dashboards.
- Confirm Supabase backup/PITR plan.
- Configure Vercel environment variables.
- Configure Expo/Bitrise mobile release credentials.

## Pilot Readiness Checklist

- [ ] Staging database migrated.
- [ ] RLS policies validated with multiple tenant users.
- [ ] Security workflow passing on pull requests.
- [ ] Secrets stored only in managed environments.
- [ ] PostHog events visible in dashboards.
- [ ] Backup restore drill completed.
- [ ] Privacy request runbook tested.
- [ ] AI output audit records generated for RAG answers.
- [ ] Human review path assigned for high-impact AI.
- [ ] Mobile internal build process documented and tested.

## Known Limitations

- This sprint adds foundations and evidence tables, not full admin UI for every compliance workflow.
- Actual MFA, OAuth, passkeys, KMS, branch protection, PostHog dashboards, Bitrise, TestFlight, and Google Play setup require provider-side configuration.
- The Supabase CLI was not installed locally, so the migration file follows the repository's existing timestamp convention.
