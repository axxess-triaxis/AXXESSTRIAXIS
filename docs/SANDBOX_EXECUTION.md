# Sandbox Execution

AXXESS now has a controlled execution abstraction for AI tools, plugin sync, document extraction, webhook processing, and report exports.

The current implementation prepares and audits execution jobs. It does not run arbitrary code automatically. That keeps Sprint 20/21 safe while preparing for Kubernetes, Vercel Sandbox, Docker, or CI runners.

## Core Files

- `src/services/execution/sandboxRuntime.ts`
- `src/app/api/execution/jobs/route.ts`
- `supabase/migrations/202607140002_sprint20_21_live_ai_platform.sql`

## Supported Job Kinds

- `plugin_sync`
- `ai_tool`
- `document_extraction`
- `integration_webhook`
- `report_export`

## Security Controls

- CPU, memory, and timeout limits.
- Network policy modes.
- Private-network denial.
- Secret brokering requirement.
- Artifact retention.
- Human approval for restricted and regulated tiers.
- Kubernetes-ready job spec generation.

## Runtime Modes

- `github_actions`
- `vercel_sandbox`
- `kubernetes`
- `docker`
- `local`

## Current Behavior

The API returns a dry-run execution record with logs and an execution spec. Unsafe policies are blocked before execution.

## Next Implementation Layer

Sprint 22 should connect one real runner behind explicit tenant policy approval, add artifact storage, and record actual runtime metrics.
