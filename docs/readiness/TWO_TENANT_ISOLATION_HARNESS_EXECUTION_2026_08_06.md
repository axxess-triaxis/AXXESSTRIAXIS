# Two-Tenant Isolation Harness -- First Real Execution

Date: 2026-08-06
Governance source: `docs/FOUNDER_EXECUTION_EVIDENCE_GOVERNANCE.md`

## Summary

`scripts/verify-two-tenant-isolation.mjs` -- written in Sprint 5 (2026-07-22) but never executed
against a real database in any prior sprint -- was run for the first time against the actual
production Supabase project (`vnliomnfabaicvvvfwia.supabase.co`) backing
`landing.triaxisventures.com`, the same project the platform's 5 real tenants use. This closes the
single largest recurring caveat in `docs/SPRINT_1_TO_4_GAP_ANALYSIS_2026_07_22.md` and
`docs/SPRINT_5_CLOSEOUT_2026_07_22.md`: tenant isolation had previously been proven only at the
unit-test / static-RLS-policy level, never against real RLS policies deciding a real cross-tenant
request end to end.

## How This Was Run

The founder provided the production `SUPABASE_SERVICE_ROLE_KEY` directly in chat for this one run,
per explicit instruction. It was used only in-memory (Node's `--env-file` flag against a temp file
outside the repository), never written to any tracked file, never logged, and the temp file was
deleted immediately after each use (once for the harness run, once again for the cleanup pass
below). `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` were pulled via
`vercel env pull --environment=production` (non-sensitive, safe to read back).

```
node --env-file=<temp>.env scripts/verify-two-tenant-isolation.mjs
```

Run ID: `mshjon07`. Two throwaway organizations ("QA Isolation Test Org A/B") and two real Supabase
Auth users (`qa-isolation-mshjon07-a@axxess-test.invalid`, `...-b@axxess-test.invalid`) were
created via the Admin API, each granted "Organization Admin" in their own org only, each
signed in for a real access token -- exactly what a browser session has. Tenant B's real access
token (not an admin/service-role bypass) was then used to attempt cross-tenant reads and writes
against tenant A's data, with real RLS policies deciding the outcome.

## Results

| Resource | Created | Cross-tenant read blocked | Cross-tenant write blocked | Note |
|---|---|---|---|---|
| `projects` | Yes | **true** | **true** | Clean pass |
| `tasks` | Yes | **true** | **true** | Clean pass |
| `documents` | Yes | **true** | **true** | Clean pass |
| `audit_logs` | Yes | **true** | **true** | Clean pass |
| `knowledge_articles` | **No** | n/a | n/a | Tenant A's own create attempt was rejected: `403`, `new row violates row-level security policy for table "knowledge_articles"` |
| `workflow_timeline_events` | **No** | n/a | n/a | Tenant A's own create attempt was rejected: `409`, foreign key violation -- `actor_user_id` must reference a row in a `users` table the harness never populates (it only creates an Auth user + `profiles` row) |

**Overall harness status: `"failed"`**, per the script's own strict definition (every one of the 6
`REQUIRED_COVERAGE` resource types must show both booleans `true`). This should not be read as "an
isolation defect was found" -- **isolation passed with zero failures everywhere it was actually
exercised.** The `"failed"` status reflects that 2 of 6 resource types have no real coverage yet,
because the harness's own test-fixture setup broke before isolation could be checked for those two
-- a harness/fixture gap, not a security finding. Distinguishing these precisely matters: a security
finding would block a release; a fixture gap needs the harness fixed, not RLS policy changed (unless
investigation shows the RLS policy itself is wrong for a legitimate owning-tenant create, which
`knowledge_articles`' `403` deserves a closer look to rule out).

## Cleanup Incident (Found and Fixed Same Session)

The harness's own built-in cleanup step (delete organizations, then delete auth users) failed for
both test tenants:

```
Error: Admin request failed: DELETE /rest/v1/organizations?id=eq.<org> -> 409
  "insert or update on table \"audit_logs\" violates foreign key constraint \"audit_logs_organization_id_fkey\""
Error: Admin request failed: DELETE /auth/v1/admin/users/<user> -> 500
  "Database error deleting user"
```

Root cause: the harness deletes `organizations` before deleting the `audit_logs` rows that were
created during the `audit_logs` isolation check, and those rows have a foreign key back to the org
-- the delete order in the script is wrong for that one table. The `500` deleting the auth user is
a downstream consequence: `profiles`/`organization_members`/`user_roles` rows referencing the user
still existed, blocking the cascade.

**This left real (test-labeled) rows in the production database** until a manual, cascade-ordered
cleanup was run the same session: delete `audit_logs`/`projects`/`tasks`/`documents`/
`knowledge_articles`/`workflow_timeline_events` (organization-scoped) -> delete
`user_roles`/`organization_members`/`roles` -> delete `profiles` -> delete `organizations` -> delete
the two auth users. All 24 delete operations across both tenants succeeded; confirmed no leftover
test data remains.

**Recommended fix for `scripts/verify-two-tenant-isolation.mjs`'s `cleanUpTenant()`:** delete all
six resource tables (organization-scoped) before deleting `organizations`, matching the order used
in the manual cleanup above, so a future run cleans up after itself correctly without manual
intervention.

## What This Closes And What It Doesn't

**Closed:** the specific claim "the Sprint 5 isolation harness has never been run against a real
database" is no longer true. It has been run, against the actual production project, with a real
cross-tenant attacker-style access pattern, and passed cleanly for 4 of 6 resource types.

**Not closed:**
- `knowledge_articles` and `workflow_timeline_events` isolation is **still unverified** -- the
  harness needs a fixture fix (populate whatever `knowledge_articles`' RLS create-policy requires;
  populate the `users` table row `workflow_timeline_events.actor_user_id` needs) before those two
  can be tested at all.
- This was a single run, not a stress test or repeated-run regression check.
- The harness's own cleanup bug (above) should be fixed so this doesn't require manual intervention
  next time.

## Evidence Chain

- Full run JSON (result only, no credentials): captured in this session's tool-call history,
  2026-08-06, run ID `mshjon07`.
- Cleanup script and its full 24-step success output: same session, same date. The one-off cleanup
  script itself was written to a scratchpad path outside the repository and deleted immediately
  after use -- not committed, since it is not meant to be reusable (the harness's own
  `cleanUpTenant()` should be fixed instead, per the recommendation above).
- Related: `docs/SPRINT_1_TO_4_GAP_ANALYSIS_2026_07_22.md` (2026-08-06 update section),
  `docs/SPRINT_5_CLOSEOUT_2026_07_22.md` (original harness authorship).
