# Agentic MCP3-1 Live Validation Evidence (2026-08-14)

## Purpose

This file tracks the live rollout evidence for MCP3-1: admin control plane, activity visibility,
capability toggles, grant visibility, and end-to-end MCP validation.

## Current Status

Status: **Deployed / pending HITL live MCP validation**

MCP3-1 adds production-testable admin controls, but live certification is not claimed here because
the real tenant key walkthrough has not been completed in this pass.

## Deployment Status

Deployed by HITL/operator after local closeout.

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

## Live Validation Checklist

| Step | Status | Evidence / Notes |
|---|---|---|
| Production deployment live | Done | `landing.triaxisventures.com` aliased to deployment `triaxis-www-frontend-import-akc36rz48.vercel.app`; Vercel CLI reported `Ready in 2m`. |
| Tenant admin generates real key | Pending | Requires live deployment and authenticated tenant admin session. |
| Raw key shown once | Code-complete | Existing `/api/agents/connections` behavior preserved; UI copy reinforced. |
| `initialize` succeeds live | Pending | Requires generated key and production call. |
| `tools/list` succeeds live | Pending | Requires generated key and production call. |
| Auto tool works live | Pending | Use `list_tasks` or `list_projects`. |
| Disabled tool returns denial | Code-complete, live pending | Capability toggles are UI-wired through PATCH; MCP denial already tested. |
| Critical tool creates approval | Code-complete, live pending | MCP2 route behavior preserved. |
| Approval executes exactly once | Code-complete, live pending | Existing approval route behavior preserved; needs live walkthrough. |
| Audit logs show full chain | Code-complete, live pending | New activity API reads `audit_logs` category `agentic-infrastructure`. |

## Code Evidence Added This Pass

- `GET /api/agents/activity` reads tenant-scoped agent audit logs, pending approvals, and active grants.
- Agent Connections UI now shows provider, status, label, key prefix, issued role/user, created date,
  last-used date, enabled tools, critical-tool labels, active grants, grant revocation, capability
  toggles, activity stream, and summary metrics.
- MCP2 tools remain opt-in per connection; critical tools remain approval-gated unless an active
  Always-Allow grant exists.

## Verification Evidence

Passed:

- `corepack pnpm run typecheck`
- `corepack pnpm run lint`
- `corepack pnpm run build`
- `corepack pnpm run supabase:verify`
- Targeted MCP/admin tests: 11 files / 98 tests passed
- Focused new tests: 2 files / 16 tests passed

Partial:

- `corepack pnpm run test -- --exclude .claude/**` timed out locally without a final summary.
  This is recorded as a runtime blocker, not a passing result.

## Exact HITL Actions Required

1. Open Settings / Integrations / Agent Connections as an Organization Admin.
2. Generate a key and copy it once.
3. Call `POST https://landing.triaxisventures.com/api/agents/mcp` with `initialize`.
4. Call `tools/list`.
5. Disable one tool and confirm it returns a denial.
6. Call one auto tool and confirm success.
7. Call one critical tool and confirm pending approval.
8. Approve it in Approvals & Governance.
9. Confirm the action executes exactly once.
10. Confirm Agent Activity and Audit logs show the full chain.
