# Two-organization stack test closeout (PR 6 of the customer-fireable stack), 2026-11-24

Issue ID: CUSTOMER-FIREABLE-STACK
Origin plan: `docs/readiness/CUSTOMER_FIREABLE_STACK_PLAN_2026_11_20.md`, delivery step 6.
PR: #557, branch `test/stack-two-org-e2e`, test code at `5a52f9a0`.

## Result on staging

GitHub run [45347097022](https://github.com/axxess-triaxis/AXXESSTRIAXIS/actions/runs/45347097022),
`workflow_dispatch` on the branch, 2026-11-24 07:19:24 to 07:30:12 UTC, against staging build
`dpl_6wR5W285nqeqW5xeE3LGgsALcRJe` (`a6dcf64e`): **7 passed (8.8m)**.

| Test | Time |
|---|---|
| A Callismatic lead becomes one AXXESS task | 51.9s |
| A completed Omnidamus conversation becomes one task, no real message sent | 41.6s |
| The same event delivered twice makes one task | 56.0s |
| Spam makes no task | 1.9m |
| A malformed event reaches the failure queue and makes no task | 3.3m |
| Org B's Message with agent becomes a task in org B only | 59.1s |
| A forged organization or an unknown job is refused (409, 404, 401) | 2.3s |

Logs for job `ba942d20-8b5f-4139-82d6-79d895e24112`: staging Omnidamus sent the opening message as
`captured-cac71556-aff3-4d7f-ad5f-c030397a0317` (07:29:00 UTC), and STILL staging logged
`routed:filed,task:36d63ae0-c662-403d-8331-76efd73f43e9` (07:29:06 UTC). The test found one task for
the job in org B and none in org alpha. Production Omnidamus has no log entry in that window.

## What changed

- `tests/stack/two-org.spec.ts`, `twoOrg.ts`, `twoOrg.test.ts`, `stackHelpers.ts`; `stack.spec.ts` uses the shared helpers.
- `.github/workflows/stack-e2e.yml`: three environment values. `infra/stack-e2e-github-role.yaml`: publish to the staging WhatsApp topic, deployed 2026-11-21 04:24 UTC.

## What did not change

App code. Production.

## Problems found on the way

| Found | Cause | Fix |
|---|---|---|
| Vercel Production lost three stack variables (2026-11-21) | Rows were switched to staging instead of added | Founder restored them; API shows all four on both, 2026-11-23 14:04 UTC |
| Lead test failed, run 45191095692 | The Tasks page loads 50 rows; the organization has 57 tasks | #570 |
| Saving a WhatsApp template fails with 2201B | `{1,512}` in the check; PostgreSQL allows 255 | #571 |
| `unauthorized`, run 45332137548 | The staging URL row held the production address. Staging called production Omnidamus, which refused the key (log 05:25:36 UTC). Nothing was sent | Founder set the staging URL, 05:55 UTC |
| `unauthorized`, run 45337948364 | Key in Vercel differed from the staging secret | Founder rotated both staging secrets, 06:51 and 07:08 UTC |
| Sidebar cut off on short screens | Container without a height (#302) | #569 |

The test's random phone number could equal org B's own line or repeat, and it failed on an empty task
list. Both fixed in `5a52f9a0`, unit tests first.

## Verification

- `pnpm exec vitest run tests/stack`: 2 files, 27 tests passed (`5a52f9a0`).
- `pnpm run typecheck`, `pnpm --dir apps/mobile run typecheck`, `pnpm run lint`, `pnpm run supabase:verify`: exit 0 on the code committed as `5a52f9a0`.
- Full vitest and build did not finish locally on `5a52f9a0` (machine out of memory). CI on `5a52f9a0`: 15 success, 1 skipped.

## What remains partial or blocked

- Org B was set up with SQL, not the operator panel. The panel did not appear for the founder on staging. Cause not known. Owner: Claude, needs the founder's `/api/stack/agent-settings` reply. It must work before a customer is set up.
- Staging has #569 and #570, and the #571 change by SQL. None is on main.
- Production migrations `20261120120000`, `20261120140000` and then `20261124060000` (#571) are not reported run.
- Production secret values are unverified. A correct-key production `/start` call has not been made.
- "Call with agent" for a customer, and SMS, are not covered (plan: PR 7).
- The scheduled run from main (Monday 2026-11-30 03:30 UTC) has not run with this test.

## What is unsupported

That a real customer can be served on production today. Nothing here tests production.

## Decision ledger

Decision: set org B up by SQL instead of waiting for the operator panel.
Why: the panel was missing and the test needed only the stored settings.
What changed: two staging rows.
Architecture boundary: the same tables and checks the panel writes.
Product boundary: customers are still set up through the panel only.
Verification: the founder's query returned one row, 2026-11-24.
Outcome: the two-org test passed, run 45347097022.
Follow-up: find why the panel is missing. Review by 2026-12-08.
