# API role checks: closeout (2026-11-06)

**Status: `Code complete`, draft PR #457, stacked on #456. Not merged, not deployed, and the migration has not been applied to staging or production.** Every result here comes from local Supabase and local builds with synthetic data. None of it shows production behaviour.

**Merge order:** #456 first, then retarget this PR to `main`.

## What your staff will notice

Your decision was that Employees use the CRM and see only their own leads, with no new Sales role. These are the consequences, as stated in the approved plan:

- **Finance staff lose the watchlist.** They are `Employee`, because AXXESS has no finance role. The finance head (`Manager`) keeps it, so every `Manager`, including the sales head, can see it until a finance role exists (M23).
- **Finance staff see only their own leads,** although the audit's finance table wants all deal values. Same cause.
- **Employees still see all tasks, projects and meetings.** The audit's matrix says assigned only. Narrowing it would change daily work for every `Employee`, so it needs its own decision from you.
- **Consultants and the agency lose organization-wide documents.** Anything they rely on today must be shared with them explicitly before this reaches production.
- **Employee dashboard lead counts now cover their own leads only.**
- **Outside roles see a message in the dashboard's Snapshot panel** in place of the activity counts: "Organization activity counts are not available for your role."

## Who gets what

| Data | Super Admin, Org Admin, Executive, Manager | Employee | Consultant | Guest |
|---|---|---|---|---|
| CRM leads: read | All | Own only (owner or creator) | Refused | Refused |
| CRM leads: create | Yes | Yes, as owner | Refused | Refused |
| Financial watch: read, create | Yes | Refused | Refused | Refused |
| Stakeholders and notes | Yes | Yes | Refused | Refused |
| Email import | Yes | Yes | Refused | Refused |
| Workflow timeline | Yes | Yes | Refused | Refused |
| Dashboard activity counts (added, see below) | Yes | Yes | Refused | Refused |
| Tasks | All | All, unchanged | Assigned only | Assigned only |
| Projects | All | All, unchanged | Own, or holding a task in it | Same |
| Meetings | All | All, unchanged | Owner or attendee | Same |
| Documents | As now | As now | Owned or shared only | As now |

## Results by finding

"Before" is from `docs/readiness/STACK_PERSONA_ORCHESTRATION_AUDIT_2026_11_05.md`. "After" is from `round7_role_checks.mjs`, through the running production build with the personas, which passed 152 of 152: 42 setup checks and 110 role checks.

| ID | Problem | Before | After |
|---|---|---|---|
| L3 | Outside roles read leads | `GET /api/crm/leads` 200, 37 rows | All 5 outside personas 403, and 0 leads through REST |
| L6 | Watchlist open to everyone | Read 200, create 201 | 8 refused personas, including an `Employee`, an agent and finance staff, each get 403 on read and create and 0 rows through REST. Admin, promoter and finance head still read it |
| L8 | Outside roles read contacts and add notes | 200, 201 | All 5 outside personas 403 on both, and 0 stakeholders through REST |
| L9 | All tasks, projects, meetings and timeline returned | 200, with 41, 3, 3 and 20 rows | Outside personas are limited as in the table. A vendor with one assigned task sees that task and not the other. An `Employee` can still create a task |
| L10 | Agency and consultant read other people's documents | 200 | Agency, consultant and contract staff cannot read a new organization-wide document. An `Employee` still can |
| L13 | Outside roles create leads and import email | 201, 201, 200 | All 5 outside personas 403 on lead create and email import. Contract staff cannot create a lead through REST |
| L18 | Every agent reads all 30 deal values | 200, all 30 | 30 agents each create a deal (201). Each reads exactly their own, not the other 29, through the API and through REST. Admin, promoter, sales head and finance head read all 30 |

**Found beyond the audit, while checking the Guest dashboard in the browser.** `/api/dashboard/snapshot-periods` returned tenant-wide activity to outside roles (a Guest's Snapshot read "Tasks created: 11" with no tasks of their own). It reads with the service role, so this PR's RLS changes did not cover it. It now returns 403 to outside roles and 200 to an `Employee`. The first fix then left the Guest's panel on "Loading..." forever, so the dashboard no longer requests these counts for outside roles and shows the message above.

## What changed

- **Migration** `supabase/migrations/20261106130000_api_role_checks.sql`: helpers `is_staff_member`, `is_senior_member`, `holds_task_in_project` and `is_meeting_attendee`, and role-based select or insert policies on `crm_leads`, `financial_watch_items`, `stakeholders`, `stakeholder_notes`, `workflow_timeline_events`, `tasks`, `projects`, `meetings` and `documents`. No backfill and no data change.
- **One table of rules:** `src/security/rbac.ts` gains `canUseCapability` and `canReadAllLeads`.
- **Routes:** `src/app/api/crm/leads/route.ts`, `financial-watch/route.ts`, `stakeholders/notes/route.ts`, `workflows/timeline/route.ts`, `connectors/email/import/route.ts`, `repositories/[resource]/route.ts` (reading stakeholders), `dashboard/snapshot-periods/route.ts`. Refused writes are logged through `recordDeniedAttempt`. Refused reads are not.
- **Own leads:** `src/repositories/crmRepository.ts` takes an owner filter that matches owner or creator.
- **Pages:** `src/app/routing/routes.ts` lets `Employee` open `/crm`. `src/features/workflow-records/WorkflowRecordsPage.tsx`, `src/features/dashboard/DashboardSection.tsx` and `DashboardSnapshotBar.tsx` handle refusal without an error state.
- **Tests:** new `src/security/apiRoleChecks.test.ts` and `src/repositories/crmRepository.ownLeads.test.ts`, a new case in `DashboardSnapshotBar.test.tsx`, and `scripts/verify-access-integrity.mjs` extended from 44 to 86 checks with direct REST checks per the table.

## What did not change

Lead update and reassign routes, a leads page, routing rules (the rest of M1 to M3, M14, M15), a finance role (M23), hiding phone numbers in task text (L4), the user directory for outside roles, Callismatic, and the Settings 50-user limit. No Vercel or AWS settings changed.

## Closeout Evidence

Issue ID: API-ROLE-CHECKS (findings L3, L6, L8, L9, L10, L13, L18)
Title: Make "Access restricted" true at the API and the database
Origin plan: approved plan-mode plan, `~/.claude/plans/transient-drifting-wilkinson.md`
Research artifact: `docs/readiness/STACK_PERSONA_ORCHESTRATION_AUDIT_2026_11_05.md`
Implementation commit(s): `c68f63c`, on branch `fix/api-role-checks`
PR: https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/457, draft, stacked on #456
Branch: `fix/api-role-checks`, from `fix/access-and-audit-integrity`
Files changed: listed above

Verification commands and raw results, on the final code unless stated:

- `pnpm run lint`: `LINT_EXIT=0`, zero warnings
- `pnpm run typecheck`: `TYPE_EXIT=0`
- `pnpm --dir apps/mobile run typecheck`: `MOBILE_EXIT=0`
- `pnpm run test --maxWorkers=3`: `Test Files  339 passed (339)`, `Tests  2025 passed (2025)`, exit 0, no worker errors
- `pnpm run build`: `BUILD_EXIT=0`
- `pnpm run supabase:verify`: `status passed`, 49 migrations, 114 tables, all 114 with RLS, exit 0, one warning, `20260702165736_initial_enterprise_schema.sql: contains permissive using (true) RLS predicate.` That file predates this change and is not touched by it
- `pnpm exec supabase db reset`: every migration and seed applied, exit 0
- `node scripts/verify-access-integrity.mjs`, on a freshly reset database: `status passed, total 86, passed 86`. This ran before the dashboard page change, which touched no route or migration
- `node scripts/verify-two-tenant-isolation.mjs`: `status passed`, `coverageMissing []`, `cleanupErrors []`. Same timing
- `round7_role_checks.mjs`, in the shared audit notes folder, with 62 personas seeded (`failures=0`): `status passed, total 152, passed 152, failed 0`. Same timing
- Playwright against the local production build with `E2E_RUN_SEEDED=true`, on plain seeds: `auth`, `user-admin`, `audit-logs` and `sprint17-pilot-readiness` together, `6 passed`, with the 2 Sprint 17 failures below. Sprint 27 failed in this mode only because it needs demo mode
- `pnpm exec playwright test tests/e2e/sprint27-golden-path.spec.ts tests/e2e/sprint29-pilot-acceptance.spec.ts`, with the release gate's environment and `CI=1`: `1 flaky`, `1 passed (1.8m)`, exit 0. Re-run of Sprint 27 alone with `--retries=0`: `1 passed (36.7s)`, exit 0
- Browser pane, local production build:
  - `agent01` on `/crm`: not restricted, and the leads API returns only `SYNTH Round7 agent01`.
  - `contract02` (`Guest`) on `/crm`: "Access restricted", and snapshot counts return 403.
  - `contract02` on `/dashboard`: role `Guest`, no error text, not stuck loading, and the Snapshot panel shows the message above. Screenshot taken in the session, not stored in the repo.

Deploy evidence: not applicable, not deployed. Live endpoint checks: none, so production status is **not verified**.

Acceptance criteria (from the approved plan):

1. Every table cell checked for each role, through the API and direct REST. Met locally: `apiRoleChecks.test.ts`, `verify-access-integrity.mjs`, `round7`.
2. An agent sees exactly their own leads, and 30 agents' deal values are not visible to each other or to outside roles. Met locally.
3. A sales agent can open `/crm`, a `Guest` cannot. Met locally. An agent has no sidebar link and needs the URL, see the limits below.
4. A `Guest` dashboard loads with no error state. Met locally.
5. A Guest with an assigned task sees that task and no others. Met locally, with the vendor persona (`Guest`).
6. Standard suite with exact counts, and PR CI passes. Suite met. **PR CI is read on #457, not recorded here, and the Sprint 27/29 gate does not run until the PR targets `main`.**

Regression test: written before the fix and seen failing.

- Role table: `Test Files 2 failed (2)`, `Tests 66 failed | 42 passed (108)`, then `Tests 108 passed (108)`.
- Snapshot counts: `Tests 11 failed | 116 passed (127)`, then, with both new files, `Tests 129 passed (129)`.
- Stuck panel: `Tests 1 failed | 12 passed (13)`, then, with the `DashboardSection` tests, `Tests 33 passed (33)`.

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
- Error: a screenshot timed out while the browser pane was hidden.
  Resolution: retried once the page had settled, and it worked.
- Earlier blocker closed: VITEST-WORKER-TIMEOUT, from the #456 closeout. CI on #456 ran the full suite on the merged code: run `42212681486`, `Test Files 337 passed (337)`, `Tests 1895 passed (1895)`. The full suite here also ran clean locally with `--maxWorkers=3`.

Decision outcomes:

- Decision: Employees use the CRM and see only their own leads, with no new Sales role (founder).
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
- **`programs` still returns a row to a `Guest`.** It was not in the approved table, so it is unchanged.
- **The `workflow_timeline_events` insert policy is unchanged.** Reads are limited, writes are not narrowed here.
- **Agents can open `/crm`, but it lists contacts, not leads, and there is no sidebar link.** The API returns their own leads, and the page to show them is M3.
- **`toolRegistry.ts` still reads with the service role,** for admin-issued agent keys that carry their own capability scope. Not changed here.
- **`updateCrmLead` and `updateFinancialWatchItem` are not checked at route level.** The search of routes found no caller.
- **Pages on the other side of a refusal were checked for the dashboard, `/crm` and workflow records.** Other pages that call these routes were reviewed in code but not opened as each role.

## Follow-ups

- **Your decision:** whether `Employee` should be narrowed to assigned tasks, projects and meetings, as the audit's matrix says.
- **M23:** a finance role, which would close both finance exceptions above.
- **M1 to M3:** a leads page, a sidebar link for agents, and lead reassignment.
- **`programs` for outside roles, and document storage paths.**
- **E2E-SPRINT17-STALE:** fix or retire the spec.

## Decision Ledger

Decision: Employees use the CRM and see only their own leads, with no new Sales role, and both the API and RLS enforce the table.
Why: fixing only the routes would leave direct `/rest/v1` calls open, which is how L2 happened. A new role would mean re-classifying staff before anything could ship.
What changed: as listed above.
Architecture boundary: one table in `rbac.ts` for routes and pages, with RLS repeating it in the database. Service-role readers need their own route check, which is why the snapshot route leaked.
Product boundary: no new roles. Employee access to tasks, projects and meetings is unchanged, pending your decision.
Verification: as listed above, local only.
Outcome: Pending, review by 2026-11-20.
Follow-up: merge #456, retarget this PR, read the gate result, then merge and deploy on your approval, with a live check of the deployed SHA.
