# Imprints Production Tenant Recovery -- Incident Record

Date discovered: 2026-08-12
Related: `docs/readiness/ORGANIZATION_HARD_DELETE_TRIGGER_FIX_2026_08_12.md` (Section 7 -- discovered
during that fix's Phase 6 verification, unrelated in cause), `docs/audit/FOUNDER_QUESTIONS.md` Q-004,
`docs/LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md` (source of the customer's
real business context, used in recovery), `docs/readiness/TWO_TENANT_ISOLATION_HARNESS_EXECUTION_2026_08_06.md`
(the earlier incident this one is most plausibly traced to -- see Root Cause Hypothesis below).

**Status: recovered. Real customer auth identity reconnected to a functioning tenant, verified by
direct SQL query. Not a byte-exact restore -- no backup exists on this Free-tier project -- but a
real, working account, not a placeholder.**

## Discovery

While executing Phase 6 verification of the organization hard-delete trigger fix (see the related
doc), the standing checklist item "confirm existing production tenants are untouched" was run as a
simple count query:

```sql
select count(*) from public.organizations
where slug not like 'qa-isolation-%' and slug not like 'diagnostic-rollback-test-%';
```

Result: **3**. The founder's own expectation, stated directly in this session: **5** real tenants
should exist. A full listing was pulled:

```sql
select id, name, slug, sector, created_at from public.organizations
where slug not like 'qa-isolation-%' and slug not like 'diagnostic-rollback-test-%'
order by created_at asc;
```

Three rows returned: **Triaxis Ventures Private Limited**, **The North Eastern Policy, Development
and Strat[egy]** (name truncated in the UI view, not verified in full), **Ekora Hive**.

The founder identified the two missing by name: **"Triaxis admin - triaxisgrp@[REDACTED -- internal
admin alias, masked per this repo's standing PII policy]"** and **"Imprints Production."** Direct follow-up resolved the first as a non-issue -- the founder
confirmed it was a redundant/duplicate entry, not an expected-to-exist tenant (Tenant 0, "Triaxis
Ventures Private Limited," was already present in the 3-row list). **"Imprints Production" was
confirmed by the founder as a real signup they had personally seen functioning in the live app** --
not merely an LOI/expression-of-interest that never converted (the founder was asked this directly
and distinguished it explicitly from that possibility).

## Investigation

**Step 1 -- confirm the underlying identity is real, not a name-matching error.** Searched Supabase
Auth for the account:

```json
{
  "id": "9adcaff6-74bb-48c7-8ade-43862ecac30a",
  "email": "imprintsprod@[REDACTED -- PII, matches this repo's standing masking policy]",
  "created_at": "2026-07-29 06:07:26.771473+00",
  "confirmed_at": "2026-07-29 06:07:46.118689+00",
  "last_sign_in_at": "2026-08-04 05:38:23.126444+00",
  "raw_user_meta_data": { "display_name": "Imprints", "email_verified": true },
  "providers": ["email"]
}
```

Real, pre-existing account -- created 2026-07-29, last signed in 2026-08-04 (8 days before this
discovery), display name "Imprints" set via the app's own signup flow, not fabricated.

**Step 2 -- trace what happened to this account's organization linkage.** Three targeted, read-only
queries against this exact user ID:

```sql
select id, email, display_name, created_at from public.profiles
where id = '9adcaff6-74bb-48c7-8ade-43862ecac30a';
-- 0 rows

select om.organization_id, om.status, om.created_at from public.organization_members om
where om.user_id = '9adcaff6-74bb-48c7-8ade-43862ecac30a';
-- 0 rows

select id, organization_id, email, role, status from public.users
where id = '9adcaff6-74bb-48c7-8ade-43862ecac30a';
-- 0 rows
```

**Finding: the `auth.users` row survives; `profiles`, `organization_members`, and `public.users` do
not.** `public.profiles.id` references `auth.users(id) ON DELETE CASCADE` -- if the auth account had
been deleted, the profile would be gone *because* the auth row is gone. Since the auth row is
present but the profile is not, the profile was removed independently, by a direct action, not a
cascade from the auth layer.

**Step 3 -- rule out this session's own actions.** Every `DELETE` statement run against
`organizations` or related tables in this session (both for the trigger-fix testing and the
subsequent orphan cleanup) targeted an exact UUID pulled from a list reviewed immediately
beforehand -- never a broad pattern that could have matched a real organization. The full list of
UUIDs deleted this session (`qa-isolation-*`/`diagnostic-rollback-test-*` only): `5f9edab7-...`,
`6771a06e-...`, `63b1eb76-...`, `d2b3185b-...`, `07338ead-...`, `fcd09da2-...` (organizations), plus
4 matching auth users by `%@axxess-test.invalid` email pattern, plus 2 organizations
(`275dbc9a-...`, `ddd20f11-...`) removed automatically by the isolation harness's own successful
cleanup. None reference "Imprints" by name, slug, or any field.

**Step 4 -- check Supabase's own infrastructure logs.** Exported and read in full (1396 lines). Log
retention on this Free-tier project covers only **2026-08-12 13:36:46 through 16:36:53** -- roughly
3 hours, entirely within this session. No entry anywhere in the file references `organizations`,
`DELETE`, or "Imprints" by name. This is inconclusive both ways: the log does not capture routine
successful `DELETE` calls made through the REST API at all (Supabase does not log successful DML at
this level by default -- only errors, checkpoints, and explicit dashboard-run SQL statements are
captured), so its absence from the log proves nothing either way, and the retention window is far
too short to reach back to whenever this actually happened.

## Root Cause Hypothesis (stated as a hypothesis, not a confirmed fact)

The most plausible explanation, given the evidence: this dates to **2026-08-06**, the first time
this same isolation harness was ever run against production
(`docs/readiness/TWO_TENANT_ISOLATION_HARNESS_EXECUTION_2026_08_06.md`). That incident also required
a manual cleanup after the harness's own cleanup step failed -- but that cleanup script was written
ad hoc in that earlier session, explicitly **never committed to this repository, and deleted after
use** (stated directly in that doc: "The one-off script was written to a scratchpad path outside the
repository and deleted immediately after use -- not committed"). This means there is no way to audit
today exactly what matching criteria that script used to identify "the test rows" it was cleaning
up. If that matching was less precise than today's exact-UUID approach -- for example, matching by a
creation-timestamp window rather than by the specific test-run's own IDs -- it is plausible it swept
up a real organization created or modified around the same time.

**This is not proven.** No log evidence reaches back to 2026-08-06 to confirm or refute it. It is
the most consistent explanation available, not a verified fact, and is recorded here as such per
this repository's evidence-chain discipline (do not present a hypothesis as a finding).

## Recovery

**No backup or Point-in-Time Recovery is available** -- confirmed directly in the Supabase Dashboard
(Database > Backups: "Backups not available for Supabase Free"). A byte-exact restore to the moment
of deletion is not possible on this project tier. Per explicit founder direction -- primary
preference "restore to state it existed till the moment it was deleted," with an explicit fallback
of "bring back as tenant even if a few things are missing" -- recovery proceeded as a **faithful
recreation using only real, known data**, not a blank placeholder:

- **Business identity**: sourced from `docs/LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md`,
  which independently records this customer's real context (Prajnyan Goswami, Proprietor, Imprints
  Production, Jorhat, Assam) -- not invented for this recovery.
- **Account identity**: the real, surviving `auth.users` row (`9adcaff6-74bb-48c7-8ade-43862ecac30a`,
  `imprintsprod@[REDACTED -- PII, matches this repo's standing masking policy]`, display name "Imprints" -- taken verbatim from `raw_user_meta_data`, not
  re-typed or altered).
- **Organization creation date backdated** to `2026-07-29 06:07:26.771473+00`, matching the real
  auth account's own creation timestamp, so the record does not misrepresent when this relationship
  actually began.
- **Role**: `Super Admin`, per explicit founder instruction.
- **Sector**: `enterprise` -- an inference (the valid enum is `government`/`enterprise`/`healthcare`/
  `ngo`/`consulting`/`other`; no more specific "printing/small business" option exists), not a
  recovered original value. Flagged to the founder as an inference at the time; not corrected, so
  retained as the operative value.

**Full set of rows created**, in a single explicit transaction (`BEGIN ... COMMIT`, not the
side-effect-free `ROLLBACK` pattern used for diagnostics elsewhere in this session, since this one
was meant to persist):

1. `public.organizations` -- name "Imprints Production", slug `imprints-production`, sector
   `enterprise`, backdated `created_at`.
2. `public.profiles` -- id matches the real auth account, email and display name preserved exactly.
3. `public.users` -- same id, linked to the new organization, `role = 'Super Admin'`,
   `status = 'active'`.
4. `public.organization_members` -- links the user to the new organization, `status = 'active'`.
5. `public.roles` -- a `Super Admin` role scoped to the new organization.
6. `public.user_roles` -- links the user to that role.

Items 5-6 were included deliberately, not as an afterthought: this codebase's real RLS permission
checks (`public.has_any_role()`, `supabase/migrations/20260702165736_initial_enterprise_schema.sql:285`)
verify access through the `roles`/`user_roles` join, not through `public.users.role` directly.
Creating only the `users` row (item 3) would have left the account able to sign in but blocked from
every real action -- the exact same complete row set the isolation harness itself creates for a
functioning test tenant, applied here to a real one.

## Verification

Read-only join query, immediately after the recreation transaction committed, against the real
user's exact ID:

```sql
select
  o.id as org_id, o.name, o.slug, o.sector,
  p.display_name as profile_name,
  u.role as users_table_role, u.status as users_status,
  om.status as membership_status,
  r.name as role_name,
  ur.role_id is not null as has_user_role_link
from public.organizations o
join public.organization_members om on om.organization_id = o.id
join public.profiles p on p.id = om.user_id
join public.users u on u.id = om.user_id
left join public.user_roles ur on ur.organization_id = o.id and ur.user_id = om.user_id
left join public.roles r on r.id = ur.role_id
where om.user_id = '9adcaff6-74bb-48c7-8ade-43862ecac30a';
```

**Result: 1 row.** `org_id = 9df43059-4050-4c0e-9ece-ebbc3fd006a4`, `name = "Imprints Production"`,
`slug = "imprints-production"`, `sector` beginning "ente..." (enterprise). The join across all 5
tables (`organizations`, `organization_members`, `profiles`, `users`, and the `user_roles`/`roles`
left-joins) returning exactly one row confirms every link is correctly wired -- not just that the
rows individually exist, but that they reference each other correctly. Founder confirmed: "Restored."

**Exact recovery SQL**: `evidence-private/tenant-recovery/restore_imprints_production_2026_08_12.sql`
-- kept local-only, `.gitignore`d, never committed to this public repository, since it embeds the
real customer's real email address as an executable value (same treatment this repo's Evidence
Storage Policy already applies to the LOI PDFs -- real contact information does not enter git
history, regardless of source).

## What This Recovery Does Not Claim

- **Not a byte-exact restore.** The organization's original internal ID, any projects, tasks,
  documents, knowledge articles, or audit history that may have existed under the original
  organization are **not recovered** -- no backup exists to recover them from. This is a fresh
  organization record with the same real owner reconnected, not a resurrection of the original row.
- **The root cause is a hypothesis, not a confirmed finding** -- see the section above. If further
  evidence later contradicts the 2026-08-06 theory, this document should be updated, not treated as
  settled.
- **No claim is made about whether other real tenants might have a similar gap.** This was found by
  a founder cross-check against a specific expected count (5); it is not the result of an exhaustive
  audit of every tenant's data integrity. If that broader audit is wanted, it is a separate,
  unstarted piece of work.
- **The customer was not contacted.** Whether and how to inform Imprints Production that their
  account was affected is a business decision for the founder, not made or assumed here.

## Follow-Up -- Founder Decisions (2026-08-12, same day)

All three items below were explicitly decided by the founder, not left open by default:

1. **Broader audit of remaining real tenants for similar gaps: "Not needed now."** Deliberately
   deferred, not ruled out -- if a similar gap surfaces again, this decision should be revisited,
   not treated as a permanent "no."
2. **Contacting the affected customer: "Will do it over call."** The founder will handle this
   directly, outside this repository -- not delegated to or attempted by any AI-assisted session.
3. **The 2026-08-06 root-cause hypothesis: "Not needed now."** Further investigation into whether
   that incident's own uncommitted cleanup script is actually what caused this is deliberately not
   being pursued. The hypothesis in the section above remains exactly that -- a stated hypothesis,
   never elevated to a confirmed finding -- and should not be cited as settled fact in any future
   document.

No further action is expected on any of these three items unless the founder reopens them.
