# Access and audit integrity: closeout (2026-11-06)

**Status: `Implemented locally`, moving to `Code complete` when the PR opens. Not merged, not deployed, and the migration has not been applied to staging or production.** Every result here comes from local Supabase and a local production build with synthetic data. None of it shows production behaviour.

## Before you merge: two checks only you can run

Both need read access to the real database, and both only read. **Run them before the migration is applied**, because the migration changes the state they measure.

**1. How many live users does the backfill change?** It makes `user_roles` and `organization_members` match `public.users`, so anyone who has drifted gains or loses access the moment it runs. In particular, anyone already suspended loses access straight away.

```sql
select
  (select count(*) from public.user_roles ur join public.users u on u.id = ur.user_id and u.organization_id = ur.organization_id
    where u.status = 'suspended'
       or not exists (select 1 from public.roles r where r.id = ur.role_id and r.name = u.role)) as role_rows_removed,
  (select count(*) from public.users u
    where u.status = 'active' and u.organization_id is not null
      and not exists (select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
        where ur.user_id = u.id and ur.organization_id = u.organization_id and r.name = u.role)) as users_gaining_a_role_row,
  (select count(*) from public.organization_members m join public.users u on u.id = m.user_id and u.organization_id = m.organization_id
    where u.status = 'suspended' and m.status <> 'suspended') as memberships_being_suspended;
```

The query was tested locally against planted drift inside a rolled-back transaction. One deleted role row, one suspended user and one changed role returned `2 | 2 | 1`, as expected, then `0 | 0 | 0` after the rollback.

**2. Are there pending `Super Admin` invitations already issued?** The new guard stops new ones. It does not cancel old ones, so review and revoke any you did not intend.

```sql
select count(*) as pending_super_admin_invitations
from public.invitations
where role = 'Super Admin' and status = 'pending' and expires_at > now();
```

## Results by finding

"Before" is from `docs/readiness/STACK_PERSONA_ORCHESTRATION_AUDIT_2026_11_05.md`. "After" is from the API round below, which passed 54 of 54.

| ID | Problem | Before | After |
|---|---|---|---|
| L1 | Suspended user keeps access | Sign-in 200, leads 200 (37 rows), task 201, REST read 206 | Sign-in 403 `account_suspended`, no cookies issued. Existing session 401. Old token reads 0 tasks through REST and gets 403 creating one. Reactivation restores sign-in and the role |
| L2 | Demoted user keeps database access | REST task 201, lists 67 users | REST task 403, lists only themselves |
| M10 | Promotion does not reach RLS | `user_roles` not updated | Demotion and promotion both update `user_roles` |
| L16 | Organization Admin can grant `Super Admin` | 200, 200, 200, 201 | API self-promotion, API promotion of another user and invitation all 403. REST self-promotion and role row insert both 403. Settings no longer offers the role |
| L17 | Audit entries can be forged | Spoofed row 201, shown in the admin's audit view | Direct insert 403, no row stored. Reserved admin action 403. An ordinary event is stored under the real actor |
| M20 | Non-admin actions are not logged | 30 lead creates added 0 rows, `auth.login` only for admins | 30 lead creates added 30 rows. 30 sign-ins added 30 `Employee` `auth.login` rows. Finance staff's watch item logged |
| M7 | Accepting an invitation returns 500 | 500, though the user had joined | 200, exactly the invited role, `invitation.accepted` logged |
| M21 | Agent key changes are not logged | 0 rows for create and revoke | Key create, capability change, revoke and profile create each add one row. The raw key is in no row. Revoked key still returns 401 |
| M22 | Refused attempts are not logged | 3 refusals added 0 rows | 3 refused writes added 3 `access.denied` rows. Refused reads add none, on purpose, because pages make them routinely |

**Regressions checked in the same round:** `Employee` creates a task (201), `Manager` creates a project (201), `Consultant` reads tasks (200), `Guest` is still refused on a task write (403), admin audit export (201) and admin audit read (200).

## What changed

- **Migration** `supabase/migrations/20261106120000_access_and_audit_integrity.sql`: a sync trigger from `users` to `user_roles` and `organization_members`, a one-time backfill, `Super Admin` guards on `users`, `user_roles`, `invitations` and `roles`, the `record_audit_event` RPC, and removal of the direct insert policy on `audit_logs`. The two audit trigger functions become `security definer`.
- **Auth:** `src/auth/supabaseUser.ts`, `src/auth/serverSession.ts`, `src/app/api/auth/login/route.ts`.
- **Role checks:** `src/security/rbac.ts`, `src/app/api/repositories/[resource]/route.ts`, `src/app/api/invitations/route.ts`, `src/features/settings/SettingsSection.tsx`.
- **Audit:** new `src/services/audit/auditEvents.ts`, `src/repositories/supabaseEnterpriseRepositories.ts`, `src/app/api/audit-logs/route.ts`, `src/app/api/invitations/accept/route.ts`, the agent connection, grant and profile routes, connector credentials, and four `/api/admin/*` routes.
- **Tests:** four new Vitest files (`serverSession.suspended`, `accessIntegrity`, two `route.audit`), new `scripts/verify-access-integrity.mjs`, updates to `supabaseEnterpriseRepositories.test.ts` and `scripts/verify-two-tenant-isolation.mjs`.
- **Playwright, two stale test fixes:** `tests/e2e/helpers.ts` marks the What's New panel as seen, because it opens once per release and covers the page. `tests/e2e/user-admin.spec.ts` matches the current invitation wording. Neither failure came from this change.
- **Docs:** the audit report joins the repo with a note on which findings this work addresses.

## What did not change

L3, L6, L8 to L10, L13 and L18 (role checks on API routes), M19 and M23 (finance), M25 (suspending an admin), U4 to U7, and Callismatic. No Vercel or AWS settings changed.

**So "Access restricted" is still mostly a screen.** The audit's third main finding is not fixed here: contract staff, vendors and customers can still read tasks, leads and finance items through the API.

## Closeout Evidence

Issue ID: ACCESS-AUDIT-INTEGRITY (findings L1, L2, M10, L16, L17, M20, M7, M21, M22)
Title: Make access follow one source, limit `Super Admin` grants, make the audit log reliable
Origin plan: approved plan-mode plan, `~/.claude/plans/transient-drifting-wilkinson.md`
Research artifact: `docs/readiness/STACK_PERSONA_ORCHESTRATION_AUDIT_2026_11_05.md`
Implementation commit(s): on branch `fix/access-and-audit-integrity`, listed in the PR
PR: recorded in `docs/readiness/EVIDENCE_INDEX.md` once open
Branch: `fix/access-and-audit-integrity`
Files changed: listed above

Verification commands and raw results:

- `pnpm run lint`: `LINT_EXIT=0`, zero warnings
- `pnpm run typecheck`: `TYPECHECK_EXIT=0`
- `pnpm --dir apps/mobile run typecheck`: `MOBILE_EXIT=0`
- `pnpm run test`, before merging `main`: `Test Files  336 passed (336)`, `Tests  1890 passed (1890)`, exit 0
- `pnpm run test`, after merging `main`: **no clean full run on this machine.** First run: `Test Files  330 passed (330)`, `Tests  1843 passed (1843)`, `Errors  7 errors`, exit 1. With `--maxWorkers=2`: `Test Files  334 passed (334)`, `Tests  1880 passed (1880)`, `Errors  3 errors`, exit 1. No test failed, but some files did not run, because of `[vitest-pool]: Timeout starting threads runner`. The first run's errors are that message. The second run's text was not captured
- Targeted run after merging `main`, the 3 test files `main` changed and this PR's 5 test files: `Tests  64 passed (64)`, exit 0. The full suite on the merged code is left to CI on the PR
- `pnpm run build`: `BUILD_EXIT=0` before merging, with local Supabase values, and `BUILD_EXIT=0` after merging, without them
- Lint and both typechecks: exit 0 again after merging
- `pnpm run supabase:verify`: exit 0, one warning, `20260702165736_initial_enterprise_schema.sql: contains permissive using (true) RLS predicate.` That file predates this change and is not touched by it
- `pnpm exec playwright test tests/e2e/auth.spec.ts tests/e2e/user-admin.spec.ts tests/e2e/audit-logs.spec.ts` with `E2E_RUN_SEEDED=true`, against the local production build: `6 passed (17.0s)`
- `node scripts/verify-access-integrity.mjs`, on a freshly reset database: `status passed, total 44, passed 44, failed []`
- `node scripts/verify-two-tenant-isolation.mjs`: `status passed`, `coverageMissing []`, `cleanupErrors []`
- API round through the running production build, `round6_after_fix.mjs`, in the shared audit notes folder: `status passed, total 54, passed 54, failed []`
- `pnpm exec supabase db reset`: every migration and seed applied, exit 0
- Settings as seeded Organization Admin in the browser pane: invite options are `Organization Admin, Executive, Manager, Employee, Guest`. Of 9 user rows, none of the 8 editable rows offers `Super Admin`, and the existing Super Admin's row is disabled

Deploy evidence: not applicable, not deployed. Live endpoint checks: none, so production status is **not verified**.

Acceptance criteria (from the approved plan): before and after recorded for all nine findings, role regression as `Employee`, `Guest` and `Consultant`, the standard suite with exact counts, and the `auth`, `user-admin` and `audit-logs` specs. All met locally.

Regression test: written before the fix and seen failing (`Test Files 4 failed (4)`, `Tests 26 failed | 21 passed (47)`), then passing (`Test Files 6 passed (6)`, `Tests 60 passed (60)`). A later test for agent profile creation failed first too (`Tests 1 failed | 1 passed (2)`), then passed (`Tests 2 passed (2)`).

Errors hit this session:

- Error: lint failed with 2 unused-import warnings. One showed a real gap, because agent profile creation had no audit call.
  Resolution: fixed, test added, lint re-run with zero warnings.
- Error: the machine rebooted at 10:27 local time on 2026-11-06, which killed the test and build runs and stopped Docker.
  Resolution: all re-run. The results above come from after the reboot.
- Error: first API round was 48 of 53, because creating an agent key returned 500.
  Resolution: the test environment had no `AXXESS_TOKEN_VAULT_KEY`. Fixed with a random throwaway value, re-run at 54 of 54 with one added check. **A deployment without this variable still returns 500 on key creation. That behaviour is not new.**
- Error: 3 of 6 Playwright tests failed on the first run.
  Resolution: fixed. Two were blocked by the What's New panel. One expected old invitation wording, then could not find `employee.alpha3` because 62 test personas pushed it past the 50-user list limit. Re-run on plain seeds: 6 of 6.
- Error: Vitest worker startup timeouts on the merged code, 7 errors, then 3 with fewer workers.
  Resolution: not fixed. Likely cause, not proven: this machine has 8 GB of memory, with about 1.5 GB free at the time. Recorded as VITEST-WORKER-TIMEOUT, owner Claude Code, closed only by the full suite passing in CI on the PR.
- Error: merging `main` conflicted in `docs/readiness/DECISION_OUTCOME_LEDGER.md`.
  Resolution: fixed, both new sections kept, no lines removed compared with `main`.
- Error: `preview_start` ran `next-dev` from the primary checkout's config rather than this worktree's entry.
  Resolution: stopped straight away. This worktree's build was unaffected, and the production build was served as a background process.
- Error: seed run lost 3 personas to Supabase Auth 504 timeouts while lint and tests ran at the same time.
  Resolution: re-seeded with less load, `failures=0`, 62 of 62 with role rows.

Decision outcomes:

- Decision: `public.users` is the single source of truth for access, kept in step by a database trigger.
  Outcome: works locally. Pending on production, review by 2026-11-20.
- Decision: refused reads are not logged, only refused writes.
  Outcome: works locally. Pending on log volume in real use, review by 2026-11-20.
- Decision: no authenticated user inserts into `audit_logs` directly, only through the RPC.
  Outcome: works locally, including task and project writes through audit triggers. Pending on production, review by 2026-11-20.

Final status: Implemented locally
Remaining risk: listed below
Follow-up issue IDs: listed below
Supersedes: none
Superseded by: none
Reopened by: none

## Partial, unsupported and known limits

- **Not tested on staging or production.** Staging was out of reach during the audit, and this work stays local until you approve otherwise.
- **The API round, Playwright and database scripts ran before `main` was merged.** `main` brought UI code and one new spec, and changed nothing in `src/auth`, `src/security`, `src/app/api`, `supabase/migrations` or dependencies, so they were not repeated.
- **The backfill changes live access** when applied. Run check 1 above first.
- **A multi-organization user is suspended only in their current organization.** Other memberships keep working.
- **Issued access tokens stay valid until they expire,** but a suspended user's token now passes no role or membership check, so it reads nothing and writes nothing, as tested above.
- **Refused attempts by signed-out callers are not logged,** because there is no actor to attribute.
- **`access.denied` rows are best effort.** A failed audit write does not change the 403 the caller gets.
- **No negative control for `verify-access-integrity.mjs`.** It was not run against a database without the migration. The evidence that these failures existed is the audit run and the failing unit tests.
- **M12 is only partly closed.** The trigger gives seeded users their role rows, but seeded auth users still could not sign in after a reset without a local repair script. Seeds were not changed.

## Follow-ups

- **Settings user list stops at 50 users with no notice.** Found here. `UserAdministration` calls `listByOrganization` with no page size, so an organization above 50 users cannot reach the rest in Settings. Not fixed here.
- **Role checks on API routes** (L3, L6, L8 to L10, L13, L18), the next most serious group from the audit.
- **M12:** repair the seeds so a fresh reset can sign in.

## Decision Ledger

Decision: fix access and audit first, with one migration, using `users` as the source of truth.
Why: the audit showed that suspending, demoting and logging could not be relied on, and each traced to the two role stores or to the audit write.
What changed: as listed above.
Architecture boundary: the API and RLS keep their separate reads, and a trigger keeps them in step. Service-role writes bypass the `Super Admin` guard on purpose, for provisioning, seeds and tenant switching.
Product boundary: no new roles, and no change to what each existing role may do, except that `Super Admin` can now be granted only by a `Super Admin`.
Verification: as listed above, local only.
Outcome: Pending, review by 2026-11-20.
Follow-up: the two founder checks, then merge and deploy on your approval, with a live check of the deployed SHA.
