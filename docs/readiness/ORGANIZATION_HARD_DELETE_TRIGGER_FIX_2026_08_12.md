# Organization Hard-Delete Trigger Fix -- Investigation, Design, Migration, Production Safety Gate

Date: 2026-08-12
Related: `docs/readiness/TWO_TENANT_ISOLATION_HARNESS_EXECUTION_2026_08_12.md` (where this defect was
discovered), `docs/audit/FOUNDER_QUESTIONS.md` Q-004 and Q-006, PR #227, PR #228,
`docs/readiness/IMPRINTS_PRODUCTION_TENANT_RECOVERY_2026_08_12.md` (a distinct incident found while
verifying this fix -- see Section 7).

**Status (final, 2026-08-12): deployed and verified. Organization hard-deletion works correctly in
production.** Three migrations were required, not one -- the first two both failed in production in
ways static review could not have caught, and were diagnosed and corrected live, each time stopping
for founder authorization before proceeding. Full account of all three attempts in Section 6.

---

## 1. Root Cause (Phase 1 investigation)

`organizations.id` is referenced with `ON DELETE CASCADE` by `user_roles.organization_id`
(`supabase/migrations/20260702165736_initial_enterprise_schema.sql:44`). Deleting an organization
cascades to delete its `user_roles` rows within the same statement. That cascade fires
`audit_user_roles_changes` (`AFTER INSERT OR UPDATE OR DELETE ON public.user_roles`,
`supabase/migrations/20260703025318_sprint6_server_auth_repositories.sql:204`), which calls
`record_enterprise_audit_log()`. For the `user_roles`-DELETE branch (lines 60-67 of that function),
the function unconditionally attempts `INSERT INTO public.audit_logs (organization_id, ...) VALUES
(old.organization_id, ...)` (lines 101-120) -- but by the time this trigger fires, the parent
`organizations` row has already been removed within the same transaction, so the new insert's
foreign key check against `organizations.id` fails immediately (**SQLSTATE 23503**, constraint
`audit_logs_organization_id_fkey`), and the entire top-level `DELETE FROM organizations` statement
rolls back atomically.

**Confirmed exclusive to organization deletion**: tracing every FK path that can cascade-delete
`user_roles` (via `organization_id`, via `role_id -> roles`, via `user_id -> profiles`) shows the
failure only occurs when the referenced `organizations` row is the one being deleted -- deleting a
role or a user directly leaves the organization live, so the audit insert succeeds normally in those
cases.

**Confirmed not shared by any other trigger**: an exhaustive grep of every `CREATE TRIGGER` across
all 28 migration files for one whose event list includes `DELETE` found exactly two:
`audit_user_roles_changes` (buggy, no guard) and `audit_role_permissions_changes` (already
defended -- its function, `record_permission_audit_log()`, lines 130-186 of the same file, already
checks `if target_organization_id is null then ... return old; end if;` before inserting). Every
other audit trigger (`audit_projects_changes`, `audit_tasks_changes`, `audit_meetings_changes`,
`audit_organizations_changes`, `audit_users_role_changes`, `audit_documents_changes`,
`audit_knowledge_articles_changes`, `audit_document_permissions_changes`) is `INSERT`/`UPDATE`-only,
confirmed by reading each one's exact event clause -- none are exposed to this failure mode.

**Blast radius today**: zero. No application code anywhere in `src/` attempts to delete an
organization (confirmed by search). This is a real, structural defect, but currently latent -- it
has only ever fired via direct API calls (the isolation harness), never through a shipped feature.

## 2. Design (Phase 2)

**Chosen: Option A** -- add a pre-insert existence check in the `user_roles`-DELETE branch only,
mirroring the exact pattern `record_permission_audit_log()` already uses safely in production for
the structurally identical `role_permissions`-DELETE case. Two other options (relaxing the
`audit_logs.organization_id` foreign key; wrapping the insert in a blanket exception handler) were
evaluated and rejected -- full reasoning for both, and for Option A, in the design discussion
preceding this document (this session's transcript). Option A is the only one that touches zero FKs,
zero RLS policies, and no table other than replacing one function body.

## 3. Migration (Phase 3)

**File:** `supabase/migrations/20260812120000_fix_organization_hard_delete_audit_trigger.sql`
(119 lines, SHA-256 `0bd38af25aecb0649075536fd5492e3ae0fad5bd52949dacbca4eba999f7546b`)

**Objects changed:** exactly one -- `public.record_enterprise_audit_log()` (function body replaced
via `CREATE OR REPLACE FUNCTION`). No table, column, index, RLS policy, or trigger definition is
touched -- the trigger `audit_user_roles_changes` itself is unchanged; only the function it calls is
updated.

**Exact diff from the pre-fix body** (confirmed via `diff` against the rollback file, which holds
the byte-for-byte original body):

```diff
   elsif tg_table_name = 'user_roles' then
     if tg_op = 'DELETE' then
       target_organization_id := old.organization_id;
       target_resource_id := old.role_id;
+      if not exists (select 1 from public.organizations org where org.id = target_organization_id) then
+        return old;
+      end if;
     else
       target_organization_id := new.organization_id;
       target_resource_id := new.role_id;
     end if;
```

Every other line in the 119-line file is either an unchanged copy of the original function body or a
comment. This is the only functional change.

**Idempotency:** `CREATE OR REPLACE FUNCTION` is inherently safe to re-run -- applying this migration
twice has the same effect as applying it once.

**Rollback artifact:** `supabase/rollback/20260812120000_fix_organization_hard_delete_audit_trigger_ROLLBACK.sql`
(SHA-256 `08d590cf3394f438b283fce3a0e3b212436dd7c91aff3bdfdc65d2ae39adf45f`). Deliberately kept outside
`supabase/migrations/` so the Supabase CLI never applies it automatically -- it is a manual-only
`CREATE OR REPLACE FUNCTION` that restores the exact pre-fix body. Since the forward migration only
ever replaces a function body (touches no data, no table, no RLS policy), the rollback is a pure
function-body revert with no data-level consequences to reason about.

## 4. Static Verification Performed (Phase 4, partial -- see limitation below)

```
node scripts/repo-bloat-guard.mjs   -> passed, 0 of 1408 tracked files under a forbidden path
git diff --check                    -> clean, no whitespace/line-ending issues
diff <rollback> <migration>         -> confirms the only functional change is the 8-line guard block above
```

No `.ts`/`.tsx`/config files were touched -- `typecheck`/`lint`/`test`/`build` do not apply to this
change.

**Explicit limitation, stated plainly rather than glossed over**: the Phase 4 regression matrix this
fix requires (ordinary `user_roles` INSERT/UPDATE/DELETE still audited; cross-tenant read/write still
blocked; organization hard-delete succeeds; no orphan rows; no cross-tenant deletion; no RLS
regression) **can only be executed against a live Postgres instance running this trigger**. This
environment has no local Docker daemon and no staging/branch Supabase project (same constraint
recorded in `docs/readiness/TWO_TENANT_ISOLATION_HARNESS_EXECUTION_2026_08_12.md`'s "Chance of
Recurrence" section). **This regression matrix has NOT been run and its results are NOT claimed.**
It is Phase 6's first required action, after authorization, against production (the only real target
available), using the disposable-QA-tenant procedure below -- not before.

## 5. Production Safety Gate (Phase 5) -- migration NOT applied, authorization required

**Exact migration filename:** `supabase/migrations/20260812120000_fix_organization_hard_delete_audit_trigger.sql`

**Complete schema diff:** one `CREATE OR REPLACE FUNCTION public.record_enterprise_audit_log()`
statement. No `CREATE TABLE`, `ALTER TABLE`, `CREATE INDEX`, `CREATE POLICY`, or `CREATE TRIGGER`
statement anywhere in the file.

**Objects changed:** `public.record_enterprise_audit_log()` (function body only).

**Blast radius:** every INSERT/UPDATE on `projects`, `tasks`, `meetings`, `organizations` (update),
`users` (role update), `documents`, `knowledge_articles`, `document_permissions`, and `user_roles`
(insert/update) continues to call this same function, byte-for-byte unchanged for those branches.
The only behavioral change is: a `user_roles` DELETE whose parent organization no longer exists now
returns without writing an audit row, instead of throwing and rolling back the caller's entire
statement. No other table, RLS policy, or trigger is touched.

**Rollback procedure:** run
`supabase/rollback/20260812120000_fix_organization_hard_delete_audit_trigger_ROLLBACK.sql` directly
against the project (e.g. via the Supabase SQL Editor, or `psql` with the project's connection
string). Single statement, completes in under a second, no data affected.

**Pre-migration backup/check requirements:**
1. Confirm via Supabase Dashboard that Point-in-Time Recovery (or the most recent automated backup)
   is available and its timestamp noted, per standard practice for any production schema change --
   this migration's blast radius is minimal, but the check costs nothing and this repo's own
   Production Gate Bypass discipline expects a named pre-check, not an assumption.
2. Run the "verify production state before migration" query below and record its output for
   comparison against the post-migration query.

**SQL to verify production state before migration** (read-only, run via Supabase SQL Editor or
`psql`):
```sql
select proname, prosrc ilike '%not exists (select 1 from public.organizations%' as has_guard_already
from pg_proc
where proname = 'record_enterprise_audit_log';
```
Expected output before migration: one row, `has_guard_already = false`.

**Exact deployment command** (run by whoever holds production credentials -- not Claude Code):
```bash
supabase db push --linked
```
(or, if this checkout is not linked to the remote project: apply
`supabase/migrations/20260812120000_fix_organization_hard_delete_audit_trigger.sql`'s contents
directly via the Supabase SQL Editor, since it is a single self-contained `CREATE OR REPLACE
FUNCTION` statement with no dependency on migration-history bookkeeping beyond that one file).

**Post-migration verification queries:**
```sql
-- 1. Confirm the guard is now present
select proname, prosrc ilike '%not exists (select 1 from public.organizations%' as has_guard_already
from pg_proc
where proname = 'record_enterprise_audit_log';
-- expected: has_guard_already = true

-- 2. Confirm ordinary user_roles auditing still works (manual functional check, not just a
--    static source check) -- see Phase 6 disposable-QA-tenant procedure below for the real test.
```

**Expected outputs:** query 1 flips from `false` to `true`. No error. No other schema object
reports a change (a `supabase db diff` or dashboard schema comparison immediately after should show
only this one function's definition differing from before).

**Recovery procedure if any check fails:** do not attempt a second fix inline. Run the rollback
artifact immediately (single statement, sub-second, no data impact), confirm query 1 above reverts
to `false`, and stop -- report the exact failure back before any further action, per this repo's
Production Gate Bypass discipline (no improvised second attempt without a new, explicit go/no-go).

## 6. Phase 6 -- What Actually Happened During Deployment

Founder authorized Phase 6. What followed was three deployment attempts, not one -- the first two
each surfaced a real defect that static review (Phase 4) could not detect, because both required a
live Postgres instance actually executing the trigger to manifest. This section is the honest,
complete record -- not a retroactive cleanup pretending the first migration worked.

### Attempt 1: `20260812120000` (Section 3's migration)

Applied via Supabase SQL Editor at **2026-08-12T15:21:52.847Z** (exact timestamp per Supabase's own
`postgres` log, `statement:` entry, confirmed the full pasted SQL text matched the migration file
byte-for-byte). First paste attempt (an earlier, separate query in a reused tab) produced a syntax
error (`SQLSTATE 42601`, "syntax error at or near \"select\"") from stray leftover content in that
query tab, unrelated to the migration's own SQL -- resolved by using a clean tab; the successful
apply above is the one that actually took effect. Verified live via
`select prosrc ilike '%not exists (select 1 from public.organizations%' as fix_is_present from
pg_proc where proname = 'record_enterprise_audit_log';` -> `fix_is_present = true`.

**Re-ran the isolation harness** (`node scripts/verify-two-tenant-isolation.mjs`, run `msq8o8rs`,
2026-08-12T15:23:27Z per the matching log error entry) -- crashed with a **new, different error**:
`SQLSTATE 42703`, `record "old" has no field "role"`, on a plain `user_roles` INSERT (tenant setup,
not the delete path this migration targeted). This run had already created 1 orphaned test
organization (`qa-isolation-msq8o8rs-a`, id `63b1eb76-0508-4745-a68d-3671295902cb`) before crashing
-- tenant B was never reached. This was not a regression from this migration's own logic (confirmed:
the crashing line, in `target_action`'s shared `CASE` expression, was untouched by the diff) -- it
was a pre-existing latent defect, exposed by the function being freshly recompiled. Founder chose
"Emergency fix now."

### Attempt 2: `20260812130000` -- did NOT actually fix it

First hypothesis: the `CASE` clause `when tg_table_name = 'users' and tg_op = 'UPDATE' and old.role
is distinct from new.role then 'role.changed'` assumed the flat `AND` short-circuits before touching
`old.role` for non-`'users'` tables. Fix attempted: nest the condition into a sub-`CASE`.

Applied via SQL Editor at **2026-08-12T16:15:16.736Z**. Verified present in `pg_proc` immediately
after (`fix_is_present = true` for a signature matching the nested-CASE text).

**Re-tested twice more via the live harness before switching to direct SQL diagnosis** -- run
`msqandma` (2026-08-12T16:17:17Z-16:18:39Z window, per matching log error entries) and run
`msqanu8p` (2026-08-12T16:18:45Z window) -- both crashed with the identical `SQLSTATE 42703` error,
each leaving one more orphaned tenant-A-only organization
(`qa-isolation-msqandma-a` id `07338ead-9fcb-4d9a-9550-26787b1b8d8e`;
`qa-isolation-msqanu8p-a` id `fcd09da2-0443-42c0-a668-8af538d62207`). At this point switched to a
**safe, rolled-back-regardless diagnostic SQL block** (not the harness) specifically to get the full
Postgres error trace directly, bypassing PostgREST's truncated REST-API error text -- still failed,
identical error, `CONTEXT` trace pointing at the exact same assignment inside
`record_enterprise_audit_log()`, confirming this was not a fluke of the harness's specific request
shape. **The nested-CASE fix did not work**, at 2026-08-12T16:27:53Z (final confirming error before
attempt 3).

### Attempt 3: `20260812140000` -- the actual fix

Reading the full `CONTEXT` trace (only available via direct SQL reproduction, not the REST API)
revealed the real mechanism: PL/pgSQL compiles the entire `CASE` expression -- including nested
branches -- as **one combined SQL expression tree**, and Postgres resolves every `record.field`
reference in that tree against the row type bound for the current invocation **eagerly, for the
whole tree, before any branch is selected at runtime.** Nesting the `CASE` (attempt 2) does not
change this, because it is still one expression passed to the executor as a single unit. This is a
documented PL/pgSQL limitation for `record`-typed `OLD`/`NEW` in shared trigger functions, not an
evaluation-order bug.

**Fix:** move the `users`-role-change logic out of the shared `CASE` entirely, into genuine PL/pgSQL
`IF`/`ELSE` control flow -- the same principle that already made the organization-hard-delete guard
(attempt 1) work correctly, since it also uses real `IF`, not a `CASE` sub-expression. Each `IF`
branch is a separately compiled statement, so `old.role` is only ever type-checked when the
invocation is already, structurally, inside the `tg_table_name = 'users'` branch.

Applied via SQL Editor at **2026-08-12T16:28:32.698Z**. Re-tested via the same safe rolled-back
diagnostic first (`NOTICE: INSERT SUCCEEDED`, no error) before touching the harness again -- then
ran the full harness:

```json
{
  "status": "passed",
  "runId": "msqb1xi6",
  "results": [ /* all 6 REQUIRED_COVERAGE resource types: created=true, crossTenantReadBlocked=true, crossTenantWriteBlocked=true */ ],
  "coverageMissing": [],
  "cleanupErrors": []
}
```

**`cleanupErrors: []` -- the organization hard-delete succeeded, for the first time ever, across
every run of this harness (2026-08-06 and every attempt today).** This is the definitive proof the
fix works, not a static-review claim.

### Cleanup of test artifacts from all three attempts -- exact ledger

The 3 failed/partial attempts (plus 2 earlier runs -- `qa-isolation-msqan77o-a` and 2 further runs
predating this Phase 6 sequence, `qa-isolation-msq84wrh-a`/`-b` -- found only via pattern search,
never individually narrated in this document, since their own console output was not captured at
the time) left orphaned test data in production. Discovered via
`slug like 'qa-isolation-%' or slug like 'diagnostic-rollback-test-%'` and
`email like '%@axxess-test.invalid'`, confirmed and removed in two passes this session (a first
pass of the 9 orphans existing before Phase 6 began, and a second pass of the 6 more created during
Phase 6 itself):

**Organizations removed (6, this Phase 6 pass):**
| Slug | Organization ID |
|---|---|
| `qa-isolation-msq84wrh-a` | `5f9edab7-308f-43f7-ac2d-f1f88e32b1d0` |
| `qa-isolation-msq84wrh-b` | `6771a06e-1a59-4ab4-8578-abd65c064a66` |
| `qa-isolation-msq8o8rs-a` | `63b1eb76-0508-4745-a68d-3671295902cb` |
| `qa-isolation-msqan77o-a` | `d2b3185b-c852-4060-be2b-e895f347b5d3` |
| `qa-isolation-msqandma-a` | `07338ead-9fcb-4d9a-9550-26787b1b8d8e` |
| `qa-isolation-msqanu8p-a` | `fcd09da2-0443-42c0-a668-8af538d62207` |

**Auth users removed (4, matching these orgs' `@axxess-test.invalid` accounts):**
`qa-isolation-msq8o8rs-a`, `qa-isolation-msqan77o-a`, `qa-isolation-msqandma-a`,
`qa-isolation-msqanu8p-a` (the `msq84wrh` pair's auth users had already been removed in an earlier
pass this session, before Phase 6 began).

Removed using the safe order established earlier this session: delete `user_roles` for the org
first (while the org still exists, so `record_enterprise_audit_log()`'s own audit insert for that
delete succeeds normally against a live parent), then delete the organization itself (now cascading
cleanly, with no remaining `user_roles` rows to re-trigger the original defect). All 6 organizations
and all 4 auth users returned `OK` on first attempt. Final verification queries (organizations by
slug pattern, profiles by test-email pattern) both returned zero rows.

The 2 organizations from the final, successful run (`msqb1xi6`) required no manual cleanup -- the
harness's own built-in cleanup step removed them automatically, which is itself the proof the fix
works (`cleanupErrors: []`).

## 7. A Real, Separate Finding: One Production Tenant Was Also Missing

While confirming real (non-test) tenant counts were unaffected by this session's actions (part of
the Phase 6 checklist), the founder identified that a real, previously-active customer organization
("Imprints Production") no longer existed in `public.organizations`, while the customer's own
`auth.users` account (created 2026-07-29, last signed in 2026-08-04) was still intact. Investigated
and remediated -- **full account in `docs/readiness/IMPRINTS_PRODUCTION_TENANT_RECOVERY_2026_08_12.md`,
not duplicated here.** Headline: this predates this session (traced with reasonable confidence, not
certainty, to the 2026-08-06 isolation-harness incident's own uncommitted manual cleanup script, per
that finding's own reasoning); no backup/PITR is available on this Free-tier project, so a byte-exact
restore was not possible; the tenant was recreated as a functioning account (real auth identity, real
business context from `docs/LOIS_...LOG.md`) per explicit founder direction, not a blank
placeholder. This is a distinct incident from the trigger fix -- it does not change anything about
Sections 1-6's conclusions, and the trigger fix itself did not cause it.

## 8. Root Cause / Fix / Verification -- Final Summary

**Root cause:** `record_enterprise_audit_log()`, a single shared audit trigger function, had two
independent, previously-undiscovered defects: (1) an unconditional `audit_logs` insert on
`user_roles` DELETE that fails when the cascade originates from the parent organization's own
deletion; (2) a `record`-typed field reference (`old.role`) inside a shared `CASE` expression that
Postgres resolves eagerly against every invocation's row type, regardless of table, causing a crash
on any `user_roles` write (not just deletes) once the function was freshly recompiled.

**Chosen fix and why:** genuine PL/pgSQL `IF`/`ELSE` control flow for both defects, not SQL `CASE`
sub-expressions -- the only construct that reliably gates `record`-field access in this engine,
proven by two failed attempts using `CASE`-based approaches first.

**Files changed:** `supabase/migrations/20260812120000_...sql`, `20260812130000_...sql`,
`20260812140000_...sql` (three sequential, forward-only migrations -- historical ones never edited),
plus matching rollback artifacts in `supabase/rollback/`.

**Migration SQL summary:** each replaces `public.record_enterprise_audit_log()`'s body via
`CREATE OR REPLACE FUNCTION`. No table, FK, RLS policy, or trigger definition touched by any of the
three.

**Tests performed:** static (bloat guard, diff isolation, byte-for-byte comparison against rollback
artifacts) for all three; live functional (direct SQL reproduction with full `CONTEXT` trace,
side-effect-free via explicit `ROLLBACK`) for attempts 2 and 3; full end-to-end isolation harness
(6/6 resource types, both directions) for attempt 3, the one that shipped.

**Before/after behavior:** before -- organization hard-delete failed, atomically, 100% of the time,
for every organization, via any code path; ordinary `user_roles` writes worked only until the
function was ever recompiled, at which point they also failed 100% of the time. After -- both work
correctly, verified against production, not staging.

**Production verification evidence:** run `msqb1xi6`, `cleanupErrors: []`, full JSON in Section 6.

**Rollback readiness:** all three rollback artifacts exist, tested by construction (each restores
the immediately-prior function body via `CREATE OR REPLACE FUNCTION`, a single sub-second
statement). Not exercised live, since no rollback was needed.

**Residual risk:** low. The fix is narrowly scoped (one function, two `IF`-based guards) and verified
end-to-end against production. The underlying *pattern* (record-typed field access in shared trigger
functions) could recur if a future migration reintroduces a `CASE`-based check on a field that
doesn't exist for every table the function serves -- worth a code-review convention note, not a
schema-enforced guarantee.

**Probability of recurrence:** near-zero for this exact defect (fixed at the root, verified live).
Structurally similar defects remain *possible* in future changes to this same shared function if the
`IF`/`ELSE` discipline established here isn't followed for new per-table branches -- named as a
convention risk, not a currently-open bug.

## 9. Decision Ledger (CLAUDE.md standing rule -- this session carried multiple major calls)

```
Decision: Deploy 3 sequential production-schema migrations to fix a structural defect that made
  organization hard-deletion impossible; separately, recreate one real customer tenant found
  missing during verification.
Why: The defect (Q-004 live re-verification finding) blocks any real tenant-deletion or erasure
  feature from ever working, including future Q-006 (DPDP/GDPR erasure) execution. Founder
  explicitly authorized fixing it as a "HIGH RISK... treat as HIGH RISK" production-schema change,
  following an explicit phased protocol (investigate -> design -> implement -> verify -> safety
  gate -> authorized deployment) rather than an ad hoc fix.
What changed: public.record_enterprise_audit_log() (one shared audit-trigger function) now uses
  real PL/pgSQL IF/ELSE control flow instead of SQL CASE sub-expressions for two branches that
  reference fields not present on every table it serves. Three migrations were needed because the
  first two, though each statically reviewed and diffed to a minimal change, failed in production
  in ways only a live Postgres instance could reveal -- each failure was found, root-caused with an
  exact mechanism (not guessed), and corrected with the founder's explicit go-ahead before the next
  attempt, never silently retried.
  Separately: one real customer organization ("Imprints Production") was found missing during
  verification, most plausibly (not certainly) predating this session -- traced to a hypothesis
  about the 2026-08-06 incident's own uncommitted cleanup script, not proven. Recreated as a
  functioning tenant (real auth identity, real business context, explicit founder-directed role)
  since no backup exists on this Free-tier project to restore byte-exact.
Architecture boundary: No RLS policy, foreign key, or table structure changed across any of the 3
  migrations -- confirmed via diff against each rollback artifact showing an isolated, single-digit
  line change each time. The has_any_role()-based RLS permission model was read and matched exactly
  (not guessed) when recreating the customer tenant, so the recreated account passes real
  permission checks, not just a surface-level "looks restored" state.
Product boundary: Organization hard-deletion is now a real, working capability at the database
  layer for the first time since this schema existed (Sprint 6, 2026-07-03) -- this does not by
  itself constitute a GDPR/DPDP erasure feature (no automated execution engine exists), only removes
  the structural blocker Q-006 named. The customer tenant recreation restored account/access-layer
  data only, not any original projects/tasks/documents/audit history, which cannot be recovered on
  this project tier.
Verification: Live isolation harness run msqb1xi6 (2026-08-12): 6/6 REQUIRED_COVERAGE resource
  types pass both crossTenantReadBlocked and crossTenantWriteBlocked, cleanupErrors: [] (the direct
  proof organization hard-delete now succeeds, where every prior run since 2026-08-06 failed). All
  test-data orphans (6 organizations, 4 auth users this pass) found and removed, final zero-result
  verification query confirmed. Imprints Production recreation verified via a 5-table join query
  returning exactly 1 correctly-linked row, founder-confirmed "Restored."
Outcome: Both objectives achieved and verified against production, not staging. PR #228 (the
  migrations) and this document plus IMPRINTS_PRODUCTION_TENANT_RECOVERY_2026_08_12.md (the
  tenant-recovery record) are the durable evidence trail.
Follow-up: (1) Whether to audit remaining real tenants for similar undetected gaps -- not started.
  (2) Whether/how to inform the Imprints Production customer -- founder's decision, not made here.
  (3) The 2026-08-06 root-cause hypothesis for the missing tenant remains unconfirmed. (4) A
  code-review convention against CASE-based record-field access in shared trigger functions is
  worth adopting so this exact defect class does not recur -- not enforced at the schema level,
  named as a process recommendation only.
```

---

**This fix is deployed, verified, and closed.** No further authorization needed for this specific
change. Section 7's tenant-recovery finding is tracked separately and is not blocking.
