# Due Diligence Pack

## Architecture Overview

AXXESS is a Next.js 15 enterprise SaaS beta with Supabase Auth/Database/Storage architecture, tenant-scoped repositories, private storage, governed RAG, local NLP, analytics abstraction, and an Expo mobile beta scaffold.

Sprint 14 extends this into an AI-native platform layer with provider-gated AI routing, a RAG repository foundation, an open-source NLP model registry, productivity plugin registry, live dashboard hooks, social alert ingestion architecture, and Wix-safe public website exports.

Sprint 15 adds enterprise frontend coherence with shared UI primitives, guided demo state, clean screenshot mode, live/demo/provider-gated labeling, and polished dashboard, AI Workspace, Knowledge Hub, approvals, CRM, projects, tasks, and analytics surfaces for investor and pilot demonstrations.

## Security Model

The platform is designed with tenant isolation, RBAC, route protection, private storage, audit logs, immutable audit-chain utilities, and server-only privileged operations.

## Auth Model

Current beta supports email/password login/logout/session cookies. Sprint 13 adds sign-up, password recovery, MFA route surfaces, OAuth readiness, and passkey-ready placeholders.

## MFA/OAuth/Passkey Status

MFA/OAuth/passkeys require Supabase project-side configuration before live enablement.

## Tenant Isolation Model

Tenant records use `organization_id` and Sprint 13 migration adds `tenant_id`, workspace, and department metadata to core tables where feasible.

## RLS Policy Summary

RLS policies exist across core tenant tables, Knowledge Hub, storage, and Sprint 12/13 governance tables. Persona SQL tests are checked in for staging validation.

## Data Storage Model

Relational data lives in Supabase Postgres. Document objects live in private Supabase Storage. Future embeddings/vector indexes must stay tenant-scoped.

## Analytics/Privacy Model

Analytics provider defaults to noop. PostHog and Mixpanel are selectable. Sensitive content and PII keys are sanitized by default.

## AI Governance Model

RAG answers track citations, confidence, source ids, human review flags, prompt version readiness, and AI output audit metadata.

Sprint 14 adds provider routing metadata including selected provider, routing reason, cost tier, latency, confidence, citations, and human review status.

## Prompt Approval Model

Prompt versions support draft/pending/approved/rejected/retired review states in the Sprint 13 migration.

## Audit Log Model

Audit logs cover auth, provisioning, role, document, workflow, privacy, and AI actions. Sprint 12 adds hash-chain utilities.

## Backup/Restore Model

Staging backup/restore scripts and verification SQL exist. A completed provider-side restore drill is still required.

## Mobile Deployment Model

Expo app lives under `apps/mobile` with EAS profiles and Bitrise workflows for Android APK and iOS prebuild/signing path.

## App Store / Play Store Readiness

Readiness docs exist. Store submission requires icons, screenshots, privacy policy/support URLs, Apple/Google credentials, and final data safety labels.

## Known Beta Limitations

- Supabase MFA/OAuth/passkeys must be configured.
- Staging migration must be applied and validated.
- Mobile builds require provider credentials.
- Some frontend states remain demo-seeded until production providers and pilot tenants are fully configured.
- Compliance is an audit-ready foundation, not certification.

## Roadmap To SOC2/ISO27001 Readiness

- Complete access control evidence.
- Automate RLS persona tests.
- Complete backup drills.
- Add incident tabletop exercises.
- Add vendor risk register.
- Add formal change-management approvals.

## Production-Ready vs Beta-Ready

Beta-ready: web build, demo mode, repository fallback, RAG foundation, local NLP, audit-ready docs, mobile scaffold, CI/security configs.

Production/provider-gated: MFA/OAuth/passkeys, staging Supabase application, mobile store builds, branch protections, live analytics dashboards, restore drill evidence.
