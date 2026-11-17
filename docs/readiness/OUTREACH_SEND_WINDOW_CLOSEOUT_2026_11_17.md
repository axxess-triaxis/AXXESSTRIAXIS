# Outreach Business-Hours Send Window: Closeout

**Date:** 2026-11-17
**Branch:** `feat/outreach-send-window`, cut from `origin/main` at `c4d8bbe4`

## Planning provenance

- **Founder requests, 2026-11-17:**
  - "What to build now?" The answer recommended a send window.
  - "Plan the business-hours send window." The plan was approved in session.
- **Product evidence:**
  - Outreach tick logs (GitHub Actions workflow `outreach-tick.yml`) show sends at 16:04 UTC on 2026-11-16 (21:34 IST) and 04:20 UTC.
  - The 30 leads enrolled on 2026-11-17 (crawl batches 4 and 5) were due to start at about 16:05 UTC (21:35 IST, 20:05 GST).
  - The sender had no time-of-day rule for email.

## Evidence chain

- **External signal:** cold emails were landing in the evening, local time.
- **Decision:** send email only inside the lead's local business hours.
- **Shipped artifact:** this branch.
- **Verification:** see below.
- **Current status:** PR #527 open. Not merged and not deployed.

## What changed

- **`src/services/outbound/sequencePlanner.ts`**
  - `EMAIL_SEND_WINDOWS`:
    - IN: Asia/Kolkata, 09:00 to 18:00, Monday to Saturday
    - AE: Asia/Dubai, 09:00 to 18:00, Monday to Friday
  - `isWithinEmailWindow(country, now)`.
  - A new `wait` action, returned for an email the contactability gate allows but that falls outside the window. The window is checked after the gate and before the budget.
- **`src/services/outbound/outreachTick.ts`**
  - `wait` actions write nothing: no `contact_attempts` row, no enrollment update, no send.
  - The summary gains `outsideWindow`, so the tick JSON in the Actions log explains a run that sent 0.
- **`src/compliance/contactability.ts`**
  - Exports `localTimeParts` (local hour and weekday).
  - `localHour` now wraps it. Calling-hours behaviour is unchanged.
- **Tests**
  - 6 planner cases:
    - India hours
    - UAE hours
    - India Saturday and Sunday
    - UAE Friday, Saturday and Sunday
    - a waiting lead uses no budget
    - permanent refusals still stop outside hours
  - 1 tick case: an evening run sends 0, writes nothing, and reports `outsideWindow: 1`.
  - 4 existing tick assertions now include `outsideWindow: 0`.

## What did not change

- The contactability gate.
- Calling hours for voice and SMS.
- The ramp, daily budget, follow-up spacing (`advanceEnrollment`) and the tick schedule.
- Countries outside the table are not restricted by the window. Contactability already stops them as `country_not_configured`.

## Verification

Run on 2026-11-17 in `C:\Users\Sudipta Sarmah\wt\axxess-send-window`:

- **Targeted:** `pnpm exec vitest run --config vitest.config.mjs src/services/outbound src/compliance src/app/api/outreach`: 18 files, 108 tests passed.
- **`pnpm run typecheck`:** exit 0.
- **`pnpm --dir apps/mobile run typecheck`:** exit 0.
- **`pnpm run lint`** (`--max-warnings=0`): exit 0.
- **`pnpm run supabase:verify`:** exit 0. The one warning is the existing one on `20260702165736_initial_enterprise_schema.sql`.
- **`pnpm run test`:** 378 files, 2310 tests passed, exit 0.
- **`pnpm run build`:**
  - First attempt: exit 1, a Next.js `SecurityFatalError` notice.
  - Unchanged retry: exit 0.
  - Cause: `pnpm-lock.yaml` on `main` resolves `next` 16.4.2, while `package.json` asks for `^16.4.5`. This is a pre-existing lockfile issue, not part of this change. A separate fix is needed to bring the lockfile up to a patched Next.js.

## Still partial or unverified

- Not merged or deployed. Merge and deploy need the founder's explicit go.
- Live behaviour is unverified until deploy. After deploy:
  - evening tick logs should show `sent:0` with `outsideWindow` above 0
  - the first tick after 03:30 UTC (09:00 IST) or 05:00 UTC (09:00 GST) should send
- Effect on replies is not measured. It will be reviewed by 2026-12-01 in `DECISION_OUTCOME_LEDGER.md`.

## Decision ledger

```
Decision: Email sends only 09:00-18:00 local time (India Mon-Sat, UAE Mon-Fri); out-of-window
  enrollments wait with no audit row and no budget used.
Why: The sender had no time-of-day rule and was sending at 21:30 IST.
What changed: see "What changed".
Architecture boundary: the rule lives in the pure planner; the tick only counts waits.
Product boundary: no change to who is contacted or how often; only when.
Verification: see "Verification".
Outcome: code complete and gated; not deployed.
Follow-up: founder go to merge and deploy; check the first evening and morning ticks; fix the
  Next.js lockfile pin separately.
```
