# AXXESS by Triaxis Ventures

AXXESS is an AI-enabled, human-in-the-loop institutional intelligence platform for enterprise, government, healthcare, NGO, and consulting organizations.

The product helps complex organizations turn projects, documents, decisions, stakeholders, meetings, risks, and approvals into a governed execution workspace. This repository contains the production-oriented Next.js implementation migrated from earlier Figma-generated Codex sprints while preserving the existing AXXESS visual language and feature surface.

## Product Philosophy

AXXESS is built for institutional execution rather than generic content generation. The application favors structured intelligence, auditability, role-aware workflows, and human review over opaque automation.

Core principles:

- Human-in-the-loop AI for high-impact actions.
- Enterprise-grade tenant, RBAC, and audit boundaries.
- Modular feature domains that can move from mock services to real services cleanly.
- A quiet, precise interface suitable for executive and operational users.
- Open-source-quality repository standards for long-term collaborative development.

## Architecture

AXXESS uses the Next.js App Router as the application runtime. Feature modules are separated from route definitions, service contracts, repository interfaces, security concerns, and design tokens so implementation details can evolve without forcing UI rewrites.

Current runtime status:

- UI and route shell are implemented.
- Data is mock-backed through service/repository boundaries.
- Supabase schema, seed, and fixture scaffolding are present.
- Auth, storage, realtime, AI providers, and notifications are architecturally prepared but not connected to production services.

## Tech Stack

- Next.js 15 App Router
- React 18
- TypeScript
- Tailwind CSS 4
- Radix UI primitives and shadcn-style components
- Lucide React icons
- Recharts
- Vitest and React Testing Library
- Supabase-ready database/auth/storage architecture
- pnpm

## Folder Structure

```text
.
|-- .github/             GitHub issue templates, PR template, workflows, Dependabot
|-- docs/                Repository audit and engineering notes
|-- public/              Static public assets
|-- scripts/             Project automation helpers
|-- src/
|   |-- app/             Next App Router pages, shell layout, navigation, routing
|   |-- auth/            Mock auth/session facade
|   |-- components/      Shared layout, feedback, and UI components
|   |-- config/          Feature flags
|   |-- constants/       Shared route constants
|   |-- domain/          Core enterprise entity types
|   |-- features/        Dashboard, projects, tasks, CRM, knowledge, documents, etc.
|   |-- hooks/           Reusable React hooks
|   |-- lib/             Environment and platform helpers
|   |-- mocks/           Mock institutional data
|   |-- providers/       Dependency injection and service provider wiring
|   |-- repositories/    Repository interfaces
|   |-- security/        RBAC and route guard architecture
|   |-- services/        Service contracts and mock implementations
|   |-- styles/          Fonts, theme, Tailwind, globals, design tokens
|   |-- test/            Test setup
|   |-- types/           Shared app types
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
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
```

Only `NEXT_PUBLIC_*` values are safe to expose to the browser. Server-side keys must stay in local environment files or managed deployment secrets.

## Deployment

The app is prepared for Vercel and container-based deployment.

Vercel:

```bash
pnpm install --frozen-lockfile
pnpm run build
```

Docker:

```bash
docker build -t axxess .
docker run -p 3000:3000 axxess
```

Production deployments should provide secrets through the hosting platform, enable Supabase row-level security before connecting real tenant data, and keep security headers enabled through `next.config.mjs`.

## Screenshots

Screenshots are intentionally placeholders until production-approved imagery is available.

- Executive Dashboard: `docs/screenshots/dashboard.png`
- AI Workspace: `docs/screenshots/ai-workspace.png`
- Projects and Programs: `docs/screenshots/projects.png`

## Roadmap

- Connect Supabase Auth, Postgres, Storage, and Realtime.
- Implement production tenant isolation and organization membership flows.
- Replace mock repositories with Supabase-backed implementations.
- Add AI provider adapters with human-review workflow controls.
- Expand automated testing around feature modules and route guards.
- Add visual regression testing for the enterprise UI shell.
- Add observability, audit logging, and deployment runbooks.

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
