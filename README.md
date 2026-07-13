# AXXESS by Triaxis Ventures

AXXESS is an AI-enabled, human-in-the-loop institutional intelligence platform for MSMEs, startups, enterprise, government, healthcare, NGO, and consulting organizations.

The product helps complex organizations convert projects, documents, decisions, stakeholders, meetings, risks, and approvals into a governed execution workspace. This repository contains the production-oriented Next.js implementation migrated from earlier Figma-generated Codex sprints while preserving the existing AXXESS visual language and feature surface.

Web beta is already live at **https://www.triaxisventures.com**, with iOS and Android build pipelines active in CI/CD ahead of public beta release.

---

## Table of Contents

- [Product Philosophy](#product-philosophy)
- [Who AXXESS Is For](#who-axxess-is-for)
- [Current Delivery Baseline (Post-Sprint-18)](#current-delivery-baseline-post-sprint-18)
- [Architecture](#architecture)
- [Governance, Observability, and Technical Auditability](#governance-observability-and-technical-auditability)
- [Security and Compliance Posture](#security-and-compliance-posture)
- [AI Governance and Human Review Model](#ai-governance-and-human-review-model)
- [Delivery and Release Pipeline Status](#delivery-and-release-pipeline-status)
- [Runtime Modes](#runtime-modes)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Quality Gates and CI Expectations](#quality-gates-and-ci-expectations)
- [Deployment](#deployment)
- [Mobile Delivery Notes](#mobile-delivery-notes)
- [Investor and Reviewer Navigation](#investor-and-reviewer-navigation)
- [Roadmap](#roadmap)
- [Documentation Index](#documentation-index)
- [Contributing](#contributing)
- [License](#license)

---

## Product Philosophy

AXXESS is built for institutional execution rather than generic content generation. The application prioritizes structured intelligence, governance controls, role-aware workflows, and human review over opaque automation.

Core principles:

- Human-in-the-loop AI for high-impact workflows.
- Enterprise-grade tenant boundaries, RBAC enforcement, and audit-first records.
- Predictable repository contracts with graceful fallback behavior.
- Quiet, precise interface patterns for executive and operational usage.
- Open-source-quality repository standards for maintainable, long-term development.

---

## Who AXXESS Is For

AXXESS is intended for organizations that require both productivity and control, including:

- MSMEs scaling from founder-led execution to institutional processes.
- Startups preparing for operational maturity and investor diligence.
- Enterprise teams requiring structured approvals and auditable decision flows.
- Public-sector and quasi-public institutions with governance-heavy operations.
- Healthcare and NGO programs requiring controlled data handling.
- Consulting and advisory firms coordinating multi-stakeholder execution.

---

## Current Delivery Baseline (Post-Sprint-18)

Current runtime status: **post-Sprint-18 baseline** with production-oriented onboarding/auth surfaces, tenant-aware governance controls, Supabase RLS persona artifacts, analytics provider selection, and mobile delivery scaffolding.

Implemented platform baseline includes:

- Next.js App Router application shell with protected route surfaces.
- Supabase-first repository model for auth, tenant entities, storage, and audit trails.
- Demo Mode for controlled preview environments with seeded institutional data.
- Graceful fallback repository behavior when backing services are unavailable.
- Governed RAG with permission-aware retrieval, citation handling, and answer audit logs.
- Local deterministic NLP utilities for extraction, summarization, and classification workflows.
- Governance modules for IAM-oriented controls, audit integrity, privacy planning, compliance mapping, and prompt governance.
- Operational delivery assets for CI, testing, release checks, and mobile scaffolds.

Historical sprint references may still appear in archival documents; where present, they should be interpreted as delivery milestones rather than current-state labels.

---

## Architecture

AXXESS follows a modular, service-oriented front-end/server architecture with clear domain and control boundaries.

### Application Layer

- Next.js App Router drives route structure, shells, protected views, and server routes.
- React + TypeScript support strongly typed UI/domain boundaries.
- Tailwind + component primitives provide a consistent design system foundation.

### Domain and Repository Layer

- Domain entities model institutional constructs such as organizations, programs, projects, approvals, documents, and stakeholders.
- Repository interfaces abstract storage/provider implementations.
- Supabase-backed implementations are used when configured; fallback repositories maintain controlled UX continuity in preview or degraded modes.

### Auth and Access Model

- Supabase Auth integration with route-aware auth surfaces.
- MFA/passkey-ready route patterns and account recovery flows.
- Tenant-aware access patterns and role-oriented control boundaries.

### Knowledge and Intelligence Layer

- Governed RAG pipeline supports:
  - document chunking,
  - permission-aware retrieval,
  - citation-enriched responses,
  - confidence metadata,
  - and answer audit logs.
- Local NLP utilities provide deterministic transformations:
  - keyword extraction,
  - summary generation,
  - entity extraction,
  - classification,
  - tag suggestions,
  - lightweight regional language detection.

### Runtime Resilience

- Service provider wiring supports dependency injection and graceful degradation.
- Failure modes are intentionally controlled to prevent leakage of backend internals to end users.
- Demo and production pathways are explicitly separated by configuration.

---

## Governance, Observability, and Technical Auditability

AXXESS is designed to be technically inspectable and operationally accountable.

### Governance

- Tenant isolation and role-aware boundaries are explicit platform concerns.
- Admin/governance route surfaces are included for controlled operations.
- Policy-oriented compliance control mapping is versioned and reviewable.

### Observability

- Analytics adapter supports dependency-safe provider selection.
- PostHog and Mixpanel integrations are optional and configuration-gated.
- CI gates, test suites, and build validations contribute to observable release hygiene.
- Operational runbooks are documented for repeatable delivery and incident response.

### Technical Auditability

- AI-assisted workflows are designed for traceability rather than black-box behavior.
- Audit-oriented logs capture security-relevant and workflow-relevant events.
- Governance and compliance artifacts are maintained in versioned docs.
- Control evidence can be reproduced through repository history, config, and runbooks.

---

## Security and Compliance Posture

AXXESS includes a practical, engineering-first security/compliance baseline intended to support due diligence and staged production hardening.

- RBAC and tenant guardrails are modeled in application/security layers.
- Supabase RLS persona testing assets support policy validation.
- Audit integrity controls include immutable hash-oriented patterns.
- Privacy engineering includes request planning and data protection considerations.
- Compliance mapping framework supports control-to-implementation traceability.
- Secret management expectations are documented (no server secrets in client runtime).
- Security/release expectations are reinforced through CI and documented runbooks.

> Note: Compliance outcomes depend on deployment configuration, environment hardening, and operational discipline in addition to application code.

---

## AI Governance and Human Review Model

AXXESS intentionally applies AI in a controlled decision-support model:

- AI is used to accelerate understanding, drafting, and retrieval.
- Human operators remain accountable for approvals and high-impact actions.
- Prompt governance and audit logging are integrated into design intent.
- Confidence/citation patterns are included to support verifiability.
- The platform is positioned for governed augmentation, not autonomous execution.

---

## Delivery and Release Pipeline Status

AXXESS currently runs a multi-surface CI/CD delivery pipeline for **Web, iOS, and Android** builds.

- **Web:** Active beta deployment is already hosted at **https://www.triaxisventures.com**.
- **Mobile (iOS/Android):** Build and release workflows are integrated and running through repository CI/CD and mobile build tooling.
- **Release posture:** Public beta release preparation is in progress, with governance, observability, and readiness checks tracked through documented runbooks and gates.
- **Engineering toolchain integration:** Delivery implementation has been accelerated through an integrated stack that includes **Codex, Capacitor, GitHub, VS Code, and Webnative**, while maintaining repository-level controls for auditability and operational traceability.

---

## Runtime Modes

### Production Mode

- Uses configured Supabase services and tenant-aware repositories.
- Intended for real organization onboarding and live operational usage.
- Requires secure secret provisioning and RLS policy readiness.

### Demo Mode

- Loads a coherent seeded preview tenant (North East Health Mission).
- Useful for controlled product walkthroughs and investor previews.
- Can be enabled via settings, preview login, or environment configuration.

Demo Mode controls:

- `NEXT_PUBLIC_AXXESS_DEMO_MODE=true` enables seeded preview behavior.
- Keep `false` for live customer environments.

Investor preview credentials (for controlled demos):

- Email: `investor.preview@axxess.demo`
- Password: `preview`

---

## Tech Stack

- Next.js 15 App Router
- React 18
- TypeScript
- Tailwind CSS 4
- Radix UI primitives and shadcn-style components
- Lucide React icons
- Recharts
- Supabase Auth, Database, and Storage architecture
- PostHog capture adapter through a dependency-free analytics provider
- Mixpanel browser client (disabled unless configured)
- Expo/EAS mobile scaffold under `apps/mobile`
- Capacitor/Webnative native shell under `apps/mobile-capacitor`
- Vitest and React Testing Library
- Playwright E2E
- pnpm workspace tooling

---

## Repository Structure

```text
.
|-- .github/                 GitHub templates, CI workflows, Dependabot
|-- apps/mobile/             Expo React Native scaffold for iOS and Android
|-- apps/mobile-capacitor/   Capacitor/Webnative shell
|-- docs/                    Engineering, governance, security, compliance, deployment docs
|-- guidelines/              Internal process and standards artifacts
|-- packages/shared/         Shared constants for roles, sectors, notices, events
|-- plans/                   Planning artifacts
|-- public/                  Static public assets
|-- src/
|   |-- app/                 Next App Router pages, shell layout, navigation, routing
|   |-- auth/                Supabase auth facade, local profile helpers, session clients
|   |-- components/          Shared layout, forms, feedback, and UI components
|   |-- config/              Feature flags and runtime configuration
|   |-- demo/                Seeded preview dataset, mode switch, demo repositories
|   |-- domain/              Core enterprise entity types
|   |-- features/            Dashboard, projects, tasks, CRM, Knowledge Hub, AI workspace
|   |-- providers/           Service provider wiring and dependency injection
|   |-- repositories/        Repository interfaces and Supabase implementations
|   |-- security/            RBAC, IAM patterns, tenant guardrails, audit integrity
|   |-- privacy/             Privacy request planning, masking, tokenization
|   |-- compliance/          Compliance control resolver
|   |-- services/            Analytics, observability, storage, NLP, governed RAG
|   |-- styles/              Fonts, theme, globals, design tokens
|   |-- test/                Test setup
|   `-- utils/               Pure utility modules
|-- supabase/                Migrations, seed data, fixtures, RLS persona artifacts
|-- tests/e2e/               End-to-end coverage
`-- scripts/                 Build/test/release and utility scripts
```

---

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

Open: `http://localhost:3000/dashboard`

### Useful commands

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
pnpm run ci
pnpm run mobile:capacitor:doctor
```

---

## Environment Variables

Copy `.env.example` to `.env.local` and populate values for connected services.

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_AXXESS_AUTH_SHELL=false
NEXT_PUBLIC_AXXESS_DEMO_MODE=false
NEXT_PUBLIC_AXXESS_APP_VERSION=0.8.0
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_ANALYTICS_PROVIDER=noop
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
NEXT_PUBLIC_MIXPANEL_TOKEN=
NEXT_PUBLIC_ANALYTICS_DISABLED=false
NEXT_PUBLIC_BETA_FEEDBACK_FORM_URL=
SUPABASE_SERVICE_ROLE_KEY=
AXXESS_KMS_KEY_ALIAS=
AXXESS_SECRET_ROTATION_DAYS=90
AXXESS_AUDIT_HASH_SALT=
```

Important handling rules:

- Only `NEXT_PUBLIC_*` values are safe for browser exposure.
- Server-side keys must remain in secure environment stores.
- Do not commit real secrets to version control.

---

## Quality Gates and CI Expectations

Before creating or merging changes, run:

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```

Repository CI includes (subject to workflow evolution):

- code quality checks,
- security gates,
- e2e validations,
- mobile-related workflow checks where applicable.

These checks are intended to keep platform behavior predictable and release artifacts auditable.

---

## Deployment

The application is prepared for Vercel and container-oriented deployment patterns.

Recommended production build flow:

```bash
pnpm install --frozen-lockfile
pnpm run build
```

Production deployment checklist:

- configure secrets in the hosting platform (never hardcode),
- apply and verify Supabase RLS before onboarding live tenant data,
- preserve security headers via `next.config.mjs`,
- validate observability hooks and rollback paths,
- verify environment segregation (preview/staging/production).

---

## Mobile Delivery Notes

- Expo scaffold is available under `apps/mobile`.
- Capacitor/Webnative shell is available under `apps/mobile-capacitor`.
- Bitrise/EAS workflows support preview and production pathways.
- iOS/Android signing should be managed through documented credential workflows.
- Build/release operations should follow runbooks to preserve repeatability and auditability.

See docs:
- `docs/EXPO_AUTO_BUILDS.md`
- `docs/EXPO_GITHUB_BUILD.md`
- `docs/EAS_MANAGED_CREDENTIALS.md`
- `docs/MOBILE_RELEASE_RUNBOOK.md`
- `docs/APP_STORE_READINESS.md`
- `docs/PLAY_STORE_READINESS.md`
- `docs/BITRISE.md`

---

## Investor and Reviewer Navigation

For external diligence and internal review workflows, start with:

- `docs/REVIEWER_GUIDE.md`
- `docs/DUE_DILIGENCE_SUMMARY.md`
- `docs/INVESTOR_ONE_PAGER.md`
- `docs/TECHNICAL_RISK_REGISTER.md`
- `docs/ENTERPRISE_READINESS_SCORECARD.md`
- `docs/SUBMISSION_CHECKLIST.md`

These documents are intended to present technical maturity, governance posture, and execution readiness without marketing-heavy claims.

---

## Roadmap

Near-term delivery priorities include:

- migrate lexical/local retrieval toward production embedding providers while preserving permission boundaries;
- expand document permission models with department/team-aware policies;
- complete invitation delivery provider integration with audit-reviewed provisioning flows;
- expand Playwright E2E coverage for protected routes and investor-preview pathways;
- validate Supabase RLS policy behavior across multiple tenant personas in staging;
- complete staged MFA/OAuth/passkey enablement and branch protection hardening;
- strengthen observability dashboards and operational alerts;
- complete mobile build hardening and release credential readiness.

---

## Documentation Index

### Platform and Architecture

- `docs/API.md`
- `docs/SCHEMA.md`
- `docs/ADMIN_OPERATIONS.md`
- `docs/DOCUMENTS.md`
- `docs/STORAGE.md`
- `docs/SEARCH.md`

### Security, Privacy, Compliance, Governance

- `docs/SECURITY_ARCHITECTURE.md`
- `docs/COMPLIANCE_ENGINE.md`
- `docs/PRIVACY_ENGINEERING.md`
- `docs/AI_GOVERNANCE.md`
- `docs/PRIVACY_DATA_MAP.md`
- `docs/ACCOUNT_DELETION.md`
- `docs/DEVSECOPS.md`
- `docs/BACKUP_DR.md`

### AI and Data Workflows

- `docs/RAG.md`
- `docs/NLP.md`

### Auth, Demo, and Environment

- `docs/AUTH.md`
- `docs/DEMO_MODE.md`
- `docs/ENVIRONMENT_VARIABLES.md`

### Delivery, Deployments, and Releases

- `docs/DEPLOYMENT.md`
- `docs/VERCEL_DEPLOYMENT.md`
- `docs/SUPABASE_STAGING.md`
- `docs/RLS_PERSONA_TESTS.md`
- `docs/PLAYWRIGHT.md`
- `docs/MOBILE_RELEASE.md`
- `docs/MOBILE_RELEASE_RUNBOOK.md`
- `docs/WEBNATIVE_CAPACITOR_AUDIT.md`
- `docs/WEBNATIVE_ENVIRONMENT_MATRIX.md`
- `docs/EXPO_AUTO_BUILDS.md`
- `docs/EXPO_GITHUB_BUILD.md`
- `docs/EAS_MANAGED_CREDENTIALS.md`
- `docs/BITRISE.md`
- `docs/WIX_SETUP.md`
- `docs/POSTHOG.md`
- `docs/POSTHOG_DASHBOARDS.md`
- `docs/MIXPANEL.md`

### Due Diligence and Reviewer Pack

- `docs/DUE_DILIGENCE_PACK.md`
- `docs/DUE_DILIGENCE_SUMMARY.md`
- `docs/INVESTOR_ONE_PAGER.md`
- `docs/TECHNICAL_RISK_REGISTER.md`
- `docs/ENTERPRISE_READINESS_SCORECARD.md`
- `docs/REVIEWER_GUIDE.md`
- `docs/SUBMISSION_CHECKLIST.md`

### Historical Milestones (Archival Context)

- `docs/SPRINT_12_RELEASE_READINESS.md`
- `docs/SPRINT_13_AUDIT.md`

---

## Contributing

Please read `CONTRIBUTING.md` before opening a pull request.

Expected contribution standards:

- preserve UI language unless an approved design task requires changes;
- maintain domain/repository boundary discipline;
- keep configuration and security assumptions explicit;
- update docs with implementation changes, especially where controls or runbooks change;
- pass local quality gates before opening a PR.

Required local checks before PRs:

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```

---

## License

Licensed under the Apache License, Version 2.0. See `LICENSE`.
