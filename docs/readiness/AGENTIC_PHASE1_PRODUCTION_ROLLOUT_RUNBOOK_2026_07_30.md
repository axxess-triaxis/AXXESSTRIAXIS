# Agentic Infrastructure Phase 1 Production Rollout Runbook

Date: 2026-07-30  
Related: A-78  
Status: ready for HITL-controlled rollout

## Goal

Move Agentic Infrastructure Phase 1 from code-complete to production-certified.

## Current State

Code is reported complete and verified:

- typecheck clean
- mobile typecheck clean
- lint clean
- 707 tests passing
- build clean
- `supabase:verify` clean

But A-78 remains blocked until:

1. Production Supabase migration is applied.
2. Current code is deployed to `landing.triaxisventures.com`.
3. A live MCP call proves `tools/list`, `create_task`, and audit logging.

## Step 1 -- Confirm Clean Commit

Before production rollout, confirm the agentic implementation is committed and pushed.

Required:

- no uncommitted code in `src/app/api/agents`
- no uncommitted code in `src/services/agents`
- no uncommitted agent migration
- branch and commit recorded

## Step 2 -- Apply Supabase Migration

Migration expected:

- `supabase/migrations/20260730120000_agent_connections.sql`
- possibly `supabase/migrations/20260730130000_agent_action_grants.sql` if included in the final committed agentic batch

Do not apply against production unless the migration file has been reviewed.

Pre-checks:

- table names
- RLS enabled
- no destructive statements
- service-role-only credential table access
- no raw key storage

Apply migration using the approved Supabase deployment path.

Evidence to capture:

- command/source used
- migration name
- success output
- table exists
- RLS enabled

## Step 3 -- Deploy Product/Beta

Deploy current committed code to:

`https://landing.triaxisventures.com`

Evidence to capture:

- Vercel project
- deployment ID
- status `READY`
- alias assigned to `landing.triaxisventures.com`
- commit hash

## Step 4 -- Generate Agent Key

In live product:

1. Sign in as Organization Admin / Super Admin.
2. Go to Settings > Integrations.
3. Open Agent Connections.
4. Select provider:
   - OpenAI
   - Anthropic
   - Microsoft Copilot
5. Generate key.
6. Copy key once.
7. Confirm key is not shown again after closing.

Evidence:

- provider selected
- connection label
- generated key prefix only
- connection listed as active

Do not paste raw key into docs.

## Step 5 -- Live MCP `tools/list`

Run:

```bash
curl.exe -X POST "https://landing.triaxisventures.com/api/agents/mcp" ^
  -H "Authorization: Bearer <AGENT_KEY>" ^
  -H "Content-Type: application/json" ^
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\",\"params\":{}}"
```

Expected:

- JSON-RPC response
- tools returned:
  - `create_task`
  - `query_knowledge_hub`
  - `list_projects`

## Step 6 -- Live MCP `create_task`

Run:

```bash
curl.exe -X POST "https://landing.triaxisventures.com/api/agents/mcp" ^
  -H "Authorization: Bearer <AGENT_KEY>" ^
  -H "Content-Type: application/json" ^
  -d "{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/call\",\"params\":{\"name\":\"create_task\",\"arguments\":{\"title\":\"Agent rollout verification task\",\"description\":\"Created through live MCP verification.\",\"priority\":\"medium\"}}}"
```

Expected:

- success response or pending approval response if critical gating applies
- no cross-tenant data
- no raw error

## Step 7 -- Verify Task Row

In UI:

- open Tasks & Workflow
- confirm task appears in correct tenant only
- confirm no other tenant sees it

Database verification if available:

- task belongs to correct `organization_id`
- created_by attribution is honest

## Step 8 -- Verify Audit Log Row

In UI:

- open Audit Logs
- find agent tool call event

Expected metadata:

- actor type agent or issuing admin attribution
- provider
- agent connection ID or prefix
- tool name
- success/failure
- organization ID

## Step 9 -- Revoke Key

In Agent Connections:

1. Revoke the key.
2. Repeat `tools/list`.

Expected:

- request fails safely
- no tool data returned
- audit/denial logged if supported

## Closure

A-78 can move from `Blocked` only after:

- migration applied
- deploy complete
- live key generated
- `tools/list` verified
- `create_task` or pending approval path verified
- task/approval/audit row verified
- revoke verified

Microsoft Copilot remains Phase 2 unless a real Copilot Studio adapter completes a call.

