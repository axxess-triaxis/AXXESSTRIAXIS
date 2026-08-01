# Real Document Text Extraction for RAG (PDF/DOCX/OCR) -- Closeout

Date: 2026-07-30
Branch: `canonical/sprint-1-35-unified-gitlab`
Governance source: `CLAUDE.md`'s evidence-chain discipline (External signal -> product decision -> shipped artifact -> verification -> current status)

## External Signal

2026-07-30 live walkthrough of AI Workspace (production, `landing.triaxisventures.com`). Founder query returned an answer citing "Pitch deck" and "AXXESS TRIaxis Progress Report" whose actual indexed content was literal placeholder text ("Tenant 0 dummy data", "Dummy file indexing succeeded"). Founder's exact framing: *"RAG as you see is turning up 'null' report even though the documents it is referring to are correct. Problem is actual extraction from indexed docs. That needs to be rectified."*

## Root Cause (Confirmed, Not Assumed)

No PDF/DOCX/OCR text-extraction pipeline existed anywhere in this codebase before this change:
- `package.json` had no PDF/DOCX/OCR parsing dependency.
- `src/services/rag/governedRag.ts`'s `textForDocument()` built RAG-searchable text only from document **metadata** (title, description, tags) -- never real file content.
- `POST /api/documents/upload/route.ts` uploaded raw file bytes to Supabase Storage and returned only `{ path }` -- no extraction, no indexing.
- `POST /api/documents/ingest/route.ts` (the only route that writes `rag_document_chunks`) required a human to manually paste text into a box.
- `docs/DOCUMENTS.md` already self-documented this gap.

The "Tenant 0 dummy data" text the founder saw was real database content (from earlier test uploads' metadata fields), honestly surfaced by a RAG system with no text-extraction capability -- not fabricated by the answer generator.

## Product Decision

Scoped via Plan Mode, approved by the founder with two explicit choices:
- **Automatic on upload** (not a separate manual trigger).
- **OCR included now** for scanned/image-only PDFs (founder explicitly overrode the recommended "defer OCR" option).

## What Changed

- **`src/services/rag/ingestion/documentTextExtraction.ts`** (new) -- `extractDocumentText(buffer, mimeType)`. Dispatches: PDF text-layer via `pdf-parse`'s `PDFParse` class; OCR fallback (PDF page rendering via `pdf-parse`'s own `getScreenshot()`, which uses `@napi-rs/canvas` internally, then `tesseract.js` recognition) when the text layer is empty/near-empty (<20 non-whitespace characters); DOCX via `mammoth`; plain UTF-8 decode for `text/plain`/`text/markdown`. Everything else returns an honest `{ supported: false, reason }` -- never a fabricated or empty index. Caps: 200 pages / 250,000 characters for text-layer and DOCX, 15 pages for OCR; both truncation cases are disclosed via `truncated`/`pagesProcessed`/`totalPages`, not silently cut.
- **`src/app/api/documents/upload/route.ts`** -- after a successful Supabase Storage upload, runs extraction on the already-buffered file bytes (the existing `file.arrayBuffer()` call, no double-read) and returns `{ path, extraction }` in the response. Added `export const maxDuration = 60` for OCR headroom. **Open item, not assumed resolved**: this requires the Vercel plan tier to support 60s function duration (Hobby defaults to 10s) -- the founder needs to confirm the plan tier in the Vercel Dashboard.
- **`src/features/knowledge-hub/KnowledgeHubSection.tsx`** -- `handleFiles` now calls `POST /api/documents/ingest` with the extracted text (when extraction succeeded) immediately after the existing raw-file upload/version-create steps, reusing the existing `ingestTenantDocument()` chunking/embedding pipeline -- no new indexing logic. Post-upload toast is now honest per file: "Indexed for search", "Indexed via OCR (first N of M pages)", "Not indexed: \<reason\>", or "uploaded but indexing failed -- index manually via Documents & Files" on a real ingest-call failure.
- **`src/services/rag/tenantRagWorkflow.ts`** -- `TenantDocumentIngestInput` gained optional `extractionMethod`/`extractionTruncated`, threaded into the existing-document re-index branch's `documentVersionsRepository.create()` call so the version created from automatic extraction records how its text was produced.
- **`src/app/api/documents/ingest/route.ts`** -- accepts and forwards `extractionMethod`/`extractionTruncated` from the request body.
- **`supabase/migrations/20260730140000_document_versions_extracted_text.sql`** (new) -- adds `extracted_text`, `extraction_method` (checked against the four known method values), `extraction_truncated` (default `false`) to `document_versions`. No RLS changes needed (existing table policies already cover the new columns).
- **`src/domain/entities.ts`**, **`src/repositories/interfaces.ts`**, **`src/repositories/supabaseEnterpriseRepositories.ts`** -- plumbing for the three new fields end to end (domain type, Supabase row mapping, `DocumentFileUploadResult`/`DocumentUploadExtractionResult` types).
- **`package.json`** -- added `pdf-parse`, `mammoth`, `pdfjs-dist`, `@napi-rs/canvas`, `tesseract.js` (runtime), `jszip` (devDependency, used only to build a real in-memory `.docx` test fixture).
- **`pnpm-workspace.yaml`** -- `allowBuilds.tesseract.js: true`, added after reading the package's actual postinstall script (`opencollective-postinstall || true` -- confirmed harmless, a funding-message print) directly from `node_modules`.

## What Did Not Change (Explicitly Out of Scope This Pass)

- XLSX/PPTX extraction -- different libraries and chunking strategy.
- Re-extraction/backfill for documents already uploaded before this shipped -- their existing metadata-only chunks are untouched.
- Async/background job processing beyond the page caps -- confirmed via direct code reading that this codebase's `execution_jobs`/`sandboxRuntime.ts` `"document_extraction"` job kind is dry-run-only policy simulation (its referenced `scripts/extract-document.mjs` does not exist), not a real executor to build on. Documents beyond the caps get an honest partial result, not a queued job.
- `governedRag.ts`'s metadata-only fallback is unchanged -- it remains the honest zero-citations path when no chunk exists at all.

## What Was Verified

Exact commands run, this session, on this branch:

- `corepack pnpm exec tsc --noEmit -p tsconfig.json` -- clean, no errors.
- `corepack pnpm --dir apps/mobile run typecheck` -- clean (`tsc --noEmit`, no output).
- `corepack pnpm run lint` (`eslint . --max-warnings=0`) -- exit 0.
- `corepack pnpm run test` (`vitest run --config vitest.config.mjs`) -- **180 test files passed, 768 tests passed**, 0 failed.
  - New: `src/services/rag/ingestion/documentTextExtraction.test.ts` (7 tests) -- proves real extraction against a hand-built, byte-exact minimal PDF fixture (text-layer path), a real in-memory `.docx` built with `jszip` (mammoth path), plain-text decode, honest `supported:false` for an unsupported MIME type, a real 250,000-character truncation cap, and the OCR fallback triggering on a genuinely empty PDF text layer (Tesseract recognition itself mocked to avoid a network dependency on language-data download in this environment; PDF rendering via `@napi-rs/canvas` runs for real).
  - Extended: `src/app/api/documents/upload/route.test.ts` (2 new tests) -- proves the route returns `extraction` in its JSON response, with an honest `supported:false` for a non-PDF byte string and real `text-layer` extraction (containing the fixture's actual drawn text) for a genuine hand-built PDF.
  - `node scripts/verify-supabase-migrations.mjs` -- `"status": "passed"`, 30 migrations, 102 tables with RLS, no new warnings (the new migration only adds columns to an already-RLS-covered table).
  - `corepack pnpm run build` (`next build`) -- passed, exit 0. All 125 routes compiled (static + dynamic), TypeScript check within the build passed.
- **Noted, not a defect**: a one-off native-module teardown segfault occurred when running exactly two of the new extraction-related test files together in isolation (outside the full suite). It did not reproduce in the full 180-file/768-test run (exit 0). Flagged here for transparency per the evidence-chain discipline, not hidden, since it points at `@napi-rs/canvas`/`tesseract.js` native-binary teardown behavior under Vitest's thread pool -- worth watching if it ever recurs, but not currently blocking.

## What Remains Partial or Blocked

- **Vercel `maxDuration: 60` plan-tier confirmation** -- `Founder-stated, source artifact needed`. Not yet confirmed whether the connected Vercel plan supports 60-second function duration (Hobby caps at 10s). If not, the OCR page cap needs to shrink accordingly.
- **Live HITL walkthrough** -- cannot be self-certified by this session (no real login, no real file upload through the live UI, no real Supabase table read access). Per the approved plan's own verification section, this requires the founder to:
  1. Upload a real, digitally-created PDF via the live Knowledge Hub and confirm the post-upload toast says "Indexed for search."
  2. Upload a real scanned (image-only) PDF and confirm the toast says "Indexed via OCR" (or the honest truncation/failure variant).
  3. Ask a governed AI Workspace question answerable only from one of those files' actual body text (not title/description), and confirm the answer reflects the real file content.
- **Invitation email delivery bug** (separately flagged by the founder during this same session, screenshot: "Invitation created, but the email could not be sent.") -- not yet investigated; out of scope for this closeout, tracked as a separate open item.

## What Claim Is Still Unsupported

This closeout does **not** claim the founder's original "null report"/"demo data" symptom is resolved in production -- only that the mechanism that caused it (no extraction pipeline) is now fixed in code and unit-tested against real fixtures. Confirming the symptom itself is gone requires the live HITL walkthrough above, which this session cannot perform.

## Exact File/Command/Branch State

- Branch: `canonical/sprint-1-35-unified-gitlab` (uncommitted at time of writing this doc; commit pending founder confirmation).
- Files changed/added: see `git status --short` -- `documentTextExtraction.ts` + `.test.ts` (new), `20260730140000_document_versions_extracted_text.sql` (new), `upload/route.ts` + `.test.ts`, `ingest/route.ts`, `tenantRagWorkflow.ts`, `KnowledgeHubSection.tsx`, `entities.ts`, `interfaces.ts`, `supabaseEnterpriseRepositories.ts`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`.
- No deploy has been performed for this change as of this doc. Per standing git/deploy discipline, commit and deploy each require explicit confirmation in this conversation.
