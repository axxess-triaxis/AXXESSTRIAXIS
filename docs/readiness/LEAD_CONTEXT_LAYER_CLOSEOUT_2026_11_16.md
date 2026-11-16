# Lead Context Layer: Closeout (automation plan Phase 1, 2026-11-16)

**Status: `Blocked`, not Verified.** The code and tests are done locally. It is not deployed, and the migration is not applied anywhere.

## External signal
- Founder, 2026-11-16: "Goal is full automation with HITL."
- Founder, 2026-11-16: "Storing context is essential."
- Founder, 2026-11-16: "Callismatic currently does CRM through Google Sheets. We need it connected to AXXESS CRM and agent."
- Founder, 2026-11-16: "Omnidamus needs connection to CRM, Leads and agent too."
- Founder, 2026-11-16: approved the full automation plan ("Approve, start Phase 1").

## Product decision
Phase 1 is a shared lead memory: one timeline per lead that every agent reads and writes through MCP.
- It comes before Callismatic and Omnidamus are connected (Phases 2 and 3), because both need somewhere to record leads and conversations.
- A data warehouse is not built. Postgres and pgvector cover the current volume.

## What changed
| File | Change |
|---|---|
| `supabase/migrations/20261116120000_lead_conversations.sql` | New append-only table `lead_conversations`: channel, direction, source, external id, summary (at most 2,000 characters), time, and the agent connection. It has a unique index on (organization, source, external id), so a retry is not stored twice. RLS on: senior members read everything, staff read their own leads. There is no write policy; only the server writes. |
| `src/services/crm/leadContext.ts` | Pure rules: validating an upsert and a conversation, and `agentLeadPatch`, which defines what an agent may change. |
| `src/repositories/leadContextRepository.ts` | Finds a lead by exact email or phone, search, the agent upsert, the idempotent conversation insert, and `loadLeadContext`. That one timeline combines contact attempts, audit changes, replies, milestones and conversations. |
| `src/services/agents/leadTools.ts` | Four MCP tools: `get_lead_context`, `search_leads`, `upsert_lead` and `log_conversation`. |
| `src/security/agentScope.ts` | New opt-in capability group `crmAgentCapabilities`. Existing keys gain nothing. |
| `src/services/agents/toolRegistry.ts` | Registers the four tools. |
| `src/security/chatbotAgentScope.ts`, `src/services/chatbot/agenticChatLoop.ts` | The in-app copilot gets the two **read** tools for roles that can open the Leads page. An Employee sees only their own leads. |

## HITL boundary (by design)
- An agent may:
  - create a lead;
  - fill blank fields on a lead;
  - move a lead forward, up to `proposal`.
- An agent may never:
  - overwrite a field a person filled in;
  - reassign the owner;
  - move a lead back;
  - set negotiation, won or lost;
  - touch a closed lead.
- Recording a lead never makes it contactable for outreach. The contactability gate still needs a consent basis, which only a person or a vetted import sets.
- The copilot cannot use `upsert_lead` or `log_conversation`. People edit leads on the Leads page.

## What did not change
- STILL, Callismatic and Omnidamus are not connected yet. That is Phases 2 and 3.
- No UI change. The Leads page history does not show conversations yet; it will once conversations exist (Phase 2).
- Callismatic's Google Sheet sync is untouched.

## Verification (local)
- Typecheck exit 0, and eslint passes on the changed areas with zero warnings.
- Tests:
  - New: `src/services/crm/leadContext.test.ts` and `src/services/agents/leadTools.test.ts`, 16 tests passing.
  - Updated: `agentScope.test.ts`, `toolRegistry.test.ts` and `chatbotAgentScope.test.ts`.
  - The affected agent and chatbot suites: 9 files, 97 tests passing after the fix to the country length check.
- `pnpm run supabase:verify` passes; its one warning is an existing one (the initial schema's `using (true)`).
- Full-suite counts are in the PR.

## Remains partial or blocked
- **Migration:** `20261116120000_lead_conversations.sql` must be applied to staging, then production. Owner: founder for production, the same path as `lead_milestones`.
- **Dependency:** this branch is stacked on `feat/lead-milestones` (PR #503), because the timeline includes milestones. #503 merges first.
- **Live check:** a staging check through MCP: upsert, log a conversation, read the context. This needs the migration on staging.

## Unsupported claims
None. No automation percentage or time saving is claimed.

## Decision ledger
```
Decision: Build one shared lead timeline exposed as MCP tools before wiring Callismatic and Omnidamus; no data warehouse now.
Why: Founder goal "full automation with HITL"; agents need one memory; current volume fits Postgres.
What changed: lead_conversations table, lead context repository, four MCP tools, copilot read access.
Architecture boundary: Agents write only through MCP tools with opt-in capabilities; the service role writes, RLS governs reads.
Product boundary: Agents never reassign, close or move a lead back; recording is not consent to contact.
Verification: Typecheck, lint and focused tests pass locally; full suite in the PR; no live check yet.
Outcome: Pending until the migration is applied and the staging MCP check passes.
Follow-up: Phase 2 (Callismatic via STILL upsert_lead plus log_conversation), Phase 3 (Omnidamus).
```
