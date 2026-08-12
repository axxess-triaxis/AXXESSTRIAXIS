# Organization Hard-Delete Trigger Fix -- Investigation, Design, Migration, Production Safety Gate

Date: 2026-08-12
Related: `docs/readiness/TWO_TENANT_ISOLATION_HARNESS_EXECUTION_2026_08_12.md` (where this defect was
discovered), `docs/audit/FOUNDER_QUESTIONS.md` Q-004 and Q-006, PR #227.

Status as of this document: **migration designed, written, and statically reviewed. NOT applied to
production. Awaiting explicit founder authorization before any deployment.**

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

---

**Waiting here for explicit founder authorization before Phase 6 (live deployment + regression
verification). No production mutation has occurred as part of writing this document.**
