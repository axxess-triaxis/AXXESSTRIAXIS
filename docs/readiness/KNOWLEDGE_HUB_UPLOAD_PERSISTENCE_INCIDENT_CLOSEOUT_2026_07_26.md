# Knowledge Hub Upload Persistence Incident -- Closeout (2026-07-26)

Date: 2026-07-26
Branch: `canonical/sprint-1-35-unified-gitlab`
Governance source: `CLAUDE.md`'s evidence-chain discipline (External signal -> product decision ->
shipped artifact -> verification -> current status)
Related: `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` A-61/A-62/A-13, A-08/A-65;
`docs/readiness/RAG_REMEDIATION_FINAL_EVIDENCE_PACKAGE_2026_07_26.md`;
`docs/readiness/RAG_CAPABILITY_MILESTONE_KANBAN_2026_07_26.md`

## Summary

A HITL live walkthrough on `landing.triaxisventures.com` today found that Knowledge Hub document
uploads showed a "Document uploaded" success message but never actually persisted -- the file did
not appear as an indexing candidate in Documents & Files, and did not survive a session refresh.
This blocked the live retest that `RAG_CAPABILITY_MILESTONE_KANBAN_2026_07_26.md` had flagged as
the single remaining precondition for closing A-61/A-62/A-13. Root cause was found, fixed, tested,
and live-confirmed by the HITL the same day. This document is the closure record for that specific
incident, separate from (but unblocking) the pre-existing A-61/A-62/A-13 retest.

## External Signal

HITL, live on `landing.triaxisventures.com`, 2026-07-26:

1. **First observation:** "Documents & Files Workflow makes no sense for user if file uploaded on
   'Knowledge Hub' does not show up for indexing in 'Documents & Files'." The uploaded document
   ("AXXESS TRIaxis Progress Report", a real 545 KB PDF) appeared in Knowledge Hub itself
   ("Uncategorized", correct size, correct modified date) but never appeared in the Documents &
   Files selector that RAG Remediation Sprint 1 (`0ed228e`) had built for exactly this purpose.
2. **Second observation, after a production redeploy** (see "Preceding Discovery" below):
   browser console showed a real error on re-upload:
   `Access to fetch at 'https://vnliomnfabaicvvvfwia.supabase.co/object/upload/sign/...' from
   origin 'https://landing.triaxisventures.com' has been blocked by CORS policy: ... net::ERR_FAILED`
3. **Third observation** (DevTools Network tab): the actual PUT's CORS preflight (`OPTIONS`)
   returned **404**, not a clean CORS-headers-missing response -- the "no Access-Control-Allow-Origin
   header" console message was a downstream symptom of that 404, not evidence of a bare
   origin-allowlist misconfiguration.

## Preceding Discovery (Same Day, Prerequisite to This Incident)

Before this incident could even be tested, a separate finding surfaced: **production had not been
redeployed since 2026-07-25 16:16 IST** -- meaning Executive Dashboard Sprints ED-1/2/3 and all
three RAG Remediation Sprints (commits `c306914`, `82e5332`, `cecfd1e`, `0ed228e`, `d3436c0`,
`c85165a`) existed only in the repository, never reached `triaxis-www-frontend-import` or
`triaxis-product-investor-demo` in production. Confirmed via `vercel inspect` (live deployment
build timestamp) compared against `git log` commit timestamps. Fixed by running the full
verification suite (typecheck/lint/579 tests/build, all clean) and `vercel deploy --prod` against
both projects. This is a distinct, already-closed finding -- documented here only because it is the
reason A-61's selector was visible for the first time (showing the pre-existing seeded "Triaxis
Pitch Deck" document) but still didn't show the HITL's own new upload, which is this incident.

## Debugging Process (Chronological, With What Each Step Ruled In/Out)

1. **Code review of `KnowledgeHubSection.tsx`'s `handleFiles()`** found the whole upload chain
   (signed-URL creation, browser PUT to Supabase Storage, `documentsRepository.create`) wrapped in
   one `try` block whose `catch` silently pushed an in-memory-only document into local state while
   still showing a "Document uploaded" success toast -- exactly the failure-hides-behind-a-fake-
   success pattern this program has repeatedly found elsewhere (A-02, A-08). This explained the
   *symptom* (looks uploaded, vanishes on refresh, never in the real selector) but not the
   *underlying* failure.
2. **HITL re-uploaded with DevTools open**, producing the CORS console error above. This confirmed
   the failure was in the browser-to-Supabase-Storage PUT specifically, not in our own
   `/api/documents/storage-url` route (which had already returned a valid, correctly-signed URL --
   confirmed both from the console log and by independently replaying the same signed URL's
   preflight via `curl`, which returned a clean `200` with `Access-Control-Allow-Origin: *`).
3. **HITL's Network tab on a second, fresh upload attempt** showed the real preflight for that
   specific request returning `404`, not `200` -- ruling out a blanket CORS-allowlist
   misconfiguration (Supabase's gateway clearly can return a clean CORS response for a validly
   signed URL) and pointing at something specific to the direct browser-to-Supabase-domain call.
4. **HITL checked the Supabase Dashboard directly** (Storage -> Buckets): the `axxess-documents`
   bucket exists, with the correct 50 MB limit and the exact allowed MIME type list the code
   expects, and 4 RLS policies attached. This ruled out "bucket doesn't exist."
5. **Direct server-side diagnostic against Supabase's Storage API** (disposable test paths only,
   cleaned up after, no production data touched):
   - A raw write using `SUPABASE_SERVICE_ROLE_KEY` failed with `400 Invalid Compact JWS` -- **this
     service-role key is not a valid, parseable token in this project's current production
     environment.** Unrelated to this incident (the app doesn't use this key for uploads) but a
     real, separate finding -- see "New, Separate Finding" below.
   - A raw sign-then-PUT attempt using only the anon key (no real user session) correctly failed
     with `new row violates row-level security policy` -- proving RLS is enforced as designed, not
     bypassable, and not itself broken.
6. **Conclusion:** the exact trigger behind the 404/CORS failure on the direct browser-to-Supabase
   PUT could not be conclusively isolated further without a live user session this environment
   cannot obtain or should not simulate. Rather than continue chasing a third-party edge/CORS
   quirk, the decision was made to remove the entire class of failure by construction.

## Product Decision

Stop uploading directly from the browser to Supabase Storage's domain. Route the file bytes through
the app's own same-origin API instead, which then performs the write to Supabase Storage
server-to-server (no browser CORS involved at all, since the browser only ever talks to
`landing.triaxisventures.com`, which every other API call on this page already proves is reliable).
RLS enforcement is preserved unchanged -- the new route authenticates the same way
`/api/documents/storage-url` already did and uses the caller's own session token, not an elevated
credential.

## What Changed

- **New:** `src/app/api/documents/upload/route.ts` -- authenticates the caller, validates the
  target path belongs to their organization, validates the file (size/MIME type, same rules as
  before), then performs the Supabase Storage object write server-side using the caller's own
  session access token (same RLS enforcement as the old client-side flow), and records a real audit
  log entry (`document.uploaded`) on success.
- **New:** `src/app/api/documents/upload/route.test.ts` -- 6 tests: unauthenticated request (401),
  missing file (400), path outside the caller's organization (403), disallowed file type (400),
  successful upload with a real audit event (200), and a genuine Supabase-side failure surfaced as a
  real `502` error rather than a fake success.
- **Changed:** `src/repositories/interfaces.ts` -- added `uploadDocumentFile` to `StorageRepository`.
- **Changed:** `src/services/storage/documentStorage.ts` -- live implementation posts a
  `multipart/form-data` request to the new route instead of PUTting to a Supabase-signed URL.
- **Changed:** `src/demo/demoRepositories.ts` / `src/demo/emptyRepositories.ts` -- demo mode gets a
  pure in-memory success (no network call, consistent with demo's existing deterministic,
  non-persisted design); the empty/unconfigured-backend stub throws, consistent with every other
  method on that interface.
- **Changed:** `src/providers/serviceProvider.ts` -- wired the new method through the existing
  live-with-empty-fallback resilience wrapper, same pattern as every other repository method.
- **Changed:** `src/features/knowledge-hub/KnowledgeHubSection.tsx`'s `handleFiles()` -- calls the
  new proxy method instead of the old signed-URL PUT; **removed the silent local-only fallback** --
  a real failure now produces a real error toast naming the file and reason, and per-file
  success/failure is tracked independently across a multi-file upload instead of one shared
  try/catch for the whole batch.

## What Did Not Change

- Document *downloads* (`createDocumentDownloadIntent`, `getSignedDownloadUrl`) -- not reported as
  broken, untouched, out of scope for this incident.
- RLS policies and bucket configuration in Supabase -- confirmed correct, not modified.
- Demo mode's upload experience -- still a pure in-memory success, no real network call, by design.
- A-62 (stale "Triaxis Pitch Deck" placeholder document) -- still present in the governed RAG index;
  this incident did not archive it. That remains a separate HITL action.
- A-65/A-08 (feedback and invitation email delivery) -- still blocked; see "New, Separate Finding."

## What Was Verified

- `pnpm run typecheck` -- clean.
- `pnpm run lint` -- clean, zero warnings.
- `pnpm run test` -- 148/148 test files, 585/585 tests passing (147/579 before this change; the new
  route test file accounts for the +1 file / +6 tests).
- `pnpm run build` -- succeeds; `/api/documents/upload` present in the route output.
- **Live, HITL-performed, same day:** re-uploaded a real document on `landing.triaxisventures.com`.
  HITL confirmed all three of: (1) the upload succeeded for real, (2) the document appeared as a
  selectable indexing candidate in Documents & Files (A-61's originally intended behavior, now
  actually reachable), (3) the document survived a session refresh.
- Deployed via `vercel deploy --prod` against `triaxis-www-frontend-import`
  (deployment `dpl_2gMEom4p5uGkjwjUqpC9vnLUwUbH`, aliased to `landing.triaxisventures.com`); live
  post-deploy check confirmed `/api/documents/upload` returns `401` for an unauthenticated request
  and the existing redirect behavior on the domain is unaffected.

## What Remains Partial or Blocked

- **A-62 retest**: with a real second document now genuinely indexable, the HITL still needs to
  archive "Triaxis Pitch Deck" in Knowledge Hub and confirm it stops being cited, and re-run an
  AI Workspace query against the real document to confirm A-55/A-13's "genuinely grounded, not
  dummy-pattern" answer claim end to end. Not yet done as of this closeout.
- **A-65/A-08 (email delivery)**: confirmed via `vercel env ls production` against
  `triaxis-www-frontend-import` that `RESEND_API_KEY` does not exist in that project's production
  environment at all (16 vars present, none named `RESEND_API_KEY`). The code is complete and
  correct; there is nothing to send through. Requires the founder to add a valid `RESEND_API_KEY`
  via the Vercel Dashboard -- this cannot be done from this environment (credential entry is
  explicitly out of scope for this agent regardless of authorization).

## New, Separate Finding (Unresolved, Not Part of This Fix)

`SUPABASE_SERVICE_ROLE_KEY` in `triaxis-www-frontend-import`'s production environment is **not a
valid token** -- a direct API call using it was rejected with `400 Invalid Compact JWS` (fails to
parse as a JWT at all). This project also carries newer-format `SUPABASE_PUBLISHABLE_KEY` /
`SUPABASE_SECRET_KEY` variables alongside the legacy ones, suggesting this key may be stale from
before a Supabase key-format migration. Nothing in today's fix depends on this key, so it did not
block this incident's resolution -- but any existing or future admin/cron code path that does
depend on service-role privileges would silently fail the same way. **Recommended: rotate/replace
this key in the Vercel Dashboard and confirm it against a disposable diagnostic call before relying
on it for anything.** Not yet actioned.

## Exact File / Commit / PR / Deployment State

- **Files changed:** `src/app/api/documents/upload/route.ts` (new),
  `src/app/api/documents/upload/route.test.ts` (new), `src/repositories/interfaces.ts`,
  `src/services/storage/documentStorage.ts`, `src/demo/demoRepositories.ts`,
  `src/demo/emptyRepositories.ts`, `src/providers/serviceProvider.ts`,
  `src/features/knowledge-hub/KnowledgeHubSection.tsx`.
- **Commit:** `e4b27b7` on `canonical/sprint-1-35-unified-gitlab`, pushed to both `origin` (GitHub)
  and `gitlab`.
- **PR:** [#156](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/156) (pre-existing open PR for
  this branch; this commit was pushed onto it, not a new PR).
- **Production deployment:** `dpl_2gMEom4p5uGkjwjUqpC9vnLUwUbH`, `triaxis-www-frontend-import`,
  aliased to `https://landing.triaxisventures.com`.
- **Preceding redeploy** (see "Preceding Discovery"): `dpl_2zb9FKR25Ham2MtuRPm4xUDtWBDE`
  (`triaxis-www-frontend-import`) and `dpl_2SLXrP93FHSWEChFb1Sxj6hDrHxQ`
  (`triaxis-product-investor-demo`), both same day, prior to this fix's own deployment.
