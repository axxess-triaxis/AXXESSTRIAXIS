# Agentic Infrastructure Phase 1 -- Policy Decision, Constraints, and Verification (2026-07-30)

Evidence-chain doc per `CLAUDE.md`. Covers: the founder's policy decision on external agent
access, the hard/soft constraints that decision is implemented under, the audit trail philosophy,
and the exact verification evidence for this pass. Cross-references `docs/readiness/
ACTIONABLES_READINESS_MATRIX.md` (new item A-78, added below) and the approved plan at
`C:\Users\Sudipta Sarmah\.claude\plans\squishy-sprouting-plum.md`.

## Founder Policy Decision (2026-07-30, this conversation)

> The founder has approved OpenAI, Anthropic/Claude, and Microsoft Copilot as the first three
> external agent platforms allowed to receive full agentic infrastructure access to AXXESS.

Founder's own clarification of what "full access" means, quoted directly:

> "Full access" means access to the approved AXXESS tool surface for that phase, with the roadmap
> expanding the tool catalogue over time. It does not mean direct database access, cross-tenant
> access, bypassing audit logs, or bypassing RLS or tenant checks.

## Rationale

This is part of the broader YC RFS alignment work scoped earlier in this conversation (Summer 2026
"Software for Agents" / "AI Operating System for Companies" themes) -- the founder identified a
genuine product/market overlap, not a "build for YC" exercise. The specific design choice
("elevated, faster-path access" for connected agents, no human-approval hold on writes) rests on
the premise that the tenant already vetted the agent provider when they generated its API key --
the trust decision happens once, at key issuance, by a human admin; every subsequent call is then
mediated through scoped capabilities and full audit logging rather than re-litigated per call.

## Access Model

- **Allowed providers (Phase 1):** OpenAI, Anthropic/Claude, Microsoft Copilot --
  `src/security/agentScope.ts` (`agentProviderIds`).
- **Access mechanism:** AXXESS-issued inbound agent API keys, not provider OAuth. AXXESS is the
  credential issuer; the agent authenticates *to* AXXESS via `Authorization: Bearer <key>`, the
  reverse direction from every other connector in this codebase (which authenticate *as* AXXESS
  calling out to Gmail/Slack/etc.).
- **Public interface:** a real MCP (Model Context Protocol) server, `POST /api/agents/mcp`
  (`src/app/api/agents/mcp/route.ts`), JSON-RPC 2.0 over the Streamable HTTP transport
  (`initialize`, `tools/list`, `tools/call`). Microsoft Copilot Studio is not MCP-native the same
  way Claude is -- a Copilot-specific adapter is explicitly deferred to Phase 2.
- **Capability model:** explicit per-tool permission (`AgentCapability`), not unlimited access.
  Phase 1 tools: `create_task`, `query_knowledge_hub`, `list_projects`
  (`src/services/agents/toolRegistry.ts`). A connection's `capabilities` array is checked before
  every dispatch (`agentScopeHasCapability`, enforced in the MCP route before the handler runs).

## Hard Constraints (non-negotiable, enforced in code)

| Constraint | Enforcement |
|---|---|
| Tenant isolation | Every read/write is filtered by `organization_id` derived from the resolved `AgentScope`, never from caller-supplied input -- `src/services/agents/toolRegistry.ts` (all 3 tools), `src/services/agents/agentConnectionRepository.ts`. |
| No raw key storage | `agent_connections.api_key_hash` stores a one-way scrypt fingerprint only (`src/services/agents/agentConnectionVault.ts`, `hashAgentApiKey`); the raw key is returned to the admin exactly once at issuance (`POST /api/agents/connections`) and never persisted. |
| Key revocation | `DELETE /api/agents/connections?id=` flips `status` to `revoked`; `resolveAgentScopeFromApiKey` only matches `status=active` rows, so a revoked key stops authenticating immediately. |
| No raw database access | Agents only ever reach the 3 registered tool handlers -- there is no pass-through query surface. `query_knowledge_hub` reuses the existing governed retrieval logic (`answerWithGovernedRag`, `src/services/rag/governedRag.ts`) unchanged, so the same visibility/classification rules that apply to a human session apply here. |
| RLS / tenant checks not bypassed | `agent_connections` has RLS enabled with a service-role-only grant (`supabase/migrations/20260730120000_agent_connections.sql`), matching every other server-only credential table in this schema (`enterprise_connector_credentials`, `oauth_token_vault`). Agent reads/writes to `documents`/`tasks`/`projects`/`knowledge_articles` go through the service role with an explicit `organization_id` filter applied in application code -- the same "trusted server code, explicit tenant filter" pattern already used by `src/app/api/connectors/oauth/callback/route.ts`. |
| Audit logging not bypassed | See Audit Trail Philosophy below -- every `tools/call` outcome is logged, success or failure. |

## Soft Constraints (Phase 1 scope, expected to expand)

- Every new connection is granted all 3 registered tools -- no per-tenant capability toggle UI yet
  (`allAgentCapabilities` in `src/security/agentScope.ts`). A future toggle only needs to change
  what's written at connection-creation time, not the shape any caller reads.
- Microsoft Copilot is an approved provider in the connection-issuance UI (a tenant can generate a
  Copilot-labeled key today), but Copilot Studio's own adapter/manifest to actually consume that
  key is Phase 2 -- Phase 1's MCP server directly serves Claude/OpenAI-family MCP clients.
- The one explicit "elevated access" behavior against the pre-existing plugin-action approval gate
  (`pluginRuntime.ts`'s `approvalRequiredForWrites`) is implemented and tested
  (`evaluatePluginAction`'s `callerType: "agent"` branch), but none of Phase 1's 3 tools currently
  route through that gate -- native `create_task`/`list_projects`/`query_knowledge_hub` are direct
  repository operations, not plugin actions (e.g. "send a Slack message"), and native task creation
  was never gated for human users either. The bypass is real, tested, and ready for Phase 2 when
  plugin-action tools (e.g. `send_slack_message`) are added to the agent tool registry.

## Audit Trail Philosophy

Every `tools/call` -- success, business-logic failure (e.g. missing required argument), capability
denial, or an unhandled exception in a tool handler -- writes exactly one `audit_logs` row via
`recordAgentToolAuditEvent` (`src/services/agents/agentConnectionRepository.ts`), *before* the HTTP
response is returned. This is separate from `auditLogsRepository.record` (used by every
human-session route in this codebase) because that function requires a real Supabase user access
token, which an API-key-authenticated agent call never has -- so this writes directly via the
service role (`supabaseAdminRest`), the same "trusted server code" pattern already established in
`src/app/api/connectors/oauth/callback/route.ts`.

Each row records: `organization_id`, `actor_user_id` (the human who issued the key, from
`agent_connections.issued_by_user_id` -- an honest attribution to a real person, not a fabricated
system actor), `actor_role`, `action` (`agent.<provider>.tool.<toolName>`), `category`
(`agentic-infrastructure`), and `metadata` (`agentConnectionId`, `provider`, `toolName`, `success`,
`errorMessage` when applicable, and a summary of the call arguments). This gives a tenant admin a
complete, queryable record of everything a connected agent has done or attempted, with no gap
between "the agent tried something" and "there is a row for it" -- deliberately not wrapped in
`.catch(() => undefined)` at the call site inside the route for the write itself failing silently
in the same way other audit writes in this codebase do (a pre-existing gap, not introduced here,
and not fixed as part of this pass -- see `governedRag.ts`/`route.ts`'s existing
`.catch(() => undefined)` pattern on audit writes elsewhere).

## Implementation Status (A-78)

Added to `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` as A-78. Status: **Blocked** -- code is
real, tested, and builds clean, but zero production credentials exist yet (no tenant has actually
generated a key and connected a real agent), matching this repo's `Yes` bar of "founder has
actually tested and certified... in a real workflow," which requires a live HITL step this pass
cannot self-certify.

| Item | Status |
|---|---|
| `agent_connections` migration, RLS enabled, service-role only | Shipped, `pnpm run supabase:verify` passed |
| API key issuance/hash/revoke (`agentConnectionVault.ts`, `agentConnectionRepository.ts`) | Shipped, unit-tested |
| MCP server (`POST /api/agents/mcp`, initialize/tools list/tools call) | Shipped, unit-tested |
| 3 Phase 1 tools (create_task, query_knowledge_hub, list_projects) | Shipped, unit-tested |
| Elevated-access bypass in `pluginRuntime.ts` | Shipped, unit-tested; not yet wired to any Phase 1 tool (see Soft Constraints) |
| Settings UI (Agent Connections panel) | Shipped, source-verified |
| Live migration applied to production Supabase | **Blocked** -- requires founder/HITL action, not run this pass (schema change to a live database is outside what this pass should do unattended) |
| Deploy to production | **Blocked** -- not deployed this pass, pending explicit confirmation |
| Real agent (ChatGPT/Claude/Copilot) completing a live call | **Blocked** -- Phase 2 scope per the approved plan; cannot be self-certified by automated tests |

## Verification Evidence (exact commands, exact results)

- `pnpm run typecheck` -- exit 0, no errors.
- `pnpm --dir apps/mobile run typecheck` -- exit 0, no errors.
- `pnpm run lint` (`eslint . --max-warnings=0`) -- exit 0, 0 errors, 0 warnings (one pre-fix error,
  an unescaped apostrophe in the new panel's copy, found and fixed in this pass).
- `pnpm run test` (`vitest run --config vitest.config.mjs`) -- **171 test files passed, 707 tests
  passed** (up from the pre-existing 165 files / 665 tests; +6 new test files, +42 new tests: this
  pass's new/extended coverage for `agentScope`, `agentConnectionVault`,
  `agentConnectionRepository`, `toolRegistry`, `pluginRuntime`'s new bypass, the two new routes,
  and `IntegrationsSection`'s new panel). No worker-timeout flake this run.
- `pnpm run build` (`next build`) -- exit 0, compiled successfully; both new routes
  (`/api/agents/connections`, `/api/agents/mcp`) registered as dynamic (`ƒ`) in the route table.
- `pnpm run supabase:verify` -- `"status": "passed"`, `"migrations": 28` (up from 27),
  `"rlsProtectedTables": 101` (up from 100, the new `agent_connections` table). This is a static
  shape/RLS check against the migration files in this repo -- **not** confirmation the migration
  has been applied to the live production Supabase database (it has not, this pass).
- **Manual MCP/curl verification against a live server: not performed.** This requires (a) the
  migration applied to production Supabase and (b) a deployment, both of which are HITL/founder
  actions this pass did not take without explicit confirmation, per this repo's git/deployment
  discipline. Once both are done, verification is: generate a key from Settings > Integrations >
  Agent Connections, then `curl -X POST https://<host>/api/agents/mcp -H "Authorization: Bearer
  <key>" -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`
  and confirm the 3 tools are returned, then a `tools/call` for `create_task` and confirm a real
  row appears in `tasks` and `audit_logs`.

## What Is Not Yet Supported (say so, don't infer)

- No tenant has generated a real agent API key yet -- **Founder-stated-but-unverified claims do
  not apply here since none have been made; this is simply not-yet-done, stated plainly.**
- No real external agent (ChatGPT, Claude Desktop/API with custom tool config, Copilot Studio) has
  completed a live call against `/api/agents/mcp`.
- Per-tenant capability toggles (which of the 3 tools a given connection can use) do not exist --
  every connection currently gets all 3.
- Microsoft Copilot Studio's own connector/manifest adapter does not exist yet -- a Copilot admin
  cannot yet configure this MCP server from within Copilot Studio without Phase 2 work.
