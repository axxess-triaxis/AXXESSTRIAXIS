# Agentic Infrastructure MCP2 Closeout (2026-08-14)

## Objective

Make the existing AXXESS inbound MCP agent layer safer and more useful through capability controls, argument/payload hardening, and a bounded MCP2 tool expansion.

## Files Modified

- `src/security/agentScope.ts`
- `src/security/agentScope.test.ts`
- `src/services/agents/agentConnectionRepository.ts`
- `src/services/agents/agentConnectionRepository.test.ts`
- `src/app/api/agents/connections/route.ts`
- `src/app/api/agents/connections/route.test.ts`
- `src/app/api/agents/mcp/route.ts`
- `src/app/api/agents/mcp/route.test.ts`
- `src/services/agents/toolRegistry.ts`
- `src/services/agents/toolRegistry.test.ts`

## Files Added

- `docs/readiness/AGENTIC_INFRASTRUCTURE_MCP2_ROLLOUT_AND_TOOL_EXPANSION_2026_08_14.md`
- `docs/readiness/AGENTIC_MCP_LIVE_VALIDATION_CHECKLIST_2026_08_14.md`
- `docs/readiness/AGENTIC_MCP_PROVIDER_SETUP_OPENAI_CLAUDE_COPILOT_2026_08_14.md`
- `docs/readiness/AGENTIC_INFRASTRUCTURE_MCP2_CLOSEOUT_2026_08_14.md`

## Code Changes

- Added MCP1/default versus MCP2/opt-in capability separation.
- Added `PATCH /api/agents/connections` for admin capability updates.
- Added strict tool argument validation.
- Added 64 KB MCP payload cap.
- Added MCP2 tools:
  - `list_tasks`
  - `list_meetings`
  - `list_documents`
  - `get_dashboard_snapshot`
  - `update_task_status`
  - `add_stakeholder_note`
  - `search_audit_logs`

## Tools Deferred

- `create_approval_request`

Reason: the requested critical-tool behavior would create an approval request to approve creating an approval request. Needs a separate product decision.

## Verification

Passed:

- Focused MCP tests: 15 files / 154 tests passed.
- `pnpm run typecheck`: passed.
- `pnpm run lint`: passed.
- `pnpm run build`: passed.
- `pnpm run supabase:verify`: passed.

Partial:

- `pnpm run test`: timed out after 5 minutes without a final summary. This is documented as a full-suite runtime blocker, not a passing result.

## Deployment Status

Not deployed in this pass.

## Live Validation Status

Pending HITL/live validation:

- Production deploy.
- Real key generation.
- Live MCP `initialize`.
- Live MCP `tools/list`.
- Live auto-tool call.
- Live critical-tool approval path.
- Audit-log confirmation.

## Residual Risks

- The Agent Connections UI still needs a richer visual control surface for capability toggles and grants.
- Full-suite test timeout should be re-run in a clean terminal/CI environment.
- Copilot Studio requires a dedicated adapter/manifest path.
- `create_approval_request` needs separate product scoping.
- Production live readiness cannot be claimed until the live checklist is completed.

## Closeout Position

MCP2 is code-complete for backend hardening and bounded tool expansion, with focused tests and core gates passing. It is not production-certified until deployment and live MCP validation are completed.

