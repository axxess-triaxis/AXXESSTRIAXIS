# Agentic MCP3-1 Closeout: Live Rollout, Admin Control Plane, and Observability (2026-08-14)

## Objective

Make the existing MCP2 agentic infrastructure production-testable and admin-governable without
rebuilding MCP1/MCP2 or weakening tenant isolation.

## Files Added

- `src/app/api/agents/activity/route.ts`
- `src/app/api/agents/activity/route.test.ts`
- `docs/readiness/AGENTIC_MCP3_1_LIVE_VALIDATION_EVIDENCE_2026_08_14.md`
- `docs/readiness/AGENTIC_MCP3_1_LIVE_ROLLOUT_ADMIN_CONTROL_CLOSEOUT_2026_08_14.md`

## Files Modified

- `src/features/integrations/IntegrationsSection.tsx`
- `src/features/integrations/IntegrationsSection.test.ts`
- `src/security/agentScope.ts`
- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md`

## What Changed

- Added `GET /api/agents/activity`, an admin-only endpoint that summarizes tenant-scoped MCP
  activity from existing `audit_logs`, `approval_requests`, and `agent_action_grants`.
- Upgraded the Agent Connections panel from a key-generation card into an admin control plane:
  provider, status, label, key prefix, issued role/user, created date, last-used date, enabled tools,
  critical tool labels, active grants, grant revocation, capability toggles, recent activity, and
  summary metrics.
- Wired per-connection capability toggles through the existing `PATCH /api/agents/connections`
  route.
- Kept MCP2 tools opt-in and critical tools approval-gated.
- Kept raw API keys shown once only.
- Documented Copilot adapter status honestly as pending.

## What Did Not Change

- No raw API key storage.
- No new database tables.
- No RLS weakening.
- No direct database access for agents.
- No automatic execution of critical tools without approval or Always-Allow.
- No claim of live OpenAI / Claude / Copilot agent readiness.
- No X0, Demo, Lite, RAG, Knowledge Hub, auth, RBAC, or payment model changes.

## Verification

Passed:

- `corepack pnpm run typecheck`
- `corepack pnpm run lint`
- `corepack pnpm run build`
- `corepack pnpm run supabase:verify`
- `corepack pnpm exec vitest run src/app/api/agents/activity/route.test.ts src/features/integrations/IntegrationsSection.test.ts --config vitest.config.mjs --exclude .claude/**`: 2 files / 16 tests passed
- `corepack pnpm exec vitest run src/app/api/agents src/services/agents src/security/agentScope.test.ts src/features/integrations/IntegrationsSection.test.ts src/features/approvals --config vitest.config.mjs --exclude .claude/**`: 11 files / 98 tests passed

Blocked / partial:

- `corepack pnpm run test -- --exclude .claude/**` timed out locally without a final summary.

## Build Result

Passed. Next.js build registered `/api/agents/activity` as a dynamic production route.

## Supabase Result

Passed. No new migration was added. Supabase verification reports 40 migrations, 110 created
tables, and 110 RLS-protected tables, with the pre-existing warning about a permissive policy in
the initial enterprise schema.

## Deployment Status

Deployed by HITL/operator after local closeout:

```bash
node scripts/deploy-vercel.mjs --target=production --skip-checks
```

Deployment record:

- Project: `triaxis-www-frontend-import`
- Production alias: `https://landing.triaxisventures.com`
- Deployment URL: `https://triaxis-www-frontend-import-akc36rz48.vercel.app`
- Inspect URL: `https://vercel.com/axxess-tri-axis-powered-by-triaxis-ventures/triaxis-www-frontend-import/FxhgpgLKwQUgmAnue4L2gHbwi42R`
- Status: `Ready in 2m`
- Note: deploy script ended with a false failure because the optional Vercel CLI upgrade prompt
  attempted to run `pnpm` and failed with `spawn pnpm ENOENT`; the production deployment itself
  succeeded and was aliased to `landing.triaxisventures.com`.

## Live Validation Status

Pending HITL.

Do not mark live-complete until a tenant admin completes:

1. Generate key.
2. `initialize`.
3. `tools/list`.
4. One auto tool.
5. Disabled-tool denial.
6. One critical tool creates approval.
7. Approval executes exactly once.
8. Agent Activity and audit logs show the chain.

## Residual Risks

- Production deploy remains pending.
- Full-suite local test run timed out.
- Live MCP key generation and tool calls are not yet proven.
- Copilot still needs a dedicated adapter/manifest path.
- Activity panel is read-only observability; deeper filtering/export can be MCP3-2.

## Closeout Position

MCP3-1 is code-complete and verified at targeted, typecheck, lint, build, and Supabase levels. It is
not production-certified until deploy and live tenant-admin validation are completed.
