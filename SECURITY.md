# Security Policy

AXXESS is designed for enterprise and public-sector deployment. Please treat security issues with care and avoid public disclosure until a fix is available.

## Supported Versions

During pre-1.0 development, only the latest mainline version is actively maintained.

| Version | Supported |
| ------- | --------- |
| main    | Yes       |
| < main  | No        |

## Reporting a Vulnerability

Do not open public issues for vulnerabilities. Send a private report to the project maintainers with:

- Affected area or route.
- Reproduction steps.
- Expected impact.
- Any known tenant, RBAC, data exposure, or escalation path.
- Suggested mitigation, if known.

Maintainers should acknowledge valid reports, assess severity, prepare a fix privately, and publish release notes once the issue is resolved.

## Secret Handling

- Never commit `.env`, `.env.local`, service role keys, API keys, private certificates, or tenant exports.
- Only `NEXT_PUBLIC_*` variables may be exposed to browser code.
- Server-side credentials must be provided through local environment files or managed deployment secrets.
- Use least-privilege keys for development and production integrations.
- GitHub native secret scanning and push protection are enabled on this repository (2026-08-22), independent of the CI-based Gitleaks scan below.

## Security Architecture Status

This section is updated as the actual implementation changes, not written once at project start and left stale — treat any claim here you can't verify against the cited source file as a bug in this document, not a fact about the product.

- **Authentication:** real Supabase Auth (`src/auth/`), not mocked. Session handling and provisioning are live.
- **Authorization:** an 8-tier enterprise role model (Super Admin, Organization Admin, Department Admin, Project Lead, Member, Auditor, External Consultant, Guest) with a granular permission matrix (`src/security/enterpriseIam.ts`). Least-privilege by default; the one cross-tenant exception (`canViewCrossTenantPilotPortfolio` in `src/security/rbac.ts`) is scoped to a single env-configured operator organization and fails closed if that env var is unset.
- **Tenant isolation:** defense-in-depth. Postgres Row Level Security enforces tenant boundaries at the database layer; an independent application-layer guard (`src/security/tenantGuard.ts`, `assertTenantBoundary`/`canAccessTenantResource`) enforces the same boundary again in application code, wired into the RAG query pipeline (`tenantRagWorkflow.ts`).
- **Audit logging:** a hash-chained, tamper-evident event log (`src/security/auditIntegrity.ts`) — each event's hash incorporates the previous event's hash (SHA-256), so a modified or deleted historical entry breaks the chain and is detectable via `verifyAuditChain`.
- **Privacy / data subject requests:** a real execution engine (`src/privacy/privacyEngine.ts`) covering access/export, erasure, rectification, and consent withdrawal across database, storage, vector index, cache, search index, and analytics targets — wired into `POST /api/privacy/export-request` and `POST /api/account/deletion-request`. PII masking and tokenization helpers are available for lower-sensitivity display contexts.
- **Compliance mapping:** `src/compliance/complianceEngine.ts` maps GDPR, EU AI Act, UAE/Saudi PDPL, Singapore, and India DPDP requirements to the evidence types this platform can produce. This is a mapping/rules engine, not a certification — see the honest gaps below.
- **Security headers:** Content-Security-Policy, `Referrer-Policy`, `X-Content-Type-Options`, `X-Frame-Options: DENY`, and `Permissions-Policy` are set explicitly (`next.config.mjs`); `Strict-Transport-Security` is applied at the Vercel edge.
- **CI security gates** (`.github/workflows/security.yml`, `security-isolation-tests.yml`):
  - CodeQL (`security-extended`, `security-and-quality`) — blocking.
  - Gitleaks secret scanning — blocking.
  - `pnpm audit --prod --audit-level critical` — blocking, production dependencies, critical severity.
  - `dependency-review` — currently informational only (`continue-on-error: true`); the workflow's own comment attributes this to GitHub's Dependency Graph setting, which needs re-verifying against current repo settings rather than assumed correct.
  - Security Isolation Tests (tenant-boundary, `tenantGuard`, approval audit-log coverage) — currently informational only, an intentional advisory rollout window pending a reliability re-check before being made required.

## Known, honest gaps

Listed here deliberately, not omitted — a security document that only lists strengths reads as marketing, not evidence:

- **No rate limiting** on any API route today, including authentication and AI/RAG query endpoints.
- **`twoFactorAuthEnabled: true`** (`packages/shared/src/index.ts`) is a compliance-mapping capability flag, not yet backed by a wired TOTP/MFA challenge flow in `src/auth/` — do not represent this as an active 2FA control until that implementation exists.
- **No formal, written incident-response plan** exists yet.
- **No third-party penetration test** has been performed.
- **SOC 2, ISO 27001, and HIPAA certification are explicitly not yet pursued** — a deliberate founder decision (`docs/readiness/COMPLIANCE_CERTIFICATION_AND_INVESTOR_FEEDBACK_ROADMAP_2026_08_03.md`), to be revisited when a real procurement process requires it, not preemptively.
