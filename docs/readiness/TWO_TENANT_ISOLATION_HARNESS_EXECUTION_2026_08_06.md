# Two-Tenant Isolation Harness -- First Real Execution, Closeout

Date: 2026-08-06
Governance source: `docs/FOUNDER_EXECUTION_EVIDENCE_GOVERNANCE.md`

## Need For This Test

`scripts/verify-two-tenant-isolation.mjs` was written in Sprint 5 (2026-07-22) but had never been
executed against a real database in any prior sprint. Every claim this program had made about
tenant isolation before this test was proven only at the unit-test / static-RLS-policy level
(`supabaseEnterpriseRepositories.test.ts`, `tenantGuard.test.ts`) -- never against a real, running
Supabase project with two real tenants exercising real RLS policies end to end. This was the single
largest recurring caveat across `docs/SPRINT_1_TO_4_GAP_ANALYSIS_2026_07_22.md` and
`docs/SPRINT_5_CLOSEOUT_2026_07_22.md`. Separately, real operational evidence already existed --
the founder reported no data leakage observed across 4 (now 5, including admin) real live tenants
in practice -- but that is qualitatively different evidence from a scripted, repeatable, adversarial
test with a pass/fail assertion per resource type. This test was needed to convert "no leakage
observed" into "no leakage possible, proven against real RLS policies."

## Objectives

1. Execute the existing Sprint 5 harness against the actual production Supabase project backing
   `landing.triaxisventures.com` -- the same database the platform's real tenants use -- not a
   local or branch database, so the result speaks directly to production risk.
2. Prove or disprove cross-tenant data leakage for every resource type in the harness's own
   `REQUIRED_COVERAGE` list (`projects`, `tasks`, `documents`, `knowledge_articles`, `audit_logs`,
   `workflow_timeline_events`), using a second tenant's own real, non-privileged access token --
   not a service-role/admin bypass -- so the result reflects what an actual malicious or
   misconfigured tenant could attempt through the app's real API surface.
3. Do this without touching, reading, or risking any of the platform's real tenant data --
   the harness is designed to create and then fully delete its own throwaway test tenants.
4. Leave no residue: verify the harness's own cleanup step actually removes everything it created.

## Actions Taken

1. **Credential handling.** The founder provided the production `SUPABASE_SERVICE_ROLE_KEY`
   directly in chat for this one run, per their own explicit choice among the options offered. It
   was used only in-memory via Node's `--env-file` flag against a temp file written outside the
   repository (OS temp directory, never a tracked path), never echoed in any tool output, never
   logged, and the temp file was deleted immediately after each use -- once for the harness run,
   once again for the manual cleanup pass described below. `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (non-sensitive) were pulled separately via
   `vercel env pull --environment=production`.
2. **Execution.** Ran `node --env-file=<temp>.env scripts/verify-two-tenant-isolation.mjs` against
   `https://vnliomnfabaicvvvfwia.supabase.co`. Run ID: `mshjon07`.
3. **Incident response (same session).** The harness's own cleanup step partially failed (foreign
   key ordering bug in the script -- detailed below), leaving test-labeled rows in production.
   Diagnosed the exact cause, wrote a one-off cascade-ordered cleanup script (kept outside the
   repository, deleted after use, not committed since it is not meant to be reusable), re-obtained
   the service-role key from the founder for this second, narrower purpose, ran the cleanup, and
   verified all 24 delete operations succeeded.
4. **Documentation.** This closeout, plus dated update sections added to
   `docs/SPRINT_1_TO_4_GAP_ANALYSIS_2026_07_22.md` cross-referencing this result.

## Tasks Performed (What The Harness Itself Does)

1. Created two throwaway organizations ("QA Isolation Test Org A/B") and one real Supabase Auth
   user per organization (`qa-isolation-mshjon07-a@axxess-test.invalid`,
   `...-b@axxess-test.invalid`), each granted "Organization Admin" in their own org only.
2. Signed in as each user via the real password-grant flow to obtain a real access token --
   exactly what a browser session has, not an admin/service-role token.
3. As tenant A's user: created one row per resource type (`projects`, `tasks`, `documents`,
   `knowledge_articles`, `audit_logs`, `workflow_timeline_events`).
4. As tenant B's user, using tenant B's own real access token: attempted to (a) read tenant A's
   just-created row by ID and (b) update it by ID, both via PostgREST directly, so real RLS
   policies decided the outcome -- not application code.
5. Recorded pass/fail per resource type and printed a JSON summary.
6. Attempted best-effort cleanup of every row and both auth users/organizations created.

## Tests Done -- Results

| Resource | Created | Cross-tenant read blocked | Cross-tenant write blocked | Note |
|---|---|---|---|---|
| `projects` | Yes | **true** | **true** | Clean pass |
| `tasks` | Yes | **true** | **true** | Clean pass |
| `documents` | Yes | **true** | **true** | Clean pass |
| `audit_logs` | Yes | **true** | **true** | Clean pass |
| `knowledge_articles` | **No** | n/a | n/a | Tenant A's own create attempt was rejected: `403`, `new row violates row-level security policy for table "knowledge_articles"` |
| `workflow_timeline_events` | **No** | n/a | n/a | Tenant A's own create attempt was rejected: `409`, foreign key violation -- `actor_user_id` must reference a row in a `users` table the harness never populates (it only creates an Auth user + `profiles` row) |

**Overall harness status: `"failed"`**, per the script's own strict definition (every one of the 6
`REQUIRED_COVERAGE` resource types must show both booleans `true`). This must not be misread as "an
isolation defect was found" -- **isolation passed with zero failures everywhere it was actually
exercised.** The `"failed"` status reflects that 2 of 6 resource types have no real coverage yet,
because the harness's own test-fixture setup broke before isolation could be checked for those two
-- a harness/fixture gap, not a security finding. This distinction matters operationally: a security
finding would block a release; a fixture gap needs the harness fixed, not RLS policy changed --
though `knowledge_articles`' `403` on a legitimate owning-tenant create deserves a closer look to
rule out the RLS policy itself being overly strict, not just assumed to be a fixture-payload issue.

### Cleanup Incident (Found and Fixed Same Session)

The harness's own built-in cleanup step (delete organizations, then delete auth users) failed for
both test tenants:

```
Error: Admin request failed: DELETE /rest/v1/organizations?id=eq.<org> -> 409
  "insert or update on table \"audit_logs\" violates foreign key constraint \"audit_logs_organization_id_fkey\""
Error: Admin request failed: DELETE /auth/v1/admin/users/<user> -> 500
  "Database error deleting user"
```

Root cause: the harness deletes `organizations` before deleting the `audit_logs` rows created
during the `audit_logs` isolation check, and those rows foreign-key back to the org -- the delete
order in the script is wrong for that one table. The `500` deleting the auth user is a downstream
consequence: `profiles`/`organization_members`/`user_roles` rows referencing the user still
existed, blocking the cascade.

This left real (test-labeled) rows in the production database until a manual, cascade-ordered
cleanup was run the same session: delete `audit_logs`/`projects`/`tasks`/`documents`/
`knowledge_articles`/`workflow_timeline_events` (organization-scoped) -> delete
`user_roles`/`organization_members`/`roles` -> delete `profiles` -> delete `organizations` ->
delete the two auth users. **All 24 delete operations across both tenants succeeded; confirmed no
leftover test data remains.**

**Recommended fix for `scripts/verify-two-tenant-isolation.mjs`'s `cleanUpTenant()`:** delete all
six resource tables (organization-scoped) before deleting `organizations`, matching the order used
in the manual cleanup above, so a future run cleans up after itself correctly without manual
intervention.

## Closeout

**What changed:** nothing in application code or the committed harness script -- this was a test
execution and an out-of-band manual data cleanup, not a code change. (The recommended harness
cleanup-ordering fix above is scoped for a follow-up, not applied in this pass.)

**What did not change:** no application code, no RLS policies, no schema.

**What was verified:**
- Real cross-tenant isolation for `projects`, `tasks`, `documents`, `audit_logs` against the actual
  production database, using a real non-privileged access token on the attacking side -- **all four
  passed, zero leakage.**
- The harness's cleanup bug, root-caused and worked around this session with a verified
  24/24-successful manual cleanup.
- No leftover test data remains in production as of this closeout.

**What remains partial or blocked:**
- `knowledge_articles` and `workflow_timeline_events` isolation is unverified -- blocked on fixing
  the harness's own test fixtures (and confirming `knowledge_articles`' RLS policy is correctly,
  not overly, strict).
- This was a single run, not a repeated/stress-tested regression check.
- The harness's own `cleanUpTenant()` ordering bug is diagnosed and documented but not yet patched
  in the script itself.

**What claim is still unsupported:** none of this closeout's own claims are unsupported -- every
number above is from the actual run's JSON output or the cleanup script's own logged results,
captured in this session's tool-call history, 2026-08-06, run ID `mshjon07`.

**Closure statement:** the specific, standing claim "the Sprint 5 isolation harness has never been
run against a real database" is closed -- it has now been run, against the actual production
project, with a real cross-tenant attacker-style access pattern, and passed cleanly for 4 of 6
resource types with zero cross-tenant leakage found anywhere it was tested. The remaining 2
resource types and the harness's cleanup-ordering bug are named, scoped follow-up items, not
silently dropped.

## Evidence Chain

- Full run JSON (result only, no credentials): this session's tool-call history, 2026-08-06, run ID
  `mshjon07`.
- Manual cleanup script and its full 24-step success output: same session, same date. The one-off
  script was written to a scratchpad path outside the repository and deleted immediately after use
  -- not committed, since the harness's own `cleanUpTenant()` should be fixed instead.
- Related: `docs/SPRINT_1_TO_4_GAP_ANALYSIS_2026_07_22.md` (2026-08-06 update sections),
  `docs/SPRINT_5_CLOSEOUT_2026_07_22.md` (original harness authorship).
