# AXXESS by Triaxis Ventures

AXXESS is an AI-enabled, human-in-the-loop institutional execution platform for MSMEs, startups, enterprise, government, healthcare, NGO, and consulting organizations.

The platform converts projects, documents, decisions, stakeholders, meetings, risks, and approvals into a governed execution workspace with auditability, role-aware workflows, and decision-grade AI support.

## Investor Snapshot

### The Problem

Large institutions still run critical execution across fragmented tools, manual reviews, and weak audit trails. Generic AI copilots do not meet governance, accountability, and compliance expectations for decision-heavy environments.

### Our Solution

AXXESS is an institutional execution layer with human-in-the-loop AI, governed retrieval, and role-aware workflows that connect projects, documents, risks, approvals, and decisions in one auditable system.

### Why We Can Win

- Architecture moat: tenant-aware, audit-first platform built for regulated operations.
- Product moat: AI integrated into governed workflows, not bolted on as chat.
- Delivery moat: web, Android, and iOS release pipelines already operational.
- Trust moat: privacy, compliance, and security design embedded from core sprints.

## Current Build and Release Status

As of 2026-07-14:

- Web production website is live on https://www.triaxisventures.com.
- Beta web experience is hosted separately on beta.triaxisventures.com.
- Beta and website architectures are intentionally separated.
- Android build pipeline is active in CI/CD.
- iOS build pipeline is active in CI/CD.
- Web build and deployment pipeline is active in CI/CD.
- Sprint 19 adds the first live external-organization journey: sign-up/login, tenant provisioning, document ingestion, governed RAG, human review, audit logging, and selected-email import.

## Product Philosophy

AXXESS is built for institutional execution rather than generic content generation. The application prioritizes structured intelligence, governance controls, role-aware workflows, and human review over opaque automation.

- Human-in-the-loop AI for high-impact workflows.
- Enterprise-grade tenant boundaries, RBAC enforcement, and audit-first records.
- Predictable repository contracts with graceful fallback behavior.
- Quiet, precise interface patterns for executive and operational usage.
- Open-source-quality repository standards for maintainable long-term development.

## Who AXXESS Is For

- MSMEs scaling from founder-led execution to institutional processes.
- Startups preparing for operational maturity and investor diligence.
- Enterprise teams requiring structured approvals and auditable decision flows.
- Public-sector institutions with governance-heavy operations.
- Healthcare and NGO programs requiring controlled data handling.
- Consulting and advisory firms coordinating multi-stakeholder execution.

## Current Delivery Baseline

Implemented platform baseline includes:

- Next.js App Router application shell with protected route surfaces.
- Supabase-first repository model for auth, tenant entities, storage, and audit trails.
- Live onboarding route for clean organization creation, profile persistence, role provisioning, workspace setup, and tenant selection.
- Demo Mode for controlled preview environments with seeded institutional data.
- Graceful fallback repository behavior when backing services are unavailable.
- Governed RAG with document ingestion, persistent chunks, permission-aware retrieval, citation handling, answer audit logs, and human approval/rejection records.
- Provider-neutral AI routing with cost, latency, model, confidence, and human-review metadata.
- Connector framework for OAuth-owned integrations, selected email import, confirmation-before-create extraction, sync logs, retry/error posture, revocation readiness, and audit trail.
- Local deterministic NLP utilities for extraction, summarization, and classification workflows.
- Governance modules for IAM controls, audit integrity, privacy planning, and compliance mapping.
- Operational delivery assets for CI, testing, release checks, and mobile scaffolds.

## Architecture

AXXESS follows a modular, service-oriented front-end and server architecture with clear domain and control boundaries.

### Application Layer

- Next.js App Router drives route structure, shells, protected views, and server routes.
- React and TypeScript support strongly typed UI and domain boundaries.
- Tailwind and component primitives provide a consistent design system foundation.

### Domain and Repository Layer

- Domain entities model organizations, programs, projects, approvals, documents, and stakeholders.
- Repository interfaces abstract provider implementations.
- Supabase-backed implementations are used when configured; fallback repositories preserve controlled UX continuity.

### Auth and Access Model

- Supabase Auth integration with route-aware auth surfaces.
- Email/password sign-up, login, logout, session persistence, password recovery, reset finalization, live profile update, organization creation, invitation acceptance, and tenant selection routes.
- MFA and passkey-ready route patterns and recovery flows.
- Tenant-aware access patterns and role-oriented control boundaries.

### Knowledge and Intelligence Layer

- Governed RAG pipeline with document upload/text ingestion, chunking, local deterministic embeddings, permission-aware retrieval, citation-enriched responses, confidence metadata, and answer audit logs.
- Human review path records approved/rejected AI answers and can create a follow-up task from an approved recommendation.
- Local NLP utilities for keyword extraction, summary generation, entity extraction, classification, and tag suggestions.

## Governance, Observability, and Auditability

- Tenant isolation and role-aware boundaries are explicit platform concerns.
- Analytics adapter supports dependency-safe provider selection.
- PostHog and Mixpanel integrations are optional and configuration-gated.
- CI gates and test suites contribute to observable release hygiene.
- Governance and compliance artifacts are maintained in versioned docs.

## Security and Compliance Posture

Current commercial focus is DIFC, ADGM, and Singapore, with EU readiness as a parallel track.

AXXESS is mapped to policy and control patterns aligned with DIFC DP Law, ADGM data protection expectations, and Singapore PDPA-style accountability, while maintaining GDPR-aligned engineering patterns (data minimization, purpose limitation support, auditability, deletion workflows, access controls, and tenant isolation).

This is an engineering readiness posture and should be finalized per customer engagement through legal and compliance review.

## Delivery and Release Pipeline Status

AXXESS currently runs a multi-surface CI/CD delivery pipeline for web, iOS, and Android builds.

- Web deployment is active.
- Mobile iOS and Android build and release workflows are active.
- Public beta release preparation is tracked through runbooks and gates.
- Delivery tooling includes Codex, Capacitor, GitHub, VS Code, and Webnative with repository-level traceability.

## Runtime Modes

### Production Mode

- Uses configured Supabase services and tenant-aware repositories.
- Intended for live organization onboarding, profile management, document ingestion, grounded AI questions, email-import review, and operational usage.
- Requires secure secret provisioning and RLS policy readiness.

### Demo Mode

- Loads a seeded preview tenant for controlled demos.
- Can be enabled via settings, preview login, or environment configuration.
- Keep disabled for live customer environments.

## Tech Stack

- Next.js 15 App Router
- React + TypeScript
- Tailwind CSS 4
- Radix UI and shadcn-style components
- Lucide React icons and Recharts
- Supabase Auth, Database, and Storage architecture
- PostHog and Mixpanel provider pathways
- Expo/EAS mobile scaffold under apps/mobile
- Capacitor native shell under apps/mobile-capacitor
- Vitest, React Testing Library, and Playwright
- pnpm workspace tooling

## Repository Structure

```text
.
|-- .github/
|-- apps/mobile/
|-- apps/mobile-capacitor/
|-- docs/
|-- guidelines/
|-- packages/shared/
|-- plans/
|-- public/
|-- scripts/
|-- src/
|-- supabase/
`-- tests/
```

## Getting Started

### Prerequisites

- Node.js 22 or newer
- pnpm 11 or newer

### Install

```bash
pnpm install
```

### Run locally

```bash
pnpm run dev
```

Open http://localhost:3000/dashboard

### Useful commands

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
pnpm run ci
pnpm run mobile:capacitor:doctor
```

## Environment Variables

Copy .env.example to .env.local and populate values for connected services.

Important handling rules:

- Only NEXT_PUBLIC_* values are safe for browser exposure.
- Server-side keys must remain in secure environment stores.
- Do not commit real secrets to version control.

## Quality Gates and CI Expectations

Run before creating or merging changes:

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```

## Deployment

Recommended production build flow:

```bash
pnpm install --frozen-lockfile
pnpm run build
```

Production deployment checklist:

- Configure secrets in hosting platforms.
- Apply and verify Supabase RLS before onboarding live tenant data.
- Preserve security headers via next.config.mjs.
- Validate observability hooks and rollback paths.
- Verify environment segregation (preview, staging, production).

## Mobile Delivery Notes

- Expo scaffold is available under apps/mobile.
- Capacitor shell is available under apps/mobile-capacitor.
- Build and release operations should follow runbooks for repeatability and auditability.

## Documentation Index

Key references:

- docs/DEPLOYMENT.md
- docs/VERCEL_DEPLOYMENT.md
- docs/MOBILE_RELEASE.md
- docs/MOBILE_RELEASE_RUNBOOK.md
- docs/SECURITY_ARCHITECTURE.md
- docs/COMPLIANCE_ENGINE.md
- docs/PRIVACY_ENGINEERING.md
- docs/AI_GOVERNANCE.md
- docs/DEVSECOPS.md
- docs/RLS_PERSONA_TESTS.md
- docs/DUE_DILIGENCE_PACK.md
- docs/API.md
- docs/SCHEMA.md
- docs/SPRINT_19_FUNCTIONAL_ENTERPRISE_AI.md

## Contributing

Please read CONTRIBUTING.md before opening a pull request.

Expected contribution standards:

- Preserve UI language unless an approved design task requires changes.
- Maintain domain and repository boundary discipline.
- Keep configuration and security assumptions explicit.
- Update docs with implementation changes, especially for controls and runbooks.
- Pass local quality gates before opening a PR.

## License

Licensed under the Apache License, Version 2.0. See LICENSE.
