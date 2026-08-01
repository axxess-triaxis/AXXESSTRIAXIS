# RAG Remediation Sprint 1 -- Source Integrity and Knowledge Hub-to-Index Path -- Closeout

Date: 2026-07-26
Branch: `canonical/sprint-1-35-unified-gitlab`
Planning provenance: Codex-drafted, founder-issued execution prompt, following the HITL live walkthrough of the AI Workspace/RAG pipeline on production (2026-07-25), documented in `docs/readiness/AI_WORKSPACE_RAG_PIPELINE_GAP_ANALYSIS_2026_07_26.md` and roadmapped in `docs/readiness/AI_WORKSPACE_RAG_PIPELINE_REMEDIATION_ROADMAP_2026_07_26.md`.

## Sprint Objective

Fix RAG source integrity before attempting to improve answer generation: (1) make it possible for a HITL user to select an already-uploaded Knowledge Hub document and index it for governed retrieval, and (2) stop a stale placeholder document from being retrievable, so that any future claim about RAG answer quality (A-55) is tested against real content, not a known-bad source.

## What Changed

| File | Change |
|---|---|
| `src/services/rag/governedRag.ts` | `canRetrieveDocument()` now excludes `status === "archived"` from retrieval, not only `"deleted"`. |
| `src/services/rag/tenantRagWorkflow.ts` | `TenantDocumentIngestInput` gained an optional `documentId`. `ingestTenantDocument()` branches: with `documentId`, it looks up the existing document (tenant-checked, rejects deleted documents), reuses its real title/visibility/classification/tags/owner instead of the form's inputs, computes the correct next version number, and records a `document_activity` row (`action: "edited"`, `metadata.event: "indexed"`). Without `documentId`, original create-new-document behavior is unchanged. `TenantDocumentIngestResult` gained `reindexedExistingDocument: boolean`. |
| `src/app/api/documents/ingest/route.ts` | Accepts and passes through `documentId` from the request body. |
| `src/features/documents/DocumentsSection.tsx` | Added a document selector ("Index an uploaded document") populated from the tenant's real, non-archived, non-deleted documents (new exported `selectableDocumentsForIndexing()`); selecting a document disables the title/classification/visibility inputs (shown as inherited, read-only) and sends its `documentId` on submit; added honest copy on the PDF-text-extraction limitation; success message names the actual indexed document when reindexing. |
| `src/services/rag/governedRag.test.ts` | +1 test: archived documents excluded from retrieval. |
| `src/services/rag/tenantRagWorkflow.test.ts` | +2 tests: reindex-existing-document preserves real metadata and doesn't duplicate; cross-tenant reindex is rejected. Also fixed a pre-existing mock gap (`documentsRepository.create()` ignored `input.organizationId`/`visibility`/`classification`, always using test-file defaults) that these new tests exposed. |
| `src/features/documents/DocumentsSection.test.tsx` (new) | 6 tests: pure-function archived/deleted exclusion and large-list safety; selector renders a real uploaded document; honest extraction-limitation copy; indexing a selection sends `documentId` and reports the real title; indexing without a selection still supports the original paste-new-document path. |
| `src/app/routing/lazyRoutes.test.ts` | Fixed a genuine regression this sprint caused (see below): tightened the F-019 module-distinctness guard to check heading text specifically instead of a blanket "must never contain the other module's name" substring check. |

No files were deleted. No production data was deleted. No migration was added (see the `document_activity` action-enum note below).

## Stale Placeholder Source -- Found (Inferred From Code, Not Live-Queried)

**No local Supabase credentials exist in this environment** -- `.env.local` contains only `VERCEL_OIDC_TOKEN`; `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, and the Supabase URL/anon-key variables are all absent. This means the exact production row (its ID, creator, and creation timestamp) could not be pulled directly, and this section is a code-level inference, not a live-verified fact -- flagged accordingly rather than presented as more certain than it is.

Full-codebase search for the literal strings `Pitch deck` and `Tenant 0 dummy data` found zero hits in application source code, the seeded demo dataset (`src/demo/demoDataset.ts`), or Knowledge Hub's fallback data (`src/features/knowledge-hub/knowledgeHubData.ts`) -- only in readiness documents quoting the founder's own walkthrough report. Combined with the architectural fact (already documented in `docs/DOCUMENTS.md` from Sprint 2) that Knowledge Hub uploads never write chunk/body text, the only code path in this repository capable of producing a persisted document + chunk record with this literal free-text content is `ingestTenantDocument()`, reached via Documents & Files' "Ingest governed document text" paste-text form.

**Conclusion:** a real, persisted Tenant 0 Supabase row, created by pasting placeholder text through that form during earlier pipeline testing (most plausibly Sprint 2's WS1/WS2 RAG-pipeline verification on 2026-07-24, one day before the founder's own real uploads on 2026-07-25, matching the "Jul 24, 10:42 AM" timestamp the founder reported seeing). It is **not** hardcoded, **not** seeded/demo data, and **not** a local-fallback artifact.

## Cleanup / Exclusion Approach

Given the finding above, silently deleting the record was not attempted -- non-negotiable per the sprint prompt, and appropriately cautious given it could not be independently confirmed as safe-to-delete without live DB access. Instead: `canRetrieveDocument()` previously excluded only `status === "deleted"` documents from RAG retrieval, not `"archived"` ones -- so archiving a document through Knowledge Hub's existing, real Archive button (already built, already wired to `documentsRepository.update()`) had **no effect** on live RAG retrieval. That gap is now fixed. This makes the safest possible cleanup path -- archive, not delete -- actually work.

**This sprint did not itself archive the stale document in production** (no live/credentialed access). The HITL retest step below is required to complete this.

## Knowledge Hub-to-Index Implementation Summary

`ingestTenantDocument()` gained an optional `documentId` parameter. When a HITL selects an existing Knowledge Hub document in the new `DocumentsSection.tsx` selector instead of leaving "New document (paste text only)," the ingest call reuses that document's real row (verified to belong to the caller's organization; rejected if deleted or cross-tenant) instead of creating a new, disconnected one. The document's own title/visibility/classification/tags/owner are used for the resulting chunks -- the form's inputs are ignored in this mode specifically so they cannot silently override real governed metadata. A new document version is appended with the correct next version number. **PDF/DOCX text extraction was not added** -- there is no such pipeline anywhere in this codebase, and adding one was out of this sprint's scope. The HITL still pastes the text to index; what changed is that the resulting chunks now attach to the correct, already-governed document record instead of spawning an orphan duplicate with a similar title. The UI says this explicitly.

## Tenant/Permission Metadata Handling

- `rag_document_chunks` rows continue to carry `organization_id` from the authenticated scope, unchanged by this sprint.
- The reindex path cannot cross tenants: `getById()` result is checked against `scope.organizationId`, and a mismatch throws before any write happens. Covered by a dedicated test.
- Visibility/classification/role-allowlist metadata on new chunks is now guaranteed to match the *actual* document's real values in the reindex path (previously, for a brand-new document via paste-text, these came from form defaults; that path is unchanged and was already scope-correct).
- No global, tenant-less chunks are created by either path.

## Tests Run

- `governedRag.test.ts`, `tenantRagWorkflow.test.ts`, `DocumentsSection.test.tsx` (new) run in isolation first: 16/16 passed.
- Full suite, first attempt: **139/141 test files passed, 540/542 tests passed, exit 1.** Two failures:
  1. **Genuine regression this sprint introduced:** `src/app/routing/lazyRoutes.test.ts`'s Sprint-4 F-019 module-distinctness guard failed, because the new, intentional "Knowledge Hub" cross-reference copy added to `DocumentsSection.tsx` (guiding the user to where to upload a document first, per the founder's own A-61 wording) tripped its blanket "must never contain the other module's name" substring check. Root-caused, then fixed by tightening the test to check the actual module-identity heading text (`title="Documents & File Intelligence"` / `title="Knowledge Hub"`) specifically, which is what F-019 was actually guarding against (the two components rendering as if they were each other), rather than banning any mention of the other module's name -- a legitimate product requirement this sprint, not a copy-paste bug.
  2. `OAuthProviderButtons.test.tsx` timed out at 5000ms. Untouched by this sprint's changes. Re-ran in isolation immediately after and it passed cleanly (2/2) -- consistent with this session's previously-documented low-free-RAM worker-timeout pattern on this machine, not a regression.
- Full suite, clean re-run after the `lazyRoutes.test.ts` fix: **141/141 test files passed, 542/542 tests passed, exit 0.**
- `pnpm run test:rag` and `pnpm run test:security` **do not exist as scripts in `package.json`** -- documented per the sprint prompt's own instruction, not fabricated.

## Verification Results

| Gate | Command | Result |
|---|---|---|
| Typecheck | `pnpm run typecheck` | Pass, exit 0, zero errors |
| Mobile typecheck | `pnpm --dir apps/mobile run typecheck` | Pass, exit 0, zero errors |
| Lint | `pnpm run lint --max-warnings=0` | Pass, exit 0, zero warnings |
| Tests | `pnpm run test` | 141/141 test files, 542/542 tests, exit 0 |
| Build | `pnpm run build` | Pass, exit 0, "Compiled successfully" |
| `pnpm run supabase:verify` | Not run this pass | No schema/migration changed by this sprint; nothing to verify. See the `document_activity` note below for why no migration was needed |

## A Deliberate Scope Decision: No New Migration

`document_activity.action` has a DB check constraint (`202607040001_sprint9_knowledge_hub.sql`) limited to `'uploaded', 'viewed', 'edited', 'downloaded', 'deleted', 'archived', 'restored', 'permission_changed'` -- no `"indexed"` value. Adding one would require a new migration. To keep this sprint scoped exactly to source integrity and the selector (per the prompt's own "do not rewrite the RAG architecture" non-negotiable), the reindex path instead records `action: "edited"` with `metadata.event: "indexed"` distinguishing it from a plain metadata edit. This is a real, honestly-documented trade-off, not a hidden shortcut.

## Items Closed

- RAG1-01 through RAG1-09: all Done, per `AI_WORKSPACE_RAG_PIPELINE_REMEDIATION_CHECKLIST_2026_07_26.md`.
- RAG1-10 through RAG1-13 (verification suite): all Done, this pass.

## Items Still Blocked / Partial

- **RAG1-14 exit criteria "HITL has clear retest steps"**: met by this document (see below), but the retest itself has not been performed -- this environment has no live/credentialed Supabase or production access.
- **A-61**: kept `Blocked`, not moved to `Yes`. Code shipped and locally verified; not yet exercised live in production by the HITL.
- **A-62**: kept `No` with a "mechanism fixed" qualifier, not moved to `Yes`. The archive-then-exclude mechanism is now real; the HITL has not yet archived the specific stale document in production.
- **A-55: explicitly NOT resolved.** Per the sprint's own non-negotiable ("Do not claim A-55 is fixed until real document re-query proves it"), nothing in this sprint touches answer generation, and no re-query was performed (no live access). A-55 remains exactly as diagnosed in the gap analysis: two competing hypotheses, undistinguished. This sprint's work is a precondition for running that diagnostic, not the diagnostic itself.
- **A-13**: unchanged, kept `Blocked`. Same reasoning as A-55.

## Why A-55 Is Not Resolved

A-55 (RAG answers return templated/dummy-pattern text) requires evidence this environment cannot produce: a live production query against a real, freshly-indexed document, after the stale placeholder has actually been archived. This sprint built the two preconditions (archiving now works; an existing document can now be selected and reindexed without duplication) but did not and could not execute them against production. Claiming A-55 fixed without that evidence would be exactly the kind of inflated claim `CLAUDE.md`'s evidence discipline exists to prevent.

## Required HITL Retest Steps

1. In Knowledge Hub, find the "Pitch deck" document dated 2026-07-24 (content: "Tenant 0 dummy data"). Click **Archive**.
2. In Documents & Files, click **Upload**, open the "Index an uploaded document" selector, and pick the real, already-uploaded pitch deck (e.g. `Triaxis Ventures 23072026 (1)`). Paste its actual text into the "Document text" box (still manual -- no PDF extraction exists), and click **Index document**. Confirm the success message names that real document.
3. In AI Workspace, re-run a query that previously returned the "Tenant 0 dummy data" pattern (e.g. "Summarize Triaxis Ventures 23072026 (1)").
4. Compare the answer:
   - If it now reflects the real pitch-deck content -> A-55's root cause is confirmed as the indexing gap (A-61/A-62), not the answer generator itself. Update A-55/A-13 accordingly and prioritize any remaining RAG-2 work.
   - If it still returns templated/keyword-echo text despite a real indexed source -> A-55 is an answer-generation problem, and RAG-2 should investigate the generation path directly (`RAG2-02` in the roadmap).

## Remaining Risks

- The `canRetrieveDocument()` fix (excluding archived documents) applies globally, including to the in-memory/no-Supabase-configured code path used in tests and local dev -- verified via the new test, low risk.
- Reindexing an existing document currently still requires the HITL to manually paste its full text; a long, complex real document (the founder's stated use case) remains a manual-paste burden, just no longer a duplicate-creating one. Automated PDF/DOCX extraction remains unbuilt and unscoped for this program.
- The stale placeholder's exact database row (ID, exact creation actor) was not independently confirmed via direct query, only inferred from code architecture and full-codebase text search -- if this inference is wrong, the HITL archiving "the Pitch deck document" in Knowledge Hub will not find a matching entry, and RAG1-01's finding would need re-investigation with live DB access.

## Exit Criteria Status

| Criterion | Status |
|---|---|
| 1. Stale placeholder indexed source identified | Done (code-level inference, documented as such) |
| 2. Stale placeholder removed/archived/excluded from live retrieval | Mechanism fixed; HITL action required to complete |
| 3. Knowledge Hub documents selectable for governed indexing | Done |
| 4. Indexing remains HITL-triggered | Done -- no auto-indexing added |
| 5. Tenant and permission metadata preserved | Done |
| 6. UI copy explains the indexing path clearly | Done |
| 7. Tests added/updated | Done -- 9 new tests across 3 files |
| 8. Typecheck/lint/tests/build run and documented | Done |
| 9. Closeout exists | This document |
| 10. HITL has clear retest steps | Done -- see above |

Per this sprint's own instruction, **RAG Remediation Sprint 2 is not started.**
