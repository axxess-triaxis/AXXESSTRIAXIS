# OpenAI, Claude and Copilot Agent Setup Notes

Date: 2026-07-30  
Related: A-78, A-79

## Purpose

Explain how external agent platforms should connect to AXXESS once Agentic Infrastructure Phase 1 is deployed.

## Shared AXXESS Side

All providers use:

- AXXESS-issued API key
- Bearer authentication
- MCP endpoint: `POST https://landing.triaxisventures.com/api/agents/mcp`
- JSON-RPC 2.0
- tenant-scoped tools
- audit logging
- revocable keys
- no raw database access

## OpenAI / ChatGPT

Status: approved provider, Phase 1 server-side support ready after deployment.

Connection model:

- use AXXESS-issued API key
- configure ChatGPT/custom agent action or MCP-capable client when available
- call AXXESS MCP endpoint

Supported after A-78 rollout:

- `tools/list`
- `list_projects`
- `query_knowledge_hub`
- `create_task`

Not yet certified:

- no live ChatGPT custom agent has completed a call
- provider-specific setup guide is Phase 2

## Anthropic / Claude

Status: approved provider, best fit for Phase 1 MCP.

Connection model:

- use AXXESS-issued API key
- configure Claude/MCP client to call AXXESS MCP endpoint

Supported after A-78 rollout:

- MCP initialize
- tools/list
- tools/call

Not yet certified:

- no live Claude client has completed a call
- exact client configuration guide is Phase 2

## Microsoft Copilot

Status: approved provider label in AXXESS, but adapter is Phase 2.

Reason:

Copilot Studio's primary extensibility path is its own connector/plugin/manifest model. MCP support is not the same shape as Claude's direct MCP use.

Phase 1 supports:

- Copilot-labeled key issuance
- tenant-scoped credential model
- future adapter target

Phase 1 does not yet support:

- Copilot Studio manifest
- Copilot custom connector
- live Copilot Studio call into AXXESS

Safe claim:

"AXXESS is prepared to issue tenant-scoped Copilot-labeled agent credentials, but Copilot Studio adapter certification is Phase 2."

