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
| RAG2-01 | Real uploaded document indexed through new/updated path | Not attempted (no live/credentialed access) | This environment has no Supabase credentials and no production browser session -- indexing a real document on production requires the HITL. See required retest steps in the closeout doc. |
| RAG2-02 | Real document query re-run after stale placeholder removal | Not attempted (same reason) | |
| RAG2-03 | Answer reflects real document content or generator blocker documented | Partially done | Code-level proof that the answer generator genuinely synthesizes from real retrieved chunk text (not a keyword-echo/stub) is established with a dedicated test suite (`tenantRagWorkflow.answerGrounding.test.ts`) using real indexed content and the real embedding provider. What remains undone is the live production confirmation that A-55's specific symptom is resolved -- that requires the retest above. |
| RAG2-04 | Answer-generation path audited | Done | See `docs/RAG.md`'s new Sprint 2 section: no real external LLM exists anywhere in this codebase; every answer is a deterministic local extractive summary; the AI router's own generated text was being silently discarded (only its confidence/metadata were used) -- now documented. |
| RAG2-05 | Confidence score computation documented | Done | `src/services/rag/confidenceExplanation.ts` (new) -- `RagConfidenceExplanation` object with source match strength, chunk count, authorization status, citation coverage, answer mode, human-review flag, and capped-reason; surfaced in AI Workspace UI and persisted in `ai_operation_reviews.metadata`. |
| RAG2-06 | AI Review Inbox receives real answer with content/citations | Done (already real pre-Sprint-2) | Confirmed unchanged from Sprint 1 findings -- citations/confidence/review routing already worked; extended this sprint to also carry the original question and full answer. |
| RAG2-07 | Created task/approval carries answer content/context as expected | Done | `liveTenantWorkflow.ts`'s `createApprovedAction()` now includes the original question and full (non-excerpted) answer in every created record's description; `confidenceExplanation` and `question` added to the structured `metadata` for approval requests, stakeholder notes, and project updates (the three record types whose domain types have a `metadata` column). Task and Meeting have no `metadata` column (schema constraint) -- they get the enriched description text only. |
| RAG2-08 | `Ask AI Workspace` routes correctly | Done | Root-caused to a single shared bug with RAG2-09 (see below) -- fixed in `useGuidedDemo.ts`/`GuidedDemoBanner.tsx`. |
| RAG2-09 | `Review Approval Queue` routes correctly | Done | Both A-64 and A-59 were the same bug: the guided-demo "Next" button displayed the *current* step's own cta label but its `onClick` (`goNext()`) navigated to the *next* step's section. Every step's own `cta` already named its own section correctly. Fixed by displaying the destination step's own `cta`, with zero change to navigation logic. Covered by `useGuidedDemo.test.tsx`. |
| RAG2-10 | CRM escalation path verified or honestly deferred | Deferred | Out of this sprint's targeted scope (A-57 is a "supporting navigation defect" only "if directly blocking validation" per the sprint prompt; it is not) -- not investigated this pass. |
| RAG2-11 | Feedback notification requirement to `triaxisgrp@gmail.com` implemented or blocked | Deferred | Same reasoning as RAG2-10 (A-65) -- out of this sprint's targeted actionable list. |
| RAG2-12 | Typecheck passes | Done | `pnpm run typecheck` -- 0 errors. |
| RAG2-13 | Lint passes | Done | `pnpm run lint --max-warnings=0` -- 0 warnings, 0 errors. |
| RAG2-14 | Tests pass | Done | See closeout doc for exact file/test counts. |
| RAG2-15 | Build passes | Done | See closeout doc. |
| RAG2-16 | RAG-2 closeout created | Done | `docs/readiness/RAG_REMEDIATION_SPRINT_2_ANSWER_QUALITY_CLOSEOUT_2026_07_26.md`. |

## Sprint RAG-3 Checklist

| ID | Item | Status | Evidence / Notes |
|---|---|---|---|
| RAG3-01 | Approved "Create Stakeholder Note" review visible in Stakeholders & CRM | Done (code shipped, pending HITL live confirmation) | Root cause: the note was already being created as a real, tenant-scoped row with full linkage -- `StakeholdersSection.tsx` just never fetched or displayed the notes table. New `GET /api/stakeholders/notes` route + a real "AI-escalated notes" list section. |
| RAG3-02 | CRM contact creation preserves AI review id, question, answer, citations, confidence, actor, tenant, timestamp | Done | Confirmed already true pre-Sprint-3 for the note-creation path itself (Sprint 2's `createApprovedAction()` fix); this sprint's contribution was making the resulting note *visible*, not the linkage itself. |
| RAG3-03 | Unauthorized user cannot create CRM handoff from a restricted review | Done (pre-existing) | Already covered by the Sprint 5 `POST /api/ai/reviews` 403 test -- the authorization gate runs before any workflow action (including stakeholder_note) can be created. No new test needed, coverage re-confirmed. |
| RAG3-04 | Live contact creation no longer inserts fake influence/engagement | Done | `stakeholderMutation()` defaults changed from `50`/`"medium"` to `0`/`"unrated"`; form now has real, optional Influence/Engagement inputs. |
| RAG3-05 | Demo contact creation remains demo-scoped | Done (unchanged) | Demo stakeholder cards are a separate, already-isolated dataset (`demoStakeholderCards`) -- not touched this sprint. |
| RAG3-06 | Contact fields persist correctly when user supplies real values | Done | Tested: supplying Influence 78 / Engagement "high" sends exactly those values through. |
| RAG3-07 | Approvals Export Report performs a real action or is honestly disabled | Done (code shipped, pending HITL live confirmation) | New `GET /api/approvals` (real tenant-scoped queue) + real JSON-download Export Report button (mirrors the existing Export Briefing pattern) + `POST /api/approvals/export` audit event. |
| RAG3-08 | Export respects tenant/role boundaries | Done | `GET /api/approvals` is session-authed and organization-scoped; tested with a cross-org row excluded. |
| RAG3-09 | Export audit event written | Done | Tested: `POST /api/approvals/export` writes a real `approvals.export_report` audit log entry with the approval count. |
| RAG3-10 | Feedback submission persists with user/tenant/route/message/timestamp | Done (unchanged, re-confirmed) | Already true pre-Sprint-3 via `betaFeedbackRepository.create()`; re-confirmed while reading the pipeline for the email-routing fix. |
| RAG3-11 | Feedback routed/prepared for email to `triaxisgrp@gmail.com` | Done (code shipped, delivery NOT live-verified) | `feedbackEmail.ts` (new) sends via the same Resend provider `invitationEmail.ts` uses. Per this sprint's own non-negotiable, delivery itself is explicitly not claimed verified -- see A-65's matrix entry and A-08's precedent (same provider, same unconfirmed-in-production status). |
| RAG3-12 | Missing email config does not lose feedback, shows safe status | Done | `sendFeedbackNotificationEmail()` returns an honest `"not-configured"` status when `RESEND_API_KEY` is absent; wrapped in try/catch so an exception can never fail the feedback submission itself. |
| RAG3-13 | A-55/A-56/A-61/A-62/A-63 reconfirmed after Sprints 1-2 | Done | See `RAG_REMEDIATION_FINAL_EVIDENCE_PACKAGE_2026_07_26.md`. |
| RAG3-14 | Typecheck passes | Done | `pnpm run typecheck` -- 0 errors. |
| RAG3-15 | Lint passes | Done | `pnpm run lint --max-warnings=0` -- 0 warnings, 0 errors. |
| RAG3-16 | Tests pass | Done | See closeout doc for exact file/test counts. |
| RAG3-17 | Build passes | Done | See closeout doc. |
| RAG3-18 | RAG-3 closeout and final evidence package created | Done | `docs/readiness/RAG_REMEDIATION_SPRINT_3_WORKFLOW_POLISH_CLOSEOUT_2026_07_26.md`, `docs/readiness/RAG_REMEDIATION_FINAL_EVIDENCE_PACKAGE_2026_07_26.md`. |

## Overall Completion Gate

| Completion Standard | Status | Evidence / Notes |
|---|---|---|
| Stale placeholder is no longer retrievable in live RAG | Done (RAG-1 scope) | Archiving now genuinely excludes a document from retrieval (RAG1-02); the HITL must still perform the archive action itself in Knowledge Hub -- see closeout for the retest step. |
| Knowledge Hub document can be selected for indexing | Done (RAG-1 scope) | RAG1-03 through RAG1-07. |
| Real document can produce cited answer or precise blocker is known | Partial -- code-level proof done, live proof still requires HITL | Answer-generation is proven (by test, with real embeddings) to genuinely synthesize from real retrieved content, not a stub -- but the live production confirmation of A-55's specific symptom still requires the HITL retest (archive stale doc, select + index real doc, re-query, compare). |
| Review-to-work mechanics preserve answer/citation context | Done (RAG-2 scope) | RAG2-07. |
| Confidence score is explainable | Done (RAG-2 scope) | RAG2-05. |
| Navigation misroutes are fixed | Done (RAG-2 scope, A-64/A-59) | RAG2-08/RAG2-09. |
| Full verification suite passes | Done | `pnpm run typecheck`, `pnpm --dir apps/mobile run typecheck`, `pnpm run lint --max-warnings=0` all pass; see RAG-1 and RAG-2 closeout docs for full test/build counts. `pnpm run test:rag` and `pnpm run test:security` do not exist as scripts in this repository -- documented, not fabricated. |

