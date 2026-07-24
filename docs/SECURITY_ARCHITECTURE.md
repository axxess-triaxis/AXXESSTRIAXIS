# Security Architecture

Sprint 12 adds a production security foundation without changing the existing AXXESS UI or repository architecture.

## Security Model

AXXESS uses defense in depth:

- Supabase Auth for identity and session issuance.
- Server-side route and repository guards for tenant-aware access.
- PostgreSQL Row Level Security for database enforcement.
- Private Supabase Storage paths scoped by organization.
- Role, department, and workspace-aware permissions.
- Immutable security audit events with chained integrity hashes.
- Governed AI output audit records for model, prompt, source, and review evidence.

## Enterprise IAM

The Sprint 12 enterprise role model is defined in `src/security/enterpriseIam.ts`.

Roles:

- Super Admin
- Organization Admin
- Department Admin
- Project Lead
- Member
- Auditor
- External Consultant
- Guest

Existing Sprint 5-11 roles are preserved and mapped forward:

| Existing Role | Enterprise Role |
| --- | --- |
| Super Admin | Super Admin |
| Organization Admin | Organization Admin |
| Executive | Department Admin |
| Manager | Project Lead |
| Employee | Member |
| Consultant | External Consultant |
| Guest | Guest |

## Tenant Isolation

Tenant isolation is enforced through:

- `organization_id` on tenant-owned tables.
- `tenant_id` on organizations (a self-referential mirror column; see Sprint 3 tenant-model audit note below).
- Tenant scoping baked into `src/repositories/supabaseEnterpriseRepositories.ts` (`applyRepositoryQuery` on reads, `scope.organizationId`-derived inserts on writes) and `src/security/rbac.ts` (`canManageOrganization`, `assertOrganizationAccess`).
- RLS policies that require `public.is_org_member(...)` or role checks.
- Tenant-scoped vector namespaces through `org:{organizationId}:visibility:{scope}`.

### Sprint 3 Tenant-Model Audit Note (2026-07-24)

`src/security/tenantGuard.ts` (`assertTenantBoundary`, `canAccessTenantResource`, `requireTenantResourceAccess`) is correct but **not called by any route or repository** -- it is exercised only by its own unit test. The line above previously listed it as an active enforcement layer; it is not currently wired into request handling. Real enforcement today is the repository-layer `organization_id` scoping plus Postgres RLS listed above. See `docs/readiness/SPRINT_3_TWO_TENANT_ISOLATION_PERMISSION_PROOF_CLOSEOUT_2026_07_24.md` for the full tenant-model audit this note is drawn from.

No resource should be read, indexed, cached, or retrieved for RAG unless the request context and resource organization match.

## Supabase RLS

Sprint 12 migration:

`supabase/migrations/202607090001_sprint12_security_compliance_foundation.sql`

Adds RLS-protected tables for:

- Departments
- Workspaces
- Workspace members
- Security audit events
- Privacy requests
- Privacy consents
- Retention policies
- Compliance policies
- Prompt registry
- Prompt versions
- AI output audit
- Encryption key registry
- Vector index manifests

The migration uses `public.has_any_role_text(...)` to safely compare newly introduced enterprise roles without relying on same-transaction enum casts.

## Authentication Hardening Targets

Repository-level foundation is in place for:

- MFA enforcement markers.
- Passkey enrollment timestamp.
- OAuth provider readiness.
- Session correlation through `last_session_id`.
- Audit logging for login, logout, MFA, role, permission, document, workflow, and AI actions.

Cloud-side work still required:

- Enable Supabase MFA factors.
- Configure passkeys/WebAuthn provider flow.
- Configure Google, Microsoft, and Apple OAuth.
- Set short JWT expiry for regulated deployments.
- Add server-side session revocation checks for high-risk operations.

## Encryption

Current repository support:

- KMS alias registry in `encryption_key_registry`.
- Organization encryption profile field.
- Secret rotation interval in `.env.example`.
- Private storage and signed URL architecture from Sprint 9.

Cloud-side work still required:

- Confirm TLS 1.3 at ingress/CDN.
- Enable provider-managed database and storage encryption.
- Configure customer-managed keys for regulated tenants if required.
- Implement key rotation jobs and recovery drills.

## Audit Integrity

`src/security/auditIntegrity.ts` creates SHA-256 audit chain hashes.

Every production security event should include:

- Actor user and role.
- Organization.
- Action.
- Resource type and id.
- IP address.
- User agent or browser.
- Device id where available.
- Session id.
- Request id.
- Previous hash.
- Integrity hash.

## Operational Rule

Application code must not make authorization decisions using mutable user metadata. Role and tenant claims must come from trusted database records or Supabase app metadata.
