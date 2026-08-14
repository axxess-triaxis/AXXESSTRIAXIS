# Agentic MCP3-2 Closeout: Agent Profiles, Policy Templates, Approval Resume (2026-08-14)

## Objective

Ship agent profiles, 5 named policy templates, and safer approval-resume semantics on top of the
existing MCP1/MCP2/MCP3-1 agentic infrastructure, per the Codex-drafted execution prompt for this
sprint. Full design detail: `docs/readiness/AGENTIC_MCP3_2_AGENT_PROFILES_POLICY_APPROVAL_RESUME_2026_08_14.md`.

## Headline change

A read-only investigation performed before writing any code found that **approving a critical MCP
tool call had never executed the underlying tool** in any prior sprint -- only
`approval_requests.status` flipped, and an `alwaysAllow` grant (if requested) only affected
*future* calls. This sprint's approval-resume work closes that gap for the first time via a new
`agent_pending_tool_calls` table and a reserve-then-finalize execution sequence inside
`PATCH /api/approvals/[id]`.

## Files Added

- `supabase/migrations/20260814140000_agent_profiles_and_pending_calls.sql`
- `src/services/agents/agentPolicyTemplates.ts` + `.test.ts`
- `src/services/agents/agentProfileRepository.ts` + `.test.ts`
- `src/services/agents/agentPendingToolCallRepository.ts`
- `src/services/agents/agentPendingToolCallExecutor.ts` + `.test.ts`
- `src/app/api/agents/profiles/route.ts`
- `src/app/api/agents/profiles/[id]/route.ts`
- `docs/readiness/AGENTIC_MCP3_2_AGENT_PROFILES_POLICY_APPROVAL_RESUME_2026_08_14.md`
- `docs/readiness/AGENTIC_MCP3_2_CLOSEOUT_2026_08_14.md` (this file)

## Files Modified

- `src/services/agents/toolRegistry.ts` -- added `version: "1"` to all 15 tool definitions.
- `src/services/agents/agentConnectionRepository.ts` -- `agentProfileId` on create, new
  `getAgentConnectionById`.
- `src/app/api/agents/connections/route.ts` -- `POST` accepts optional `agentProfileId`.
- `src/app/api/agents/mcp/route.ts` -- `tools/list` includes `version`; the critical-tool-no-grant
  branch now also creates a linked `agent_pending_tool_calls` row.
- `src/app/api/approvals/[id]/route.ts` -- rewritten: compare-and-swap decision, reserve-then-
  finalize pending-call execution, required rejection reason, `execution` field in the response.
- `src/repositories/workflowActionRepositories.ts` -- `decide()`'s `PATCH` now filters on
  `status=eq.pending`.
- `src/features/approvals/ApprovalsSection.tsx` -- required reject reason, execution outcome
  display.
- `src/features/integrations/IntegrationsSection.tsx` -- Agent Profiles sub-panel, profile picker
  on connection creation.
- `src/app/api/agents/mcp/route.test.ts`, `src/app/api/agents/connections/route.test.ts`,
  `src/app/api/approvals/[id]/route.test.ts` -- extended for the above.
- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` -- new row for this sprint.

## What Changed

See the design doc for full detail. In summary: agent profiles and 5 policy templates exist and
are wired into connection creation; every tool carries a version; a critical tool call now
persists a real, execution-tracking pending-call record; approving it executes the tool exactly
once via an atomic reserve-then-finalize sequence; rejecting it requires a reason and never
executes; repeat decisions on an already-decided approval are rejected (409) instead of silently
overwritten.

## What Did Not Change

- No raw database access anywhere -- all new tables go through repository functions using
  `supabaseAdminRest` (service role), never raw SQL from a route.
- No raw key storage -- no new credential material introduced.
- No RLS policies added to the two new tables (`agent_profiles`, `agent_pending_tool_calls`) --
  same service-role-only, no-authenticated-grant model as `agent_connections`/`agent_action_grants`.
- No new MCP tools -- policy templates only reference the 15 tools that already existed.
- No automatic retry of a failed pending tool call.
- No Copilot-specific adapter work.
- No X0, Demo, Lite, RAG, Knowledge Hub, general auth/RBAC, or payment-model changes.

## Verification

Passed:

- `pnpm run typecheck` -- 0 errors.
- `pnpm run lint` -- 0 warnings.
- `pnpm --dir apps/mobile run typecheck` -- 0 errors.
- `pnpm run supabase:verify` -- passed; 41 migrations (was 40), 112 created tables (was 110), 112
  RLS-protected tables (was 110) -- exactly the 2 new tables from this sprint's migration, with the
  same pre-existing warning on `20260702165736_initial_enterprise_schema.sql` (unrelated to this
  sprint).
- Targeted `vitest run` across every touched/new area
  (`src/services/agents`, `src/app/api/agents`, `src/app/api/approvals`, `src/features/approvals`,
  `src/features/integrations`, excluding `.claude/worktrees` and `.cache/worktrees`): **16 files /
  134 tests passing**, including the 8 required scenarios from the execution prompt (profile
  creates scoped default capabilities; policy template applies correct tools; critical call
  persists pending state; approve executes once; double approval does not duplicate; reject
  prevents execution; wrong tenant cannot see/approve; audit chain complete).
- `pnpm run build` -- production build, run in background; result recorded separately once
  complete (see Residual Risks if it had not finished by the time this doc was written).

Not run / not claimed:

- Full `pnpm run test` was not attempted as a substitute for the targeted run above -- this
  session's own prior full-suite attempts today crashed with a Vitest worker error before
  producing a summary; the targeted run is the working substitute for this repo in this
  environment, used consistently rather than claiming a full-suite pass that did not happen.

## Residual Risks

- **Live MCP validation is not performed.** No real MCP client (OpenAI, Claude, Copilot) has
  generated a key, called `initialize`/`tools/list`/`tools/call`, or triggered the new
  approve-and-execute path against a running deployment. This is the same class of gap flagged in
  every prior MCP sprint's closeout (MCP2, MCP3-1) and remains a founder/HITL action item, not
  something a coding session can close unilaterally.
- **Not deployed.** Per the execution prompt's own scope ("Commit: ..."), this sprint's work is
  committed locally only -- no push, PR, merge, or deploy was performed, matching this repo's
  standing rule that production actions require separate explicit confirmation.
- **A failed pending tool call has no retry path.** This is deliberate (avoids uncontrolled
  re-execution) but means a founder/admin currently has no in-product way to re-attempt a failed
  execution other than the agent issuing a fresh MCP call -- worth a smaller follow-up if this
  becomes a real friction point.
- **Agent Profiles UI is intentionally compact.** It covers create/list and wiring into connection
  creation; it does not yet expose profile editing (`PATCH /api/agents/profiles/[id]` exists and is
  tested, but no UI calls it yet) or revocation from the panel.

## Closeout Position

MCP3-2 is code-complete and verified at typecheck, lint, mobile-typecheck, Supabase-migration, and
targeted-test levels, with all 8 of the execution prompt's required test scenarios passing. It is
not production-certified: no deploy has happened this sprint, and live MCP validation (the same gap
open since MCP2) remains outstanding and requires direct HITL action against a real provider.
