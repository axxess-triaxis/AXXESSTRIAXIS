# Agentic MCP Provider Setup -- OpenAI, Claude, Copilot (2026-08-14)

## Current Truth

AXXESS now exposes an inbound MCP endpoint:

`POST https://<host>/api/agents/mcp`

Authentication:

`Authorization: Bearer <AXXESS-issued-agent-key>`

The key is issued by an AXXESS tenant admin from the Agent Connections UI. It is shown once, stored only as a one-way hash, and can be revoked.

## OpenAI

Status: MCP endpoint is ready for MCP-compatible OpenAI/agent clients, but live external-client proof is still required.

Setup concept:

1. Create an AXXESS Agent Connection labeled for OpenAI.
2. Enable only the needed tools.
3. Give the agent the MCP endpoint and Bearer key.
4. Run `initialize`, `tools/list`, then one tool call.
5. Validate audit logs.

Do not claim OpenAI production agent readiness until a real OpenAI-side agent/client completes a live call.

## Claude / Anthropic

Status: MCP is the native path Claude-family clients can use.

Setup concept:

1. Create an AXXESS Agent Connection labeled for Anthropic.
2. Configure Claude/MCP client with the AXXESS MCP URL and Bearer token.
3. Run `tools/list`.
4. Test one auto tool.
5. Test one critical tool and approval.

Do not claim Claude live readiness until a real Claude/MCP client completes a live call.

## Microsoft Copilot

Status: approved provider label exists, but Copilot Studio still needs its own adapter/manifest path.

MCP2 does not complete Copilot Studio integration by itself. Treat Copilot as provider-approved but adapter-pending until a Copilot-specific setup path is built and live-tested.

## Tool Classes

Auto tools execute immediately if the capability is enabled:

- `create_task`
- `query_knowledge_hub`
- `list_projects`
- `list_stakeholders`
- `list_tasks`
- `list_meetings`
- `list_documents`
- `get_dashboard_snapshot`

Critical tools require an approval unless an Always-Allow grant exists:

- `create_meeting`
- `create_project`
- `create_stakeholder`
- `query_external_model`
- `update_task_status`
- `add_stakeholder_note`
- `search_audit_logs`

Deferred:

- `create_approval_request`

Reason: circular approval flow risk.

