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

### Running the live test (MCP3-3)

`scripts/mcp-live-test.mjs` runs steps 4 above (`initialize` -> `tools/list` -> one auto tool call) against a real deployment and prints PASS/FAIL per step:

```bash
node scripts/mcp-live-test.mjs --base-url https://investor.triaxisventures.com --key axa_live_...
```

**This has not been run against a real key by any coding session as of this sprint** -- no session has real OpenAI credentials or a founder login to generate a key. HITL must generate a key via Integrations > Agent Connections (optionally issued from the "OpenAI" provider and a relevant Agent Profile) and either run this script directly or hand the raw key to Claude Code to run it.

## Claude / Anthropic

Status: MCP is the native path Claude-family clients can use.

Setup concept:

1. Create an AXXESS Agent Connection labeled for Anthropic.
2. Configure Claude/MCP client with the AXXESS MCP URL and Bearer token.
3. Run `tools/list`.
4. Test one auto tool.
5. Test one critical tool and approval.

Do not claim Claude live readiness until a real Claude/MCP client completes a live call.

### Running the live test (MCP3-3)

Same script as OpenAI's, since both go through the same generic MCP endpoint -- there is nothing
Claude-specific about the test itself, only about which connection's key is used:

```bash
node scripts/mcp-live-test.mjs --base-url https://investor.triaxisventures.com --key axa_live_...
```

**Not run against a real key by any coding session as of this sprint**, same caveat as OpenAI above.

## Microsoft Copilot

Status: approved provider label exists, but Copilot Studio still needs its own adapter/manifest path.

MCP2 does not complete Copilot Studio integration by itself. Treat Copilot as provider-approved but adapter-pending until a Copilot-specific setup path is built and live-tested.

### Copilot -- formally scoped as MCP4, not built this sprint (MCP3-3)

A read-only investigation before this sprint confirmed there is genuinely nothing beyond the provider
label anywhere in this repo: no manifest file, no adapter code, no Copilot-specific route or UI
component. `"microsoft_copilot"` is one of three interchangeable strings in `AgentProviderId`, with no
gate preventing a tenant admin from issuing a working key labeled for it today -- what's missing is
entirely on the Copilot Studio side, not this repo's MCP server.

Per this sprint's own "do not build a Copilot readiness claim without actual Copilot adapter/live
proof" constraint, building a real Copilot Studio custom connector was **not attempted** this sprint --
the exact schema Copilot Studio's current custom-connector manifest format requires was not verified
against Microsoft's own documentation, and a real manifest built without that verification would be a
plausible-looking artifact that doesn't actually work, which is worse than no artifact at all. Exact
requirements for a future MCP4 sprint:

1. **An OpenAPI 3.0 custom-connector manifest** describing `/api/agents/mcp` as a Copilot Studio
   action (or a small set of actions mapping to `initialize`/`tools/list`/`tools/call`), hosted at a
   stable, publicly reachable URL.
2. **Copilot Studio connector registration** -- requires Power Platform admin access this repo/session
   does not have and has not verified exists.
3. **Auth mapping** -- an AXXESS Bearer API key is, in principle, compatible with Copilot Studio's
   API-key-header auth type, but this has not been confirmed against Copilot Studio's current
   documentation and is not assumed true without that check.
4. **A live Copilot Studio agent actually invoking a tool call end-to-end** -- the only evidence that
   would justify calling Copilot "ready," matching the same bar already applied to OpenAI and Claude
   above.

None of the four are attempted or claimed complete by this sprint.

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

