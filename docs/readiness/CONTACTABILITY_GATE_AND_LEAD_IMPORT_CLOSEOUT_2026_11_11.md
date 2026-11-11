# Contactability Gate and Lead Import: Closeout (2026-11-11)

**Status: `Code complete`, branch `feat/contactability-gate`. Not merged, not deployed, and the migration has not been applied to staging or production.** Results come from unit and route tests with mocks, and a static migration check. Nothing here has run against a real database.

Plan: `GTM_4_DAY_AUTOMATION_PLAN_2026_11_11.md`, Day 1 items 1 and 5.

## External signal

Founder, 2026-11-11: outbound in India and the UAE "within regulatory boundary", then "Draft a plan to go full scale automated GTM in next 3-4 days", approved with "Approve, start Day 1".

## What changed

- **`src/compliance/contactability.ts`:** `checkContactability()`, a pure function that returns allowed or refused with reasons. It refuses:
  - a suppressed contact (any channel)
  - no consent or lawful basis
  - a country other than IN or AE
  - WhatsApp without opt-in
  - SMS, AI voice, or a cold human call before DLT (India) or TDRA (UAE) registration and counsel sign-off
  - a DND or DNCR listed number, or a scrub older than 30 days, for calls and SMS unless opted in
  - calls and SMS outside 09:00-21:00 IST (India) or 09:00-18:00 Gulf time (UAE)
  - more than 1 attempt a day or 3 a week on the same channel

  A human callback to someone who opted in is allowed without registration.
- **`src/services/outbound/leadImport.ts`:** RFC 4180 CSV parser and `parseLeadImport()`. Requires the columns `company, contact_name, email, phone, country, consent_basis, source`. Normalises email to lower case and phone to E.164. Rejects by line: invalid consent basis, missing source or company, unconfigured country, no contact detail, invalid email or phone, suppressed, already a lead, duplicate in file. Limit 2,000 rows.
- **`src/repositories/outboundRepository.ts`:** `loadImportContext()` reads suppressions and existing lead contacts (paged by 1,000); `insertImportedLeads()` bulk-inserts owned by the importing user.
- **`POST /api/crm/leads/import`:** senior roles only (`crm.create` and `canReadAllLeads`). Employees get 403 and a denied-attempt audit row. Writes a `crm.leads.imported` audit row with counts only, no contact data.
- **Migration `20261111120000_outbound_contactability.sql`:**
  - `crm_leads`: `country`, `contact_email`, `contact_phone_e164`, `consent_basis`, `consent_source`, `consent_recorded_at`, `registry_status` (default `unchecked`), `registry_checked_at`
  - `contact_suppressions`: any staff member may add, only senior members may delete
  - `contact_attempts`: append-only (no update or delete policy); staff insert their own, senior read all
  - No backfill. Existing leads have no consent basis, so the gate refuses them until one is recorded.

## What did not change

- No sending. The gate is not yet called by any send path; email sequences are Day 2.
- No UI. The import is API only.
- `listCrmLeads` and the existing lead routes do not return the new contact fields.

## Verification

- `npx vitest run src/compliance/contactability.test.ts src/services/outbound src/app/api/crm/leads/import`: 22 passed (12 gate, 6 import parser, 4 route).
- Full suite, first run (gate only, before the import files): `pnpm run test` 344 files and 2,071 tests passed; `pnpm --dir apps/mobile run typecheck` exit 0; `pnpm run build` compiled successfully.
- Full suite, second run with every file: `pnpm run typecheck`, `pnpm run lint` (zero warnings), mobile typecheck and `pnpm run build` all exit 0. `pnpm run test` crashed once with a segfault, then on rerun reported 332 files and 2,026 tests passed, 0 failed, but exit 1 because 14 files never started (`[vitest-pool]: Timeout starting threads runner`, machine load). PR CI is the clean full-suite run.
- `pnpm run supabase:verify`: status passed, 51 migrations, one pre-existing warning (`20260702165736_initial_enterprise_schema.sql` permissive `using (true)`).

## Partial, blocked or unsupported

- **Test-first, partly.** The gate and parser tests were written first, but their first run failed on missing dependencies and a missing module, not on assertions. The route test was written alongside the route.
- **Migration not run on a database.** Local Supabase needs Docker, which does not start on this machine. The RLS policies are checked only by the static verifier.
- **Regulatory rules not verified by counsel.** Hours, caps and the 30-day scrub age are this program's reading of TCCCPR 2018 and the TDRA rules.
- **Registry scrubbing is not automated.** `registry_status` must be set from an NCPR or DNCR check; no integration exists.

## Decision ledger

```
Decision: Build one server-side contactability gate and a consent-required lead import before any outbound sending.
Why: Founder wants automated outbound in India and the UAE within the rules; every send must be refusable and logged.
What changed: Gate function, CSV import route, outbound repository, migration (lead consent fields, suppression list, attempt log).
Architecture boundary: Pure decision function; callers load inputs and log the decision. Service-role writes scoped by session organization.
Product boundary: No sending, no UI, no registry integration yet.
Verification: See "Verification".
Outcome: Code complete; not applied or deployed.
Follow-up: Apply migration with #456/#457 migrations; Day 2 wires the gate into email sequences.
```
