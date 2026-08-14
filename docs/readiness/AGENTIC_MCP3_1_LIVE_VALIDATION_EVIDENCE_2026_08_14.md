# Agentic MCP3-1 Live Validation Evidence (2026-08-14)

## Purpose

This file tracks the live rollout evidence for MCP3-1: admin control plane, activity visibility,
capability toggles, grant visibility, and end-to-end MCP validation.

## Current Status

Status: **Code-complete / pending production deploy and HITL live validation**

MCP3-1 adds production-testable admin controls, but live certification is not claimed here because
the production deploy and real tenant key walkthrough have not been completed in this pass.

## Deployment Status

Not deployed in this pass.

Reason: the working tree already contained unrelated modified files before MCP3-1 work began:

- `package.json`
- `src/features/admin/OrganizationAdminSection.tsx`
- `src/features/beta-readiness/BetaReadinessSection.tsx`
- `src/features/beta-readiness/betaReadinessSnapshot.ts`
- `src/services/analytics/config.ts`
- `.claude/settings.local.json`

Deploying from this dirty workspace would risk shipping unrelated changes under the MCP3-1 release
label. The exact production deploy command, once the workspace is intentionally clean or the
unrelated changes are explicitly approved for release, is:

```bash
node scripts/deploy-vercel.mjs --target=production --skip-checks
```

## Live Validation Checklist

| Step | Status | Evidence / Notes |
|---|---|---|
| Production deployment live | Pending | Blocked by dirty-worktree release governance above. |
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

1. Resolve or explicitly approve the unrelated dirty files for release.
2. Deploy production with:

   ```bash
   node scripts/deploy-vercel.mjs --target=production --skip-checks
   ```

3. Open Settings / Integrations / Agent Connections as an Organization Admin.
4. Generate a key and copy it once.
5. Call `POST https://landing.triaxisventures.com/api/agents/mcp` with `initialize`.
6. Call `tools/list`.
7. Disable one tool and confirm it returns a denial.
8. Call one auto tool and confirm success.
9. Call one critical tool and confirm pending approval.
10. Approve it in Approvals & Governance.
11. Confirm the action executes exactly once.
12. Confirm Agent Activity and Audit logs show the full chain.
