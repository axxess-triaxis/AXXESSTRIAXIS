# Plan: customers can fire Callismatic and Omnidamus from AXXESS TRIaxis (2026-11-20)

Status: **approved by the founder 2026-11-20 ("Approve, start PR 1").**

| PR | Repository | State (2026-11-20) | Evidence |
|---|---|---|---|
| 1. Routing core | AXXESSTRIAXIS | Merged, not live (migration and secret pending) | #555, merge `0eef8486`; `/api/stack/results` answered 401 without the secret at 11:10 UTC |
| 2. STILL results route | STILL | Merged, not deployed | STILL #13, merge `5350f6fb` |
| 3. Omnidamus org conversations and `POST /start` | Omnidamus | Merged, not deployed | Omnidamus #8, merge `38e62cc9`; 132 tests |
| 4. Callismatic customer calls | callismatic | Merged, not deployed; customer-call script approved by the founder ("Approve and merge") | callismatic #21, merge `cce79de5`; 197 tests |
| 5. AXXESS Agents card, Message with agent, per-org registration gate | AXXESSTRIAXIS | In review (this branch) | see below |
| 6. Two-org staging end to end | all | Not started | |
| 7. Production | all | Not started | |

PR 5 adds:
- **Migration** `20261120140000_org_agent_settings_details.sql`: `call_purpose`, `sms_opening_text`, `whatsapp_template`, `whatsapp_number_e164`, `sms_number_e164` on `org_agent_settings`.
- **Per-org registration gate.** `CURRENT_REGISTRATIONS` (a global, all false) is gone. The call queue, logged calls, Call with agent and Message with agent read the organization's own DLT, TDRA and counsel flags (`loadRegistrations`). With no row, every flag is false, so behaviour is unchanged until Triaxis records one.
- **Who sets what.** Organization admins set the agent switches, call purpose and opening SMS (`/api/stack/agent-settings`). Only Triaxis's own Super Admin (`AXXESS_PLATFORM_OPERATOR_ORGANIZATION_ID`) links caller IDs, numbers and senders and records registrations (`/api/stack/agent-settings/[organizationId]`). A number can belong to one organization only (`org_channel_numbers`).
- **Call with agent** needs Callismatic on for the organization; a customer organization also needs its caller ID and call purpose, which go to Callismatic with its name.
- **Message with agent** (lead panel, WhatsApp or SMS): setup check, the contactability gate for the channel, an `agent_message_jobs` row, then Omnidamus `POST /start` (`OMNIDAMUS_START_URL`, `OMNIDAMUS_START_API_KEY`). Triaxis's own organization does not use it.
- **Agents card** on the Integrations page, with Triaxis's operator panel for its own Super Admin.

PR 1 adds:
- **Migration** `supabase/migrations/20261120120000_stack_org_routing.sql`: tables `agent_message_jobs`, `org_agent_settings` and `org_channel_numbers`. Every product is off for every organization until a row turns it on.
- **Route** `POST /api/stack/results`, with the job lookup in `src/services/stack/stackResults.ts` and `src/repositories/stackJobsRepository.ts`.
- **Tests:** 10 route tests and 4 repository tests.
- **Not live yet.** The route stays unused until two founder steps:
  - set `STACK_RESULTS_SECRET` (32+ characters) in Vercel and Secrets Manager
  - run the migration in each environment

  STILL starts sending to the route in PR 2.

## Request and decisions
- Founder, 2026-11-20: "Can you ensure Callismatic and Omnidamus are fireable from AXXESS TRIaxis for customers? work on that next".
- Founder decisions, same day:
  - **Tenancy:** one shared Callismatic deployment and one shared Omnidamus deployment, with every job tagged with the customer's organization.
  - **Sender:** each customer sends from its own WhatsApp Business number, SMS sender and caller ID, never Triaxis's.
  - **Scope:** both products in one sprint.

## What exists today (main, verified 2026-11-20)
| Piece | State | Evidence |
|---|---|---|
| AXXESS "Call with agent" -> Callismatic | Built. Every call is refused by the contactability gate | `src/app/api/crm/leads/[id]/agent-calls/route.ts`; `CURRENT_REGISTRATIONS` all false in `src/services/outbound/callQueue.ts:38` |
| Callismatic outbound calls | Built and switched off. No DLT- or TDRA-registered provider | Callismatic README "Outbound agent calls"; `OUTBOUND_PROVIDERS_BY_COUNTRY_CODE` is empty |
| AXXESS -> Omnidamus | **Missing.** A conversation starts only through `scripts/start_conversation.py`, which invokes the Lambda directly | Omnidamus repo; no Omnidamus caller in AXXESS `src/` |
| Results back into AXXESS | STILL -> AXXESS MCP with **one** agent API key, so every task and every `log_agent_call` lands in the **Triaxis** org | STILL `src/still/adapters/axxess.py` (single `api_key`); `agentCallRepository.ts` uses the MCP connection's tenant |
| Per-org WhatsApp number in AXXESS | A field exists for webhook attribution (`phone_number_id`), not for sending through Omnidamus | `src/features/integrations/WhatsAppPhoneNumberField.tsx` |

**Consequence today:** a customer's org can't start Omnidamus at all. If a customer's agent call ever ran, its result would be filed in the Triaxis org (or fail), not in the customer's org.

## Design
### A. Org routing: results land in the org that fired the job
- AXXESS owns the job record. Each job carries a `job_id`, and AXXESS stores `job_id -> organization_id`.
  - Calls already do this with `agent_call_jobs`.
  - Messages get a new `agent_message_jobs` table.
- **The org comes from AXXESS's job record, never from the event payload.** A forged `organization_id` can't move data between orgs.
- **New service route in AXXESS:** `POST /api/stack/results`.
  - Authentication: a stack service credential, held only by STILL (Secrets Manager), separate from per-org agent keys.
  - Behaviour: it looks up the job, checks that the org has the product enabled, and writes the task or call log into that org. An unknown `job_id` is refused and recorded.
- **STILL change:** for `call.completed.v1` and the new `conversation.completed.v1` (which will carry `job_id`), send to `/api/stack/results`.
  - Events without a `job_id` keep today's path into the Triaxis org (Tenant 0). That covers Triaxis's own inbound calls and messages, so nothing about Triaxis's own use changes.
- **Inbound for customers** (a call or message arrives on a customer's number):
  - Map the receiving number to an org through a new `org_channel_numbers` registry in AXXESS.
  - Omnidamus and Callismatic include the receiving number in the event, and AXXESS resolves the org.

### B. Per-org setup ("Agents" card on the Integrations page, admins only)
- **Omnidamus, per org:**
  - WhatsApp: the End User Messaging Social `phone_number_id` of the customer's own number, plus approved template names.
  - SMS: an origination identity.
  - Email: a sender address on a verified domain.
  - On/off switch.
- **Callismatic, per org:** caller ID or provider route, and an on/off switch. It stays refused until the org's DLT/TDRA registration is recorded.
  - Today the registration gate is a global constant. It becomes per-org data that a Triaxis admin sets after seeing proof, never self-declared by the customer.
- **Storage:** non-secret identifiers only. No customer secrets are stored in AXXESS. Sending happens in Triaxis's AWS account through the customer's linked number.

### C. Firing from AXXESS
- **New "Message with agent" button on a lead** (next to "Call with agent").
  - It goes through the existing contactability gate as channels `whatsapp`/`sms`, plus consent and opt-out checks.
  - It then creates an `agent_message_jobs` row and invokes Omnidamus `start_conversation` with `job_id`, `organization_id` and the org's sender identifiers.
  - **Invoke path:** AXXESS on Vercel has no AWS role. So Omnidamus gets an authenticated HTTPS endpoint (Function URL plus admin key, the same pattern as Callismatic's `/api/outbound-calls`). That adds no new AWS credentials to Vercel.
- **"Call with agent":** it passes the org's caller ID and route to Callismatic, which places the call from the customer's identity.
- **Job status:** both buttons show queued, running, done or failed with the result summary. The pattern already exists for calls.

### D. Callismatic and Omnidamus changes
- **Omnidamus:**
  - Accept `job_id`, `organization_id` and per-request sender identifiers.
  - Store `organization_id` on the conversation item and key conversations by `(org, customer phone)`, so two orgs messaging the same person never share a thread.
  - Put `job_id` and the receiving number on `conversation.completed.v1`.
  - Opt-outs (STOP) stay per sending org.
- **Callismatic:**
  - Use the per-request caller ID or route.
  - Carry `organization_id` and `job_id` through.
  - Partition its stores (digest, blocklist, corrections) by org, so one customer's corrections never affect another's.

## Outside the code (HITL)
- **Customer WhatsApp:** each customer links its WhatsApp Business Account to Triaxis's AWS End User Messaging Social. That is Meta's embedded signup in the AWS console, a founder or customer action with Meta business verification.
- **India SMS and calls:** need the customer's own DLT registration (entity, headers, templates). UAE calls need TDRA.
  - Until those are recorded, SMS and calls for that org stay refused by design.
  - WhatsApp is the channel that can go live first.
- **Legal:** sending on a customer's behalf needs terms that cover it (data processor role, the customer is responsible for consent). This needs counsel. Founder-stated policy is assumed until it's signed.

## Delivery (separate PRs per repository, each with the full gates)
1. **AXXESS: routing core.**
   - Migration: `agent_message_jobs`, `org_channel_numbers`, per-org agent settings and registrations.
   - `POST /api/stack/results` with the service credential.
   - Tests:
     - an org can't write into another org through a forged `job_id` or `organization_id`
     - an unknown job is refused
     - a disabled product is refused
2. **STILL:** route job-tagged events to `/api/stack/results`. Tenant-0 events are unchanged. Covered by tests and the weekly stack test.
3. **Omnidamus:** HTTPS start endpoint, org-scoped conversations, per-request sender, `job_id` on events.
   - Tests: the same phone number used by two orgs gets two threads.
4. **Callismatic:** per-request caller ID, org-partitioned stores, `job_id` through.
5. **AXXESS UI:**
   - Integrations "Agents" card and the "Message with agent" button.
   - Per-org registration gate replacing `CURRENT_REGISTRATIONS`.
   - Playwright: an admin configures, a rep fires, the result appears in the right org, and another org sees nothing.
6. **Staging end to end:**
   - Two staging orgs.
   - Org B fires a WhatsApp conversation from the staging test number.
   - The result appears only in org B.
   - The weekly stack test gains a two-org scenario.
7. **Production,** with the founder's explicit go per step:
   - deploy each repository
   - onboard the first customer's WhatsApp number (HITL)
   - closeout doc and readiness matrix

## Done when (checkable)
- On staging, a member of a non-Triaxis org clicks "Message with agent". The WhatsApp conversation is sent from that org's configured number. The completed conversation becomes a task **in that org only**. Triaxis's org gets nothing.
- "Call with agent" for that org passes the org's caller ID to Callismatic, and is refused with `dlt_india` / `tdra_uae` until that org's registration is recorded.
- A forged `organization_id` or a `job_id` from another org is refused (a test plus one live staging request).
- Triaxis's own Tenant-0 flows still pass the weekly stack test 5/5.

## Risks
- **WhatsApp onboarding per customer** depends on Meta business verification. This is the real lead time, not the code.
- **Shared deployments** mean one customer's traffic spike shares Lambda concurrency with others. Per-org rate limits come in the AXXESS gate.
- **AWS cost:** messaging fees are charged to Triaxis's AWS account. Usage needs to be metered per org before billing exists. That is noted here, not built.
