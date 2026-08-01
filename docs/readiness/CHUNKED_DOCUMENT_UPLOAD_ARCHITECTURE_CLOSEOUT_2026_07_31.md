# Chunked Document Upload Architecture (No More 4.5MB Ceiling) -- Closeout

Date: 2026-07-31
Branch: `canonical/sprint-1-35-unified-gitlab`
Governance source: `CLAUDE.md`'s evidence-chain discipline

## External Signal

2026-07-31, founder attempted to upload a real document ("Triaxis Ventures 31072026.pdf") through
Knowledge Hub, immediately after the document-extraction feature shipped. It failed with "Storage
requires a connected data backend." -- a generic client-side fallback message that gave no real
diagnostic information.

## Root Cause (Confirmed via Live Production Logs, Not Assumed)

`npx vercel logs` against `landing.triaxisventures.com` for the failure window showed the upload
never reached `/api/documents/upload` at all -- no server log entry for that route, at any status
code, in the relevant window. This ruled out a server-side config or Supabase problem and pointed
at the request never completing the trip from browser to server.

**Vercel serverless functions (the runtime `/api/documents/upload` ran on) cap an incoming request
body at ~4.5MB.** The prior upload implementation relayed the *entire* file through that route as a
single FormData POST -- so any real document over roughly 4.5MB (very plausible for a real business
PDF) would be rejected by Vercel's platform *before* the request ever reached our code. The browser
receives a bare network failure with no server response to read, which the client's
`withResilientFallback` wrapper (silently swallows any error, falls back to a generic stub) turned
into the misleading "Storage requires a connected data backend." message -- masking the real cause
completely.

## A Wrong Turn, Caught Before Implementation

The first proposed fix was a direct browser-to-Supabase-Storage signed-URL upload (bypassing our
own server, which has no size ceiling of its own). **This was not implemented** -- before writing
any code, a repo search surfaced
`docs/readiness/KNOWLEDGE_HUB_UPLOAD_PERSISTENCE_INCIDENT_CLOSEOUT_2026_07_26.md`, documenting that
this exact approach was tried on 2026-07-26, failed live in production (a CORS/404 preflight
failure on the browser's direct PUT to Supabase's domain), and was deliberately replaced with a
same-origin-only architecture specifically to eliminate that class of failure "by construction."
Reverting to it would have very likely reintroduced that incident. Flagged to the founder before any
code was written; the corrected approach below was chosen instead, preserving the same-origin
principle.

## What Changed

- **`src/app/api/documents/upload/route.ts`** -- rewritten. No longer accepts a whole file; now
  accepts **one chunk** (raw bytes in the request body, metadata in query params: `path`,
  `uploadId`, `chunkIndex`, `totalChunks`, `mimeType`, `sizeBytes`, `fileName`). Writes the chunk to
  a temporary org-scoped storage path (`organizations/{orgId}/_upload-chunks/{uploadId}/{chunkIndex}`
  -- covered by the bucket's existing RLS policies with no new policy needed, since they key off any
  `organizations/{orgId}/...` prefix, not specifically `.../documents/...`).
- **`src/app/api/documents/upload/complete/route.ts`** (new) -- the assembly step. Downloads every
  chunk for the given `uploadId` **server-to-server** (no ~4.5MB ceiling applies in that direction --
  that limit is specific to inbound browser requests), concatenates them in order, verifies the
  assembled size matches the declared `sizeBytes` exactly (refuses to write a corrupted file on
  mismatch rather than silently proceeding), writes the final object to the real target path, records
  the `document.uploaded` audit event, and best-effort deletes the temp chunks (deletion requires
  Super Admin/Organization Admin per the bucket's RLS delete policy, narrower than the insert policy
  -- a non-admin uploader's temp chunks may be left behind; that's a minor storage-hygiene issue, not
  a user-facing failure, since the real upload already succeeded by that point). `maxDuration = 60`.
- **`src/app/api/documents/extract/route.ts`** (new) -- extraction, previously inline during the
  upload relay, is now its own step: downloads the already-uploaded object from storage
  server-to-server and runs the existing `extractDocumentText()` pipeline against it. Decoupling this
  from the upload transfer means extraction's own potential slowness (OCR) no longer has anything to
  do with the upload's size ceiling. `maxDuration = 60`.
- **`src/services/storage/chunkedUploadStorage.ts`** (new) -- shared server-side helpers
  (`putStorageObject`, `getStorageObject`, `deleteStorageObject`, `tempChunkPath`,
  `getSupabaseConfig`) used by all three routes above, all authenticated with the caller's own
  session access token -- RLS enforced exactly as every other Supabase-backed write in this app, no
  elevated credential involved anywhere in this change.
- **`src/services/storage/documentStorage.ts`** -- `uploadDocumentFile()` now slices the file into
  3.5MB chunks client-side (safely under Vercel's ~4.5MB ceiling), POSTs each to
  `/api/documents/upload`, then POSTs to `/api/documents/upload/complete` to finalize. A small file
  still just means exactly one chunk -- no branching logic for "small vs. large" on the client.
- **`src/features/knowledge-hub/KnowledgeHubSection.tsx`** -- `handleFiles()` now calls the new
  `POST /api/documents/extract` after the document/version rows are created (previously read
  `extraction` off the upload response, which no longer carries it since upload and extraction are
  now separate steps). The honest per-file status toast logic is unchanged.
- **`src/repositories/interfaces.ts`** -- removed the now-unused `extraction?` field from
  `DocumentFileUploadResult` (upload no longer returns it).

## What Did Not Change

- The browser still only ever talks to `landing.triaxisventures.com` -- never directly to Supabase's
  domain, preserving the 2026-07-26 incident fix's core architectural decision.
- RLS enforcement -- every storage read/write still uses the caller's own session access token, same
  as before this change.
- The 50MB total file-size cap (`MAX_DOCUMENT_UPLOAD_BYTES`) -- unchanged; this fix removes the
  *relay* ceiling (~4.5MB), not the bucket's own configured limit.
- Document archive/delete, download/preview flows -- untouched, out of scope.

## What Was Verified

- `corepack pnpm exec tsc --noEmit -p tsconfig.json` -- clean.
- `corepack pnpm --dir apps/mobile run typecheck` -- clean.
- `corepack pnpm run lint` (`eslint . --max-warnings=0`) -- exit 0.
- `node scripts/verify-supabase-migrations.mjs` -- unchanged, `"status": "passed"` (this change added
  no migration).
- `corepack pnpm run test` (`vitest run --config vitest.config.mjs`) -- **184 test files passed, 794
  tests passed**, 0 failed, after resolving a real test-infrastructure issue (see below).
  - New: `src/app/api/documents/upload/route.test.ts` (rewritten for the chunk contract) -- 6 tests:
    401/403/400 (invalid uploadId, chunk-index-out-of-range, disallowed file type), a successful chunk
    write to the correct temp path with the correct auth header, and a real 502 (not a fake success)
    when Supabase rejects the write.
  - New: `src/app/api/documents/upload/complete/route.test.ts` -- 5 tests: 401/403, full assembly
    (downloads both chunks in order, writes the final object, cleans up temp chunks, records the audit
    event), a real corrupted-size rejection, and a proof that best-effort cleanup failure (403, as a
    non-admin uploader would see) does not fail the overall upload.
  - New: `src/app/api/documents/extract/route.test.ts` -- 6 tests: 401/403, downloads the object and
    passes its real bytes/mimeType through to `extractDocumentText`, an honest `supported:false`
    passthrough, a thrown-extraction-error caught and reported honestly (not crashing the route), and
    a real 502 when storage can't return the object.
  - Extended: `src/services/storage/documentStorage.test.ts` -- 3 new tests: a 4MB file genuinely
    splits into 2 chunk requests (byte-exact reassembly of the split sizes verified) before finalizing,
    a small file uploads in exactly one chunk, and a real chunk-upload failure throws the server's
    actual error message and never calls `complete`.
  - **Real, self-caught issue during this work, not hidden**: the full suite intermittently segfaulted
    (exit 139) three times in a row once `extract/route.test.ts` existed alongside
    `documentTextExtraction.test.ts` -- both independently loaded the native `@napi-rs/canvas` addon
    (used by `pdf-parse`'s OCR path) in the same Vitest run, which crashed the worker-thread pool at
    full (184-file) scale, though both files passed reliably every time when run alone or together in
    isolation from the rest of the suite. Root-caused (not just retried) and fixed: `extract/route.ts`'s
    own job is auth/path-scoping/storage-download/response-shaping, not re-proving extraction
    correctness (already fully covered by `documentTextExtraction.test.ts` against the real pipeline)
    -- so `extract/route.test.ts` now mocks `extractDocumentText` instead of exercising the native
    addon a second time. The full suite has since passed clean twice in a row post-fix.
- `corepack pnpm run build` (`next build`) -- passed, exit 0.

## What Remains Partial or Blocked

- **Live HITL verification with a real large file (>4.5MB)** -- cannot be self-certified by this
  session (no live login, no live Supabase Storage access). The chunk-assembly logic (download,
  concatenate, size-integrity check, final write) is unit-tested with mocked Supabase responses, which
  proves the *logic* is correct but not that Supabase Storage's real behavior matches those mocks in
  every particular. The founder needs to re-attempt the exact upload that failed
  ("Triaxis Ventures 31072026.pdf") post-deploy and confirm: (1) it succeeds, (2) the document appears
  correctly in Knowledge Hub, (3) extraction runs and the AI Workspace reflects real content.
- **Vercel `maxDuration: 60` plan-tier confirmation** -- same open item carried over from the
  document-extraction closeout, now applying to two routes (`upload/complete`, `extract`) instead of
  one. Still not confirmed whether the connected Vercel plan supports 60-second function duration.
- **Orphaned temp chunks for non-admin uploaders** -- by design (see "What Changed" above), not a
  defect, but worth noting: an Employee/Manager-role uploader's temp chunk objects under
  `organizations/{orgId}/_upload-chunks/` are not cleaned up (delete requires Super Admin/Organization
  Admin per existing RLS). A periodic cleanup job for that path prefix is a reasonable future
  fast-follow, not built here (would be new scope, not requested).

## What Claim Is Still Unsupported

This closeout does not claim the founder's specific upload attempt now succeeds in production --
only that the mechanism that caused its failure (the 4.5MB relay ceiling) is fixed in code and
verified via mocked-but-logic-accurate tests. Confirming the exact symptom is resolved requires the
live retest above, which this session cannot perform.

## Exact File/Command/Branch State

- Branch: `canonical/sprint-1-35-unified-gitlab` (uncommitted at time of writing; commit pending
  founder confirmation).
- Files changed/added: `src/app/api/documents/upload/route.ts` (rewritten),
  `src/app/api/documents/upload/route.test.ts` (rewritten), `src/app/api/documents/upload/complete/route.ts`
  (new) + `.test.ts` (new), `src/app/api/documents/extract/route.ts` (new) + `.test.ts` (new),
  `src/services/storage/chunkedUploadStorage.ts` (new), `src/services/storage/documentStorage.ts`,
  `src/services/storage/documentStorage.test.ts`, `src/features/knowledge-hub/KnowledgeHubSection.tsx`,
  `src/repositories/interfaces.ts`.
- No deploy has been performed for this change as of this doc. Per standing git/deploy discipline,
  commit and deploy each require explicit confirmation in this conversation.
