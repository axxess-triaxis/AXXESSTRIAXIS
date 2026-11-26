# MCP idempotent tool calls: closeout (2026-11-25)

Step B1 of the founder-approved ops-agent plan (2026-11-25): the MCP server support a LangGraph worker needs. Step B2, the worker itself, is not part of this.

## Closeout Evidence

Issue ID: OPS-AGENT-B1
Title: Idempotent tools/call, get_pending_tool_call, 202 for notifications
Origin plan: founder-approved plan of 2026-11-25, relayed in the session brief. The plan is not a file in this repository.
Research artifact: MCP 2025-06-18 specification, pages `basic/transports` and `basic`, read 2026-11-25
Implementation commits: `5ed8df9f` (red tests), `ec13fe28` (implementation)
PR: #579
Branch: `feat/mcp-idempotent-tool-calls`

### What changed

- `src/app/api/agents/mcp/route.ts`: the optional caller key, replay and refusal, the lost-race path, 202 for notifications.
- `src/services/agents/agentToolCallIdempotency.ts` (new): key format, scoping, argument comparison, status mapping.
- `src/services/agents/agentPendingToolCallRepository.ts`: insert that yields to an existing key, lookups by key and by id for one connection, closing a duplicate approval request.
- `src/services/agents/pendingToolCallTool.ts` (new) and `toolRegistry.ts`: `get_pending_tool_call`.
- `src/security/agentScope.ts`: the opt-in capability. `src/security/chatbotAgentScope.ts`: withheld from the in-app chatbot, needed for its exhaustive type.
- `src/services/agents/agentGovernanceSnapshot.ts`: a retry of an already decided call shows as `denied`, not `failure`.
- Tests: `src/app/api/agents/mcp/idempotency.test.ts` (new), and additions in `agentScope.test.ts`, `toolRegistry.test.ts` and `activity/route.test.ts`.

### Contract for the B2 worker

| Case | Answer |
|---|---|
| Field | `params._meta["com.triaxisventures/idempotencyKey"]`, 8 to 128 characters from `A-Z a-z 0-9 . _ : -` |
| Malformed key | `-32602`, nothing created or run |
| First call, approval needed | `{status: "pending_approval", approvalRequestId, pendingToolCallId}` |
| Same key, tool and arguments | the same ids, the current status, `duplicate: true`; nothing created |
| Same key, other tool or arguments | `-32009`, nothing created or run |
| Call that runs immediately | runs; `result._meta["com.triaxisventures/idempotency"] = "not_applied"`, so a retry runs it again |
| `get_pending_tool_call {pending_tool_call_id}` | `status` is `pending_approval`, `executed`, `failed`, `rejected` or `unknown`, with `decidedAt` and `result` |
| Not found, other connection, other tenant, malformed id | one identical error result |
| `notifications/*` without an id | 202, no body |

`unknown` means the row is reserved as `executed` but has no result: the tool may be running, may have run, or may never have started. It is not success.

Argument order does not matter: stored arguments come back from `jsonb`, which does not keep key order.

### What did not change

- Calls without a key, the approvals route, grants, tool handlers, `src/app/api/ai/**`, `src/services/ai/**`, `src/services/chatbot/**`.
- No migration: `agent_connections.capabilities` is `text[]` with no CHECK, and `idempotency_key` is already UNIQUE.
- No admin UI edit: the capability list renders from `allAgentCapabilities`.
- `tools/call` and other methods sent without an id keep their old behaviour. Only `notifications/*` changed.

### Acceptance criteria (as stated before the work began)

Red tests shown failing on the old code and passing on the new; duplicate retry, changed arguments, race, cross-connection and cross-tenant reads, revoked key, missing capability and no-key behaviour covered; all checks pass with raw counts; PR open with closeout and ledger row; no merge, deploy or migration. Met.

### Regression tests

`pnpm exec vitest run --config vitest.config.mjs --pool=forks --maxWorkers=2 src/app/api/agents/mcp/idempotency.test.ts`

- Old code: `Tests  24 failed | 8 passed (32)`. The 8 are unchanged behaviour (no key, 401s, a request with an id) and cases the old code satisfied by accident.
- New code, with `src/app/api/agents src/services/agents src/security src/app/api/approvals`: `Test Files  47 passed (47)`, `Tests  426 passed (426)`.
- Notifications on the old code: `notifications/initialized` returned 200 with a `-32601` error body. The specification requires 202 with no body, so it was changed.

The tests use an in-memory store in place of the Supabase REST call. It applies `eq` filters and the UNIQUE constraint and reverses stored argument order.

### Verification (local, commit `ec13fe28`, Node on Windows)

- `pnpm run test --pool=forks --maxWorkers=2`: PASS, `Test Files  408 passed (408)`, `Tests  2656 passed (2656)`, exit 0, 1128.73s
- `pnpm run typecheck`: exit 0
- `pnpm --dir apps/mobile run typecheck`: exit 0
- `pnpm run lint`: exit 0, zero warnings
- `pnpm run build`: exit 0
- `pnpm run supabase:verify`: exit 0, 62 migrations, 129 of 129 tables with RLS, 1 existing warning (`20260702165736_initial_enterprise_schema.sql`, not touched here)
- CI on `ec13fe28`: 17 checks passed, none failed (Supabase Preview and the two mobile previews skip). CI runs on the later head with `main` merged in are in PR #579.

### Errors hit this session

- Error: first full run exited 1. `Test Files  397 passed (397)`, `Tests  2558 passed (2558)`, and 6 test files never started (`Timeout waiting for worker to respond`); 2 more appeared in a targeted run that still passed. Hypothesis: memory pressure; 667 MB of 8 GB was free and another session was running vitest.
  Resolution: rerun after rebasing on `main`, with no code change from this session, passed with all 408 files reporting and no start timeout. The machine's memory was still low (482 MB free), so the hypothesis is not proven; the cause is being worked on in the vitest reliability session. My check that waited for other vitest runs was faulty and may have started early.
- Error: `pnpm install` took 68 minutes. Not investigated; the machine was under load.

After merging `main` (#572, #577): `pnpm run typecheck` exit 0, and the agent, chatbot, approvals and agentic-chat tests `Test Files  54 passed (54)`, `Tests  548 passed (548)`. The full suite on that head ran in CI only.

### What is still unverified or partial

- Not exercised against a real PostgREST or a live server. The insert uses `resolution=ignore-duplicates` with `on_conflict=idempotency_key`, the same pattern as `src/auth/provisioning.ts`.
- No MCP client has used the key or the tool.
- If the process dies between creating the approval request and the pending call, that approval request has no linked call. A retry creates a second one. This existed before; only a transaction would close it.
- A pending row whose approval was decided but not executed (a crash in the approvals route) stays `pending_approval`. The worker needs its own deadline.
- A closed duplicate approval counts as `rejected` in the governance summary: the status CHECK has no `cancelled`, and adding one needs a migration.

### Deploy and live check (added 2026-11-26)

- PR #579 merged 2026-11-26 12:10:55 UTC with a merge commit, `1610d821`, at head `58d6631d`, which contains `main` at `aa90680f` (#583). Every check on that head passed, including all four Vercel statuses. Merged under Merge When Ready after the founder lifted the PR's hold ("After Vercel limit resets").
- Production deploy run 45817267599: success.
- Live check 2026-11-26 12:26:17 UTC: `GET /` and `GET /auth` returned 200 on landing, investor and lite.triaxisventures.com; `POST /api/agents/mcp` with no key returned 401 on landing and investor.
- New deployments: landing `dpl_2jBsBUMkU7JfD7MMotYMhqCXt8eL`, investor `dpl_GgLP8GKHKVTCHdJHVS3oLauFzSCP`, lite `dpl_9FjAi96Qot6mcQY7bGS5Emfp3dQG`. Previous (rollback): the #583 deployments, landing `dpl_DzBzkAEWP11o4t6VzhNcMFUVbD3T`, investor `dpl_E5joa7KkvthkxQqWfoFRNvqUHrqn`, lite `dpl_2qyGNYc2choFhoaJH4QUMb3btNi7`.
- The live check does not send a caller key, call `get_pending_tool_call`, or race two calls against the hosted database; those stay unverified (above).

### Decision outcomes

- Decision: return the existing call on a retry with the same caller key, using the existing UNIQUE column.
  Outcome: Shipped to production 2026-11-26 (#579, `1610d821`). Use by a real worker: Pending, review by 2026-12-09 (the worker's first staging run)

Final status: Deployed and live-checked; not yet used by any MCP client
Remaining risk: listed above
Follow-up: approving a pending call runs it even if the agent connection was revoked after the request (`src/app/api/approvals/[id]/route.ts`, found by reading, not tested). Fixed in #583, deployed 2026-11-26 before this PR.
Deploy evidence: run 45817267599, live check 2026-11-26 12:26:17 UTC (above)
