# Agent Call Pipeline: Closeout (2026-11-13), Built and Gated Off

GTM plan `GTM_4_DAY_AUTOMATION_PLAN_2026_11_11.md`, outbound calling. **Status: Partial.** The pipeline is built across AXXESS, Callismatic and STILL, and is off end to end. **No real call can be placed.** That waits on DLT registration, counsel sign-off and an Indian voice provider, which are founder (HITL) actions.

## External signal

- **Founder (2026-11-13), after one-tap logging (#485):**
  - Windows asks the person to press Call a second time, and this "needs to be one step".
  - "Person presses call on AXXESS, call through from one button click, voice agent is integrated, voice agents does the call, AI agent logs the call, sets actionable, follows up/sets demo automatically; with minimal HITL."
  - "We are automation, not CRM not Salesforce."
- **Founder decisions (2026-11-13, AskUserQuestion):**
  - AI call gate: "Register DLT and get counsel first", meaning the gate is not changed.
  - Provider: "Retry CALL-E with a local number".
  - Then "Yes, plan the pipeline". The plan was approved in plan mode (`i-need-to-log-eager-donut.md`), followed by "Yes, merge #487".

## What research found (read-only)

**CALL-E (docs.heycall-e.com/regions, read 2026-11-13):**
- It lists India only as International tier, "intended primarily for development and call testing".
- It lists no Indian local numbers.
- Callismatic's README records a real India call through CALL-E that was dialled and never rang.
- So the founder's provider choice can't place a real Indian call as things stand. A "SIP integration" is mentioned for unlisted regions, but no CALL-E SIP documentation was found. **Unverified.**

**India rules:** from vendor and law-firm sources, not TRAI's own text, so **unverified until counsel reviews them**.
- Promotional voice calls go out from 140-series numbers, under a DLT-registered company with the calling platform linked to it.
- TRAI amended the TCCCPR telemarketing rules in February 2025.
- AI-voice disclosure rules are reported as still in draft.

**AXXESS gate:** `checkContactability` (`src/compliance/contactability.ts`) already refuses `voice_ai` for every contact until `dltIndia` (or `tdraUae`) and `counselSignedOff` are recorded. That's unchanged.

## What changed

**AXXESS, [#487](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/487), merged as `0dcc5578`:**
- **Migration `20261115120000_agent_call_jobs.sql`:**
  - one row per "Call with agent" request: status, outcome, summary, action items and failure reason
  - service-role writes only
  - read policy as on `contact_attempts`
  - no transcript and no phone number stored
- **`callQueue.ts`:**
  - `decideCall` takes a `channel`
  - each callable lead carries `agentCall` (the `voice_ai` decision)
  - `buildCallQueue` takes the voice-agent suppressions
- **`leadWorkRepository.ts`:** suppressions are read per channel, and `recordCall` takes a channel.
- **`POST`/`GET /api/crm/leads/[id]/agent-calls`:**
  - the gate runs with `voice_ai`
  - a refusal is logged and returns 409
  - 503 when Callismatic isn't configured
  - 502 when Callismatic refuses (the job is marked failed and no attempt is logged)
  - 202 when accepted (an allowed `voice_ai` attempt is logged)
- **`callismaticClient.ts`:** uses `CALLISMATIC_URL` and `CALLISMATIC_API_KEY`, which are server-only and not set.
- **MCP tool `log_agent_call`:**
  - `auto`, opt-in capability, idempotent on the job id
  - records the result and applies `leadChangesForOutcome` and the follow-up date
  - creates a follow-up task
  - on opt-out, adds `voice_human` and `voice_ai` suppressions
  - withheld from the in-app chatbot (`chatbotAgentScope.ts`)
- **Call queue route:** attaches each lead's latest agent job. If that table can't be read, it logs the error and still returns the human queue, because the migration is applied by hand.
- **UI:** a **Call with agent** button on each Call queue card. Today it's disabled with "Agent calls are off: India DLT registration not recorded; counsel sign-off not recorded".

**Callismatic, [axxess-triaxis/callismatic#15](https://github.com/axxess-triaxis/callismatic/pull/15), merged as `0f83ab3`. Not deployed.**
- **`outbound.py`:**
  - the call task: AI disclosure first, up to three demo slots from Google Calendar, opt-out honoured, no prices or commitments
  - a Bedrock `CallReport` (outcome, summary, action items, accepted slot, follow-up, opt-out)
  - the `call.completed.v1` event, with no transcript or phone number
  - an async Lambda self-invoke to run the call
- **`POST /api/outbound-calls`** (admin key):
  - 503 unless `OUTBOUND_AGENT_CALLS_ENABLED=true`
  - 409 `provider_unavailable`, because `OUTBOUND_PROVIDERS_BY_COUNTRY_CODE` is empty and there is never a CALL-E fallback
- **Staging template:** fake provider only, 600 s timeout, self-invoke permission.

**STILL, [axxess-triaxis/STILL#9](https://github.com/axxess-triaxis/STILL/pull/9), merged as `52187c1`. Not deployed.**
- strict schema `triaxis.callismatic/call.completed.v1`
- `AxxessAgentCallRule` with retry and a DLQ
- adapter: `log_agent_call`, then `create_meeting` only for an accepted slot without opt-out. `create_meeting` is critical in AXXESS, so the demo waits for one approval: the only human step.

## What did not change

- The contactability gate's rules, and `CURRENT_REGISTRATIONS` (DLT, TDRA and counsel are all still false).
- Production configuration in Callismatic and STILL: no deploy, no IAM change, no enable flag, no provider.
- The human call queue and one-tap logging (#485).

## What was verified

**AXXESS, local:**
| Check | Result |
|---|---|
| `pnpm run typecheck` | exit 0 |
| `pnpm --dir apps/mobile run typecheck` | exit 0 |
| `pnpm run lint` | exit 0 |
| `pnpm run build` | exit 0 |
| `pnpm run supabase:verify` | exit 0. 56 migrations, 121/121 tables RLS-protected, one known warning in the initial schema. |
| `pnpm run test` | **exit 1:** 11 Vitest worker errors (359 workers spawned, 3277 s), while the machine also ran other test suites. Not a clean signal either way. |

**AXXESS, focused:**
- 447 tests passed across agents, security, MCP, CRM routes and outbound services.
- After that run, the queue fallback added 1 more CRM route test, and the leads UI and log_agent_call tool tests are 17/17 and 8/8.

**AXXESS, CI on #487 (head `41cbdc9`):** every check passed.
- Build, Lint, Type Check; playwright; validate; mobile-validate; mobile-screenshots
- Supabase CLI And Migration Static Verify; rls-artifact-check; Required RAG Release Gate
- CodeQL; Secret Scan; dependency-review; the critical-vulnerability gate
- the Pilot Acceptance Gate; the Store Listing gate; the Vercel previews
- Skipped: android-preview, ios-preview, Supabase Preview, Manual Local Supabase Migration Drill.

**Callismatic:** `PYTHONPATH=src python -m pytest -q` gives 181 passed (15 new).

**STILL:** `.venv` pytest gives 77 passed (70 existing + 7 new).

**Production deploy:**
- `deploy-production.yml` run 43465784035 for `0dcc5578`: landing, investor and lite all succeeded.
- Unauthenticated probes return 401 for `GET /api/crm/call-queue` and for `POST /api/crm/leads/{id}/agent-calls`, so the new route is live and auth-gated.
- **The disabled button was not checked by the agent.** Seeing it needs a signed-in session, so it needs the founder to look.

**End to end on staging with the fake provider:** **not run.** It needs the Callismatic and STILL staging deploys, which wait for the founder's go.

## What remains partial or blocked

1. **Apply the migration: done (2026-11-14), founder-reported.**
   - The local checkout is linked to staging, so nothing was pushed from here. The founder ran `20261115120000_agent_call_jobs.sql` in the Supabase SQL editor for production (`vnliomnfabaicvvvfwia`).
   - The founder ran the check query below and reported `jobs = 0, rls_on = true`. **Founder-stated, source artifact needed:** a screenshot of the result.
     ```sql
     select count(*) as jobs, (select relrowsecurity from pg_class where relname = 'agent_call_jobs') as rls_on from public.agent_call_jobs;
     ```
   - The agent couldn't confirm it independently. It has no production database credentials. The Vercel Hobby plan keeps only 30 minutes of logs, and no `/api/crm/*` request appeared between 02:37 and 03:07 UTC on 2026-11-14.
2. **Grant the capability:** grant the opt-in `log_agent_call` capability to the AXXESS agent connection STILL uses.
3. **Deploy:** STILL (SAM), then Callismatic (image).
   - Callismatic production also needs `lambda:InvokeFunction` on itself and a longer timeout.
   - Set `CALLISMATIC_URL` and `CALLISMATIC_API_KEY` in Vercel. Values are pasted by the founder and never pass through chat.
4. **Call script:** the founder reviews the script in `outbound.build_task` before anything is enabled.
5. **Before any real call (blocked):** DLT registration, counsel sign-off, and a DLT-registered Indian voice provider registered in `OUTBOUND_PROVIDERS_BY_COUNTRY_CODE[91]`. Then the registrations are flipped in a small follow-up PR.

## Decision ledger

```
Decision: Build the one-click voice-agent pipeline now, gated off, instead of changing the compliance gate or calling through CALL-E's international pool.
Why: Founder wants one-click AI calling with logging and demo booking ("automation, not CRM"); founder chose to keep AI calls gated until DLT and counsel sign-off; CALL-E's India route is development-only and a past India call never rang.
What changed: AXXESS #487 (agent_call_jobs, agent-calls route, log_agent_call tool, Call with agent button), Callismatic #15 (outbound endpoint, off, no provider), STILL #9 (call.completed.v1 routing).
Architecture boundary: AXXESS decides (gate, voice_ai) and records; Callismatic places calls only through a registered lead-call provider; STILL carries results as MCP tool calls. No transcript or phone number crosses the bus.
Product boundary: One human approval remains, for the demo meeting (create_meeting is critical). No unattended batch dialling. No real call until DLT, counsel and a provider exist.
Verification: AXXESS CI all green on 41cbdc9; Callismatic 181 tests; STILL 77 tests; local AXXESS typecheck, lint, build and supabase:verify pass; local full test run inconclusive (worker errors under load).
Outcome: Partial. Production shows a disabled Call with agent button with the reason; no call path is live.
Follow-up: Migration applied 2026-11-14 (founder-reported: jobs = 0, rls_on = true). Remaining: capability grant, STILL and Callismatic deploys, Vercel env, script review; then DLT, counsel and an Indian provider.
```
