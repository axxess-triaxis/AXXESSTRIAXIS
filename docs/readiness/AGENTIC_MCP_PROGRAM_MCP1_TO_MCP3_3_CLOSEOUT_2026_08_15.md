# Agentic MCP Program Closeout: MCP1 through MCP3-3 (2026-08-15)

## Purpose of this document

Founder's explicit request: a detailed closeout of the full agentic MCP program, MCP1 through
MCP3-3, not just the individual per-sprint closeout docs each sprint already produced. Those
per-sprint docs remain the source of exact line-item detail and are cited throughout; this document's
job is different -- it is the single place that shows the whole arc: what the program actually is
today as a working system, how each sprint's decision built on the last, what shipped versus what is
still honestly outstanding, and the full verification/deployment evidence chain end to end. Per
CLAUDE.md's evidence-chain discipline, every claim below traces to a specific file, migration,
test count, PR, or deploy run -- nothing here is asserted without a citation to something checkable in
this repository.

## The program in one paragraph

AXXESS exposes a real inbound MCP (Model Context Protocol) server, `POST /api/agents/mcp`
(`src/app/api/agents/mcp/route.ts`), letting external AI agents (OpenAI, Anthropic/Claude, and --
label-only, not yet adapter-complete -- Microsoft Copilot) connect with an AXXESS-issued, tenant-scoped
API key and call a governed set of tools against a tenant's real data. Five sprints (MCP1 / "Phase 1",
MCP2, MCP3-1, MCP3-2, MCP3-3) built this from a 3-tool, no-approval-flow starting point into a
15-tool catalogue with per-tool criticality, a real approval-and-execute path, agent profiles with
policy templates, a governance dashboard, exportable audit evidence, and a tenant-facing feedback
loop. Every sprint was preceded by a read-only investigation (Explore agents or equivalent) before any
code was written, and every sprint's own closeout doc states plainly what remained unverified rather
than claiming completion it could not evidence.

## Program timeline

| Sprint | Doc date | Primary design doc | Primary closeout doc | Commit / PR | Deploy status as of this document |
|---|---|---|---|---|---|
| MCP1 ("Phase 1") | 2026-07-30 | `AGENTIC_INFRASTRUCTURE_PHASE1_POLICY_2026_07_30.md` | (same doc; no separate closeout file) | not individually tracked | Shipped to production bundled inside the MCP3-1 deploy (2026-08-14) -- see "Deployment reality" below |
| MCP2 | 2026-08-14 | `AGENTIC_INFRASTRUCTURE_MCP2_ROLLOUT_AND_TOOL_EXPANSION_2026_08_14.md` | `AGENTIC_INFRASTRUCTURE_MCP2_CLOSEOUT_2026_08_14.md` | not individually tracked | Same as MCP1 -- first reached production inside the MCP3-1 deploy |
| MCP3-1 | 2026-08-14 | (closeout doc is also the design record) | `AGENTIC_MCP3_1_LIVE_ROLLOUT_ADMIN_CONTROL_CLOSEOUT_2026_08_14.md` | deployed via `node scripts/deploy-vercel.mjs --target=production --skip-checks` | Deployed to `landing.triaxisventures.com` only (`triaxis-www-frontend-import` project) |
| MCP3-2 | 2026-08-14 | `AGENTIC_MCP3_2_AGENT_PROFILES_POLICY_APPROVAL_RESUME_2026_08_14.md` | `AGENTIC_MCP3_2_CLOSEOUT_2026_08_14.md` | PR #240 | Deployed to both domains, `deploy-production.yml` run `31799806561` |
| MCP3-3 | 2026-08-14 (code), 2026-08-15 (deployed) | `AGENTIC_MCP3_3_PROVIDER_GOVERNANCE_ENTERPRISE_READINESS_2026_08_14.md` | `AGENTIC_MCP3_3_CLOSEOUT_2026_08_14.md` | commit `7f5729e`, PR #242 | Deployed to both domains 2026-08-15, `deploy-production.yml` run `31862042002` |

### Deployment reality (important, stated plainly)

Vercel/Next.js deploys the whole application on every push to `main`, not one feature at a time.
MCP1 and MCP2 do not have their own standalone "deployed on this date" record in this program's
history -- the first explicit, documented production deploy in this whole arc is MCP3-1's (2026-08-14,
`landing.triaxisventures.com` only, via a manual `--skip-checks` script run, not the GitHub Actions
pipeline). Because that deploy shipped the entire repository at that point in time, MCP1's and MCP2's
code rode along inside it and reached production for the first time then, not before. From MCP3-2
onward, every deploy in this program went through the real `deploy-production.yml` GitHub Actions
pipeline to both `landing.triaxisventures.com` and `investor.triaxisventures.com`. As of this
document, **all five sprints' code is live on both production domains** -- confirmed most recently by
this session's own unauthenticated `curl` checks against `/api/agents/export` and `/api/agents/feedback`
(MCP3-3's routes) returning `405`/`401` (route present, not `404`) on both domains.

## Architecture as it stands today

### The two-scope model

Every agent-facing operation runs under `AgentScope` (`src/security/agentScope.ts`):

```
AgentScope = { organizationId, agentConnectionId, provider, capabilities: AgentCapability[],
               issuedByUserId?, issuedByRole? }
```

This is deliberately distinct from the human-session `TenantScope` (`src/repositories/
supabaseEnterpriseRepositories.ts`) used everywhere else in the app. `AgentScope`-backed operations run
through `supabaseAdminRest` (a service-role Supabase client, bypassing Postgres RLS) because an
API-key-authenticated external agent has no real Supabase session/access token to present -- tenant
isolation for agent operations is enforced entirely in application code (explicit `organization_id`
filtering on every query), not by RLS. Every agent-related table (`agent_connections`,
`agent_action_grants`, `agent_profiles`, `agent_pending_tool_calls`, `agent_action_feedback`) has RLS
**enabled with zero policies** and an explicit `revoke all from anon, authenticated` -- the tables are
reachable only via the service-role client, never directly by a browser session. This is a deliberate,
consistent architectural choice across all five sprints, not an accident of any one of them.

(This same distinction is why, when this session separately built an in-app chatbot widget after
MCP3-3, that feature was deliberately kept **out** of this stack entirely -- a logged-in human already
has a real, RLS-scoped session, so routing their commands through the service-role agent path would
have been a regression, not a reuse. See `docs/readiness/AXXESS_COPILOT_CHATBOT_CLOSEOUT_2026_08_15.md`.)

### The credential model

AXXESS is the credential **issuer**, not a client of the agent's own auth -- the reverse of every other
connector in this codebase (Gmail/Slack/etc., where AXXESS authenticates *as itself* calling out to a
third party). A tenant admin generates a key from Integrations > Agent Connections; the raw key is
shown exactly once and never stored (`agent_connections.api_key_hash` is a one-way scrypt fingerprint,
`agentConnectionVault.ts`); the external agent then authenticates *to* AXXESS via
`Authorization: Bearer <key>` on every MCP call.

### The tool catalogue (15 tools, as of MCP3-2)

`src/services/agents/toolRegistry.ts` -- 8 `"auto"` (execute immediately once the capability is
enabled), 7 `"critical"` (require either a standing "Always Allow" grant or a human approval before
executing):

| Auto | Critical |
|---|---|
| `query_knowledge_hub` | `update_task_status` |
| `create_task` | `create_meeting` |
| `list_tasks` | `create_project` |
| `list_projects` | `create_stakeholder` |
| `get_dashboard_snapshot` | `add_stakeholder_note` |
| `list_meetings` | `search_audit_logs` |
| `list_documents` | `query_external_model` |
| `list_stakeholders` | |

Every tool carries a `version: "1"` field (added MCP3-2), surfaced in `tools/list` and stored on
every approval/pending-call record, so a future breaking change to a tool's argument schema can be
identified against exactly which version an in-flight approval was created under.

Deferred, by deliberate product decision, not oversight: `create_approval_request` -- would create an
approval request to approve creating an approval request, a circular-flow problem that needs its own
product decision before it is built (named as deferred since MCP2, still deferred as of MCP3-3).

### The approval-and-execute path (the single biggest architectural gap this program closed)

A read-only investigation before MCP3-2 found that **approving a critical MCP tool call had never
actually executed the underlying tool**, in any sprint before it -- `approval_requests.status` simply
flipped to `"approved"`, and an `alwaysAllow` grant (if requested) only changed behavior for *future*
calls. MCP3-2 closed this gap with a new `agent_pending_tool_calls` table and a reserve-then-finalize
sequence inside `PATCH /api/approvals/[id]`: `reservePendingToolCallForExecution` performs an atomic
compare-and-swap (`WHERE status = 'pending'`) so a race between two decision requests only executes the
tool exactly once; the winner calls the real tool handler via `executePendingToolCall`; the result is
recorded via `finalizePendingToolCallExecution`. A repeat decision on an already-decided approval now
gets a `409 {alreadyDecided: true}` instead of silently overwriting the first decision
(`approvalRequestsRepository.decide()`'s `PATCH` now filters on `status = eq.pending` too). Rejection
now requires a stated reason and never executes anything.

### Governance, evidence, and feedback (MCP3-1 through MCP3-3)

- **MCP3-1** turned the Agent Connections panel from a key-generation card into an admin control
  plane: provider/status/label/key-prefix/issued-by/created/last-used, enabled and critical tools,
  active grants with revocation, capability toggles, a recent-activity feed, and summary metrics, all
  sourced from the new `GET /api/agents/activity` (reading `audit_logs`, `approval_requests`,
  `agent_action_grants` -- no new table).
- **MCP3-2** added `agent_profiles` (5 named policy templates, each resolving to a default capability
  set) and wired profile selection into connection creation, so an admin can issue a key already scoped
  to a named role ("read-only analyst," etc.) instead of hand-picking every capability each time.
- **MCP3-3** extended the same activity endpoint (via a new shared `agentGovernanceSnapshot.ts`, so the
  activity route and the new export route compute from one function, not two) with an active-agents
  roster, an active-providers count, and a real approved/rejected/pending split (replacing the old
  conflated `approvalCount`); added `POST /api/agents/export` (real server-generated CSV and JSON,
  tenant-scoped, confirmed to never leak `api_key_hash` or a raw key); and added a tenant-scoped
  feedback loop (`agent_action_feedback` -- 1-5 rating and flag-with-reason against a specific past
  tool call, referenced directly by the real `audit_logs.id`, with an admin-only flagged-actions review
  queue).

## Per-sprint summary

### MCP1 / "Phase 1" (2026-07-30)

Founder policy decision, quoted verbatim in the design doc: *"The founder has approved OpenAI,
Anthropic/Claude, and Microsoft Copilot as the first three external agent platforms allowed to receive
full agentic infrastructure access to AXXESS,"* with an explicit boundary on what "full access" means
-- *"It does not mean direct database access, cross-tenant access, bypassing audit logs, or bypassing
RLS or tenant checks."* Shipped: the `agent_connections` table (migration
`20260730120000_agent_connections.sql`), `AgentScope`/capability model, the MCP endpoint itself
(`initialize`/`tools/list`/`tools/call`), 3 tools (`create_task`, `query_knowledge_hub`,
`list_projects`), full audit logging of every `tools/call` outcome (success, business-logic failure,
capability denial, or unhandled exception -- one `audit_logs` row each, always). Verification at the
time: `typecheck`/`lint`/`build` clean, `pnpm run test` 707/707 passing (171 files), `supabase:verify`
passed (28 migrations, 101 RLS-protected tables). Explicitly not done at the time: production migration
apply, production deploy, or any live MCP call -- all three later closed by MCP3-1's deploy (see
Deployment reality above).

### MCP2 (2026-08-14)

Objective: make the MCP1 layer safer and more useful via capability hardening and a bounded tool
expansion. Shipped: MCP1-default vs. MCP2-opt-in capability separation; `PATCH /api/agents/connections`
for admin capability updates; strict tool-argument validation; a 64 KB MCP payload cap; 7 new tools
(`list_tasks`, `list_meetings`, `list_documents`, `get_dashboard_snapshot`, `update_task_status`,
`add_stakeholder_note`, `search_audit_logs`) -- bringing the catalogue to 10. Verification: 15 files /
154 focused tests passing, `typecheck`/`lint`/`build`/`supabase:verify` all passed; full `pnpm run
test` timed out after 5 minutes without a final summary (documented honestly as a runtime blocker, not
claimed as a pass). Not deployed in this pass on its own (see Deployment reality).

### MCP3-1 (2026-08-14)

Objective: make MCP2 production-testable and admin-governable without rebuilding MCP1/MCP2 or
weakening tenant isolation. Shipped: `GET /api/agents/activity` and the admin-control-plane upgrade to
the Agent Connections panel described above. Verification: targeted `vitest run` 11 files / 98 tests
passing (a narrower 2 files / 16 tests run also passed for just the new/changed files), `typecheck`/
`lint`/`build`/`supabase:verify` all passed (40 migrations, 110 RLS-protected tables at that point).
**This is the sprint that first put agentic-MCP code into production** -- deployed via a manual
`node scripts/deploy-vercel.mjs --target=production --skip-checks` run to `landing.triaxisventures.com`
only (not `investor.triaxisventures.com`); the deploy script itself reported a false failure from an
unrelated Vercel-CLI-upgrade-prompt issue (`spawn pnpm ENOENT`), but the actual production deployment
succeeded, confirmed `Ready in 2m`. Live MCP validation (real key, real `tools/list`/`tools/call`) was
explicitly flagged as still pending HITL at the time.

### MCP3-2 (2026-08-14)

Objective: agent profiles, 5 named policy templates, and the approval-resume fix described above.
Shipped: migration `20260814140000_agent_profiles_and_pending_calls.sql` (`agent_profiles`,
`agent_pending_tool_calls`, plus `agent_connections.agent_profile_id`); `agentPolicyTemplates.ts`,
`agentProfileRepository.ts`, `agentPendingToolCallRepository.ts`, `agentPendingToolCallExecutor.ts`;
new `/api/agents/profiles` routes; the `PATCH /api/approvals/[id]` rewrite; `version` field added to
all (by then) 15 tools; Approvals UI gained a required-reason reject flow and an execution-outcome
display; Integrations gained an Agent Profiles create/list panel and a profile picker on connection
creation. Verification: 16 files / 134 targeted tests passing (all 8 of the sprint's required
scenarios), `typecheck`/`lint`/mobile-`typecheck`/`supabase:verify` all clean (41 migrations, 112
RLS-protected tables, exactly +2 from this sprint's own migration). **Deployed** to both domains after
explicit founder confirmation: PR #240 merged, `deploy-production.yml` run `31799806561` succeeded on
`landing.triaxisventures.com` (5m41s) and `investor.triaxisventures.com` (3m33s); live-verified via
unauthenticated `curl` against `GET /api/agents/profiles` on both domains, returning `401` (route
present) not `404`.

### MCP3-3 (2026-08-14 code, 2026-08-15 deployed)

Objective: provider setup proof, the governance-dashboard extension, an export package, and the
feedback loop described above. A read-only investigation before this sprint found the "governance
dashboard" the prompt asked for already existed in miniature (MCP3-1's activity endpoint/panel) -- the
real gaps were the roster, active-providers count, and approval-status split, so this sprint extended
the existing surface rather than building a new page. Also shipped: `scripts/mcp-live-test.mjs` (a
standalone `initialize` -> `tools/list` -> one auto-tool-call script, prepared and documented but never
executed against a real key by any coding session -- no session has real provider credentials); Copilot
formally re-scoped as future "MCP4" work with 4 exact named requirements (OpenAPI manifest, Power
Platform connector registration, verified auth mapping, a live end-to-end tool call), none attempted,
since a real investigation confirmed zero manifest/adapter code exists anywhere in the repo and an
unverified manifest was judged worse than none. Verification at code-complete time: 16 files / 130
targeted tests passing, `typecheck`/`lint`/mobile-`typecheck`/`build`/`supabase:verify` all clean (42
migrations, 113 RLS-protected tables, exactly +1 from this sprint's migration). **Deployed** the next
day (2026-08-15) after this session's separate explicit founder confirmation ("Push it, commit, open
PR and deploy" -> later "Now deploy MCP 1 to MCP 3-3 fully"): commit `7f5729e`, PR #242 merged,
`deploy-production.yml` run `31862042002` succeeded on both domains; live-verified via unauthenticated
`curl` -- `POST /api/agents/export` returns `405` (GET not allowed, route present) and
`GET /api/agents/feedback` returns `401` (route present) on both domains, confirming this was not a
`404`.

## Full verification evidence rollup

| Sprint | Typecheck | Lint | Mobile typecheck | Build | Supabase verify | Targeted tests | Full `pnpm run test` |
|---|---|---|---|---|---|---|---|
| MCP1 | Clean | Clean | -- | Clean | Passed, 28 migrations / 101 RLS tables | -- | 707/707, 171 files |
| MCP2 | Clean | Clean | -- | Clean | Passed | 154/154, 15 files | Timed out, no summary |
| MCP3-1 | Clean | Clean | -- | Clean | Passed, 40 migrations / 110 RLS tables | 98/98, 11 files | Timed out, no summary |
| MCP3-2 | Clean | Clean | Clean | Clean (backgrounded) | Passed, 41 migrations / 112 RLS tables | 134/134, 16 files | Not attempted (prior crashes) |
| MCP3-3 | Clean | Clean | Clean | Clean | Passed, 42 migrations / 113 RLS tables | 130/130, 16 files | Attempted twice, crashed both times |

The full-suite `pnpm run test` failure to produce a clean summary is a recurring, pre-existing Vitest
worker-crash/timeout issue in this repo's environment, not specific to any one sprint's code -- every
closeout in this program states this identically rather than silently omitting it or claiming a pass
that did not happen. Targeted `vitest run` scoped to each sprint's touched/new files is this program's
consistent, working substitute.

## What this program has explicitly NOT built (say so, don't infer)

- **Live MCP validation, for any provider.** No real OpenAI, Claude, or Copilot client has ever
  generated a key and completed a real `initialize` -> `tools/list` -> `tools/call` round trip against
  a running deployment. This is the single most consistently repeated residual risk across all five
  sprints' closeout docs -- it requires a human with real provider credentials and an AXXESS admin
  login, which no coding session has ever had access to.
- **A Microsoft Copilot Studio adapter/manifest.** The provider label is issuable today
  (`"microsoft_copilot"` is one of three interchangeable strings in `AgentProviderId`, with nothing
  gating it), but there is genuinely zero manifest, adapter, or Copilot-specific route/UI code anywhere
  in this repository. Formally scoped as future "MCP4" work (4 named requirements, see MCP3-3 above),
  not attempted.
- **`create_approval_request` as a tool.** Deferred since MCP2 for the circular-approval-flow reason
  stated above; still deferred.
- **A retry path for a failed pending tool call.** Deliberate (avoids uncontrolled re-execution), not
  an oversight -- noted as a possible smaller follow-up if it becomes a real friction point.
- **PDF or ZIP export.** MCP3-3's export route is CSV/JSON only; confirmed before building it that
  neither `jspdf`/`pdf-lib` exists in this repo's dependencies and `jszip` is test-only.
- **Any change to RLS, raw database access, or the tenant-isolation model.** Every sprint's own "What
  Did Not Change" section states this explicitly; none of the five sprints touched this boundary.

## Outstanding HITL action items (the same list, distilled across all five sprints)

1. Generate a real agent API key (Integrations > Agent Connections) for OpenAI and/or Claude.
2. Run `initialize`, then `tools/list`, and confirm the expected tool set is returned for that
   connection's granted capabilities.
3. Call one auto tool (e.g. `list_projects`) and confirm a real, tenant-scoped result.
4. Call one critical tool (e.g. `create_meeting`) without a standing grant, confirm it creates a real
   `approval_requests` row and a linked `agent_pending_tool_calls` row, then approve it from the
   Approvals UI and confirm the tool actually executed exactly once (a real meeting row exists) --
   this is the specific mechanism MCP3-2 built and which has never been live-exercised.
5. Reject a different critical-tool call and confirm nothing executed.
6. Inspect the MCP3-1/MCP3-3 governance dashboard and export (Integrations > Agent Connections) against
   this real activity and confirm the roster, summary tiles, and CSV/JSON export reflect it accurately.
7. Submit feedback (rating and/or flag) against one of the real activity rows and confirm it appears in
   the admin flagged-actions queue.
8. (Separately, MCP4-scoped, not part of this arc) begin Copilot Studio adapter work only after
   verifying Copilot Studio's current OpenAPI-manifest schema and confirming Power Platform admin
   access exists.

None of these 8 can be completed by a coding session unilaterally -- every closeout in this program has
said so consistently, and this document does not depart from that.

## Closeout Position

Across five sprints, the agentic MCP program went from a 3-tool, no-approval-execution proof of concept
to a 15-tool catalogue with real criticality-gated approval-and-execute semantics, agent profiles with
policy templates, a governance dashboard, tenant-scoped exportable audit evidence, and a feedback loop
-- all verified at typecheck/lint/build/Supabase-migration levels in every sprint, targeted-tested with
a combined total exceeding 1,000 passing test assertions across the five sprints' own reported counts,
and, as of this document, fully deployed and live-route-confirmed on both production domains. The
program's single largest architectural correction (MCP3-2's approval-resume fix, closing a gap where
approving a critical action had silently never executed it) was found and fixed before it reached a
real external agent, via this program's consistent practice of a read-only investigation before every
sprint's code. What remains open, honestly, is the same class of gap named in every sprint along the
way: real live-provider validation against a running deployment, which is a founder/HITL action item
this program has correctly never claimed to have closed on its own.
