# Outreach Funnel and Safe Send Ramp: Closeout (2026-11-14)

GTM plan `GTM_4_DAY_AUTOMATION_PLAN_2026_11_11.md`, Day 4, items 1 and 2. Branch `feat/gtm-funnel-ramp`.

## External signal

- **Founder goal (2026-11-11):** aggressive, compliant GTM in India and the UAE toward a USD 1M ARR target (Founder-stated, source artifact needed).
- **Founder choice (2026-11-13):** "Funnel + safe ramp" as the next GTM step. The plan was approved in plan mode.
- **Gaps:**
  - There was no single view of what outreach produces.
  - Daily volume was a fixed number, with nothing enforcing the plan's rule: "raise volume only while bounces stay under 2% and complaints under 0.1%".

## What changed

- **Migration `20261114120000_outreach_email_events.sql`:** a new append-only table, `outreach_email_events`. It holds delivered, bounced and complained events, with one row per message and type. Senior members can read it; only the server writes. `contact_attempts` is unchanged.
- **Resend webhook:** for outreach messages, `email.delivered`, `email.bounced` and `email.complained` are now recorded in that table. Bounce and complaint suppression work exactly as before, and other events are acknowledged and ignored.
- **`src/services/outbound/sendRamp.ts`**, a pure rule:
  - Under 50 sends in 7 days: up to 20 a day, the warm-up rate, with no pausing.
  - Pause (budget 0): when the 7-day complaint rate reaches 0.1% or the bounce rate reaches 2%. Sending resumes by itself once the rate drops.
  - Otherwise: up to 1.5 times the busiest day of the last 7, never below 20 and never above `OUTREACH_DAILY_SEND_BUDGET`. That setting is now the ceiling, at most 200.
- **The outreach tick:** it loads 7-day health from real rows (`loadSendHealth`) and sends at most the ramp's budget. When paused, it doesn't run at all. The JSON response now includes `budget` and `reason`, so the GitHub Action log shows every pause.
- **`GET /api/crm/funnel?days=N`** (senior roles only; days are clamped to 1 to 365). It returns:
  - activity counts over the window: leads added, emails sent, delivered, bounced, complained, and replies by category
  - the pipeline now: open leads by stage, won and lost
  - the table behind each count
  - `notTracked: meetings, trials, paid`
  - the same ramp decision the sender uses
- **A Funnel tab on Leads & Calls**, for senior roles only:
  - the ramp status, as a red banner when paused
  - activity with percentages of emails sent
  - the pipeline now
  - "Not tracked yet" for meetings, trials and paid

## What did not change

- The contactability gate, the sequences and the email content.
- Reply sorting.
- Employees see no Funnel tab, and the API refuses them.
- **Correction to the plan:** the plan said budget deferrals add a log row per lead per tick. They don't: the planner already skips silently once the budget is used up. Nothing was changed for this.

## Verification

Run locally on `feat/gtm-funnel-ramp`:

- `pnpm run typecheck`: exit 0.
- `pnpm --dir apps/mobile run typecheck`: exit 0.
- `pnpm run lint` (`--max-warnings=0`): exit 0.
- `pnpm run supabase:verify`: exit 0. The only note is the known July one on `20260702165736_initial_enterprise_schema.sql`.
- `pnpm run test`: **365 files, 2,194 tests, all passed**, with no errors, in 417 s. A first run is not counted: the laptop slept partway through (31,801 s), and 19 test files hit "Timeout waiting for worker to respond", though all 346 files that did run passed.
- `pnpm run build`: exit 0.

New and changed tests:
- `sendRamp.test.ts` (6, written before the module and run failing first): warm-up, the ceiling, the ramp, a 2% bounce pause and staying under it, a 0.1% complaint pause and staying under it, and a bad ceiling.
- `resend-webhook/route.test.ts` (+1, 1 changed): delivered, bounced and complained events are recorded, and only bounces and complaints add suppressions. An unknown event or a non-outreach message records nothing.
- `outreach/tick/route.test.ts` (1 changed, +1): the ramp budget is capped by the ceiling and returned with its reason. A pause returns budget 0 without running the tick.
- `crm/funnel/route.test.ts` (3): 401 without a session, 403 for an Employee; a Manager gets the funnel, `notTracked` and the ramp; the window is clamped and a pause is reported.
- `LeadsSection.test.tsx` (+2): a Manager sees the Funnel tab, the paused banner, a delivered percentage and "Not tracked yet". An Employee gets no tab and no funnel request.
- `tests/e2e/leads-call-queue.spec.ts` (+1 test, +1 assertion): runs only with `E2E_RUN_SEEDED`, so it was not run here.

## Partial, blocked or unsupported

- **Delivered stays 0 until the founder adds `email.delivered` to the Resend webhook.** Bounce and complaint events already flow, because the webhook already has those events.
- **The 7-day rates count only events recorded from now on.** Bounces before this deploy are suppressions only, with no per-message row, so they don't count toward the rate.
- **Meetings, trials and paid are not linked to leads anywhere**, so the funnel reports them as not tracked. Revenue is reported only from billing records, and none exist yet.
- **The migration has not been run on a database** (no Docker on this machine). It's checked by the static verifier only.
- **Counts use row reads capped at 20,000 per query.** That's fine at today's volume (tens of emails), but needs real count queries before tens of thousands of sends.

## Decision ledger

```
Decision: Daily email volume is set by a rule on real 7-day bounce and complaint rates, not a fixed number; the funnel counts only named tables and says "not tracked" where no rows exist.
Why: The GTM plan's own limits (bounces under 2%, complaints under 0.1%) were not enforced, and a bad list could damage the new sending domain; the USD 1M ARR target needs a funnel from facts.
What changed: outreach_email_events table and webhook recording; sendRamp rule; tick uses the ramp; /api/crm/funnel; Funnel tab.
Architecture boundary: The ramp rule is pure and shared by the sender and the page, so the page shows exactly what the sender will do. Events are append-only and written by the signed webhook only.
Product boundary: Sending pauses by itself on bad rates and resumes by itself when they recover; the founder's ceiling is never exceeded. No estimated numbers anywhere.
Verification: See Verification above.
Outcome: Pending: merge, the migration on production, email.delivered in Resend, each on the founder's go.
Follow-up: Link meetings and billing to leads so the funnel can track meetings, trials and paid; WhatsApp on the verified number; Claude first lines once counsel clears sending text to Anthropic.
```
