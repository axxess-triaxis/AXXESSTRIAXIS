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

Added to `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` as A-78. **Founder-set status framing
(2026-07-30), recorded verbatim as the standing status for this item:**

> Agentic Infrastructure Phase 1 is code-complete, verified, but not production-certified yet.
> Blocked: code-complete and fully verified locally; pending production migration, deployment,
> and live MCP test. Not `Yes` yet. Why: the product rule has been consistent -- code + tests are
> not the same as live tenant certification.

| Area | Status |
|---|---|
| Architecture | Complete |
| Security model | Complete |
| MCP endpoint | Complete |
| Agent key model | Complete |
| Tool registry | Complete |
| Audit logging | Complete |
| Tests | Complete, 707 passing |
| Build | Complete |
| Supabase migration file | Complete |
| Production Supabase migration applied | Blocked / pending HITL |
| Production deployment | Blocked / pending HITL |
| Live curl/MCP test | Blocked until migration + deploy |
| Real OpenAI/Claude/Copilot external agent connected | Phase 2 |

**Exactly 3 remaining steps to move A-78 off `Blocked`**, all HITL (this session should not take
them unattended -- schema changes to production and production deploys require explicit
confirmation per this repo's git/deployment discipline):

1. Apply the new `agent_connections` migration to production Supabase.
2. Deploy current code to `landing.triaxisventures.com`.
3. Generate one real agent key (Settings > Integrations > Agent Connections) and run a live MCP
   call: `tools/list`, then `create_task`, then confirm the task row in `tasks` and the audit row
   in `audit_logs`.

**Once all 3 pass**, the claim may be upgraded to: "AXXESS supports tenant-scoped inbound MCP
agent access for OpenAI/Claude-style external agents, with hashed keys, explicit tools, tenant
isolation and audit logging." **Do not claim Microsoft Copilot is fully connected even then** --
Phase 1 lets a tenant issue a Copilot-labeled key, but no Copilot Studio adapter exists to
actually consume it (Phase 2 scope, see Access Model above).

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

## A-79: Agentic Actionables Pop-up Requirement

Founder policy decision (2026-07-30): every agentic orchestration that produces a synthesis,
insight, optimization recommendation, summary, or informational answer should immediately offer a
next-action prompt to the user instead of ending at passive output.

Required UX pattern:

> What do you want me to do with this, `{firstName}`?

The first name must come from the authenticated user's profile/session when available. If the first
name is unavailable, use a neutral fallback that does not expose demo or placeholder identity.

Required action options:

1. Create or edit task
2. Set up, modify, or reschedule meeting
3. Create or edit reminder
4. Create or edit program
5. Create or edit project
6. Save stakeholder mapping matrix
7. Store insights in Notion
8. Make analytics dashboard
9. Create slides/PPT
10. Create doc/Notion
11. Create Sheets/Excel
12. Integrate into next query
13. Other -- user provides free-text instruction
14. Nothing for now, thank you

Second-step confirmation requirement:

After the user chooses one of the action options above, the app must open a second, action-specific
confirmation pop-up before routing or writing anything. The second pop-up should use language
appropriate to the selected action, for example:

- Task / project / program / document / sheet / slide actions: `Create` / `Edit`
- Meeting actions: `Create` / `Cancel` / `Reschedule`
- Reminder actions: `Create` / `Edit`
- Stakeholder or insight-capture actions: `Store` / `Note for now`
- Binary approval-style actions: `Yes` / `No`
- Free-text `Other`: ask the user what they want done, then confirm before taking action
- `Nothing for now, thank you`: dismiss without routing or writing

The second-step choice must route the user to the correct workspace or open the correct creation
surface:

- tasks -> Tasks & Workflow
- meetings -> Meetings & Decisions
- reminders -> the current reminder/task-reminder surface, or an honest pending state if not yet
  available
- programs/projects -> Projects & Programs
- stakeholder mapping -> Stakeholders & CRM
- analytics dashboard -> Analytics & Reports
- slides/PPT -> the slide/export surface when available, otherwise honest pending/export state
- documents/Notion -> Documents & Files, Knowledge Hub, or Notion integration depending on action
- sheets/Excel -> spreadsheet/export surface when available, otherwise honest pending/export state
- integrate into next query -> AI Workspace with the selected output carried as structured context

Implementation notes for the next sprint:

- This should apply to agentic/RAG/AI outputs that create useful work product, not to every
  low-level API response.
- It should be role- and tenant-aware: options that require unavailable integrations or permissions
  should be disabled with an honest reason, not silently shown as working.
- It should reuse existing creation paths wherever possible: tasks, meetings, projects, programs,
  stakeholder notes, documents, spreadsheets, slides, dashboards, and Notion storage.
- It should not auto-create records without user confirmation.
- The second-step confirmation must occur before any write, route transition, export, or external
  integration handoff that changes state.
- It should audit the user's selected follow-up action.
- It should support "Integrate into next query" by carrying the selected output forward as
  structured context for the next AI/RAG request.
- It should treat "Nothing for now, thank you" as an explicit close/dismiss action, not a failure.

Status: **New actionable, not implemented in Phase 1.** This is a Phase 2/next-sprint workflow layer
on top of the Phase 1 MCP/agent infrastructure.

## Standing Acceptance Criteria for Agentic Action Follow-through

Founder acceptance rule (2026-07-30, amended same day), applies to A-79 and future agentic
workflow actionables:

1. Claude Code / Codex first checks off the item after implementation and verification, marking
   whether the user-facing request is fully responded to at code/test level.
2. The founder performs a live walkthrough in the deployed product.
3. Any issues, bugs, stale data, placeholders, dead ends, confusing copy, routing failures, missing
   audit rows, or tenant/demo leakage found during walkthrough are logged as actionables.
4. Claude Code / Codex debugs and performs the required remediation: UX optimization, stale-data
   cleanup, placeholder cleanup, screen/flow transition fixes, routing fixes, failure-state fixes,
   and any other required rectification.
5. The founder performs any required re-check and explicitly signs off before the issue is closed.
6. Claude Code / Codex closes the issue only after documenting the whole process, steps, evidence,
   decisions, and rationale in a closeout document.

Therefore, no A-79-related feature should be marked `Yes` merely because code, tests, lint, and
build pass. It may be marked code-complete or blocked-pending-HITL, but final closure requires live
walkthrough, remediation of found issues, founder sign-off, and a closeout document.

## A-78 Extension: Approval/Always-Allow Gating & Additional Agent Tools (2026-07-30)

Scoped and built the same day as A-78's initial rollout prep, under the same Plan Mode discipline
(a dedicated plan was reviewed and approved before implementation -- see the approved plan for
`AGENTIC_RISK_REGISTER_2026_07_30.md`'s "Overbroad tool access" and "Auto-action without consent"
rows, both of which this closes). This is **not** A-79 (the Agentic Actionables pop-up UX layer) --
it is backend infrastructure A-79 will eventually call into for several of its 14 action options
(create/edit task, set up meeting, create/edit project, save stakeholder mapping matrix), matching
`CONNECTOR_CREDENTIAL_READINESS_MATRIX_2026_07_30.md`'s and the Rollout Runbook's own framing of
this as part of "the final committed agentic batch" for A-78, not a separately numbered actionable.

### What changed

- **Approval/Always-Allow gating** (the core deliverable): a new `agent_action_grants` table
  (`supabase/migrations/20260730130000_agent_action_grants.sql`, RLS service-role-only, mirrors
  `agent_connections`'s access model) plus `src/services/agents/agentGrantsRepository.ts`
  (`hasGrant`/`createGrant`/`listGrants`/`revokeGrant`). Every `McpToolDefinition`
  (`src/services/agents/toolRegistry.ts`) now carries a `criticality: "auto" | "critical"` field.
  The MCP route (`src/app/api/agents/mcp/route.ts`) checks for an active grant before executing a
  critical tool; with none, it writes a real `approval_requests` row (reusing, not duplicating, the
  existing repository) and returns `pending_approval` instead of executing.
- **The missing decide/approve/reject mutation, now added**: `approvalRequestsRepository` gained a
  `.decide()` method (`src/repositories/workflowActionRepositories.ts`) and a new route
  `PATCH /api/approvals/[id]` -- previously `approval_requests` only had list/create, and
  `ApprovalsSection.tsx`'s live table had no action buttons at all (its demo-mode illustrative
  cards had Approve/Reject touching only local state, correctly, since that's demo content -- the
  live table itself was missing real actions entirely). Real Approve/Reject buttons now exist on
  the live table, including an "Approve + always allow" option for agent-originated approvals that
  creates a grant.
- **4 new critical tools + 1 unchanged auto tool re-classified for clarity**:
  `create_meeting`, `create_project`, `create_stakeholder` (all critical -- real-world-visible
  writes), `list_stakeholders` (auto -- read-only), and `query_external_model` (critical -- reuses
  `routeAiRequest()`, the exact same OpenRouter-backed router `/api/ai` already uses, unchanged --
  no new AI-calling code). `create_task`/`query_knowledge_hub`/`list_projects` (A-78 Phase 1) stay
  `auto`, unchanged behavior.
- **Settings UI**: `AgentConnectionsPanel` (`IntegrationsSection.tsx`) gained an "Always-allowed
  tools" sub-panel per connection with a revoke action, so grants are never invisible.
- **A real bug found and fixed in passing**: `ApprovalsSection.tsx`'s `scope` was rebuilt fresh on
  every render (not memoized), so its data-fetch effect refired on every re-render, including the
  one a real decide action causes -- silently clobbering the optimistic UI update back to stale
  data. Fixed with `useMemo`, caught by a real (not mocked-away) test.

### What did not change / explicitly deferred

- `create_program` -- `ProgramsRepository` has no insert path in this codebase at all
  (`TenantRepository<Program>`, not `MutableTenantRepository`); adding one is a product decision
  (should programs be independently agent-creatable, or only via a higher-level workflow?) out of
  scope here.
- Full integration-calling (Slack send, HubSpot create, etc.) and real analytics-dashboard
  aggregation remain out of scope, per the same reasoning as A-78's original policy doc above --
  zero existing outbound-action code for any catalogued provider, and analytics data is still
  fixture-only for live tenants.
- Grant expiry/periodic review -- `AGENTIC_RISK_REGISTER_2026_07_30.md`'s "Stale grants /
  always-allow risk" row flags this correctly: grants persist indefinitely once created, revoke is
  manual-only, there is no expiry timestamp or review-reminder UI. Real, named, tracked gap --
  `revokeGrant` exists and is tested, but nothing prompts a periodic re-review.

### Verification (evidence, not "should work")

- `pnpm run typecheck`, `pnpm --dir apps/mobile run typecheck`, `pnpm run lint`
  (`eslint . --max-warnings=0`), `pnpm run build`, `pnpm run supabase:verify` -- all exit 0.
- `pnpm run test` (`vitest run --config vitest.config.mjs`) -- **178 test files passed, 753 tests
  passed** (up from A-78's 171/707; +7 new/extended test files, +46 tests covering: grant
  hash/upsert/revoke behavior, the `.decide()` mutation (approve/reject, org-scoped, missing-row
  and admin-not-configured failure paths), the new PATCH endpoint's admin-only gating and
  conditional grant creation, the MCP route's grant-check/pending-approval/executes-when-granted
  branches, each new tool's insert shape and honest defaults, and the real `ApprovalsSection`
  decide-button behavior including the memoization fix above).
- **Not done this pass, matching A-78's own standing rule**: this code is **uncommitted**. Per
  `AGENTIC_PHASE1_PRODUCTION_ROLLOUT_RUNBOOK_2026_07_30.md`'s Step 1 ("Confirm Clean Commit... no
  uncommitted code in `src/app/api/agents`... no uncommitted agent migration"), this extension is
  not yet part of a state the rollout runbook can be run against. No live migration, no deploy, no
  live MCP verification of the grant/approval path has been attempted -- flagged honestly, not
  fabricated, matching the exact discipline `YC_INVESTOR_AGENTIC_EVIDENCE_UPDATE_2026_07_30.md`
  already states for A-78 itself.
