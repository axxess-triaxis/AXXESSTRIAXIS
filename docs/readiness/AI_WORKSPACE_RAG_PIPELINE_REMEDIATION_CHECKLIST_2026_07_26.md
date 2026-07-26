# AI Workspace / RAG Pipeline Remediation Checklist

Date created: 2026-07-26  
Roadmap source: `docs/readiness/AI_WORKSPACE_RAG_PIPELINE_REMEDIATION_ROADMAP_2026_07_26.md`

## Sprint RAG-1 Checklist

| ID | Item | Status | Evidence / Notes |
|---|---|---|---|
| RAG1-01 | Stale `Pitch deck` / `Tenant 0 dummy data` indexed record located | Done (inferred from code, not live-queried) | No local Supabase credentials exist in this environment (`.env.local` has only `VERCEL_OIDC_TOKEN`), so the exact row could not be pulled directly. Full-codebase search for the literal strings `Pitch deck` and `Tenant 0 dummy data` found zero hits in source code, seed data (`src/demo/demoDataset.ts`), or Knowledge Hub fallback data (`src/features/knowledge-hub/knowledgeHubData.ts`) -- only in readiness docs quoting the founder. Combined with the architecture fact that Knowledge Hub uploads never write chunk/body text (`docs/DOCUMENTS.md`), the only code path capable of producing this record is `ingestTenantDocument()` via Documents & Files' manual "Ingest governed document text" paste-text form (`src/services/rag/tenantRagWorkflow.ts`). Conclusion: a real, persisted Tenant 0 Supabase row created by pasting placeholder text through that form during earlier pipeline testing -- not hardcoded, not seeded, not demo-only. See `RAG_REMEDIATION_SPRINT_1_SOURCE_INTEGRITY_CLOSEOUT_2026_07_26.md` for the full trace. |
| RAG1-02 | Stale placeholder removed, archived, or excluded from live retrieval | Done | `canRetrieveDocument()` in `src/services/rag/governedRag.ts` previously excluded only `status === "deleted"` from retrieval, not `"archived"` -- so archiving a document via the existing Knowledge Hub UI button had no effect on live RAG. Fixed to exclude both. This is the safe, non-destructive cleanup path: HITL archives the stale "Pitch deck" document in Knowledge Hub and it now genuinely stops being retrieved. Test: `governedRag.test.ts` ("excludes archived documents from retrieval"). |
| RAG1-03 | Knowledge Hub uploaded documents can be selected for governed indexing | Done | `DocumentsSection.tsx` now fetches real tenant documents and renders a selector; selecting one and indexing calls `ingestTenantDocument()` with `documentId` set, which indexes the existing document instead of creating a duplicate. |
| RAG1-04 | Indexing remains HITL-triggered, not automatic bulk-indexing | Done | No auto-indexing added; the HITL must open the ingest form, pick a document (or leave "New document"), paste text, and click "Index document." |
| RAG1-05 | Indexed chunks preserve tenant metadata | Done | `rag_document_chunks` rows continue to carry `organization_id` from `scope.organizationId`, unchanged by this sprint; the reused-document path cannot cross tenants (see RAG1-06 test). |
| RAG1-06 | Indexed chunks preserve permission/visibility metadata | Done | When `documentId` is set, `ingestTenantDocument()` ignores the form's title/visibility/classification/tags inputs and reuses the *existing* document's real values, so indexed chunk metadata can never drift from the document's actual governed metadata. Cross-tenant reindex attempts are rejected. Tests: `tenantRagWorkflow.test.ts` ("indexes an existing Knowledge Hub document...", "refuses to index a document belonging to another organization"). |
| RAG1-07 | UI copy explains select-from-Knowledge-Hub indexing path | Done | Selector labeled "Index an uploaded document"; explicit copy "Automatic text extraction from PDFs and other files isn't available yet -- paste the text to index below"; inherited-metadata note shown when a document is selected; empty-state copy when no documents are available yet. |
| RAG1-08 | Tests cover Knowledge Hub to index selection | Done | `DocumentsSection.test.tsx` (selector renders an uploaded document, honest limitation copy, submitting with a selection sends `documentId`, submitting without one still supports the paste-new-document path); `tenantRagWorkflow.test.ts` (reindex-existing-document behavior). |
| RAG1-09 | Tests cover stale placeholder exclusion | Done | `governedRag.test.ts` ("excludes archived documents from retrieval"), using a document whose description mirrors the real stale placeholder pattern. |
| RAG1-10 | Typecheck passes | Done | `pnpm run typecheck` -- 0 errors. |
| RAG1-11 | Lint passes | Done | `pnpm run lint --max-warnings=0` -- 0 warnings, 0 errors. |
| RAG1-12 | Tests pass | Done | See closeout doc for exact file/test counts. |
| RAG1-13 | Build passes | Done | See closeout doc for exact result. |
| RAG1-14 | RAG-1 closeout created | Done | `docs/readiness/RAG_REMEDIATION_SPRINT_1_SOURCE_INTEGRITY_CLOSEOUT_2026_07_26.md`. |

## Sprint RAG-2 Checklist

| ID | Item | Status | Evidence / Notes |
|---|---|---|---|
| RAG2-01 | Real uploaded document indexed through new/updated path | Not started |  |
| RAG2-02 | Real document query re-run after stale placeholder removal | Not started |  |
| RAG2-03 | Answer reflects real document content or generator blocker documented | Not started |  |
| RAG2-04 | Answer-generation path audited | Not started |  |
| RAG2-05 | Confidence score computation documented | Not started |  |
| RAG2-06 | AI Review Inbox receives real answer with content/citations | Not started |  |
| RAG2-07 | Created task/approval carries answer content/context as expected | Not started |  |
| RAG2-08 | `Ask AI Workspace` routes correctly | Not started |  |
| RAG2-09 | `Review Approval Queue` routes correctly | Not started |  |
| RAG2-10 | CRM escalation path verified or honestly deferred | Not started |  |
| RAG2-11 | Feedback notification requirement to `triaxisgrp@gmail.com` implemented or blocked | Not started |  |
| RAG2-12 | Typecheck passes | Not started |  |
| RAG2-13 | Lint passes | Not started |  |
| RAG2-14 | Tests pass | Not started |  |
| RAG2-15 | Build passes | Not started |  |
| RAG2-16 | RAG-2 closeout created | Not started |  |

## Overall Completion Gate

| Completion Standard | Status | Evidence / Notes |
|---|---|---|
| Stale placeholder is no longer retrievable in live RAG | Done (RAG-1 scope) | Archiving now genuinely excludes a document from retrieval (RAG1-02); the HITL must still perform the archive action itself in Knowledge Hub -- see closeout for the retest step. |
| Knowledge Hub document can be selected for indexing | Done (RAG-1 scope) | RAG1-03 through RAG1-07. |
| Real document can produce cited answer or precise blocker is known | Deferred to RAG-2 | Requires the HITL to actually perform the archive + select + paste-text + re-query retest steps; RAG-1 builds the mechanism, RAG-2 (per the roadmap) verifies the answer-quality outcome. |
| Review-to-work mechanics preserve answer/citation context | Deferred to RAG-2 | Out of RAG-1 scope per the roadmap (RAG2-04/RAG2-06/RAG2-07). |
| Confidence score is explainable | Deferred to RAG-2 | Out of RAG-1 scope per the roadmap (RAG2-03). |
| Navigation misroutes are fixed | Deferred to RAG-2 | Out of RAG-1 scope per the roadmap (RAG2-05/RAG2-06). |
| Full verification suite passes | Done | `pnpm run typecheck`, `pnpm --dir apps/mobile run typecheck`, `pnpm run lint --max-warnings=0` all pass; see closeout doc for full test/build counts. `pnpm run test:rag` and `pnpm run test:security` do not exist as scripts in this repository -- documented, not fabricated. |

