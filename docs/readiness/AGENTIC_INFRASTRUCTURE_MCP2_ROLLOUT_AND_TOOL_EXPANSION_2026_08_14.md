# Agentic Infrastructure MCP2 -- Rollout, Controls, and Tool Expansion (2026-08-14)

## Purpose

This sprint extends the already-built Agentic Infrastructure Phase 1 / A-78 MCP server. It does not rebuild MCP1.

The goal is to make the inbound agent layer safer and more production-usable by adding opt-in capability controls, stricter tool-call validation, bounded payload protection, and a second batch of tenant-scoped tools.

## Baseline Confirmed

- `POST /api/agents/mcp` exists and serves JSON-RPC MCP methods: `initialize`, `tools/list`, and `tools/call`.
- Agent API keys are AXXESS-issued, hashed, revocable, and resolved into `AgentScope`.
- Existing MCP1/MCP1.5 tools before this sprint: `create_task`, `query_knowledge_hub`, `list_projects`, `list_stakeholders`, `create_meeting`, `create_project`, `create_stakeholder`, `query_external_model`.
- Critical tools already use approval/Always-Allow gating.
- `agent_connections.last_used_at` already exists and is updated on successful key resolution.

## What Changed

### Capability Control

- Split the capability surface into:
  - `mcp1AgentCapabilities`: the previously reviewed/default tool surface.
  - `mcp2AgentCapabilities`: newly added MCP2 tools.
  - `allAgentCapabilities`: complete known capability list.
  - `defaultAgentCapabilities`: MCP1 only.
- New agent connections default to MCP1 capabilities only.
- MCP2 tools require explicit inclusion in a connection's stored capability list.
- Added capability normalization and API-level rejection of unsupported capability names.

### MCP Route Hardening

- Added a 64 KB MCP request payload cap.
- Added strict argument validation before handler execution or approval-request creation.
- Unknown arguments are rejected.
- Required fields, primitive types, arrays, and enums are checked against each tool's JSON schema.
- Malformed critical calls no longer create approval queue noise.

### MCP2 Tools Added

Auto tools:

- `list_tasks`
- `list_meetings`
- `list_documents`
- `get_dashboard_snapshot`

Critical tools:

- `update_task_status`
- `add_stakeholder_note`
- `search_audit_logs`

Deferred:

- `create_approval_request`

Reason: making it critical would create an approval-to-create-approval loop. It needs a separate product decision on whether this should be auto, critical with special handling, or exposed through the existing approval UI rather than MCP.

## Security Posture

The sprint preserves the existing security floor:

- No raw API key storage.
- No raw database access.
- No caller-supplied tenant authority.
- Every tool reads or writes with `organization_id` derived from `AgentScope`.
- Critical write/sensitive-read tools remain approval-gated unless an active Always-Allow grant exists.
- Disabled capabilities return safe MCP denials.
- Tool-call success, failure, pending approval, and validation denial are audit-logged through the existing agent audit path.

## Production Status

Status: code-complete locally, pending live rollout.

Not claimed:

- Production deployment of MCP2.
- Live MCP2 key generation.
- Live `tools/list` against MCP2 capabilities.
- Live auto-tool execution.
- Live critical-tool approval flow.
- Live OpenAI / Claude / Copilot external-client connection.

## Verification

Completed:

- Focused MCP test suite: 15 test files passed, 154 tests passed.
- `pnpm run typecheck`: passed.
- `pnpm run lint`: passed.
- `pnpm run build`: passed.
- `pnpm run supabase:verify`: passed, 37 migrations, 110 RLS-protected tables.

Blocked/partial:

- Full `pnpm run test` timed out after 5 minutes without a final pass/fail summary. Focused MCP tests passed, so this is recorded as a full-suite execution blocker rather than hidden.

## Next HITL Actions

1. Deploy MCP2 to production.
2. Generate a real agent key in the live tenant.
3. Enable at least one MCP2 capability on that connection.
4. Run live MCP `initialize`.
5. Run live MCP `tools/list`.
6. Run one auto MCP2 tool.
7. Run one critical MCP2 tool and confirm pending approval.
8. Approve it.
9. Confirm the action executes exactly once.
10. Confirm audit logs show the full chain.

