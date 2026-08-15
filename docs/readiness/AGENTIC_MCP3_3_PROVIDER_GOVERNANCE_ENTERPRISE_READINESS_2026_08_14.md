# Agentic Infrastructure MCP3-3: Provider Setup Proof, Governance Dashboard, Export, Feedback Loop (2026-08-14)

## Objective

Per the Codex-drafted execution prompt for this sprint: turn the agentic MCP layer into an
enterprise-demonstrable capability with provider setup proof, a governance dashboard, exportable audit
evidence, and a feedback loop -- without overclaiming Copilot readiness or live provider validation
that has not actually happened.

## Two findings that reshaped this sprint's scope, established before any code was written

1. **The "governance dashboard" already existed in miniature.** `GET /api/agents/activity` (MCP3-1) and
   `AgentConnectionsPanel` (Integrations page) already covered tool usage, pending approvals, denials,
   and failures. A read-only investigation (3 parallel Explore agents) before this sprint found the
   real gaps were: an active-agents roster, an active-providers count, an approved-vs-rejected split
   (the prior `approvalCount` conflated every status together), and risk-tier/last-used surfaced as
   dashboard aggregates -- both fields already existed as real columns
   (`agent_profiles.risk_tier`, `agent_connections.last_used_at`) from MCP3-2, just never joined into
   this view. This sprint **extends** that existing surface rather than building a new page.
2. **Live provider proof cannot be executed by a coding session.** No session has real OpenAI/Claude/
   Copilot credentials or a founder login to generate a real agent API key and dial the live MCP
   endpoint end-to-end. Every MCP3-1/MCP3-2 closeout already stated this identically. This sprint's
   honest deliverable for OpenAI/Claude setup proof is a **prepared, ready-to-run live-test script**
   (`scripts/mcp-live-test.mjs`) plus exact setup docs -- not a fabricated "ran successfully" claim.

## What shipped

### Governance dashboard (extends MCP3-1's `/api/agents/activity`, not a new page)

- Logic extracted into `src/services/agents/agentGovernanceSnapshot.ts` (`buildAgentGovernanceSnapshot`)
  so both the activity route and the new export route share one computation, not two.
- New response fields: `roster` (one row per connection -- label, provider, status, risk tier resolved
  via `agent_profile_id -> agent_profiles.risk_tier`, last used), `summary.activeAgents`,
  `summary.activeProviders` (distinct provider count among active connections),
  `summary.approvals: {approved, rejected, pending}` (replaces the old conflated `approvalCount`,
  which is kept unchanged for backward compatibility).
- `AgentConnectionsPanel` (`src/features/integrations/IntegrationsSection.tsx`): summary strip grew to
  9 tiles (active agents, active providers, recent calls, pending/approved/rejected, failures, denials,
  active grants); a new dense roster table (provider/status/risk tier/last used); a "Flagged Agent
  Actions -- Review Queue" list sourced from the feedback table below.

### Export package (CSV + JSON only -- no PDF/ZIP claimed)

- New `POST /api/agents/export` (admin-gated, same pattern as every other `/api/agents/*` route):
  returns both a JSON payload and a CSV string built from the same governance snapshot, plus records a
  tenant-scoped audit-log event (`agent_governance.export`), mirroring `/api/approvals/export`'s
  audit-only pattern but additionally returning the real exportable content server-side (CSV generation
  needs to happen somewhere real -- this route is that place, following the same pattern already
  established by `/api/audit-exports`).
- UI: two buttons ("Export CSV" / "Export JSON") in `AgentConnectionsPanel`, downloading via the same
  Blob-anchor pattern already used three times elsewhere in this codebase (Approvals, Analytics,
  Dashboard exports) -- no new download mechanism invented.
- **Confirmed before writing this route**: no PDF or ZIP export helper exists anywhere in this repo
  (`jspdf`/`pdf-lib` are absent from `package.json`; `jszip` is a test-only devDependency). Neither is
  built or claimed here.

### Feedback loop

- New migration `20260814150000_agent_action_feedback.sql`: `agent_action_feedback` table, referencing
  `audit_logs.id` directly -- `GET /api/agents/activity`'s existing `activity[].id` already *is* the
  real `audit_logs` primary key for that call (confirmed by direct code read, not assumed), so no new
  id-plumbing was needed to make a past agent tool call referenceable. Same isolation pattern as every
  other agent table (service-role-only, RLS enabled with no policies) -- chosen over mirroring the
  unrelated `beta_feedback` table's authenticated-RLS shape, for consistency with every other table this
  program's agentic-infrastructure work has added.
- New `src/services/agents/agentActionFeedbackRepository.ts` + `POST`/`GET /api/agents/feedback`
  (admin-gated, same role set as the activity route -- the feed this attaches to is itself only ever
  rendered inside the admin-only panel, so there is no case where a non-admin could see a row to submit
  feedback against).
- UI: per-activity-row 1-5 rating buttons and a "Flag" control (opens a required-reason input, matching
  the Approvals reject-reason pattern from MCP3-2) in `AgentConnectionsPanel`; a "Flagged Agent Actions"
  admin review-queue list built as a filtered view of the same feedback table, not a separate queue
  construct.

### Provider setup proof

- `scripts/mcp-live-test.mjs`: standalone Node script (built-in `fetch`, no new dependency) running
  `initialize` -> `tools/list` -> one auto tool call against a real deployment, printing PASS/FAIL per
  step and exiting non-zero on any failure.
- `docs/readiness/AGENTIC_MCP_PROVIDER_SETUP_OPENAI_CLAUDE_COPILOT_2026_08_14.md` updated with a
  "Running the live test" section under both OpenAI and Claude, explicitly stating this sprint has not
  run it against a real key.

### Copilot -- formally scoped as MCP4, not built

Investigated (read-only): zero manifest/adapter code exists anywhere in the repo; the provider label is
ungated (a tenant admin can already issue a working `microsoft_copilot`-labeled key today, it just has
no Copilot-Studio-side integration). Building a real custom-connector manifest without verifying Copilot
Studio's current exact schema would produce a plausible-looking but unverified artifact -- worse than no
artifact. The same provider-setup doc now has a "Copilot -- formally scoped as MCP4" section naming the
4 exact outstanding requirements (OpenAPI manifest, Power Platform connector registration, auth-mapping
verification, a live end-to-end tool call), none attempted.

## Non-negotiables from the "What Not To Build" list, how respected

- No raw DB access: every new table goes through a repository (`agentActionFeedbackRepository.ts`) using
  `supabaseAdminRest`, never raw SQL from a route.
- No broad tool catalogue growth: zero new MCP tools.
- No Lite involvement: nothing in `src/features/lite/*` touched.
- No autonomous payment/email/WhatsApp actions: not touched.
- No Copilot readiness claim: explicitly scoped as not-built, see above.
- No background autonomous workflows: dashboard/export/feedback are all human-triggered, synchronous.

## What did not change

- No changes to MCP1/MCP2/MCP3-1/MCP3-2's core tool-call/approval-resume logic.
- `summary.approvalCount` (the old conflated field) kept unchanged for backward compatibility, not
  removed, even though `summary.approvals` now provides the real split.
- No investor/YC evidence docs touched -- the prompt's own instruction is "update... only if proof
  exists," and no live provider proof exists yet.
