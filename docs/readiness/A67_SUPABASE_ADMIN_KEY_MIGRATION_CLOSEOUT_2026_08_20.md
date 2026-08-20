# A-67 -- Supabase Admin Key Migration -- Closeout (2026-08-20)

Governed by: `docs/readiness/CLOSEOUT_TEMPLATE.md`, `CLAUDE.md` (Evidence Chain -- Standing Rule).
Related: `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` row A-67.

## What A-67 was

Discovered 2026-07-26 while diagnosing an unrelated defect (A-66): a direct, disposable diagnostic call
to Supabase's Storage API using `triaxis-www-frontend-import`'s production `SUPABASE_SERVICE_ROLE_KEY`
was rejected with `400 Invalid Compact JWS` -- the value did not parse as a JWT at all. The project also
carried newer-format `SUPABASE_PUBLISHABLE_KEY`/`SUPABASE_SECRET_KEY` variables alongside the legacy
`SUPABASE_SERVICE_ROLE_KEY`, indicating the key was stale from before Supabase's key-format migration.
Nothing in the app's tested paths had surfaced a live user-visible defect from this, but any admin/cron
code path relying on service-role privileges would have silently failed the same way. Fixing it required
either rotating the legacy key (a Vercel Dashboard action only the founder could take) or migrating the
code to the already-present, unused modern replacement -- neither of which had been attempted as of
2026-08-20.

## Closeout Evidence

**Issue ID:** A-67

**Title:** `SUPABASE_SERVICE_ROLE_KEY` in production is not a valid token

**Origin plan:** No formal plan -- reactive fix, chosen live between two options presented to the
founder (rotate the legacy key vs. migrate code to the modern key).

**Research artifact:** This row's own accumulated history in
`docs/readiness/ACTIONABLES_READINESS_MATRIX.md` (2026-07-26 discovery through the 2026-08-07 note); this
session's own `grep` confirming `src/repositories/supabaseAdmin.ts` is the single real source-file
reader of the env var (all other 9 matches were test files or one error-message string literal).

**Implementation commit(s):** `d1bcecc` (`fix(supabase): migrate admin client to SUPABASE_SECRET_KEY
(A-67); close A-109 Phase 1; log fresh A-105 CWV data`).

**PR:** [#276](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/276)

**Files changed:** `src/repositories/supabaseAdmin.ts` -- `getSupabaseAdminConfig()` and
`isSupabaseAdminConfigured()` now prefer `SUPABASE_SECRET_KEY`, falling back to the legacy
`SUPABASE_SERVICE_ROLE_KEY` name for any environment not yet migrated. New
`src/repositories/supabaseAdmin.test.ts` covers the preference/fallback logic directly.

**Verification commands:**
```
pnpm run typecheck
pnpm run lint
pnpm exec vitest run src/repositories/supabaseAdmin.test.ts
```

**Verification result (raw, not paraphrased):**
- `pnpm run typecheck`: PASS
- `pnpm run lint`: PASS
- `supabaseAdmin.test.ts`: PASS, 3/3
- Pre-existing consumer test suite (`src/app/api/account/deletion-request/route.test.ts`, a real
  `supabaseAdminRest` consumer): PASS, 7/7, unchanged, confirming no regression to an existing caller.
- **Live production verification, 2026-08-20:** founder loaded the Executive Dashboard once post-deploy
  (exercises `buildSnapshotPeriod` -> `supabaseAdminRest` via
  `src/app/api/dashboard/snapshot-periods/route.ts`). Checked `vercel logs` immediately after: multiple
  `GET /api/dashboard/snapshot-periods` requests on the fresh deployment (`dpl_49TanizfeABKhnXttDTLXLyBzxLY`),
  all `responseStatusCode: 200`, zero errors in the request logs. `supabaseAdminRest` throws
  `Supabase admin request failed for ${table}: ${status} ${message}` on any non-2xx Supabase response,
  and that exception is not caught anywhere in this route -- a clean 200 is only reachable if the
  Supabase admin call itself succeeded. This is direct, positive, live evidence that `SUPABASE_SECRET_KEY`
  is a valid, working credential in production, not an inference from absence of a complaint.

**Deploy evidence:** Merged via squash `58c80ba`; fresh production deployment
`dpl_49TanizfeABKhnXttDTLXLyBzxLY` confirmed Ready via `vercel inspect`.

**Final status:** Closed / Yes, per `docs/readiness/STATUS_TAXONOMY.md` -- Live verified, with a genuine
positive production request as evidence, not an absence-of-failure inference.

**Remaining risk:** The legacy `SUPABASE_SERVICE_ROLE_KEY` env var itself remains set in Vercel,
unrotated and still invalid -- harmless now that the code no longer reads it first, but worth removing
from Vercel at some point to avoid confusion for a future reader who greps for it. Not done in this pass
since it's a config cleanup with zero functional impact, not a live risk.

**Follow-up issue IDs:** None opened. Optional future cleanup: remove the stale
`SUPABASE_SERVICE_ROLE_KEY` var from Vercel once confidence in the migration is well established (e.g.
after a few days of clean production operation).

## Supersedes / Superseded by / Reopened by

- **Supersedes:** N/A
- **Superseded by:** N/A
- **Reopened by:** N/A
