# Frontend Architecture

Sprint 15 consolidates AXXESS frontend composition around shared enterprise primitives while preserving the existing Next.js, React, TypeScript, Supabase/demo fallback, and feature-module architecture.

## Shell

- `src/app/App.tsx` owns authenticated shell rendering, route selection, analytics events, and guided demo banner placement.
- `src/app/layout/AppShell.tsx`, `Sidebar.tsx`, and `TopBar.tsx` own global layout.
- `src/app/navigation.ts` groups modules into Overview, Operations, Intelligence, Relationships, Governance, and Admin.
- `src/app/routing/*` maps routes to lazy feature modules.

## Shared Components

New Sprint 15 shared UI lives in:

- `src/components/enterprise/`
- `src/components/demo/`
- `src/components/platform/`

Key primitives include module headers, metric cards, data-state badges, confidence/human-review/audit badges, section cards, activity feeds, workflow steps, and demo notices.

## Guided Demo State

- `src/lib/demo/demoWorkflow.ts` defines the guided walkthrough.
- `src/hooks/useGuidedDemo.ts` persists active step state in local storage.
- `src/components/demo/GuidedDemoBanner.tsx` renders the walkthrough banner.
- `src/components/demo/DemoProgress.tsx` renders progress.

The flow works without Supabase credentials because it uses seeded frontend state and existing demo fallback repositories.

## Demo Seed Slices

Sprint 15 adds lightweight frontend seed slices under `src/lib/demo/`:

- `seedData.ts`
- `demoMetrics.ts`
- `demoActivity.ts`
- `demoDocuments.ts`
- `demoStakeholders.ts`
- `demoApprovals.ts`

These do not replace the production demo repository. They provide coherent presentation-layer data for cross-screen storytelling.

## Live, Demo, Provider-Gated, Empty

Every major screen should label its state:

- **Live**: repository data is available for the active tenant.
- **Demo**: seeded investor-preview data is being used.
- **Provider-gated**: the UI is ready but external provider keys or integrations are not configured.
- **Empty**: clean tenant with onboarding guidance.

## Screenshot Mode

Append `?screenshot=true` to app routes to hide guided-demo chrome for clean screenshots.

## Frontend Rules

- Keep the app quiet, institutional, and operational.
- Use shared primitives before adding local one-off cards.
- Do not expose backend errors to investor-facing surfaces.
- Do not make demo data look like live customer data.
- Keep CTAs explicit and connected to the next workflow.
