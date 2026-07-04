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

Current runtime status: Sprint 11 production demo hardening with governed RAG and local NLP foundations.

- Next.js App Router powers the application shell, protected pages, and server routes.
- Supabase Auth, tenant repositories, CRUD workflows, notifications, invitations, audit logs, private storage, and RLS-ready metadata are in place.
- Runtime Demo Mode loads the seeded North East Health Mission tenant for investor previews.
- Production repository calls fall back to the demo repository layer when Supabase is unavailable, preventing investor-facing backend errors.
- Governed RAG provides document chunking, permission-aware retrieval, citations, confidence scoring, and answer audit logs.
- Local NLP utilities provide deterministic keyword extraction, summaries, entity extraction, classification, tag suggestions, and lightweight regional language detection.

## Tech Stack

- Next.js 15 App Router
- React 18
- TypeScript
- Tailwind CSS 4
- Radix UI primitives and shadcn-style components
- Lucide React icons
- Recharts
- Supabase Auth, Database, and Storage architecture
- Mixpanel browser client, disabled unless configured
- Vitest and React Testing Library
- pnpm

## Folder Structure

```text
.
|-- .github/             GitHub templates, CI workflows, Dependabot
|-- docs/                Engineering, auth, demo, RAG, NLP, deployment notes
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
|   |-- security/        RBAC and route guard architecture
|   |-- services/        Analytics, storage, local NLP, governed RAG, contracts
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
NEXT_PUBLIC_MIXPANEL_TOKEN=
NEXT_PUBLIC_ANALYTICS_DISABLED=false
NEXT_PUBLIC_BETA_FEEDBACK_FORM_URL=
SUPABASE_SERVICE_ROLE_KEY=
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
- Add observability, deployment runbooks, and production incident playbooks.

## Documentation

- `docs/AUTH.md`
- `docs/DEMO_MODE.md`
- `docs/RAG.md`
- `docs/NLP.md`
- `docs/DEPLOYMENT.md`
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
