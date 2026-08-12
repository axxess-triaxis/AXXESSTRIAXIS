# Two-Tenant Isolation Harness -- Live Re-Verification After Fixture Fixes, Closeout

Date: 2026-08-12
Governance source: `docs/FOUNDER_EXECUTION_EVIDENCE_GOVERNANCE.md`
Related: `docs/readiness/TWO_TENANT_ISOLATION_HARNESS_EXECUTION_2026_08_06.md` (first execution),
`docs/audit/FOUNDER_QUESTIONS.md` Q-004.

## Need For This Test

The Security Hardening Sprint (2026-08-11, PR #220, merged) fixed the two fixture bugs that broke
the 2026-08-06 run's coverage of `knowledge_articles` and `workflow_timeline_events` (a NULL
`author_user_id` failing that table's own RLS `with check`, and a missing `public.users` row
breaking a foreign key on `workflow_timeline_events.actor_user_id`). Those fixes were verified only
by static source assertion (`verify-two-tenant-isolation.test.mjs`) -- explicitly named in
`docs/audit/FOUNDER_QUESTIONS.md` Q-004 as requiring a live re-run against a real Supabase project
before the status could move past `PARTIALLY CLEARED`. This session performed that live re-run.

## Objectives

1. Execute `scripts/verify-two-tenant-isolation.mjs` against the actual production Supabase project
   backing `landing.triaxisventures.com` (`vnliomnfabaicvvvfwia`), the same one used for the
   2026-08-06 run -- no staging/branch project exists for this repo (confirmed: `docs/SUPABASE_CLI.md`
   states this checkout has never been linked to a remote project, and no local Docker daemon is
   available in this environment either).
2. Confirm all 6 of 6 `REQUIRED_COVERAGE` resource types (`projects`, `tasks`, `documents`,
   `knowledge_articles`, `audit_logs`, `workflow_timeline_events`) now report both
   `crossTenantReadBlocked: true` and `crossTenantWriteBlocked: true`, closing the 2-of-6 gap the
   2026-08-06 run left open.
3. Credentials were held and used entirely by the founder in their own PowerShell session --
   Claude Code has no Supabase credentials in this environment (confirmed: `.env.local` has zero
   `SUPABASE_*`-named variables) and did not request, receive, or handle the service-role key at any
   point. All commands were provided as fill-in-the-blank templates; the founder ran them directly.

## Actions Taken

1. **Setup attempts (2, both environment-configuration errors, not isolation runs):**
   - First attempt used the Supabase *dashboard* URL (`https://supabase.com/dashboard/project/...`)
     instead of the project's API URL, with stray `<`/`>` characters included -- failed with
     `Invalid URL` before any request was made. Zero rows created.
   - Second attempt (run `msq508cm`) used the corrected API URL but an invalid anon key -- failed at
     the sign-in step (`401 Invalid API key`) after tenant A's organization, auth user, profile,
     membership, role, and `public.users` row were already created via the (valid) service-role
     admin calls. Tenant B was never created. This left 1 orphaned test organization.
2. **Two full, successful runs**, after the anon key was corrected (run IDs `msq54ahj` and
   `msq54k48`) -- both produced complete, real JSON summaries (below).
3. **Two additional orphaned test organizations pairs (`qa-isolation-msq536tr-*`,
   `qa-isolation-msq53hg3-*`) were found during cleanup** that do not correspond to any run whose
   console output was shared in this session. **No pass/fail claim is made for those two runs** --
   they are accounted for in the cleanup below, not in the isolation-proof evidence.
4. **Cleanup incident** (detailed in its own section below) -- both successful runs' own built-in
   cleanup step failed, leaving test-labeled rows in production. Root-caused, worked around, and
   verified fully remediated, same session.

## Tests Done -- Results (run `msq54k48`, identical to `msq54ahj`)

| Resource | Created | Cross-tenant read blocked | Cross-tenant write blocked |
|---|---|---|---|
| `projects` | Yes | **true** | **true** |
| `tasks` | Yes | **true** | **true** |
| `documents` | Yes | **true** | **true** |
| `knowledge_articles` | **Yes** | **true** | **true** |
| `audit_logs` | Yes | **true** | **true** |
| `workflow_timeline_events` | **Yes** | **true** | **true** |

**Overall harness status: `"passed"`.** All 6 of 6 `REQUIRED_COVERAGE` resource types created
successfully and showed zero cross-tenant leakage, using each tenant's own real, non-privileged
access token (not a service-role bypass) on both the create and attack sides -- real RLS policies
decided every outcome. This closes the 2-of-6 gap the 2026-08-06 run left open:
`knowledge_articles` and `workflow_timeline_events` are now proven, not just fixed-and-unverified.

Full JSON for both runs (`msq54ahj`, `msq54k48`) is preserved in this session's tool-call history,
2026-08-12.

### Cleanup Incident (Found, Root-Caused More Precisely Than 2026-08-06, and Fixed Same Session)

Both successful runs' built-in `cleanUpTenant()` step failed identically:

```
Error: Admin request failed: DELETE /rest/v1/organizations?id=eq.<org> -> 409
  {"code":"23503","details":"Key (organization_id)=(<org>) is not present in table \"organizations\".",
   "message":"insert or update on table \"audit_logs\" violates foreign key constraint \"audit_logs_organization_id_fkey\""}
Error: Admin request failed: DELETE /auth/v1/admin/users/<user> -> 500 {"...":"Database error deleting user"}
```

**Root cause -- corrected from the 2026-08-06 doc's diagnosis.** That earlier closeout attributed
this to *pre-existing* `audit_logs` rows blocking the organization delete because they weren't
cleaned up first. That is not what is happening, and would not explain the exact error text (a
`23503` on an *insert/update*, not a delete). The actual mechanism, confirmed by reading
`supabase/migrations/20260703025318_sprint6_server_auth_repositories.sql:204` and
`:45-127` (the `record_enterprise_audit_log()` trigger function):

- `audit_user_roles_changes` fires `AFTER INSERT OR UPDATE OR DELETE ON public.user_roles` and
  unconditionally **inserts a new `audit_logs` row** on every fire, including deletes.
- `user_roles.organization_id` has `ON DELETE CASCADE` from `organizations`, so deleting an
  organization cascades to delete its `user_roles` rows *within the same statement*.
- By the time that cascade-triggered `AFTER DELETE` trigger fires and attempts its own
  `INSERT INTO audit_logs (organization_id, ...) VALUES (OLD.organization_id, ...)`, the parent
  `organizations` row has already been removed (cascade actions run after the parent deletion takes
  effect within the same transaction) -- so the new insert's foreign key check fails immediately,
  and the **entire top-level `DELETE FROM organizations` statement rolls back atomically.**

This means **organizations cannot be hard-deleted through any code path today**, not just this test
harness -- any real org-deletion feature would hit the identical wall. This is a genuine,
previously-undiscovered defect, not a harness-only bug. It is directly relevant to Q-006 (data
erasure): real tenant-level erasure execution would need organization deletion to work, and it
currently cannot.

**Practical upside of the atomic rollback:** because the failure is atomic, nothing was ever
partially deleted -- every test organization and all of its cascaded child rows remained fully
intact (not a half-cleaned mess) until the manual remediation below.

**Manual remediation performed:** discovered all orphaned test organizations by pattern
(`slug=like.qa-isolation-*`, found 9 total, spanning the runs listed above), then for each: deleted
its `user_roles` rows first (as their own, separate statement, while the organization still existed
-- so the trigger's `audit_logs` insert succeeded normally, referencing a still-live parent row),
then deleted the organization itself (now cascading cleanly, since no `user_roles` rows remained to
re-trigger the bug). All 9 organizations cleaned successfully on the first attempt with this
ordering. Separately, found and deleted the one remaining orphaned auth user/profile
(`qa-isolation-msq508cm-a@axxess-test.invalid`) -- the other 8 auth-user deletions the harness had
reported as `500` failures turned out to have actually succeeded despite the error (confirmed by
their absence from a follow-up query before any deliberate cleanup action targeted them) --
consistent with the `500` being a secondary/reporting failure after the real deletion already
committed, not a blocked delete. Final verification query (`organizations` by slug pattern,
`profiles` by test-email pattern) returned zero rows for both.

**Recommended fix for `scripts/verify-two-tenant-isolation.mjs`'s `cleanUpTenant()`:** delete
`user_roles` for the tenant's organization before deleting the organization itself, matching the
order used in the manual cleanup above. Not applied in this pass -- named as follow-up, consistent
with the same script's still-outstanding 2026-08-06 cleanup-fix recommendation.

**Not fixed this pass, and explicitly named as a separate, larger item:** the underlying trigger
defect itself (`audit_user_roles_changes` / `record_enterprise_audit_log()`) that makes organization
hard-deletion structurally impossible. A real fix requires a schema migration (e.g., wrapping the
trigger's insert in an exception handler that tolerates a missing parent organization, or excluding
cascade-originated `user_roles` deletes from triggering a new audit-log write) applied to production
-- out of scope for this session per this repo's Production Gate Bypass discipline, which requires
explicit founder go/no-go before any production schema change, not an improvised fix mid-cleanup.

## Chance of Recurrence

Two distinct failure modes happened this session; each has a different recurrence risk.

**1. The organization hard-delete trigger defect (the real bug).** **Will recur on every future
attempt to hard-delete any organization**, through any code path, until the trigger itself is fixed
-- this is not specific to the test harness, a particular run, or today's environment. It is a
structural property of the current schema (`audit_user_roles_changes` firing an unconditional insert
during a cascade that has already removed the parent it references). Anything that ever tries to
delete an organization -- this harness, a future admin "delete tenant" feature, a manual cleanup
script, a DPDP/GDPR erasure execution path -- will hit the same `23503` error, atomically, every
time. **Recurrence likelihood: certain, not probabilistic**, until a schema migration fixes the
trigger (recommendation given above; not applied this pass).

**2. Test runs landing in production and leaving orphaned rows.** This happened on 2026-08-06 and
again today, both times against the same production project, because this repo has no linked
staging/branch Supabase project and no local Docker daemon available in this environment (`docs/SUPABASE_CLI.md`
confirms this). The harness's own header explicitly warns against running it against production
(`scripts/verify-two-tenant-isolation.mjs:39`) -- that warning has now been violated twice, by
necessity, not oversight, because there is currently no alternative target that would let a human
actually run this check. **Recurrence likelihood: high, for the same structural reason**, on any
future re-run of this harness (a regression re-check, a future fixture change, CI integration) --
not because anyone will make the same mistake again, but because the same "production or nothing"
constraint will still be true. The standing fix is provisioning a real staging/branch Supabase
project (or enabling local Docker) so this harness has a non-production target -- named here as a
follow-up, not actioned this session.

Both risks are now at least *detectable* going forward: this closeout and the corrected root-cause
citation mean a future occurrence would be recognized immediately (matching this exact `23503` error
signature) rather than re-diagnosed from scratch, and the safe cleanup order (`user_roles` before
`organizations`) is now documented and known to work, verified against production today.

## Closeout

**What changed:** nothing in application code, RLS policies, or schema. This was a live test
execution plus an out-of-band manual data cleanup -- both fully reversed to a clean state, no
residue.

**What did not change:** no application code, no RLS policies, no schema, no committed script
changes (the `cleanUpTenant()` fix is recommended, not applied).

**What was verified:**
- Real cross-tenant isolation for all 6 of 6 `REQUIRED_COVERAGE` resource types against the actual
  production database, using real non-privileged access tokens on both sides -- **zero leakage
  found anywhere.**
- A previously-undiscovered defect that blocks all organization hard-deletion, root-caused with
  exact file/line citations, not just described.
- Full remediation of all 9 orphaned test organizations and all 9 test auth users -- confirmed via a
  final zero-result verification query, not assumed from the cleanup script's own exit status alone
  (which is exactly the assumption that would have missed the false-negative `500` errors on 8 of 9
  auth-user deletions).

**What remains partial or blocked:**
- The organization hard-delete trigger defect itself is diagnosed but not fixed -- requires a
  production schema migration with its own explicit founder sign-off.
- This was a single run (well, two, identical), not a repeated/CI-integrated regression check.
- Two of the nine orphaned test organizations (`msq536tr-*`, `msq53hg3-*`) came from runs whose
  console output was never shared in this session -- they are accounted for in the cleanup, but no
  isolation pass/fail claim is made for them specifically.

**What claim is still unsupported:** none of this closeout's own claims are unsupported -- every
result above is from the actual runs' printed JSON, or from the verification queries' actual (empty)
output, both captured in this session's tool-call history, 2026-08-12, run IDs `msq54ahj`/`msq54k48`.

**Closure statement:** the standing gap named in Q-004 -- "this fix has NOT yet been re-run against
a real Supabase project" -- is closed. All 6 of 6 resource types now show proven, zero-leakage
cross-tenant isolation against production, using real non-privileged tokens. A new, unrelated defect
(organization hard-delete is structurally broken) was found in the process, root-caused, and named
as its own follow-up item rather than silently folded into this closure.

## Evidence Chain

- Full run JSON (both runs, result only, no credentials): this session's tool-call history,
  2026-08-12, run IDs `msq54ahj` and `msq54k48`.
- Cleanup commands and their full output (9/9 organizations, 9/9 auth users, final zero-result
  verification): same session, same date.
- Trigger root-cause citation: `supabase/migrations/20260703025318_sprint6_server_auth_repositories.sql:204`
  (trigger definition), `:45-127` (`record_enterprise_audit_log()` function body).
- Related: `docs/audit/FOUNDER_QUESTIONS.md` Q-004 (status updated to reflect this closure) and Q-006
  (cross-referenced for the organization-hard-delete defect's relevance to erasure execution).
