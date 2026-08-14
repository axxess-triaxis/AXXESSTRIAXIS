# Agentic Infrastructure MCP3-2: Agent Profiles, Policy Templates, and Approval Resume (2026-08-14)

## Objective

Add three enterprise-grade capabilities on top of the existing MCP1/MCP2/MCP3-1 agentic
infrastructure, per the Codex-drafted execution prompt for this sprint:

1. **Agent profiles** -- a named, reusable persona (provider, purpose, instructions, owner,
   risk tier, default capabilities) a connection can be issued from.
2. **Policy templates** -- 5 predefined capability bundles (read-only analyst, workflow assistant,
   project coordinator, CRM assistant, governance reviewer) a profile can start from.
3. **Approval resume** -- safer execution semantics: an approved critical tool call actually
   executes, exactly once, with idempotent double-approval handling and a real rejection path.

## Headline finding, established before any code was written

A read-only investigation of the existing approval flow (`PATCH /api/approvals/[id]/route.ts`,
`approvalRequestsRepository.decide()`) found that **approving a critical MCP tool call has never
executed the underlying tool**. The prior implementation only flipped `approval_requests.status`
to `"approved"` and, if `alwaysAllow` was set, created a grant row for *future* calls. The
originally-requested action (e.g. "create this meeting") was never actually performed for the
call that triggered the approval. This sprint's "approval resume" work is therefore not a
hardening of existing behavior -- it is the first time this execution path exists at all.

## What shipped

### Schema (`supabase/migrations/20260814140000_agent_profiles_and_pending_calls.sql`)

- **`agent_profiles`** -- `organization_id`, `provider`, `display_name`, `purpose`,
  `instructions`, `owner_user_id`, `risk_tier` (`low`/`standard`/`elevated`/`high`),
  `default_capabilities` (`text[]`), `policy_template`, `status` (`active`/`revoked`).
- **`agent_connections.agent_profile_id`** -- new nullable FK; connections created without a
  profile are unaffected (same default-capability behavior as before this sprint).
- **`agent_pending_tool_calls`** -- the machine-execution record: `agent_connection_id`,
  `approval_request_id` (unique, 1:1), `tool_name`, `tool_version`, `provider`, `arguments`
  (`jsonb`), `idempotency_key` (unique), `status` (`pending`/`executed`/`rejected`/`failed`),
  `decided_by_user_id`, `decided_at`, `executed_at`, `execution_result` (`jsonb`).

All three tables follow the exact isolation pattern already established by `agent_connections`/
`agent_action_grants`: RLS enabled, **no policies**, explicit `revoke all from anon, authenticated`,
`grant select, insert, update to service_role` only. Every application-layer query filters or sets
`organization_id` explicitly.

### Policy templates (`src/services/agents/agentPolicyTemplates.ts`, new, code-only)

A static registry of the 5 required templates, each mapping to a subset of the 15 existing
`AgentCapability` values (no new tools were added):

| Template | Capabilities |
|---|---|
| Read-only analyst | `query_knowledge_hub`, `list_projects`, `list_tasks`, `list_meetings`, `list_documents`, `get_dashboard_snapshot`, `list_stakeholders`, `search_audit_logs` |
| Workflow assistant | `create_task`, `update_task_status`, `list_tasks`, `list_projects`, `list_meetings`, `query_knowledge_hub` |
| Project coordinator | `create_project`, `create_meeting`, `list_projects`, `list_meetings`, `list_tasks`, `create_task`, `get_dashboard_snapshot` |
| CRM assistant | `list_stakeholders`, `create_stakeholder`, `add_stakeholder_note`, `query_knowledge_hub` |
| Governance reviewer | `search_audit_logs`, `get_dashboard_snapshot`, `list_projects`, `list_tasks`, `query_knowledge_hub` |

A test (`agentPolicyTemplates.test.ts`) asserts every capability named in every template is a real
member of `allAgentCapabilities`, so this cannot silently drift from the actual tool registry.

### Agent profiles (`src/services/agents/agentProfileRepository.ts`, new)

CRUD mirroring `agentConnectionRepository.ts`'s established shape. `createAgentProfile` resolves
`default_capabilities` from either an explicit `capabilities` array (takes precedence) or a
`policyTemplateId`; both absent resolves to an empty array (never a silent fallback grant).
Routes: `GET`/`POST /api/agents/profiles`, `PATCH`/`DELETE /api/agents/profiles/[id]`, same
admin-role gate (`Super Admin`/`Organization Admin`) and session pattern as the connections route.

### Connection creation wired to profiles (`src/app/api/agents/connections/route.ts`)

`POST` accepts an optional `agentProfileId`. If present, the profile is loaded (must be `active`,
same organization), its `default_capabilities` are used instead of the hardcoded MCP1 default, and
`agent_connections.agent_profile_id` is set. Absent `agentProfileId`, behavior is byte-for-byte
what it was before this sprint.

### Tool versioning (`src/services/agents/toolRegistry.ts`)

Added `version: string` to `McpToolDefinition`, set to `"1"` on all 15 existing tools. `tools/list`
in `POST /api/agents/mcp` now includes it in its response, and it is stamped onto both
`approval_requests.metadata.toolVersion` and `agent_pending_tool_calls.tool_version` when a
critical tool call creates a pending approval.

### Approval resume (`src/app/api/approvals/[id]/route.ts`, `src/repositories/workflowActionRepositories.ts`)

- `approvalRequestsRepository.decide()`'s `PATCH` now includes `status: "eq.pending"` in its
  `WHERE` clause -- a compare-and-swap. A repeat decision on an already-decided approval affects
  0 rows and throws the same "not found" error a genuinely missing/wrong-org id would; the route
  catches this and returns `409 { alreadyDecided: true }` instead of silently re-processing.
- On **approve**, if the approval has a linked `agent_pending_tool_calls` row, the route runs a
  two-phase **reserve-then-finalize** sequence:
  1. `reservePendingToolCallForExecution` atomically flips `pending -> executed` via a
     `status=eq.pending`-guarded `PATCH`. A concurrent second request racing this same transition
     gets 0 rows back and does **not** execute the tool.
  2. Only the request that won the reservation calls `executePendingToolCall` (pure function --
     looks up the tool, re-validates the stored arguments against the tool's *current* schema,
     calls its handler) and then `finalizePendingToolCallExecution` to record the real
     result/failure.
- On **reject**, `decisionReason` is now **required** (`400` if missing -- a real behavior
  tightening, not just a UI nicety), the linked pending call transitions `pending -> rejected` via
  its own compare-and-swap, and the reason is stored in `execution_result` for audit visibility.
  The tool handler is never invoked on rejection.
- The response gains an `execution: { status, result? | error? }` field whenever a pending tool
  call was involved, so both the UI and any programmatic caller can see the real outcome instead of
  just a status flip.

### UI

- **`src/features/approvals/ApprovalsSection.tsx`**: reject now requires a reason (a text input,
  disables the Reject button until non-empty); after a decision resolves, the row shows the real
  execution outcome ("Executed" / "Execution failed: ..." / "Rejected -- not executed").
- **`src/features/integrations/IntegrationsSection.tsx`** (`AgentConnectionsPanel`): new "Agent
  Profiles" sub-section (list existing profiles, compact create form with display name, provider,
  purpose, risk tier, and a policy-template picker that shows the template's description); the
  "Generate key" connection form gains an optional "Profile" select wired to `agentProfileId`.

## Non-negotiables, how each is satisfied

- **No raw database access**: every new table goes through a `supabaseAdminRest`-based repository,
  never raw SQL from a route.
- **No raw key storage**: unchanged -- no new key material introduced this sprint.
- **No cross-tenant access**: every new table/query is `organization_id`-filtered; covered by
  dedicated tests in `approvals/[id]/route.test.ts` (cross-tenant decide) and
  `agentProfileRepository.test.ts` (`getAgentProfile` cross-tenant lookup).
- **No silent tool expansion**: policy templates only reference capabilities that already exist in
  `allAgentCapabilities`; `createAgentProfile`/`updateAgentProfile` route through
  `normalizeAgentCapabilities`, which filters out anything unrecognized.
- **No duplicate execution after approval**: the two-stage compare-and-swap (approval decision,
  then pending-call reservation) is the actual mechanism; tested by the "repeat approve" and
  "lost the reservation race" test cases.
- **No critical tool execution without approval/grant**: unchanged -- execution only happens from
  inside the approval route's reservation-guarded branch, or (as before this sprint, unchanged)
  from `mcp/route.ts`'s existing grant-check branch for already-granted tools.

## Explicitly out of scope this sprint

- No live MCP client validation (real key generation, `tools/list`, an auto-tool call, a real
  approve-and-execute round trip against a running deployment) -- see the Closeout doc's "Not
  Claimed" section.
- No automatic retry of a `failed` pending tool call -- a failure is recorded and visible, not
  silently retried, which would risk unbounded/uncontrolled execution.
- No Copilot-specific profile/policy adapter work -- Copilot's dedicated MCP adapter remains
  pending from earlier sprints, unchanged here.
