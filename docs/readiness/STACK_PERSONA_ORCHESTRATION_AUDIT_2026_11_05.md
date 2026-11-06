# Stack persona orchestration audit (2026-11-05)

**Status: report only. Nothing was fixed, committed, pushed or deployed.** This describes the audit as run on 2026-11-05, and the findings below are left as found.

**Update, 2026-11-06:** L1, L2, M10, L16, L17, M20, M7, M21 and M22 have fixes on branch `fix/access-and-audit-integrity`, verified locally only and not deployed. See `docs/readiness/ACCESS_AND_AUDIT_INTEGRITY_CLOSEOUT_2026_11_06.md`. Every other finding remains open.

One simulated company ran across PORT4LLEO, AXXESS TRIaxis, Callismatic, Omnidamus and STILL with 63 personas. There are 55 findings: 20 leaks, 28 misses and 7 unexpected status results. Nine matter most:

1. **Suspending a user does not remove access.** A suspended employee still signed in, read 37 leads and created a task.
2. **Demoting a user only half works.** A sales head demoted to Guest was refused by the API, but still wrote tasks and listed 67 users by calling the database directly.
3. **"Access restricted" is mostly a screen, not a control.** Contract staff, vendors and customers see that message on `/tasks` and `/crm`, but the API gives them all tasks, leads and finance items.
4. **Callismatic production answers its read routes with no key.** The fix merged on 2026-11-01 ([callismatic#11](https://github.com/axxess-triaxis/callismatic/pull/11)), but production still behaves as if it does not have it.
5. **Lead handling stops at an unowned task.** A lead becomes an AXXESS task with no owner and no CRM record, and the caller's phone number is readable by contract staff, the vendor and the agency.
6. **30 sales agents cannot open the CRM page.** They are shown "Access restricted", and leads cannot be reassigned or moved to a new stage through the API.
7. **An Organization Admin can make anyone a Super Admin, including themselves.** The app's own API accepted it and an invitation can carry the role. It stayed inside the admin's own tenant in every cross-tenant check run.
8. **The audit log cannot be relied on.** 30 agents created deals and none was logged, because audit writes by non-admins fail silently. Contract staff also wrote a fake entry naming the admin as the actor, and the admin's view showed it.
9. **There is no finance module to test.** AXXESS has no invoices, payouts, commissions or vendor payments. The finance team has no role of its own, and the 30 agents' deal values are readable by the vendor, the customer and contract staff.

Cross-tenant reads and writes held in every check, including the Beta tenant admin's, apart from one assignee gap (L12), and no secrets were found in the public bundles scanned.

**The main limit:** signed-in testing ran locally. Staging is behind Vercel SSO and the AWS session has expired, so nothing signed-in ran on staging or production, and the real event bus and real model triage did not run in this pass.

## 1. What ran, and where

| Product | Target | Commit | What ran | What did not |
|---|---|---|---|---|
| AXXESS TRIaxis | `next start` on `localhost:3100` with local Supabase | `1e7db6f` (branch `fix/deps-high-alerts-batch`) | Production build, 58 accounts, API workflows, role sweep, page sweep. A later run added 4 accounts for finance and admin | Mobile apps, real email, real AI models, real connectors |
| AXXESS TRIaxis | `landing.`, `www.`, `investor.` and `lite.triaxisventures.com` | Deployed commit not checked | 408 signed-out GETs, public bundle scan on 3 of the hosts, row counts on 114 tables with no rows requested | Any signed-in check |
| Callismatic | In-process app with synthetic data and fake keys | `aa5758b` (`origin/master`) | Key checks on routes, 163 tests | Real model triage, CALL-E, Twilio, WhatsApp, Google |
| Callismatic | Production Function URL | Deployed image not checked | 9 signed-out GETs, status and size only | Bodies were not read. No writes |
| Omnidamus | In-process handler | `76110c1` (`origin/master`) | Forged SNS records, 94 tests | Real conversation, DynamoDB, deployed stack |
| STILL | Real adapter code in-process, against local AXXESS | `f4e6dfe` (`origin/main`) | Lead, duplicate, spam and completion events, 70 tests | Event bus, failure queue, deployed stack |
| PORT4LLEO | `port4leo-sigma.vercel.app` | `4ec5ae9` read on `origin/main`; deployed commit not checked | 19 signed-out GETs, bundle scan, code read | Local run, its tests, GitHub sign-in, any payout |

The AXXESS commit is not `main` (`d393d8f`). Between them, `src` and `supabase` differ only in `src/app/page.tsx`, `src/demo/demoDataset.ts`, `src/demo/demoMode.test.ts` and `src/features/tasks/TasksSection.tsx`, so no API route, auth code or RLS policy differs.

**Which runs predate the finance team and admin.** Every run behind L1 to L15, M1 to M18, U1 to U3 and Appendices A to C happened before these two personas were added, so none of them exercised those personas. The matrix addition was written next, before any finance or admin workflow. Finance and admin then ran in a later run on the same commit, with the local database rebuilt, and produced L16 to L20, M19 to M28 and U4 to U7. That later run re-checked L3 and L6 for finance data, and did not re-run the other earlier findings.

**A correction to the first runs.** The earlier PORT4LLEO route list came from an older local checkout. `origin/main` does have bounties and PayPal payouts, so 4 signed-out GETs were added for them.

Three local changes were needed to run at all, and each is a limit on the results:

- Seeded users could not sign in, so their auth rows were repaired (finding M12).
- `user_roles` rows were added to mirror what `src/auth/provisioning.ts` writes, because the seeds do not create them (finding M12).
- STILL's https-only URL check was bypassed in the test script, and its DynamoDB store was replaced with an in-memory one.

## 2. Expected-access matrix

Written before any persona workflow ran, so results are compared to it and not the other way round.

### Modelling choices

- **Company:** seeded tenant Alpha (`10000000-0000-4000-8000-000000000001`) stands in for the simulated company. Seeded tenant Beta is the unrelated company used for cross-tenant checks.
- **Contract staff:** the founder gave no count. This audit uses **5**.
- **Total personas:** 3 SMEs + 1 promoter + 15 employees + 5 contract staff + 1 site engineer + 2 consultants + 1 agency + 1 sales head + 30 sales agents = **59**.
- **Existing software stack:** the tools the company already uses, reached through product integrations: Google Workspace (Gmail, Calendar, Sheets), Microsoft 365, Notion, Slack, WhatsApp Business, Twilio, Todoist, GitHub. Modelled as connector status and OAuth-start behaviour only. No third-party account is connected and no real third-party call is made.
- **SMEs:** the lead has no account at any stage, and enters as an inbound message. The vendor and existing customer are external people, modelled as `Guest` in the company tenant, because AXXESS has no vendor or customer role.
- **Role choice:** AXXESS has 7 assignable roles (`Super Admin`, `Organization Admin`, `Executive`, `Manager`, `Employee`, `Consultant`, `Guest`). Business roles such as sales agent, site engineer and contractor do not exist, so each maps to the nearest role. That gap is itself tested.

### Per-product role map

| Persona | AXXESS TRIaxis | Callismatic | Omnidamus | STILL | PORT4LLEO |
|---|---|---|---|---|---|
| SME lead | None. Inbound only | Message sender, no access | Conversation counterpart, no access | None | None |
| SME vendor | `Guest` | None | Conversation counterpart | None | None |
| SME customer | `Guest` | Message sender, no access | Conversation counterpart | None | None |
| Promoter | `Executive` | Read key holder | None | None | None |
| Employee x15 | `Employee` | None | None | None | Own GitHub profile only, if any |
| Contract staff x5 | `Guest` | None | None | None | None |
| Site engineer | `Employee` | None | None | None | None |
| Consultant x2 | `Consultant` | None | None | None | None |
| Marketing agency | `Consultant` | None | None | None | None |
| Sales head | `Manager` | Read key holder | None | None | None |
| Sales agent x30 | `Employee` | Read key holder at most | None | None | None |
| Company admin (support role, needed to invite) | `Organization Admin` | Admin key holder | None | None | Listed admin login, if any |
| Service identity | Agent key with `create_task` only | Admin key | IAM | IAM producer policy | GitHub App |

### AXXESS: what each persona should and should not reach

`Y` = should succeed. `N` = should be refused with 401, 403 or 404, or return no rows. `Own` = only that persona's own records. `Assigned` = only records shared with or assigned to that persona. These are the audit's business expectations, not a restatement of the code.

| Capability | Org admin | Promoter | Sales head | Sales agent | Employee | Site engineer | Consultant / agency | Contract staff | Vendor / customer | Beta-tenant user | Signed out |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Read CRM leads | Y | Y | Y | Own or team only | N | N | N | N | N | N | N |
| Create CRM lead | Y | N | Y | Y | N | N | N | N | N | N | N |
| Read another agent's lead | Y | Y | Y | N | N | N | N | N | N | N | N |
| Read tasks | Y | Y | Y | Assigned | Assigned | Assigned | Assigned | Assigned | Assigned | N | N |
| Create tasks | Y | Y | Y | Y | Y | Y | N | N | N | N | N |
| Read projects | Y | Y | Y | Y | Y | Y | Assigned | Assigned | Assigned | N | N |
| Read documents | Y | Y | Y | Permitted | Permitted | Permitted | Assigned | Assigned | Assigned | N | N |
| Read user directory with email | Y | Y | Y | Y | Y | Y | N | N | N | N | N |
| Read stakeholders | Y | Y | Y | Y | Y | Y | N | N | N | N | N |
| Read audit logs | Y | Y | N | N | N | N | N | N | N | N | N |
| Create invitations or edit users | Y | N | N | N | N | N | N | N | N | N | N |
| Read notifications | Own | Own | Own | Own | Own | Own | Own | Own | Own | N | N |
| Financial watch | Y | Y | N | N | N | N | N | N | N | N | N |
| Analytics export | Y | Y | Y | N | N | N | N | N | N | N | N |
| Admin consoles (`/api/admin/*`) | Y | N | N | N | N | N | N | N | N | N | N |
| Agent connection management and keys | Y | N | N | N | N | N | N | N | N | N | N |
| Connector credentials | Y | N | N | N | N | N | N | N | N | N | N |
| Use AI or RAG over tenant data | Y | Y | Y | Y | Y | Y | Assigned | N | N | N | N |
| Change the role of any user | Y | N | N | N | N | N | N | N | N | N | N |

### Other products: should and should not

| Product | Should | Should not |
|---|---|---|
| Callismatic | Refuse read routes and `/mcp` with no key (401). Refuse side-effect routes with a read key. Reject webhook POSTs with no valid signature | Show caller numbers or transcripts to anyone with no key, including on `/`. Place a call unless explicitly asked by an admin |
| Omnidamus | Accept only signed SNS records and direct invokes. Capture outbound on staging. Keep one customer's conversation apart from another's | Expose any public HTTP route when deployed. Send a real message from a test run |
| STILL | Accept events only from IAM producers. Create one AXXESS task per lead. Send bad events to the failure queue | Create tasks in the wrong tenant. Hold keys in code or logs. Grant the adapter's key more than `create_task` |
| PORT4LLEO | Show public profiles publicly. Require sign-in for settings, sync, overrides and audits. Hide admin routes with 404 | Show private tokens or private profiles to others. Serve secrets in client bundles |
| Cross-product | Carry one lead through to a named owner, keep identity joined, and let the sales head see the outcome | Copy personal data into a product that a persona should not read |

### Added later: finance team and admin

The founder added these two personas after the first runs. This subsection was written before any finance or admin workflow ran. Sections 4 to 7 say which runs predate them.

- **Finance team:** the founder gave no size. This audit uses **3**: one finance head (`Manager`) and two finance staff (`Employee`). AXXESS has no finance role, so these are the nearest ones.
- **Admin:** **1**, as `Organization Admin`. This is a named account separate from the seeded company admin used earlier.
- **Total personas:** 59 + 3 + 1 = **63**.

| Capability | Finance head and staff | Admin | Sales head | Sales agent | Promoter | All other Alpha personas | Beta admin | Signed out |
|---|---|---|---|---|---|---|---|---|
| Read invoices, payouts and vendor payments | Y | N | N | N | Y | N | N | N |
| Create or approve invoices and vendor payments | Y | N | N | N | N | N | N | N |
| Read and calculate commissions for all 30 agents | Y | N | Team only | Own only | Y | N | N | N |
| Export finance data | Y | N | N | N | Y | N | N | N |
| Read deal values on all leads | Y | Y | Y | Own only | Y | N | N | N |
| Manage users, roles and invitations | N | Y | N | N | N | N | Own tenant only | N |
| Grant themselves `Super Admin` | N | N | N | N | N | N | N | N |
| Read audit logs | Y, finance events | Y | N | N | Y | N | Own tenant only | N |
| Change or delete audit logs | N | N | N | N | N | N | N | N |
| Write a forged audit entry | N | N | N | N | N | N | N | N |
| Change tenant settings, connectors and agent keys | N | Y | N | N | N | N | Own tenant only | N |

**Every admin action should leave an audit entry naming who did it.**

| Product | Admin should | Non-admins should |
|---|---|---|
| AXXESS TRIaxis | Manage users, roles, invitations, settings and agent keys in their own tenant, with each change logged | Be refused on every admin route |
| Callismatic | Hold the admin key, with admin actions attributable | Be refused side-effect routes with no key or a read key |
| Omnidamus | Administer through IAM only | Have no route to reach |
| STILL | Administer through IAM only | Have no route to reach |
| PORT4LLEO | Be listed in `ADMIN_GITHUB_LOGINS`. Payouts stay in PayPal sandbox unless live is set on purpose | Get 404 on admin routes |

## 3. Coverage

### Personas

| Persona | Count | Driven | How |
|---|---|---|---|
| SME lead | 1 | Simulated | No account, as designed. Synthetic lead event through STILL, plus CRM leads created by agents |
| SME vendor | 1 | Yes | `Guest` session |
| SME existing customer | 1 | Yes | `Guest` session, and a synthetic Omnidamus completion event |
| Promoter | 1 | Yes | `Executive` session |
| Employees | 15 | 3 of 15 | All 15 exist. `employee01`, `employee14` and `employee15` were driven. The other 12 hold the same role and were not |
| Contract staff (count chosen: 5) | 5 | 5 of 5 | `Guest` sessions |
| Site engineer | 1 | Yes | `Employee` session, API and page checks. Mobile not run |
| Consultants | 2 | 2 of 2 | `Consultant` sessions |
| Marketing agency | 1 | Yes | `Consultant` session |
| Sales head | 1 | Yes | `Manager` session |
| Sales agents | 30 | 30 of 30 | Signed in and worked at the same time |
| Finance head (count chosen: 1) | 1 | Yes | `Manager` session. Later run only |
| Finance staff (count chosen: 2) | 2 | 2 of 2 | `Employee` sessions. Later run only. `finance02` signed in only, and holds the same role as `finance01` |
| Admin | 1 | Yes | `Organization Admin` session, plus the seeded Beta admin for tenant crossing. Later run only |
| Existing software stack | Modelled | Partial | Connector status, credential and import routes only. No real third-party account or call |

Personas only exist as signed-in users in AXXESS. Callismatic and Omnidamus have no per-person accounts and PORT4LLEO only has GitHub identities, so the runs in those products are key checks and event checks, not user sessions (finding M6).

### Workflows

| Workflow | Status | Result |
|---|---|---|
| Lead to agent | **Yes**, local | 30 of 30 signed in and created a lead and a task. Burst of 90 calls: 12.3 s, p50 4.3 s, max 6.0 s, no errors |
| Agent to sales head | **No** | The head can see leads through the API, but cannot reassign them or change their stage (M2) |
| Sales head to customer | **No** | No conversion step exists, and no AXXESS route starts an Omnidamus conversation (M4) |
| Callismatic lead to AXXESS task through STILL | **Yes**, local adapter only | One task, duplicate ignored, spam ignored. Bus and queue not used here. They last passed on staging on 2026-11-04, per `STACK_E2E_STAGING_CLOSEOUT_2026_11_04.md` |
| Omnidamus completion to AXXESS task | **Yes**, local adapter only | One task, with the customer's phone and email in its text (L4) |
| Vendor onboarding | **Yes**, with a defect | Invite, sign-up and accept all worked, but accept returned 500 (M7). The invite token was planted locally, because no email provider is set |
| Site engineer field work | **Partial** | Task create and status changes passed. File upload did not finish, because the script did not run the multi-step upload. Mobile and offline were not run. Tasks have no location or photo fields (M9) |
| Contract staff restrictions | **Yes** | Repository writes were refused, but other routes were open (L3, L6, L8, L13) |
| Consultant and agency scope | **Yes** | No project scoping found (L9, L10) |
| Promoter oversight | **Partial** | Leads, tasks and finance items are readable. Audit logs return an empty 200 (M11) |
| Offboarding and role change | **Yes** | Both fail (L1, L2, M10) |
| Cross-tenant | **Yes** | Reads and writes held. One assignee gap (L12) |
| Invoices, payouts, commissions, vendor payments | **No**, nothing to exercise | 13 routes, 5 tables and 7 pages return 404 (M19). No payment was attempted |
| Commissions for 30 agents | **Partial**, local | All 30 created a deal at the same time, 30 of 30 returned 201. Finance can read each value and owner. No commission field or calculation exists (M19) |
| Vendor payment, using a watch item as the nearest record | **Yes**, with defects | Created and read, but open to every role (L6), cannot be closed (M24) and is not logged for non-admins (M20) |
| Finance exports | **Partial**, local | Analytics and approvals exports return only `{"ok":true}`, and no finance export exists. Audit export returns 500 for non-admins (U4) |
| Admin: users, roles, invitations | **Yes**, local | All worked and were logged, but `Super Admin` can be granted (L16) and nothing guards against suspending an admin (M25) |
| Admin: agent keys and connectors | **Yes**, local | Worked. Revoked key returned 401. Key creation and revocation are not logged (M21) |
| Admin: audit log | **Yes**, local | Rows cannot be changed or deleted, but can be forged (L17), and non-admin and denied actions are missing (M20, M22) |
| Tenant admin crossing tenants | **Yes**, local | Beta admin got no Alpha data and changed nothing (section 7) |
| Non-admins on admin routes | **Yes**, local | 11 personas on 21 routes: 187 refused with 403, 44 returned 200, see L19 and section 6 |
| Admin in Callismatic | **Yes**, in-process | Key checks hold, but actions cannot be tied to a person (M26) |
| Admin in Omnidamus and STILL | **Code only** | IAM only, with no routes. AWS session expired |
| Admin and payouts in PORT4LLEO | **Code**, plus 4 signed-out GETs | Sign-in is blocked, and payout routes were not called |
| Existing tools | **Blocked** | Needs test accounts on each tool (section 8) |
| PORT4LLEO in any workflow | **No** | It has no link to the other four products (M5) |
| Real model triage and real channels | **Blocked** | AWS session expired, and real outbound was ruled out for this pass |

### Executed, compared with read from code

Each finding has an **Evidence** value:

- **Local** means executed on `localhost` or in-process with synthetic data.
- **Prod** means executed on production, signed out and read-only.
- **Code** means only read from code or docs, and not executed in this pass.
- **Prior** means reported by an earlier repo document and not re-tested here.

## 4. Findings: leaks

| ID | Severity | Product | Persona | Route | Status | Reproduction | Evidence |
|---|---|---|---|---|---|---|---|
| L1 | **Critical** | AXXESS | Suspended employee | `POST /api/auth/login`, `GET /api/crm/leads`, `POST /api/repositories/tasks`, `GET /rest/v1/tasks` | 200, 200 (37 rows), 201, 206 | Admin sends `PATCH /api/repositories/users?id=<user>` with `status: suspended` and gets 200. The user's old session and a fresh sign-in both keep working. A search of `src/auth/serverSession.ts` and `src/app/api/auth` found no status check | Local |
| L2 | **High** | AXXESS | Demoted sales head | `POST /rest/v1/tasks`, `GET /rest/v1/users` | 201, 206 (67 users) | Admin sets the head to `Guest`. The API then returns 403 on writes, but a new session token still writes and lists through Supabase REST. `users.role` changes and `user_roles` does not | Local |
| L3 | **High** | AXXESS | Contract staff, vendor, customer, consultant, agency | `GET /api/crm/leads` | 200 (37 rows) | Sign in as `Guest` and call the route. Page `/crm` shows "Access restricted" to the same user. No role check in `src/app/api/crm/leads/route.ts`, and the repository reads with the service role | Local |
| L4 | **High** | AXXESS, STILL | Contract staff, vendor, agency, agents | `GET /api/repositories/tasks` | 200 | Send a synthetic lead and an Omnidamus completion through the STILL adapter. Each Alpha persona checked (contract staff, vendor, agency, agent, sales head) found the caller's phone and the customer's phone and email in the task text. The tasks RLS policy allows all organization members | Local |
| L5 | **High** | Callismatic | Anyone | `/api/digest`, `/api/todos`, `/api/blocklist` on the production Function URL | 200, 200, 200 (243, 2, 2 bytes) | Signed-out GET. Main returns 401 on these routes, so production is behind main. Bodies were not read. The small sizes suggest little data today | Prod |
| L6 | **High** | AXXESS | Contract staff, vendor, consultant, all agents | `GET /api/financial-watch`, `POST /api/financial-watch` | 200 (1 row), 201 | Sign in as `Guest`, read and create an item. No role check on either verb. Matrix says `N` | Local |
| L7 | **High** | Callismatic | Anyone | `GET /` | 200 (5,173 bytes locally; 4,638 on production) | Plant synthetic data and call with no key. Triage summaries and blocked phone numbers appear, while the API routes refuse the same data with 401. On production only the status and size were read | Local, Prod |
| L8 | **Medium** | AXXESS | Contract staff, vendor, customer, agency | `GET /api/repositories/stakeholders`, `POST /api/stakeholders/notes` | 200, 201 | A vendor can read the company's other contacts, and a `Guest` can add a note. `/stakeholders` shows the same `Guest` "Access restricted" | Local |
| L9 | **Medium** | AXXESS | Contract staff, vendor, consultant, agency | `/api/repositories/tasks`, `projects`, `meetings`, `/api/workflows/timeline` | 200 (41, 3, 3 and 20 rows) | All rows in the tenant are returned with no project scoping. `/tasks` shows "Access restricted" to `Guest` | Local |
| L10 | **Medium** | AXXESS | Agency, consultant | `GET /api/repositories/documents` | 200 | The agency session read documents created by the admin and the site engineer with no permission granted. `Guest` correctly did not | Local |
| L11 | **Medium** | AXXESS | Sales agent | `PATCH /api/repositories/tasks?id=<admin's task>` | 200 | An agent overwrote the title of an admin's task. RLS allows any `Employee` to write any task | Local |
| L12 | **Medium** | AXXESS | Alpha admin | `POST /api/repositories/tasks` | 201 | A task in Alpha kept an assignee from Beta. Whether Beta's user then sees its title was not checked | Local |
| L13 | **Medium** | AXXESS | Contract staff, vendor | `POST /api/crm/leads`, `POST /rest/v1/crm_leads`, `POST /api/connectors/email/import` | 201, 201, 200 | A `Guest` can create leads and import an email into the tenant. Vendor was run on the first route, contract staff on all three | Local |
| L14 | **Low** | AXXESS | Contract staff | `POST /api/execution/jobs/run` with `approved: true` | 200 | The approval flag comes from the caller, and no role is checked. The local run had no real runner configured, so real execution was not shown | Local |
| L15 | **Low** | Callismatic | Anyone | `/docs`, `/openapi.json`, `/redoc` | 200 | Signed-out GET on production and main. Gives the full route list | Prod, Local |
| L16 | **High** | AXXESS | Organization Admin | `PATCH /api/repositories/users?id=<self or other>`, `POST /api/invitations`, `POST /rest/v1/user_roles` | 200, 200, 200, 201 | Send `{"role":"Super Admin"}` for yourself, then for another user: both are stored. An invitation with that role is stored too. A direct insert gives the admin the `Super Admin` row that RLS reads. It is logged as `role.changed`, with the actor shown under the new role. **Held in this run:** still 403 on the Super Admin route, invites into Beta and Beta's organization, 500 and no change on a Beta user, and 0 Beta rows on the first page of users, tasks and projects. Other Super Admin code paths were not all tried | Local |
| L17 | **High** | AXXESS | Contract staff (`Guest`) | `POST /rest/v1/audit_logs` | 201 | With `Prefer: return=minimal`, insert a row with `actor_user_id` set to the admin and `actor_role` set to `Organization Admin`. The row is stored and the admin's audit view shows it. The policy `audit_logs_member_insert` checks only membership. From another tenant the same insert returned 403 | Local |
| L18 | **High** | AXXESS | Vendor, customer, contract staff, consultant, agency, sales agents | `GET /api/crm/leads` | 200 | 30 agents each create a deal with `estimatedValue`. Each of these personas then reads all 30 with their values, and each agent reads the other 29. Beta personas read 0. This extends L3 to deal values | Local |
| L19 | **Low** | AXXESS | All 11 non-admin personas tried | `GET /api/connectors/enterprise/credentials` | 200 | Contract staff see which connectors are set, with status and dates, and each provider's field names. No credential value was returned. Saving and deleting are refused with 403 | Local |
| L20 | **Low** | AXXESS | Finance staff, contract staff | `/admin/users`, `/admin/workspaces`, `/admin/compliance`, `/admin/usage-limits`, `/admin/pilot-command-center`, `/admin/support-ops`, `/admin/mobile-release` and others | Page 200 | 14 admin pages load for finance staff with no access message, 7 of them also checked as contract staff. Each shows the admin menu and fixed text. Their data calls return 403, so no tenant data appeared | Local |

## 5. Findings: misses

| ID | Severity | Product | Persona | Route | Status | What is missing, and how to see it | Evidence |
|---|---|---|---|---|---|---|---|
| M1 | **High** | AXXESS | 30 sales agents, employees, site engineer | `/crm`, `/stakeholders` | Page 200, "Access restricted" | Sign in as `Employee` and open `/crm`. The people the CRM is for cannot use it, yet the API lets them read and create leads | Local |
| M2 | **High** | AXXESS | Sales head | `PATCH`, `PUT`, `DELETE /api/crm/leads` | 405 each | No route reassigns a lead or moves its stage. The head could only do so by calling the database directly | Local |
| M3 | **High** | STILL, AXXESS | Sales head, agents | Adapter `create_task` | Task created | A lead becomes a task with `assigneeId` null and no `crm_leads` row (0 found). There is no routing to any of the 30 agents | Local |
| M4 | **High** | AXXESS, Omnidamus | Sales head, customer | None | Not applicable | No step turns a won lead into a customer, and no AXXESS route starts an Omnidamus conversation. STILL's README lists AXXESS to Omnidamus as not built | Code |
| M5 | **Medium** | PORT4LLEO | All | None | Not applicable | No PORT4LLEO source mentions Callismatic, Omnidamus or the STILL bus. Governance findings do not become AXXESS tasks | Code |
| M6 | **High** | Callismatic, Omnidamus, STILL | All | Callismatic keys, Omnidamus IAM | Not applicable | No shared identity. Callismatic has one read key and one admin key for everyone, so its logs cannot tell people apart, and an agent cannot be limited to their own leads | Code, Local |
| M7 | **High** | AXXESS | New vendor | `POST /api/invitations/accept` | 500 | Accept returns 500 although the user has joined with the right role. Server log: audit insert refused by RLS. The user sees a failure, and that audit row is lost. The reason for the refusal was not confirmed | Local |
| M8 | **Medium** | AXXESS | Sales agent, site engineer, contractor, vendor | Role model | Not applicable | Only 7 roles can be assigned, with no sales, field, contractor or vendor role. `src/security/enterpriseIam.ts` defines a further 8-role model with `Auditor` | Code |
| M9 | **Medium** | AXXESS | Site engineer | `tasks` | Not applicable | Tasks have no location or photo fields in the repository's select list. Mobile and offline were not tested | Code |
| M10 | **High** | AXXESS | Promoted user | `PATCH /api/repositories/users` | 200 | The reverse of L2. An employee promoted to `Manager` still gets only their own row through Supabase, because `user_roles` is not updated. Only provisioning, tenant and invite code write that table | Local |
| M11 | **Medium** | AXXESS | Promoter | `GET /api/repositories/audit_logs` | 200, 0 rows | An `Executive` gets an empty result and not a refusal, so it looks like no activity happened. Matrix says `Y` | Local |
| M12 | **Medium** | AXXESS | Testers | `POST /auth/v1/token`, seeds | 500 `unexpected_failure` | After a fresh local reset, seeded users cannot sign in, and the seeds create no `user_roles` rows, so RLS role checks fail for every seeded user. Partly known from the 2026-11-04 closeout | Local |
| M13 | **Medium** | AXXESS | Any writer | `POST` and `PATCH /api/repositories/*`, `POST /api/financial-watch` | 500 | Bad input and RLS refusals return 500 where 400 or 403 is meant: `priority: High`, an unknown task or user status, an unknown finance category, an RLS refusal, and a missing document `storage_path` | Local |
| M14 | **Medium** | AXXESS | Sales agent, employee | `GET /api/repositories/users` | 200, 1 row | They only see themselves, so a person has no list to pick an assignee from. The API accepts an assignee ID if they already know it. Matrix says `Y` | Local |
| M15 | **Medium** | AXXESS | Sales head | `/crm`, `/dashboard` | 200 | No page lists CRM leads. `/crm` shows stakeholders, and the `crm_leads` hook only feeds the dashboard snapshot. No lead title appeared on either page for the head | Local, Code |
| M16 | **Low** | AXXESS | All 8 page personas | `/admin/backups` | 404 | The page does not exist. Already known from the 2026-11-04 parity note | Local |
| M17 | **Medium** | AXXESS | Scheduler | `/api/cron/*` (3 routes) | 503 | On landing, www and investor. Scheduled jobs do not run. Earlier notes attribute this to a missing `CRON_SECRET`. Already known | Prod |
| M18 | **Medium** | STILL | Sales head | Production lead rule | Not checked | Per the 2026-11-04 closeout, the every-lead rule is on staging only, so production may still drop leads the model does not flag. Could not re-check: AWS session expired | Prior |
| M19 | **High** | AXXESS | Finance team | `/api/invoices`, `/api/payouts`, `/api/commissions`, `/api/vendor-payments`, `/api/payments`, `/api/finance`, 7 others; `/rest/v1/{invoices,payouts,commissions,vendor_payments,payments}`; `/finance`, `/invoices`, `/payouts`, `/commissions`, `/financial-watch`, 2 billing pages | 404 each | None of these exists. Leads have `estimatedValue` and `ownerUserId`, but no commission, paid or invoice field. Razorpay is only listed in `src/services/integrations/pluginRegistry.ts`. The one finance record is the manual watchlist | Local |
| M20 | **High** | AXXESS | Every non-admin role | `POST /api/crm/leads`, `POST /api/financial-watch`, `POST /api/auth/login`, `POST /api/audit-logs` | 201, 201, 200, 500 | 30 lead creates added 0 audit rows. 14 watch item creates added 1, from the Beta admin. Only admin roles have `auth.login` rows. Audit writes ask for the new row back (`supabaseEnterpriseRepositories.ts:431`), RLS lets only admins read it, the insert fails, and most callers discard the error. Same cause as M7. The same insert succeeded with `return=minimal` (L17) | Local |
| M21 | **High** | AXXESS | Admin | `POST`, `DELETE /api/agents/connections` | 201, 200 | Creating and revoking an agent key each added 0 audit rows. The connections, grants and profiles routes have no audit call | Local, Code |
| M22 | Medium | AXXESS | Contract staff, vendor, Beta admin | Admin routes | 403, 403, 500 | 3 refused admin attempts added 0 audit rows, so nobody can see someone probing admin routes | Local |
| M23 | **High** | AXXESS | Finance staff | `/analytics`, `/api/repositories/audit_logs` | "Access restricted", 200 with 0 rows | There is no finance role. `finance01` matched a plain `Employee` on all 8 routes compared. Finance staff cannot open analytics, which the finance head can. The finance team has no finance-only access at all, and reads no audit events | Local |
| M24 | Medium | AXXESS | Finance team | `PATCH`, `DELETE /api/financial-watch` | 405 each | A watch item cannot be updated, paid or closed in the app. Finance cannot remove a fake one, and a vendor's and a contract user's items were both in finance's list. Only the creator can change one, through the database | Local |
| M25 | Medium | AXXESS | Admin | `PATCH /api/repositories/users?id=<admin>` with `{"status":"suspended"}` | 200, 200 | An admin suspended another admin and then themselves, with no warning. Both were restored after the test. Today L1 means suspension does not stop access, but this matters once L1 is fixed | Local |
| M26 | Medium | Callismatic | Admin | `/api/reminders`, `/api/correct/recategorize`, `/api/correct/unblock` | 200 with admin key | Everyone uses one shared admin key. The written `reminders.json`, `corrections.json` and `blocklist.json` have no field saying who acted, and a code search found no logging calls in `web.py` | Local, Code |
| M27 | Low | AXXESS | Admin | `PATCH /api/repositories/organizations?id=<own>` | 403 | Organization name and sector cannot be changed in the app, for any role. `LiteOrganizationSection.tsx:16` says this is on purpose. A direct database call by the admin did rename it (200), and that was logged, so the database allows more than the app | Local |
| M28 | Low | AXXESS | Admin | `/admin/users` | Page 200 | The page says "Invite, deactivate, role-assign" but lists no users. The working list is under `/settings`, which `/admin/invitations` and `/admin/roles` redirect to | Local |

## 6. 401, 403 and other failed calls

Full lists are in Appendices A, B and C.

| Result | Count | Where | Expected? |
|---|---|---|---|
| 401 signed out, every GET route | 61 of 61 | Local sweep | Expected |
| 401 on production signed-out routes | 47 each on landing, www and investor; 9 on lite | Prod | Expected |
| 401 `POST /api/agents/mcp`, missing or wrong key | 2 | Local | Expected |
| 401 `/rest/v1/agent_connections`, anon | 1 | Local | Expected |
| 401 on Callismatic main: read routes and `/mcp` with no key; `/api/reminders/send`, `/api/todos/*/complete` and `/api/triage/text` with no key or read key | All tested | Local | Expected. `/api/reminders` and `/api/correct/*` returned 422 on the script's empty bodies, so their key check was not reached |
| 401 on production Supabase REST, anon | 8 tables | Prod | Expected |
| 403 on admin and governance routes for non-admins | 156 in the sweep | Local | Expected |
| 403 on invite, repository writes, agent export and connector credentials for restricted users | See Appendix B | Local | Expected |
| **U1.** 403 `/api/admin/mobile-release`, `/api/admin/customer-success/live-ops`, called by pages for 7 non-admin personas | 14 | Local page sweep | **Unexpected, Low.** Pages call admin routes for users who cannot use them, which adds console errors |
| **U2.** 500 `GET /api/documents/extract` | 4 hosts | Prod | **Unexpected, Low.** Empty body on a POST-only route. The same request returned 405 locally, so production differs |
| **U3.** Unhandled 404 on an SNS certificate fetch, forged Omnidamus record | 1 | Local | **Unexpected, Low.** Omnidamus raises, where other bad records are dropped. Needs invoke permission to trigger |
| 403 `/webhook` on Callismatic, `/api/webhooks/whatsapp` on AXXESS | Each GET | Prod | Expected |
| 400 `GET /api/auth/oauth/start` with no provider | 4 hosts | Prod | Expected |
| 404 Lite edge block | 66 routes | Prod | Expected. This is the deliberate Lite API allowlist |
| No response from `GET /mcp` on production Callismatic | Timed out at 40 s | Prod | Not determined. A bare GET may hold a stream open |
| 401 `/lite/settings/integrations` on investor | 1 | Not re-run | Already known, on the code in PR #453 |
| 401 on investor `/api/repositories/*`, `/api/agents/*`, `/api/ai/*`, `/api/module-usage-events` from demo pages | Not re-run | Prior | Already known. Investor is a demo build |
| Staging, `/` and API | 302 to Vercel SSO | Prod check | Expected, and it blocks testing |
| 403, non-admins on 7 admin GET routes | 77 of 77 | Local, later run | Expected |
| 403, non-admins on 10 admin write routes | 110 of 110 | Local, later run | Expected |
| 200 with 0 rows, non-admins on `/api/invitations`, `/api/repositories/invitations`, `/api/repositories/audit_logs` | 33 of 33 | Local, later run | Unexpected in form, but no data. Same as M11 |
| 401 Callismatic admin routes, no key, read key or wrong key | 9 of 9 | Local, later run | Expected. Closes the earlier 422 gap |
| 401 agent key after revocation | 1 | Local, later run | Expected |
| 403 Beta admin on Alpha organization, invitation and tenant selection | 3 | Local, later run | Expected |
| 403 `GET /api/admin/pilot-portfolio`, Organization Admin | 2 pages | Local, later run | **U7** |

Unexpected results from the later run:

| ID | Severity | Route | Status | Detail | Evidence |
|---|---|---|---|---|---|
| U4 | Medium | `POST /api/audit-exports`, as finance head, finance staff, contract staff, vendor, agent | 500, empty body | The route was opened to all roles on 2026-08-27, but RLS `audit_exports_admin_insert` allows admins only. Admin gets 201 | Local |
| U5 | Low | `PATCH /api/repositories/users?id=<Alpha user>`, invitations, and `PATCH /api/agents/connections`, as Beta admin. Own admin sending `organizationId` | 500, empty body | Nothing changed, but this should be 403 or 404. Same family as M13 | Local |
| U6 | Medium | `DELETE /api/agents/connections?id=<Alpha connection>`, as Beta admin | 200 `{"ok":true}` | Nothing was revoked and Alpha's key kept working. The caller is told it succeeded | Local |
| U7 | Low | `/admin/product-analytics`, `/admin/pilot-conversion`, as Organization Admin | `GET /api/admin/pilot-portfolio` 403 | The pages open for this role but call a route it cannot use | Local |

## 7. Checks that passed

| Check | Result | Evidence |
|---|---|---|
| Tenant Beta reading Alpha leads, tasks, users, documents, audit logs, finance, stakeholders, invitations | 0 Alpha rows through API or Supabase REST | Local |
| Beta writing Alpha's task or user | Refused, though with 500 (M13) | Local |
| Beta inserting a task with Alpha's organization ID in the body | Saved under Beta | Local |
| Uploading to another tenant's document path | 403 | Local |
| `Guest` escalating their own role through Supabase REST | 0 rows changed | Local |
| Another agent or `Guest` editing a lead through Supabase REST | 0 rows changed | Local |
| Accepting another person's invitation | 403 | Local |
| Agent key limits | `list_tasks` refused with `-32001` on a `create_task`-only key, and a wrong key returned 401. A revoked key returned 401 in the later run. `tools/list` shows tools beyond the key's capability | Local |
| RLS on public tables | On for all 114 | Local |
| Anonymous reads on production Supabase | 98 tables: 0 rows; 8: 401; 8: 400 (no `id` column, so not counted) | Prod |
| Secrets in public bundles | No service keys, provider keys or private keys. Only an `anon` token, the public project URL and PostHog public keys | Prod |
| Omnidamus public surface | No HTTP route in `template.yaml`. Wrong topic and untrusted certificate URL were dropped | Local, Code |
| PORT4LLEO | Cron 401, signed-in routes reject GET with 405, dashboards redirect signed-out users | Prod |
| Beta admin against Alpha: users, organization, invitation, tenant selection, agent key, audit logs | 0 Alpha rows, nothing changed, key still valid. Status codes were 403, 500 (U5) or a false 200 (U6) | Local |
| Beta admin through Supabase REST on Alpha `users`, `organizations`, `user_roles` | 0 rows read, 0 changed, insert 403 | Local |
| Finance items and deals across tenants | Beta personas read 0 deals and only their own 2 watch items. Their update and delete on an Alpha item changed 0 rows | Local |
| Other users changing a finance item through Supabase REST | 0 rows for employee, contract, vendor and agent | Local |
| Admin actions logged | Invite, invite revoke, role up, role back, department, suspend and reactivate each added 1 row. Connector save and delete, and audit export, were logged | Local |
| Audit rows changed or deleted through Supabase REST | 0 rows, as admin and as contract staff | Local |
| Forged audit entry into another tenant | 403, 0 stored | Local |
| Contract staff promoting themselves | 0 rows on `users`, 403 on `user_roles` | Local |
| Moving a user to another tenant | Stayed in Alpha, though with 500 (U5) | Local |
| Credential values | After the admin saved a connector, contract staff's view of the route held no saved value | Local |
| Long lists | `pageSize` and `page` reach all 71 users. Default page is 50 | Local |
| PayPal live payouts | Code requires both `PAYPAL_ENV=live` and `PAYPAL_ALLOW_LIVE=true`. Payout email stripped from public output. Not executed | Code |
| PORT4LLEO payout routes, signed out | `GET /api/bounties` 401, `/api/paypal/webhooks` 405, `/bounties` 200, `/dashboard/bounties` 404 | Prod |

The test suites also passed: Callismatic 163, Omnidamus 94, STILL 70. The AXXESS and PORT4LLEO suites were not run, because this pass changed no code.

## 8. Blocked, and what the founder needs to do

| Item | Blocked by | What is needed |
|---|---|---|
| Any signed-in check on staging | Vercel SSO returns 302, and no bypass secret was used | Name `staging.triaxisventures.com` as in scope, and provide the bypass secret through the existing test variables |
| Staging bus, failure queue, Lambda logs, deployed Callismatic image and production STILL rule | AWS session expired, and `aws-mcp` failed to connect | Run `aws login`, then ask for this check |
| Real Callismatic triage | Same AWS session | Same |
| Existing software stack | No test accounts | Sandbox accounts on the tools you want covered |
| PORT4LLEO signed in | GitHub sign-in | A test GitHub account |
| PORT4LLEO bounty and payout workflow | GitHub sign-in and a PayPal sandbox | A test GitHub account and PayPal sandbox credentials, set by you |
| Finance workflows beyond the watchlist | The feature does not exist (M19) | A decision on whether AXXESS should have it, and what the finance roles are |
| Omnidamus and STILL admin checks | AWS session expired | `aws login`, then ask for an IAM review |
| Mobile and offline field work | Not run | A device or emulator session |

## 9. Proposed fixes, in order

No fix has been made.

1. **L1, L2, M10: make access follow one source.** Check `status` when a session is created and on every request. Make role changes update `users.role` and `user_roles` together, and have RLS deny inactive users. Add tests for suspend and demote.
2. **L5, L7, L15: deploy Callismatic main with its keys set**, per the 2026-11-01 note on `READ_API_KEY`, `ADMIN_API_KEY` and `WHATSAPP_APP_SECRET`. Put `/` behind the read key, and turn off the docs routes in production.
3. **L3, L6, L8, L9, L10, L13: add role checks to API routes**, using the same rules the page guard uses. Routes on the service role need this most, because RLS does not apply to them. Then tighten RLS so `Guest` and `Consultant` are limited to assigned work.
4. **L4: keep phone numbers and emails out of task text.** Store them in a restricted field, or link back to the source record.
5. **M1, M2, M3, M14, M15: build the sales flow.** Allow `Employee` on CRM or add a sales role. Add lead update and reassign routes, a leads page and a routing rule, and have STILL create a lead record.
6. **M7, M13: return correct errors.** Validate input before writing, map RLS refusals to 403, and stop an audit failure from failing an accepted invite.
7. **M12: repair the seeds** so a fresh reset can sign in and RLS works.
8. **M4, M5, M6: decide the cross-product model.** This needs a founder decision: per-person keys or shared identity, AXXESS to Omnidamus, and what PORT4LLEO should send.
9. **L16: limit who can grant `Super Admin`.** Refuse the role in the API and in invitations unless the caller is one, and stop admins inserting it through RLS on `user_roles`.
10. **M20, L17, M7: fix the audit write.** Write audit rows on the server with `return=minimal` or the service role, take the actor from the session, and remove direct inserts from the policy. This one change also clears M7.
11. **M21, M22, M26: log what is missing.** Agent key creation and revocation, refused admin attempts, and who acted in Callismatic.
12. **M19, M23, M24, L18: decide what finance is.** This needs a founder decision: build invoices, payouts and commissions in AXXESS or connect a tool, and add a finance role. Limit deal values to the owner, sales head and finance in the same pass.
13. **U4, U5, U6, M25, M27, M28, L19, L20:** smaller fixes.
14. **L11, L12, L14, U1, U2, U3:** smaller fixes, after the above.

## 10. Exact state

- **Files changed:** this report only, uncommitted in worktree `axxess-high-alerts`.
- **Reverted, after both local runs:** a temporary `.claude/launch.json` entry and the build's change to `next-env.d.ts`.
- **Torn down:** the local Supabase stack with `--no-backup`, so all test accounts and synthetic data are gone. The local AXXESS agent key went with it.
- **Docker:** Docker Desktop was not running. This audit started it, which also started an existing container, `docker-openclaw-gateway-1`, and then stopped Docker Desktop again. The later run started and stopped it a second time.
- **Production traffic:** signed-out GETs, bundle fetches and row counts with `limit=0`. Plain HTTP clients run no page scripts, so no analytics events were sent. No accounts were created, and no real credentials were used.
- **Finance and admin test changes:** the first attempt at this run used wrong request bodies, and its results are not used, apart from showing the direct self-promotion that L16 then re-tested. Roles, statuses and the organization name changed by tests were restored while testing, then the whole local database was removed.
- **Outbound:** no emails, messages, calls or payments. One forged SNS test fetched a public AWS certificate URL.
- **Harness and raw results:** `side-session-notes/local_19d10246-b866-4ab3-9e4a-4b44de3c8fa1/persona-audit-2026-11-05/`. They hold no keys. The test password in the scripts is the one already in `supabase/seeds/003_sprint7_e2e_seed.sql`.
- **Not run:** the standard verification suite, because no application code changed.
- **Unsupported claims:** this audit does not show that any finding reproduces on production unless its Evidence says Prod. It does not measure the 80% automation target (`Founder-stated, source artifact needed`).

## Appendices

### Appendix A. Production signed-out GET status, every API route

Commands: plain `curl` GET, bodies discarded. 102 route paths on each of 4 hosts = 408 requests. Columns: landing / www / investor / lite.

| landing / www / investor / lite | Count | Routes | Expected? |
|---|---|---|---|
| 401 / 401 / 401 / 404 | 38 | `/admin/customer-success/live-ops`, `/admin/mobile-release`, `/admin/pilot-acceptance`, `/admin/pilot-command-center`, `/admin/pilot-portfolio`, `/admin/platform-readiness`, `/agents/activity`, `/agents/connections`, `/agents/connections/00000000-0000-4000-8000-000000000000/grants`, `/agents/feedback`, `/agents/profiles`, `/ai/model-policy`, `/ai/reviews`, `/approvals`, `/connectors/enterprise/credentials`, `/connectors/gmail/messages/list`, `/connectors/microsoft/messages/list`, `/connectors/notion/pages/list`, `/crm/leads`, `/dashboard/external-meetings-signals`, `/dashboard/mail-signals`, `/dashboard/meta-business-signals`, `/dashboard/snapshot-periods`, `/dashboard/social-signals`, `/dashboard/threads-signals`, `/execution/jobs`, `/financial-watch`, `/invitations`, `/module-usage-events`, `/pilot-readiness-events`, `/plugins/runtime`, `/rag/evaluation`, `/social-alert-events`, `/social-alert-rules`, `/social-alerts/status`, `/tenants`, `/whatsapp/events/recent`, `/workflows/timeline` | Expected: signed out refused. Lite 404 is the expected edge block |
| 405 / 405 / 405 / 405 | 25 | `/audit-exports`, `/auth/forgot-password`, `/auth/login`, `/auth/logout`, `/auth/mfa/challenge`, `/auth/mfa/enroll`, `/auth/oauth/callback`, `/auth/passkeys/register`, `/auth/phone/link/start`, `/auth/phone/link/verify`, `/auth/phone/start`, `/auth/phone/verify`, `/auth/resend-confirmation`, `/auth/reset-password`, `/auth/sign-up`, `/documents/ingest`, `/documents/storage-url`, `/documents/upload`, `/documents/upload/complete`, `/onboarding/provision`, `/onboarding/seed-sample-data`, `/organizations/logo`, `/profile-media/avatar`, `/rag/query`, `/rag/review` | Expected: POST-only route |
| 405 / 405 / 405 / 404 | 24 | `/account/deletion-request`, `/admin/pilot-command-center/snapshot`, `/agents/export`, `/agents/mcp`, `/agents/profiles/00000000-0000-4000-8000-000000000000`, `/ai`, `/ai/agentic-chat`, `/analytics/export`, `/approvals/00000000-0000-4000-8000-000000000000`, `/approvals/export`, `/audit-logs`, `/connectors/email/import`, `/connectors/gmail/messages/import`, `/connectors/meta-business/sync`, `/connectors/microsoft/messages/import`, `/connectors/notion/pages/import`, `/connectors/threads/sync`, `/execution/jobs/run`, `/invitations/accept`, `/notifications/mark-all-read`, `/privacy/export-request`, `/social-alert-rules/00000000-0000-4000-8000-000000000000`, `/webhooks/resend`, `/whatsapp/settings/phone-number` | Expected: POST-only route. Lite 404 is the expected edge block |
| 401 / 401 / 401 / 401 | 9 | `/auth/session`, `/beta-feedback`, `/connectors/oauth/callback`, `/connectors/oauth/start`, `/connectors/status`, `/onboarding/sample-data`, `/profile`, `/repositories/tasks`, `/stakeholders/notes` | Expected: signed out refused |
| 503 / 503 / 503 / 404 | 3 | `/cron/brand24-alert-sync`, `/cron/pilot-command-center-snapshot`, `/cron/social-connector-sync` | See findings |
| 400 / 400 / 400 / 400 | 1 | `/auth/oauth/start` | See findings |
| 500 / 500 / 500 / 500 | 1 | `/documents/extract` | See findings |
| 403 / 403 / 403 / 404 | 1 | `/webhooks/whatsapp` | See findings |

### Appendix B. Every local 4xx and 5xx from the workflow runs

Local `next start` plus local Supabase. Includes the deliberate bad-payload calls. Marked by the auditor.

| Status | Call | Personas | Calls | Message |
|---|---|---|---|---|
| 400 | POST `/api/ai/agentic-chat` | contract | 1 | userMessage or resume is required |
| 400 | POST `/api/beta-feedback` | contract, vendor | 2 | Feedback type is required. |
| 400 | POST `/api/connectors/email/import` | contract, vendor | 2 | Email subject, sender and selected body text are required. |
| 400 | POST `/api/connectors/gmail/messages/import` | contract, vendor | 2 | Gmail message id is required. |
| 400 | GET `/api/connectors/oauth/start` | contract, vendor | 2 | Unsupported connector provider. |
| 400 | GET `/api/dashboard/snapshot-periods` | promoter | 1 | Unknown period. |
| 400 | POST `/api/documents/upload` | site | 1 |  |
| 400 | POST `/api/invitations/accept` | contract, newvendor | 2 | Invitation is invalid or expired. |
| 400 | POST `/api/onboarding/seed-sample-data` | contract, vendor | 2 | Unknown onboarding goal. |
| 400 | POST `/api/social-alert-rules` | contract, vendor | 2 | provider must be one of: x, facebook, instagram, linkedin, threads, rs |
| 400 | POST `/api/stakeholders/notes` | contract, vendor | 2 | title and body are required. |
| 400 | POST `/api/tenants` | contract, vendor | 2 | Organization id is required. |
| 401 | POST `/api/agents/mcp tools/list` | no-key | 1 | "Missing Bearer API key." |
| 401 | POST `/api/agents/mcp tools/list` | agent-key | 1 | "Invalid or revoked agent API key." |
| 401 | GET `/rest/v1/agent_connections` | anon | 1 |  |
| 403 | GET `/api/admin/pilot-command-center` | promoter | 1 | Organization admin access is required. |
| 403 | GET `/api/agents/activity` | promoter | 1 | Only organization admins can view agent activity. |
| 403 | POST `/api/agents/export` | contract | 1 | Only organization admins can export agent governance data. |
| 403 | POST `/api/connectors/enterprise/credentials` | contract, vendor | 2 | Only Organization Admins can configure enterprise connectors. |
| 403 | POST `/api/documents/upload` | siteEngineer | 1 | Document path is outside the active organization. |
| 403 | POST `/api/documents/upload` | site | 1 |  |
| 403 | POST `/api/invitations` | contract, employee, salesHead, vendor | 4 | You do not have permission to invite users to this organization. |
| 403 | POST `/api/invitations/accept` | contract | 1 | This invitation was sent to a different email address. Sign in as that |
| 403 | DELETE `/api/onboarding/sample-data` | contract, vendor | 2 | Only organization admins and above can remove sample data. |
| 403 | POST `/api/repositories/documents` | contract | 1 | Forbidden. |
| 403 | POST `/api/repositories/knowledge_articles` | contract | 1 | Forbidden. |
| 403 | POST `/api/repositories/meetings` | contract | 1 | Forbidden. |
| 403 | POST `/api/repositories/projects` | contract, salesHead | 2 | Forbidden. |
| 403 | POST `/api/repositories/stakeholders` | contract | 1 | Forbidden. |
| 403 | POST `/api/repositories/tasks` | contract | 1 | Forbidden. |
| 403 | POST `/api/repositories/users` | contract | 1 | Forbidden. |
| 403 | GET `/rest/v1/agent_connections` | betaAdmin, contract | 2 |  |
| 403 | POST `/rest/v1/tasks` | contract | 1 |  |
| 404 | GET `/rest/v1/connector_credentials` | contract | 1 |  |
| 405 | PATCH `/api/crm/leads` | salesHead | 1 |  |
| 405 | PUT `/api/crm/leads` | salesHead | 1 |  |
| 405 | DELETE `/api/crm/leads` | salesHead | 1 |  |
| 405 | POST `/api/whatsapp/settings/phone-number` | contract, vendor | 2 |  |
| 500 | POST `/api/audit-exports` | contract | 1 |  |
| 500 | POST `/api/invitations/accept` | nv | 1 |  |
| 500 | POST `/api/repositories/documents` | admin, site, siteEngineer | 3 |  |
| 500 | PATCH `/api/repositories/tasks` | betaAdmin, site, siteEngineer | 4 |  |
| 500 | PATCH `/api/repositories/users` | admin, betaAdmin, orgAdmin | 4 |  |

### Appendix C. Per-role GET sweep, every non-200

61 GET paths x 14 identities = 854 calls: {401: 61, 200: 624, 403: 156, 400: 13}. Every path returned 401 signed out (61 of 61), which is expected.

| Status | Path | Who | Expected? |
|---|---|---|---|
| 400 | `/dashboard/snapshot-periods` | all 13 signed-in | No, see the note under this table |
| 403 | `/admin/customer-success/live-ops` | agency, betaGuest, consultant, contract, customer, employee, promoter, salesAgent, salesHead, siteEngineer, vendor | Expected |
| 403 | `/admin/mobile-release` | agency, betaGuest, consultant, contract, customer, employee, promoter, salesAgent, salesHead, siteEngineer, vendor | Expected |
| 403 | `/admin/pilot-acceptance` | agency, betaGuest, consultant, contract, customer, employee, promoter, salesAgent, salesHead, siteEngineer, vendor | Expected |
| 403 | `/admin/pilot-command-center` | agency, betaGuest, consultant, contract, customer, employee, promoter, salesAgent, salesHead, siteEngineer, vendor | Expected |
| 403 | `/admin/pilot-portfolio` | all 13 signed-in | Expected |
| 403 | `/admin/platform-readiness` | agency, betaGuest, consultant, contract, customer, employee, promoter, salesAgent, salesHead, siteEngineer, vendor | Expected |
| 403 | `/agents/activity` | agency, betaGuest, consultant, contract, customer, employee, promoter, salesAgent, salesHead, siteEngineer, vendor | Expected |
| 403 | `/agents/connections` | agency, betaGuest, consultant, contract, customer, employee, promoter, salesAgent, salesHead, siteEngineer, vendor | Expected |
| 403 | `/agents/connections/00000000-0000-4000-8000-000000000000/grants` | agency, betaGuest, consultant, contract, customer, employee, promoter, salesAgent, salesHead, siteEngineer, vendor | Expected |
| 403 | `/agents/feedback` | agency, betaGuest, consultant, contract, customer, employee, promoter, salesAgent, salesHead, siteEngineer, vendor | Expected |
| 403 | `/agents/profiles` | agency, betaGuest, consultant, contract, customer, employee, promoter, salesAgent, salesHead, siteEngineer, vendor | Expected |
| 403 | `/beta-feedback` | agency, betaGuest, consultant, contract, customer, employee, promoter, salesAgent, salesHead, siteEngineer, vendor | Expected |
| 403 | `/module-usage-events` | agency, betaGuest, consultant, contract, customer, employee, promoter, salesAgent, salesHead, siteEngineer, vendor | Expected |
| 403 | `/pilot-readiness-events` | agency, betaGuest, consultant, contract, customer, employee, promoter, salesAgent, salesHead, siteEngineer, vendor | Expected |

The 13 400s are all `/dashboard/snapshot-periods` with no `period` query. That was the sweep's bare call, so it is a caller error, not a defect.
