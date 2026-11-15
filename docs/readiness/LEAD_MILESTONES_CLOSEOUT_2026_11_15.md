# Meetings and Trials on Leads: Closeout (2026-11-15)

**Status: `Blocked` (code and tests pass locally; not merged, migration not applied, not deployed).**

## External signal

- The follow-up in `GTM_FUNNEL_AND_SEND_RAMP_CLOSEOUT_2026_11_14.md` reads: "Link meetings and billing to leads so the funnel can track meetings, trials and paid".
- Founder, 2026-11-15, choosing the next GTM step: "Track meetings (Recommended)". Then, on the plan: "Approve, build it".
- Context: 24 cold leads are enrolled in missed-calls sequence `b7337456…`, and no lead has replied yet. This is built before the first interested reply arrives.

## What changed

- **`supabase/migrations/20261115140000_lead_milestones.sql`:** a new table, `lead_milestones`.
  - Columns: `kind`, `occurred_at`, `note` (at most 500 characters) and `recorded_by`, plus the lead and organization.
  - `kind` is one of `meeting_booked`, `meeting_held`, `trial_started`.
  - Append-only; only the server writes.
  - RLS on: senior members read every row; staff read rows on leads they own. This is the same pattern as `lead_replies`.
- **`src/services/outbound/leadMilestones.ts`:** the pure rules.
  - Input validation: the kind must be known; `occurredAt` must be an ISO date at most 1 day ahead and defaults to now; the note is trimmed.
  - Stage changes: a meeting moves a `new` lead to `qualifying`; a trial moves a `new` or `qualifying` lead to `proposal`. Won and lost leads, and leads further on, are left as they are.
- **`POST /api/crm/leads/[id]/milestones`:** staff log a milestone only on leads they can see (`requireCrmAccess` and `loadVisibleLead`), the same rule as logging a call. Each log:
  - records the milestone;
  - **stops the lead's active outreach enrollments** (reason `milestone_<kind>`), so no more cold emails go to someone who has engaged;
  - applies the stage change;
  - writes an audit row, `crm.lead.milestone_recorded`.
- **`src/repositories/leadWorkRepository.ts`:**
  - `recordMilestone`.
  - The lead history now includes milestones.
  - The history leaves out `crm.lead.milestone_recorded` audit rows, so each milestone appears once.
- **`src/repositories/funnelRepository.ts`:**
  - Adds `meetingsBooked`, `meetingsHeld` and `trialsStarted`, counted by `occurred_at` within the window.
  - `notTracked` is now `["paid"]`.
- **UI:**
  - `LeadsSection.tsx`: a "Log a meeting or trial" form in the lead panel, and milestone lines in the history.
  - `FunnelPanel.tsx`: rows for meetings booked, meetings held and trials started, and "Paid: Not tracked yet (needs billing records)".
- **Tests:**
  - `leadMilestones.test.ts`, 4 tests: the rules.
  - `leadMilestones.repository.test.ts`, 3 tests: the write, the history, and the funnel counts with the org filter.
  - `leadWork.routes.test.ts`, 4 new: 401, 403, 404, validation, side effects and audit.
  - `LeadsSection.test.tsx`, 2 new plus the funnel assertions updated.
  - `funnel/route.test.ts`: updated.
  - `tests/e2e/leads-call-queue.spec.ts`: checks the funnel rows, and that the milestone route answers 400 for a bad kind and 403 for a guest.

## What did not change

- **Paid and revenue:** reported only from billing records, and none exist.
- **Calendar integration:** none; meetings are logged by hand.
- **Editing or deleting milestones:** not possible; the table is append-only.
- **Rest of the outreach:** the tick, sequences, gate and reply sorting are untouched.

## Verification (local, branch `feat/lead-milestones`)

| Command | Result |
|---|---|
| `pnpm run typecheck` | exit 0 |
| `pnpm --dir apps/mobile run typecheck` | exit 0 |
| `pnpm run lint` (`--max-warnings=0`) | exit 0 |
| `pnpm run test` | 374 files, 2,261 of 2,261 tests passed |
| `pnpm run build` | exit 0 |
| `pnpm run supabase:verify` | passed: 57 migrations, 122 tables, all 122 RLS-protected |
| `pnpm exec playwright test tests/e2e/leads-call-queue.spec.ts --list` | 3 tests parse |

**Not verified:**
- **The Playwright run:** the spec needs `E2E_RUN_SEEDED=true` against a seeded Supabase, which this machine can't run (no Docker), so the tests were listed, not run.
- **The migration on a real database:** it is checked by the static verifier only.

## Partial, blocked or unsupported

- **Founder (HITL):** apply `20261115140000_lead_milestones.sql` to production **before** the deploy. Without the table, the funnel route fails, because it now reads `lead_milestones`.
- **Merge and deploy:** need the founder's go.
- **After the deploy:** log one milestone on a test lead in production, confirm `/api/crm/funnel` counts it, then mark that test lead lost.

## Decision ledger

```
Decision: Track meetings booked, meetings held and trials started as append-only lead milestones; paid stays untracked.
Why: The funnel reported meetings and trials as not tracked; the founder picked this as the next unblocked GTM step.
What changed: lead_milestones table, POST /api/crm/leads/[id]/milestones, funnel counts, leads page form and history.
Architecture boundary: Server-only writes through the service role; RLS read-only; same access rule as logging a call.
Product boundary: Manual logging only; no calendar sync; no revenue until billing records exist.
Verification: Full local suite green (2,261 tests); Playwright listed but not run (needs a seeded Supabase).
Outcome: Blocked on the migration being applied and the founder's go to merge and deploy.
Follow-up: Apply the migration, merge, deploy, then do the production check with a test lead.
```
