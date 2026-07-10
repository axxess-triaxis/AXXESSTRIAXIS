# AXXESS by Triaxis Ventures

AXXESS is an AI-enabled, human-in-the-loop institutional intelligence platform for enterprise, government, healthcare, NGO, and consulting organizations.

The product helps complex organizations turn projects, documents, decisions, stakeholders, meetings, risks, and approvals into a governed execution workspace. This repository contains the production-oriented Next.js implementation migrated from earlier Figma-generated Codex sprints while preserving the existing AXXESS visual language and feature surface.

## Product Philosophy

AXXESS is built for institutional execution rather than generic content generation. The application favors structured intelligence, auditability, role-aware workflows, and human review over opaque automation.

Core principles:

- Human-in-the-loop AI for high-impact actions.
- Enterprise-grade tenant, RBAC, and audit boundaries.
- Repository contracts that can fall back gracefully without exposing backend errors.
- A quiet, precise interface suitable for executive and operational users.
- Open-source-quality repository standards for long-term collaborative development.

## Architecture

Current runtime status: Sprint 13 enterprise beta readiness foundation with onboarding, auth route surfaces, admin readiness pages, Supabase RLS persona artifacts, analytics provider selection, and Expo mobile scaffold.

- Next.js App Router powers the application shell, protected pages, and server routes.
- Supabase Auth, tenant repositories, CRUD workflows, notifications, invitations, audit logs, private storage, and RLS-ready metadata are in place.
- Runtime Demo Mode loads the seeded North East Health Mission tenant for investor previews.
- Production repository calls fall back to the demo repository layer when Supabase is unavailable, preventing investor-facing backend errors.
- Governed RAG provides document chunking, permission-aware retrieval, citations, confidence scoring, and answer audit logs.
- Local NLP utilities provide deterministic keyword extraction, summaries, entity extraction, classification, tag suggestions, and lightweight regional language detection.
- Sprint 12 security modules add enterprise IAM, tenant guardrails, immutable audit hashing, privacy request planning, compliance control mapping, prompt governance, and PostHog-ready observability.
- Sprint 13 adds clean-tenant onboarding routes, sign-up/password-recovery/MFA/passkey-ready routes, account deletion initiation, admin governance pages, Expo/EAS mobile scaffold, Bitrise workflows, and due-diligence documentation.

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
- Mixpanel browser client, disabled unless configured
- Expo/EAS mobile beta scaffold under `apps/mobile`
- Vitest and React Testing Library
- pnpm

## Folder Structure

```text
.
|-- .github/             GitHub templates, CI workflows, Dependabot
|-- apps/mobile/         Expo React Native beta scaffold for iOS and Android
|-- docs/                Engineering, auth, demo, RAG, NLP, deployment notes
|-- packages/shared/     Shared Sprint 13 constants for roles, sectors, notices, events
|-- public/              Static public assets
|-- src/
|   |-- app/             Next App Router pages, shell layout, navigation, routing
|   |-- auth/            Supabase auth facade, local profile helpers, session clients
|   |-- components/      Shared layout, feedback, forms, and UI components
|   |-- config/          Feature flags
|   |-- demo/            Investor-preview dataset, mode switch, and demo repositories
|   |-- domain/          Core enterprise entity types
|   |-- features/        Dashboard, projects, tasks, CRM, Knowledge Hub, AI workspace
|   |-- providers/       Dependency injection and resilient service provider wiring
|   |-- repositories/    Repository interfaces and Supabase implementations
|   |-- security/        RBAC, enterprise IAM, tenant guards, audit integrity
|   |-- privacy/         Privacy request planning, masking, tokenization
|   |-- compliance/      Configurable compliance control resolver
|   |-- services/        Analytics, observability, storage, local NLP, governed RAG
|   |-- styles/          Fonts, theme, Tailwind, globals, design tokens
|   |-- test/            Test setup
|   `-- utils/           Pure utilities
`-- supabase/            Migrations, local seed data, and fixtures
```

## Installation

Prerequisites:

- Node.js 22 or newer
- pnpm 11 or newer

```bash
pnpm install
```

## Local Development

```bash
pnpm run dev
```

Open `http://localhost:3000/dashboard`.

Useful scripts:

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
pnpm run ci
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in values as services are connected.

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

Only `NEXT_PUBLIC_*` values are safe to expose to the browser. Server-side keys must stay in local environment files or managed deployment secrets.

`NEXT_PUBLIC_AXXESS_DEMO_MODE=true` opens the seeded North East Health Mission investor-preview tenant. Keep it `false` for live customers so new organizations start as clean tenants.

Investor preview login:

```text
Email: investor.preview@axxess.demo
Password: preview
```

## Demo Mode

Demo Mode can be enabled from Settings, through the investor preview login, or by setting `NEXT_PUBLIC_AXXESS_DEMO_MODE=true` in a deployment environment. It loads a coherent fictional institution with populated dashboards, programs, projects, approvals, Knowledge Hub records, notifications, recent activity, search data, and audit history.

When Demo Mode is off, the application uses Supabase repositories when configured and otherwise presents a clean tenant.

## Deployment

The app is prepared for Vercel and container-based deployment.

```bash
pnpm install --frozen-lockfile
pnpm run build
```

Production deployments should provide secrets through the hosting platform, enable Supabase row-level security before connecting real tenant data, and keep security headers enabled through `next.config.mjs`.

## Screenshots

Screenshot slots are reserved for production-approved imagery:

- Executive Dashboard: `docs/screenshots/dashboard.png`
- AI Workspace: `docs/screenshots/ai-workspace.png`
- Projects and Programs: `docs/screenshots/projects.png`
- Knowledge Hub: `docs/screenshots/knowledge-hub.png`

## Roadmap

- Replace lexical local retrieval with production embedding providers while preserving permission filters.
- Add department/team mappings to document permissions.
- Add invitation email delivery provider and audit-reviewed provisioning flows.
- Expand browser E2E coverage for investor preview and protected routes.
- Apply Sprint 12 migration to staging and validate RLS across multiple tenant personas.
- Apply Sprint 13 migration and run `supabase/tests/rls_persona_tests.sql` in staging.
- Enable Supabase MFA, OAuth providers, passkeys/WebAuthn, branch protections, PostHog dashboards, and backup drills.
- Run Android preview EAS/Bitrise build and prepare iOS signing credentials.
- In the Expo dashboard, set GitHub build Base directory to `apps/mobile`; see `docs/EXPO_GITHUB_BUILD.md`.
- Configure iOS and Android signing through Expo-managed EAS credentials; see `docs/EAS_MANAGED_CREDENTIALS.md`.
- Preview EAS builds auto-run on mobile-relevant pushes to `main`; production EAS builds are manually triggered. See `docs/EXPO_AUTO_BUILDS.md`.
- Launch production Android/iOS mobile builds from `apps/mobile/.eas/workflows/create-production-builds.yml`.
- Use `pnpm mobile:eas:workflow:production` or `pnpm mobile:eas:build:production:all` to trigger Expo production builds from the repository root.
- In Wix setup, use `https://github.com/axxess-triaxis/AXXESSTRIAXIS.git`; see `docs/WIX_SETUP.md`.

## Documentation

- `docs/AUTH.md`
- `docs/DEMO_MODE.md`
- `docs/RAG.md`
- `docs/NLP.md`
- `docs/DEPLOYMENT.md`
- `docs/EXPO_AUTO_BUILDS.md`
- `docs/SECURITY_ARCHITECTURE.md`
- `docs/COMPLIANCE_ENGINE.md`
- `docs/PRIVACY_ENGINEERING.md`
- `docs/AI_GOVERNANCE.md`
- `docs/OBSERVABILITY.md`
- `docs/DEVSECOPS.md`
- `docs/BACKUP_DR.md`
- `docs/MOBILE_RELEASE.md`
- `docs/SPRINT_13_AUDIT.md`
- `docs/VERCEL_DEPLOYMENT.md`
- `docs/SUPABASE_STAGING.md`
- `docs/RLS_PERSONA_TESTS.md`
- `docs/BITRISE.md`
- `docs/MIXPANEL.md`
- `docs/POSTHOG.md`
- `docs/POSTHOG_DASHBOARDS.md`
- `docs/PLAYWRIGHT.md`
- `docs/EXPO_GITHUB_BUILD.md`
- `docs/EAS_MANAGED_CREDENTIALS.md`
- `docs/WIX_SETUP.md`
- `docs/ENVIRONMENT_VARIABLES.md`
- `docs/APP_STORE_READINESS.md`
- `docs/PLAY_STORE_READINESS.md`
- `docs/PRIVACY_DATA_MAP.md`
- `docs/ACCOUNT_DELETION.md`
- `docs/DUE_DILIGENCE_PACK.md`
- `docs/SPRINT_12_RELEASE_READINESS.md`
- `docs/API.md`
- `docs/SCHEMA.md`
- `docs/ADMIN_OPERATIONS.md`
- `docs/DOCUMENTS.md`
- `docs/STORAGE.md`
- `docs/SEARCH.md`

## Contributing

Please read `CONTRIBUTING.md` before opening a pull request. All changes should preserve the existing UI language unless an approved design task explicitly changes it.

Required local checks before pull requests:

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```

## License

Licensed under the Apache License, Version 2.0. See `LICENSE`.
