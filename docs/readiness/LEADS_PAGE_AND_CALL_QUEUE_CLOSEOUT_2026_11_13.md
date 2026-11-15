# Leads Page and Daily Call Queue: Closeout (2026-11-13)

GTM plan `GTM_4_DAY_AUTOMATION_PLAN_2026_11_11.md`, Day 3, items 3 and 4. Branch `feat/leads-page-call-queue`.

## External signal

- **Founder goal (2026-11-11):** "deploy the stack in real world today and start calling and messaging", compliantly in India and the UAE.
- **Founder go for Day 3 (2026-11-12):** "Yes, start Day 3", and approval of the Day 3 plan.
- **Gap:** leads appeared only as dashboard counts. Staff had no page to work leads and no list of whom they may call.

## What changed

- **Migration `20261113120000_call_outcomes.sql`:** `contact_attempts` gains `outcome` (connected, no_answer, voicemail, wrong_number, call_back, not_interested, interested) and `note` (at most 500 characters). The table stays append-only: no update or delete policy is added.
- **`src/services/outbound/callQueue.ts`:**
  - `decideCall()` runs a lead through the existing contactability gate with channel `voice_human`. A lead with no phone number is refused as `no_phone_number`.
  - `buildCallQueue()` splits leads into callable (due follow-ups first, then the least recently contacted) and refused (with reasons).
  - `leadChangesForOutcome()`: `interested` moves `new` to `qualifying`; `not_interested` sets status `lost`.
  - `CURRENT_REGISTRATIONS` is all false, the same as the email sender. Until DLT, TDRA and counsel sign-off are recorded, only `opt_in` contacts are callable, as service callbacks.
- **`src/repositories/leadWorkRepository.ts`:** single-lead read, open leads, call context (suppressed numbers and 7-day attempts), recording a call, staff checks, and history (attempts plus `crm_lead` audit rows).
- **Routes** (shared access rules in `src/app/api/crm/leadAccess.ts`; an Employee's request for a lead they don't own answers 404):
  - `PATCH /api/crm/leads/[id]`: stage, status and follow-up for staff. Reassignment is senior-only, and only to an active staff member of the organization. Audited as `crm.lead.updated`.
  - `GET /api/crm/leads/[id]/history`: the lead's history.
  - `POST /api/crm/leads/[id]/calls`: re-checks the gate at that moment. Allowed calls are logged with the outcome. Refused calls are logged as refused and answer 409 with the reasons.
  - `GET /api/crm/call-queue`: today's queue. Senior roles see the organization; an Employee sees their own leads.
  - `GET /api/crm/staff`: assignable staff (ids and names), senior only.
- **`listCrmLeads` and `CrmLead`** now include country, contact email, phone and consent basis. They are still scoped to the owner for Employees.
- **UI:**
  - A new "Leads & Calls" nav item (`/crm/leads`) for staff roles, under Relationships.
  - `src/features/leads/LeadsSection.tsx`:
    - The Leads tab has a stage filter and a lead panel with stage, status, owner (senior only) and history.
    - The Call queue tab has `tel:` links and a log-call form for callable leads, and a list of refused leads with plain-language reasons.
    - In the demo workspace it shows a notice and makes no API calls.

## What did not change

- The contactability rules themselves, and the email sender.
- Reply sorting, WhatsApp, and Claude-written first lines (Day 3 items 1 and 2, Day 2 item 4).
- No cold calling is enabled. Refused leads have no dial link.

## Verification

Run locally on `feat/leads-page-call-queue`:

- `pnpm run typecheck`: exit 0.
- `pnpm --dir apps/mobile run typecheck`: exit 0.
- `pnpm run lint` (`--max-warnings=0`): exit 0.
- `pnpm run supabase:verify`: exit 0. Its output lists a known note about `20260702165736_initial_enterprise_schema.sql` (from July), not the new migration.
- `pnpm run test`: **359 files, 2,159 tests, all passed.** The new tests are:
  - `callQueue.test.ts`: 7 tests
  - `leadWork.routes.test.ts`: 8 tests
  - `LeadsSection.test.tsx`: 4 tests
- `pnpm run build`: exit 0.

The route tests cover:
- an Employee can move their own lead's stage, cannot reassign it, and gets 404 for someone else's lead
- a Manager can reassign only to an active staff member
- the call queue shows an Employee only their own leads
- an opt-in lead is callable at 10:00 IST; a cold B2B lead is refused with `dlt_registration_missing` and `counsel_sign_off_missing`
- an allowed call is logged with its outcome, and an interested lead moves to qualifying
- a refused call is logged as refused and answers 409
- a second call on the same day is refused

## Partial, blocked or unsupported

- **Test-first, partly.** The route tests were written before the routes and first failed because the route modules didn't exist, not on assertions. The service tests were written right after the service.
- **Migration not run on a database.** Local Supabase needs Docker, which does not start on this machine. It is checked only by the static verifier until it's applied to staging or production on the founder's go.
- **Playwright spec added but not run.** `tests/e2e/leads-call-queue.spec.ts` runs only with `E2E_RUN_SEEDED=true` against the seeded Supabase branch. Staging is paused (Supabase Free), so it was not run here.
- **Last-contact time** appears in the call queue, not as a column in the leads table, which the plan had listed.
- **Regulatory rules are not verified by counsel**, as in the gate's closeout.

## Decision ledger

```
Decision: Day 3 starts with the leads page and a gate-checked human call queue, before reply sorting and WhatsApp.
Why: Human calls are the other channel the gate allows today (opt-in contacts only); staff need a list of whom they may call and a place to work leads. At 20 emails a day the founder can read replies by hand.
What changed: Migration for call outcomes; call queue service; five CRM routes; Leads & Calls page.
Architecture boundary: The page only shows server decisions. Every call log re-runs the gate server-side and is written to the append-only contact_attempts table, allowed or refused.
Product boundary: No cold calls until DLT, TDRA and counsel sign-off are recorded; refused leads get reasons, not a dial link.
Verification: See Verification above.
Outcome: Pending: merge, migration on production, and a signed-in smoke test, each on the founder's go.
Follow-up: Reply sorting (Day 3 item 1); WhatsApp on the verified number (Day 3 item 2); recording registrations once DLT, TDRA and counsel clear.
```
