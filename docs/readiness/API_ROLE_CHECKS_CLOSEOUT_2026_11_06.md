# API role checks: closeout (2026-11-06)

**Status: `Code complete`, draft PR #457, stacked on #456. Not merged, not deployed, and the migration has not been applied to staging or production.** Every result here comes from local Supabase and local builds with synthetic data. None of it shows production behaviour.

**Merge order:** #456 first, then retarget this PR to `main`.

## What your staff will notice

You made two decisions: Employees use the CRM and see only their own leads, with no new Sales role, and Employees see only their own work. These are the consequences, as stated in the approved plans:

- **Finance staff lose the watchlist.** They are `Employee`, because AXXESS has no finance role. The finance head (`Manager`) keeps it, so every `Manager`, including the sales head, can see it until a finance role exists (M23).
- **Finance staff see only their own leads,** although the audit's finance table wants all deal values. Same cause.
- **Employees lose sight of colleagues' tasks, and can no longer edit or delete them.** This covers all `Employee` staff, including sales agents, the site engineer and finance staff.
- **An Employee cannot find a project they have no task in,** so they cannot link new work to it. A Manager has to add them through a task.
- **A task's history panel shows an Employee only their own actions,** so a Manager's "assigned this to you" event does not appear there. The task itself does.
- **Dashboard totals still count the whole organization.** Employees keep the Snapshot's numbers, which contain no names or titles, but their project and task lists shrink. Say so if you want those hidden too.
- **An Employee's assignee list shows only themselves,** because the user list returns only their own row (M14), so in the task form they can assign only to themselves.
- **Consultants and the agency lose organization-wide documents.** Anything they rely on today must be shared with them explicitly before this reaches production.
- **Employee dashboard lead counts now cover their own leads only.**
- **Outside roles see a message in the dashboard's Snapshot panel** in place of the activity counts: "Organization activity counts are not available for your role."
- **Refused dashboard tiles now say so.** An Employee's finance tiles and a Guest's finance and CRM tiles read "Finance figures are for senior roles." or "CRM figures are for staff." Their badge still reads "Not connected yet".

## Who gets what

| Data | Super Admin, Org Admin, Executive, Manager | Employee | Consultant | Guest |
|---|---|---|---|---|
| CRM leads: read | All | Own only (owner or creator) | Refused | Refused |
| CRM leads: create | Yes | Yes, as owner | Refused | Refused |
| Financial watch: read, create | Yes | Refused | Refused | Refused |
| Stakeholders and notes | Yes | Yes | Refused | Refused |
| Email import | Yes | Yes | Refused | Refused |
| Workflow timeline | Yes | Events they performed | Refused | Refused |
| Dashboard activity counts (added, see below) | Yes | Yes | Refused | Refused |
| Tasks: read | All | Assigned to them or created by them | Assigned only | Assigned only |
| Tasks: change or delete | All | The same tasks only (was any task) | Refused | Refused |
| Tasks: create | Yes | Yes | Refused | Refused |
| Projects: read | All | Own, created, or holding a task they are assigned or created | Same | Same |
| Meetings: read | All | Created by them, or a participant | Same | Same |
| Documents | As now | As now | Owned or shared only | As now |

## Results by finding

"Before" is from `docs/readiness/STACK_PERSONA_ORCHESTRATION_AUDIT_2026_11_05.md`. "After" is from `round7_role_checks.mjs`, through the running production build with the personas, which passed 163 of 163.

| ID | Problem | Before | After |
|---|---|---|---|
| L3 | Outside roles read leads | `GET /api/crm/leads` 200, 37 rows | All 5 outside personas 403, and 0 leads through REST |
| L6 | Watchlist open to everyone | Read 200, create 201 | 8 refused personas, including an `Employee`, an agent and finance staff, each get 403 on read and create and 0 rows through REST. Admin, promoter and finance head still read it |
| L8 | Outside roles read contacts and add notes | 200, 201 | All 5 outside personas 403 on both, and 0 stakeholders through REST |
| L9 | All tasks, projects, meetings and timeline returned | 200, with 41, 3, 3 and 20 rows | Outside personas are limited as in the table. A vendor with one assigned task sees that task and not the other. An `Employee` sees only their own tasks, projects, meetings and timeline events, and can still create a task |
| L10 | Agency and consultant read other people's documents | 200 | Agency, consultant and contract staff cannot read a new organization-wide document. An `Employee` still can |
| L13 | Outside roles create leads and import email | 201, 201, 200 | All 5 outside personas 403 on lead create and email import. Contract staff cannot create a lead through REST |
| L18 | Every agent reads all 30 deal values | 200, all 30 | 30 agents each create a deal (201). Each reads exactly their own, not the other 29, through the API and through REST. Admin, promoter, sales head and finance head read all 30 |

**Found beyond the audit, while checking the Guest dashboard in the browser.** `/api/dashboard/snapshot-periods` returned tenant-wide activity to outside roles (a Guest's Snapshot read "Tasks created: 11" with no tasks of their own). It reads with the service role, so this PR's RLS changes did not cover it. It now returns 403 to outside roles and 200 to an `Employee`. The first fix then left the Guest's panel on "Loading..." forever, so the dashboard no longer requests these counts for outside roles and shows the message above.

**Employees narrowed to their own work, by your decision on 2026-11-06.** My earlier wording here, "The audit's matrix says assigned only", was wrong. The audit asks for assigned-only on tasks, says Employees should read all projects, and does not cover meetings. So narrowing projects and meetings goes beyond the audit, by your choice. This needed more than a read rule:

- `tasks_sprint5_employee_write` was `for all`, so it also gave Employees read, update and delete on every task. It is removed.
- The workflow timeline reads with the service role, so it now filters by actor in the route as well as in RLS.

**Bug in this PR, fixed here.** The meeting rule read `meeting_attendees`, but the app saves participants in `meetings.attendee_ids`, so a Guest or Consultant listed as a participant could not see the meeting. The earlier test passed because it wrote to the table directly.

**Second bug in this PR, found in the browser and fixed here.** The L3 and L6 refusals left dashboard tiles on "Loading financial watchlist..." for an Employee and a Guest, and on "Loading CRM signal..." for a Guest, because the hooks treated a 403 as still loading.

## What changed

- **Migration** `supabase/migrations/20261106135000_employee_own_work.sql`: redefines `holds_task_in_project` to count tasks they created, removes `tasks_sprint5_employee_write`, and adds `tasks_staff_insert`, `tasks_own_update` and `tasks_own_delete`. Replaces `tasks_role_select`, `projects_role_select`, `meetings_role_select` and `workflow_timeline_events_role_select`. No data change.
- **Timeline:** `src/security/rbac.ts` gains `canReadWholeTimeline`, `src/app/api/workflows/timeline/route.ts` passes the actor, and `src/services/workflows/liveTenantWorkflow.ts` filters by it.
- **Dashboard tiles:** `src/hooks/useCrmLeads.ts` and `useFinancialWatchItems.ts` return `null` on a 403, and `src/services/dashboard/buildDashboardSnapshot.ts` shows the restricted text.
- **Migration** `supabase/migrations/20261106130000_api_role_checks.sql`: helpers `is_staff_member`, `is_senior_member`, `holds_task_in_project` and `is_meeting_attendee`, and role-based select or insert policies on `crm_leads`, `financial_watch_items`, `stakeholders`, `stakeholder_notes`, `workflow_timeline_events`, `tasks`, `projects`, `meetings` and `documents`. No backfill and no data change.
- **One table of rules:** `src/security/rbac.ts` gains `canUseCapability` and `canReadAllLeads`.
- **Routes:** `src/app/api/crm/leads/route.ts`, `financial-watch/route.ts`, `stakeholders/notes/route.ts`, `workflows/timeline/route.ts`, `connectors/email/import/route.ts`, `repositories/[resource]/route.ts` (reading stakeholders), `dashboard/snapshot-periods/route.ts`. Refused writes are logged through `recordDeniedAttempt`. Refused reads are not.
- **Own leads:** `src/repositories/crmRepository.ts` takes an owner filter that matches owner or creator.
- **Pages:** `src/app/routing/routes.ts` lets `Employee` open `/crm`. `src/features/workflow-records/WorkflowRecordsPage.tsx`, `src/features/dashboard/DashboardSection.tsx` and `DashboardSnapshotBar.tsx` handle refusal without an error state.
- **Tests:** new `src/security/apiRoleChecks.test.ts` and `src/repositories/crmRepository.ownLeads.test.ts`, a new case in `DashboardSnapshotBar.test.tsx`, and `scripts/verify-access-integrity.mjs` extended from 44 to 105 checks with direct REST checks per the table. Also new cases in `liveTenantWorkflow.timelineFallback.test.ts`, `buildDashboardSnapshot.test.ts` and `dashboardSignalsDemoMode.test.tsx`.

## What did not change

Lead update and reassign routes, a leads page, routing rules (the rest of M1 to M3, M14, M15), a finance role (M23), hiding phone numbers in task text (L4), the user directory for outside roles, Callismatic, and the Settings 50-user limit. No Vercel or AWS settings changed.

## Closeout Evidence

Issue ID: API-ROLE-CHECKS (findings L3, L6, L8, L9, L10, L13, L18)
Title: Make "Access restricted" true at the API and the database
Origin plan: approved plan-mode plan, `~/.claude/plans/transient-drifting-wilkinson.md`
Research artifact: `docs/readiness/STACK_PERSONA_ORCHESTRATION_AUDIT_2026_11_05.md`
Implementation commit(s): `c68f63c`, `954271e`, on branch `fix/api-role-checks`
PR: https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/457, draft, stacked on #456
Branch: `fix/api-role-checks`, from `fix/access-and-audit-integrity`
Files changed: listed above

Verification commands and raw results, on the final code unless stated:

- `pnpm run lint`: `LINT_EXIT=0`, zero warnings
- `pnpm run typecheck`: `TYPE_EXIT=0`
- `pnpm --dir apps/mobile run typecheck`: `MOBILE_EXIT=0`
- `pnpm run test --maxWorkers=3`: `Test Files  339 passed (339)`, `Tests  2033 passed (2033)`, `TEST_EXIT=0`
- `pnpm run build`: `BUILD_EXIT=0`
- `pnpm run supabase:verify`: `status passed`, 50 migrations, exit 0, one warning, `20260702165736_initial_enterprise_schema.sql: contains permissive using (true) RLS predicate.` That file predates this change and is not touched by it
- `pnpm exec supabase db reset`: every migration and seed applied, exit 0
- `node scripts/verify-access-integrity.mjs`, on a freshly reset database: `status passed, total 105, passed 105`
- Negative control for that script, on a reset database without the new migration: `status failed, total 105, passed 93`, 12 failed. 2 of the 12 were a typo in my test (`in_progress`), since fixed, so the corrected script was not re-run against the old policies. The other 10 include colleague task read, update and delete, and the attendee rule
- `node scripts/verify-two-tenant-isolation.mjs`: `ISOLATION_EXIT=0`
- `round7_role_checks.mjs`, in the shared audit notes folder, with 62 personas seeded (`failures=0`), on a freshly reset database: `status passed, total 163, passed 163`
- Playwright against the local production build with `E2E_RUN_SEEDED=true`, on plain seeds: `auth`, `user-admin`, `audit-logs`, `6 passed (38.4s)`
- `pnpm exec playwright test tests/e2e/sprint27-golden-path.spec.ts tests/e2e/sprint29-pilot-acceptance.spec.ts`, with the release gate's environment and `CI=1`: `2 passed (45.5s)`, `GATE_EXIT=0`, with `--retries=0` and Docker stopped. See the Sprint 27 error below
- `pg_policies` on `tasks`, `projects`, `meetings` and `workflow_timeline_events`: the only `for all` policies left are `tasks_manager_write`, `projects_manager_write`, `projects_sprint5_manager_write`, `meetings_manager_write` and `meetings_sprint5_manager_write`, and each allows Super Admin, Organization Admin, Executive and Manager only
- Browser pane, local production build:
  - `agent01` on `/crm`: not restricted, and the leads API returns only `SYNTH Round7 agent01`.
  - `contract02` (`Guest`) on `/crm`: "Access restricted", and snapshot counts return 403.
  - `contract02` on `/dashboard`: role `Guest`, no error text, not stuck loading, and the Snapshot panel shows the message above. Screenshot taken in the session, not stored in the repo.
  - `employee03` (`Employee`) on `/tasks`, `/projects`, `/meetings`, `/crm`: each loads. They show 2 tasks, 1 project and 1 meeting, all their own. Screenshots taken in the session.
  - `employee03` on `/dashboard` after the fix: no "loading" text, 4 finance tiles restricted, 0 CRM tiles restricted. `vendor` (`Guest`): no "loading" text, 4 finance and 3 CRM tiles restricted. The Employee's Snapshot still reads 12 tasks created across the organization, as stated above.
  - As `employee03`, `GET /api/repositories/audit_logs` returns 200 and 0 rows, so the audit log does not reopen colleagues' work. The only refused call on the dashboard was `/api/financial-watch`, 403, as intended.

Deploy evidence: not applicable, not deployed. Live endpoint checks: none, so production status is **not verified**.

Acceptance criteria (from the approved plan):

1. Every table cell checked for each role, through the API and direct REST. Met locally: `apiRoleChecks.test.ts`, `verify-access-integrity.mjs`, `round7`.
2. An agent sees exactly their own leads, and 30 agents' deal values are not visible to each other or to outside roles. Met locally.
3. A sales agent can open `/crm`, a `Guest` cannot. Met locally. An agent has no sidebar link and needs the URL, see the limits below.
4. A `Guest` dashboard loads with no error state. Met locally.
5. A Guest with an assigned task sees that task and no others. Met locally, with the vendor persona (`Guest`).
6. Standard suite with exact counts, and PR CI passes. Suite met. **PR CI is read on #457, not recorded here, and the Sprint 27/29 gate does not run until the PR targets `main`.**

Acceptance criteria for narrowing Employees (from the third approved plan), all local:

1. Every Employee cell in the table checked through the API and direct REST, with a second Employee's data planted. Met: `verify-access-integrity.mjs`, `round7`.
2. An Employee cannot read, update or delete a colleague's task. Met, with a negative control.
3. A participant in `attendee_ids` sees the meeting, for Employee and for Guest. Met, and a colleague not listed does not.
4. No other permissive policy gives an Employee these rows. Met: `pg_policies` above.
5. A Manager still sees and edits everything. Met.
6. `/tasks`, `/projects`, `/meetings` and the dashboard load as an Employee with no error state. Met, after the tile fix.
7. Standard suite with exact counts, and #457 CI passes. Suite met, CI read on #457.

Regression test: written before the fix and seen failing.

- Role table: `Test Files 2 failed (2)`, `Tests 66 failed | 42 passed (108)`, then `Tests 108 passed (108)`.
- Snapshot counts: `Tests 11 failed | 116 passed (127)`, then, with both new files, `Tests 129 passed (129)`.
- Stuck panel: `Tests 1 failed | 12 passed (13)`, then, with the `DashboardSection` tests, `Tests 33 passed (33)`.
- Timeline actor filter: `Tests 2 failed | 133 passed (135)`, then `Tests 135 passed (135)`.
- Stuck finance tiles: `Tests 2 failed | 43 passed (45)`, then `Tests 45 passed (45)`.
- Stuck CRM tiles: `Tests 2 failed | 45 passed (47)`, then `Tests 47 passed (47)`.

Errors hit this session:

- Error: the Guest dashboard showed tenant counts, found in the browser after 146 of 146 API checks had passed.
  Resolution: fixed, test first, and `round7` extended to 152 checks.
- Error: the fix for that left the Snapshot panel on "Loading..." forever for outside roles.
  Resolution: fixed, test first, confirmed in the browser.
- Error: lint failed on an unused `otherId` in `verify-access-integrity.mjs`.
  Resolution: fixed by using it in a stricter "Manager sees both leads" check. Full lint exit 0.
- Error: integrity script fixtures failed on missing `storage_path`, then `mime_type`. One check had been passing without testing anything.
  Resolution: fixed, 86 of 86, and that check now tests real data.
- Error: `user-admin` failed with 62 personas seeded, because the seeded employee sits past the 50-user list limit, the follow-up already recorded in the #456 closeout.
  Resolution: run on plain seeds as planned, passes.
- Error: `sprint17-pilot-readiness.spec.ts` fails 2 of 2 locally.
  Resolution: recorded as E2E-SPRINT17-STALE, owner Claude Code. Neither failure comes from this change. "Pilot team access" is in no file under `src` at the base commit `b8013e3`. `getByRole("button", { name: "ai" })` also matches the sidebar's "AI Workspace AI" button. This spec runs in no workflow under `.github`. Not fixed here, because it is out of scope.
- Error: `sprint27-golden-path.spec.ts` failed without demo mode, then was flaky under the gate's environment: a 30-second `page.goto` timeout, then "Review extracted tasks" not found, then a pass on the third attempt.
  Resolution: the first is explained, because the gate sets `NEXT_PUBLIC_AXXESS_DEMO_MODE=true` and the mailbox message the spec clicks is demo data (`IntegrationsSection.tsx:215`). Hypothesis for the second: first-time dev compilation on this 8 GB machine. Success check met: with a warm cache and `--retries=0`, `1 passed (36.7s)`. That supports the hypothesis without proving it. The real check is the gate on the PR, which only runs once the base is `main`.
- Error: `Email import failed. 401 Unauthorized.` in the dev server log during the gate specs.
  Resolution: not caused by this change. It is a 401, from the signed-out check, not this PR's 403. This run had no Supabase and no session, and the spec passes.
- Error: Docker Desktop would not start, and `docker version` hung. I first guessed low memory, which was wrong.
  Resolution: `com.docker.backend.exe.log` showed "backend crashed" at `dockerInference`, then at `docker-secrets-engine/engine.sock`: leftover 0-byte socket files Windows cannot open (error 1920). `del` and `fsutil` both failed, so the folders were renamed and Docker recreated them. Recorded as DOCKER-STALE-SOCKET, owner founder: the older `*.stale-*` folders in `%LOCALAPPDATA%` show it has happened before, and it can recur. The renamed folders are still there, holding only empty socket files.
- Error: `verify-access-integrity.mjs` failed 2 checks after the migration, both `tasks_sprint7_status_check`.
  Resolution: my typo, `in_progress` for `in-progress`. Fixed, 105 of 105.
- Error: a second `round7` run on the same database failed 9 of 163, for example 60 deals where 30 are expected.
  Resolution: the harness counts exact rows and is not repeatable, and all 9 failures were doubled counts or rows left by the first run. Success check met: on a reset database, one run, 163 of 163.
- Error: `supabase db reset` failed once with `LegacyDbSetupError: error running container: exit 1`, leaving an empty database.
  Resolution: hypothesis, the running app server and browser tab, since the two earlier resets had neither. Stopped them and reset with `--debug`: exit 0. That fits the hypothesis without proving it.
- Error: `aws-mcp` timed out, and `aws sts get-caller-identity` reports an expired session. `aws login` then hit a 400 in normal Chrome and Builder ID errors through GitHub.
  Resolution: not needed for this local work, so left at your request, and still blocks the staging re-run. Owner: founder. During this I printed the AWS account ID in session output by mistake, and told you. It is in no file in the repo.
- Error: with Supabase running, `sprint27-golden-path.spec.ts` failed 4 of 4 with `--retries=0` at "Review extracted tasks", and a first gate run gave 1 failed and 1 flaky (Sprint 29).
  Resolution: the failure screenshot shows "Preview extraction" disabled with the request pending and the dev server badge on "Compiling". Free memory was 87 MB, on this 8 GB machine with Supabase's containers up. The page is on `/integrations`, which no commit in this PR changes. Stopped Supabase and Docker (885 MB free), and the success check was met: `2 passed (45.5s)` with `--retries=0`. Run the gate specs with Docker stopped on this machine. The real check is the gate on the PR, once the base is `main`.
- Error: a screenshot timed out while the browser pane was hidden.
  Resolution: retried once the page had settled, and it worked.
- Earlier blocker closed: VITEST-WORKER-TIMEOUT, from the #456 closeout. CI on #456 ran the full suite on the merged code: run `42212681486`, `Test Files 337 passed (337)`, `Tests 1895 passed (1895)`. The full suite here also ran clean locally with `--maxWorkers=3`.

Decision outcomes:

- Decision: Employees use the CRM and see only their own leads, with no new Sales role (founder).
  Outcome: works locally. Pending on real use, review by 2026-11-20.
- Decision: Employees see only their own tasks, projects and meetings, with projects kept in after I corrected my description of the audit (founder).
  Outcome: works locally. Pending on real use, review by 2026-11-20.
- Decision: `Manager` keeps the watchlist until a finance role exists, against the matrix's `N` (approved plan).
  Outcome: works locally. Pending M23, review by 2026-11-20.
- Decision: outside roles are refused tenant activity counts, added during this work.
  Outcome: works locally. Pending on production, review by 2026-11-20.

Final status: Code complete
Remaining risk: listed below
Follow-up issue IDs: listed below
Supersedes: none
Superseded by: none
Reopened by: none

## Partial, unsupported and known limits

- **Not tested on staging or production.** Staging remains blocked on your access.
- **Consultants and the agency may lose documents they use.** No count of affected documents exists, because that needs read access to the real database.
- **A document's file can still be fetched by an outside member who has its path.** `axxess_documents_storage_select` only checks `is_org_member`. Not changed here.
- **`programs` still returns a row to a `Guest`.** It was not in the approved table, so it is unchanged. Being fixed in a separate session.
- **`project_updates`, `decisions`, `risks` and `meeting_attendees` rows stay readable by every member.** They were outside the approved plan, so an Employee can still reach these through REST for work they cannot otherwise see.
- **`/projects` still shows an Employee the New Project form.** They cannot write projects, and this pass did not change that. Audit finding M13 says such a refusal returns 500.
- **The migrations have only been tested on seeded data.** Effects on real Employees' daily work are unknown until staging or production.
- **The `workflow_timeline_events` insert policy is unchanged.** Reads are limited, writes are not narrowed here.
- **Agents can open `/crm`, but it lists contacts, not leads, and there is no sidebar link.** The API returns their own leads, and the page to show them is M3.
- **`toolRegistry.ts` still reads with the service role,** for admin-issued agent keys that carry their own capability scope. Not changed here.
- **`updateCrmLead` and `updateFinancialWatchItem` are not checked at route level.** The search of routes found no caller.
- **Pages on the other side of a refusal were checked for the dashboard, `/crm` and workflow records.** Other pages that call these routes were reviewed in code but not opened as each role.

## Follow-ups

- **Your decision:** whether to hide the organization-wide Snapshot numbers from Employees.
- **Narrow `project_updates`, `decisions`, `risks` and `meeting_attendees`** to match.
- **A way to add someone to a project without a task,** and the user directory (M14).
- **DOCKER-STALE-SOCKET:** stop Docker's leftover sockets blocking startup.
- **M23:** a finance role, which would close both finance exceptions above.
- **M1 to M3:** a leads page, a sidebar link for agents, and lead reassignment.
- **`programs` for outside roles, and document storage paths.**
- **E2E-SPRINT17-STALE:** fix or retire the spec.

## Decision Ledger

Decision: Employees use the CRM and see only their own leads, with no new Sales role, and both the API and RLS enforce the table.
Why: fixing only the routes would leave direct `/rest/v1` calls open, which is how L2 happened. A new role would mean re-classifying staff before anything could ship.
What changed: as listed above.
Architecture boundary: one table in `rbac.ts` for routes and pages, with RLS repeating it in the database. Service-role readers need their own route check, which is why the snapshot route leaked.
Product boundary: no new roles. Employees see only their own tasks, projects, meetings and timeline events, which is tighter than the audit on projects and meetings, by your decision. Snapshot totals stay organization-wide.
Verification: as listed above, local only.
Outcome: Pending, review by 2026-11-20.
Follow-up: merge #456, retarget this PR, read the gate result, then merge and deploy on your approval, with a live check of the deployed SHA.
