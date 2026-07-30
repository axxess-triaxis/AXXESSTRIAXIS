import type { Document, DocumentPermission, Task } from "../../domain";
import type {
  AuditLogsRepository,
  DocumentsRepository,
  DocumentPermissionsRepository,
  DocumentVersionsRepository,
  KnowledgeArticlesRepository,
  TasksRepository,
  TenantScope,
} from "../../repositories/interfaces";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "../../repositories/supabaseAdmin";
import { routeAiRequest } from "../ai/router/aiRouter";
import { openRouterBackedProviders } from "../ai/providers";
import { extractKeywords, summarizeText } from "../nlp/localNlp";
import { answerWithGovernedRag, canRetrieveDocument, type RagAnswer, type RagCitation } from "./governedRag";
import { buildConfidenceExplanation } from "./confidenceExplanation";
import { deterministicEmbeddingProvider } from "./embeddings/embeddingProvider";
import { buildRagIngestionRecord, chunkInstitutionalText } from "./ingestion/ingestionPipeline";
import { recordWorkflowTimelineEvent } from "../workflows/liveTenantWorkflow";

export type TenantRagRepositories = {
  documentsRepository: DocumentsRepository;
  documentVersionsRepository: DocumentVersionsRepository;
  documentPermissionsRepository: DocumentPermissionsRepository;
  knowledgeArticlesRepository: KnowledgeArticlesRepository;
  tasksRepository?: TasksRepository;
  auditLogsRepository?: AuditLogsRepository;
};

export type TenantDocumentIngestInput = {
  title: string;
  bodyText: string;
  fileName?: string;
  mimeType?: string;
  visibility?: Document["visibility"];
  classification?: Document["classification"];
  tags?: string[];
  projectId?: string;
  /**
   * RAG Remediation Sprint 1 (RAG1-03/04/05/06): when set, index an already-uploaded Knowledge Hub
   * document instead of creating a new, disconnected document record. The document's real
   * title/owner/visibility/classification/tags/category are preserved from the existing row --
   * input.title/visibility/classification/tags are ignored in this mode so the indexed chunks can
   * never drift from the document's actual governed metadata. bodyText is still required: this
   * codebase has no PDF/DOCX text-extraction pipeline (see docs/DOCUMENTS.md), so the HITL supplies
   * the text to index for the selected document rather than the system inventing it.
   */
  documentId?: string;
  /**
   * Set when bodyText came from automatic extraction (documentTextExtraction.ts) rather than a
   * human pasting text -- persisted onto the created document_versions row so callers and the UI
   * can be honest about how the indexed text was actually produced.
   */
  extractionMethod?: "text-layer" | "ocr" | "docx" | "plain";
  extractionTruncated?: boolean;
};

export type TenantDocumentIngestResult = {
  document: Document;
  chunkCount: number;
  ingestionRunId?: string;
  indexId: string;
  tags: string[];
  humanReviewRequired: boolean;
  reindexedExistingDocument: boolean;
};

type RagChunkRow = {
  id: string;
  organization_id: string;
  document_id: string;
  chunk_index: number;
  chunk_text: string;
  embedding_hash: number[];
  visibility: string;
  role_allowlist: string[];
  metadata: {
    title?: string;
    tags?: string[];
    classification?: string;
    sourceTextDigest?: string;
  };
};

type AiOutputAuditRow = {
  id: string;
};

type WorkflowActionReviewRow = {
  id: string;
};

function textHash(text: string) {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) % 2147483647;
  return hash.toString(16).padStart(8, "0");
}

function storagePathForDocument(scope: TenantScope, title: string) {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "document";
  return `organizations/${scope.organizationId}/documents/manual-ingest/${Date.now()}-${slug}.txt`;
}

// RAG Remediation Sprint 2 (A-55/WS1): this previously closed with a third sentence --
// "The strongest evidence relates to {extractKeywords(question + context)}" -- that echoed
// keywords from the QUESTION itself back at the reader, which reads as a grounded finding even
// when the actual retrieved context is weak or empty-ish. Removed. The remaining two clauses were
// already genuinely grounded (a real extractive summary of the real retrieved citation excerpts,
// per governedRag.ts's local synthesis) and stay; the source list at the end names the *actual*
// documents used, not derived keywords, so a reader can verify the claim against a real source.
function contextAnswer(citations: RagCitation[]) {
  const context = citations.map((citation) => citation.excerpt).join(" ");
  if (!context.trim()) {
    return "No authorized institutional source matched this question. A human review is required before any answer is used.";
  }
  const sourceTitles = [...new Set(citations.map((citation) => citation.title))];
  return [
    "Based on the authorized tenant sources,",
    summarizeText(context, 3).replace(/\.$/, ""),
    `(source${sourceTitles.length === 1 ? "" : "s"}: ${sourceTitles.join("; ")}).`,
  ].join(" ");
}

function permittedRoleAllowlist(scope: TenantScope, document: Document) {
  if (document.classification === "restricted") return ["Super Admin", "Organization Admin", "Executive", "Manager"];
  if (document.visibility === "private") return [scope.role];
  return [];
}

export async function ingestTenantDocument(
  repositories: TenantRagRepositories,
  scope: TenantScope,
  input: TenantDocumentIngestInput,
): Promise<TenantDocumentIngestResult> {
  const bodyText = input.bodyText.trim();
  if (!bodyText) throw new Error("Document text is required for ingestion.");

  let document: Document;
  let versionNumber = 1;
  const reindexingExisting = Boolean(input.documentId);

  if (input.documentId) {
    const existing = await repositories.documentsRepository.getById(scope, input.documentId);
    if (!existing || existing.organizationId !== scope.organizationId) {
      throw new Error("Selected document was not found for this organization.");
    }
    if (existing.status === "deleted") {
      throw new Error("Cannot index a deleted document.");
    }
    // RAG1-05/06: reuse the real document's own metadata (title/owner/visibility/classification/
    // tags/category) rather than trusting whatever the ingest form happens to submit -- this is
    // what guarantees indexed chunks can never drift from the document's actual governed metadata.
    document = await repositories.documentsRepository.update(scope, existing.id, {
      description: summarizeText(bodyText, 2),
    }).catch(() => existing);

    const priorVersions = await repositories.documentVersionsRepository
      .list(scope, { pageSize: 500 })
      .catch(() => [] as Awaited<ReturnType<TenantRagRepositories["documentVersionsRepository"]["list"]>>);
    versionNumber = priorVersions.filter((version) => version.documentId === existing.id).length + 1;

    await repositories.documentVersionsRepository.create(scope, {
      organizationId: scope.organizationId,
      documentId: document.id,
      versionNumber,
      fileName: document.fileName ?? `${document.title ?? document.name}.txt`,
      fileSize: bodyText.length,
      mimeType: document.mimeType,
      storagePath: document.storagePath,
      checksum: textHash(bodyText),
      extractedText: input.extractionMethod ? bodyText : undefined,
      extractionMethod: input.extractionMethod,
      extractionTruncated: input.extractionTruncated,
      createdByUserId: scope.userId,
    }).catch(() => undefined);

    // "edited" is the closest fit in the existing document_activity action enum (DB check
    // constraint in 202607040001_sprint9_knowledge_hub.sql) -- adding a dedicated "indexed" value
    // would need its own migration, out of scope for this sprint. The metadata source field below
    // is what actually distinguishes a re-index event from a plain metadata edit.
    await repositories.documentsRepository.recordActivity(scope, {
      documentId: document.id,
      action: "edited",
      metadata: { source: "knowledge-hub-select", event: "indexed", textHash: textHash(bodyText) },
    }).catch(() => undefined);
  } else {
    const title = input.title.trim();
    if (!title) throw new Error("Document title and text are required for ingestion.");

    document = await repositories.documentsRepository.create(scope, {
      organizationId: scope.organizationId,
      name: title,
      title,
      description: summarizeText(bodyText, 2),
      storagePath: storagePathForDocument(scope, title),
      fileName: input.fileName ?? `${title}.txt`,
      fileSize: bodyText.length,
      mimeType: input.mimeType ?? "text/plain",
      documentType: "text",
      visibility: input.visibility ?? "organization",
      classification: input.classification ?? "internal",
      ownerId: scope.userId,
      createdByUserId: scope.userId,
      updatedByUserId: scope.userId,
      tags: input.tags?.length ? input.tags : extractKeywords(bodyText, 6),
      projectId: input.projectId,
    });

    await repositories.documentVersionsRepository.create(scope, {
      organizationId: scope.organizationId,
      documentId: document.id,
      versionNumber: 1,
      fileName: document.fileName ?? `${title}.txt`,
      fileSize: bodyText.length,
      mimeType: document.mimeType,
      storagePath: document.storagePath,
      checksum: textHash(bodyText),
      createdByUserId: scope.userId,
    }).catch(() => undefined);

    await repositories.documentsRepository.recordActivity(scope, {
      documentId: document.id,
      action: "uploaded",
      metadata: { source: "manual-ingest", textHash: textHash(bodyText) },
    }).catch(() => undefined);
  }

  const title = document.title ?? document.name;

  const ingestionRecord = buildRagIngestionRecord(document, bodyText);
  const chunks = chunkInstitutionalText(bodyText);
  let ingestionRunId: string | undefined;

  if (isSupabaseAdminConfigured()) {
    const runs = await supabaseAdminRest<Array<{ id: string }>>("rag_ingestion_runs", {
      method: "POST",
      body: {
        organization_id: scope.organizationId,
        document_id: document.id,
        status: "ready",
        chunk_count: chunks.length,
        model_id: deterministicEmbeddingProvider.name,
        metadata: {
          classification: ingestionRecord.classification,
          tags: ingestionRecord.tags,
          sourceTextDigest: textHash(bodyText),
        },
        created_by: scope.userId,
        completed_at: new Date().toISOString(),
      },
    });
    ingestionRunId = runs[0]?.id;

    const chunkRows = await Promise.all(chunks.map(async (chunk, index) => ({
      organization_id: scope.organizationId,
      document_id: document.id,
      ingestion_run_id: ingestionRunId,
      chunk_index: index,
      chunk_text: chunk,
      embedding_model: deterministicEmbeddingProvider.name,
      embedding_hash: await deterministicEmbeddingProvider.embed(chunk),
      visibility: document.visibility ?? "organization",
      role_allowlist: permittedRoleAllowlist(scope, document),
      metadata: {
        title,
        tags: document.tags ?? [],
        classification: document.classification,
        sourceTextDigest: textHash(bodyText),
      },
    })));

    await supabaseAdminRest("rag_document_chunks", {
      method: "POST",
      body: chunkRows,
    });
  }

  await repositories.auditLogsRepository?.record(scope, {
    action: "document.ingested",
    resourceType: "document",
    resourceId: document.id,
    category: "knowledge-hub",
    metadata: {
      chunkCount: chunks.length,
      indexId: ingestionRecord.indexId,
      tags: ingestionRecord.tags,
      persistentChunks: isSupabaseAdminConfigured(),
      reindexedExistingDocument: reindexingExisting,
    },
  }).catch(() => undefined);

  return {
    document,
    chunkCount: chunks.length,
    ingestionRunId,
    indexId: ingestionRecord.indexId,
    tags: ingestionRecord.tags,
    humanReviewRequired: ingestionRecord.humanReviewRequired,
    reindexedExistingDocument: reindexingExisting,
  };
}

async function persistentCitationsForQuestion(
  repositories: TenantRagRepositories,
  scope: TenantScope,
  question: string,
  limit: number,
) {
  if (!isSupabaseAdminConfigured()) return [];

  const [documents, permissions] = await Promise.all([
    repositories.documentsRepository.list(scope, { pageSize: 2500 }),
    repositories.documentPermissionsRepository.list(scope, { pageSize: 1000 }).catch(() => [] as DocumentPermission[]),
  ]);
  const authorizedDocuments = documents.filter((document) => canRetrieveDocument(scope, document, permissions));
  if (authorizedDocuments.length === 0) return [];

  const ids = authorizedDocuments.map((document) => document.id);
  const query = new URLSearchParams({
    organization_id: `eq.${scope.organizationId}`,
    document_id: `in.(${ids.join(",")})`,
    select: "id,organization_id,document_id,chunk_index,chunk_text,embedding_hash,visibility,role_allowlist,metadata",
    limit: "2500",
  });
  const rows = await supabaseAdminRest<RagChunkRow[]>("rag_document_chunks", { query }).catch(() => []);
  const questionVector = await deterministicEmbeddingProvider.embed(question);
  const documentById = new Map(authorizedDocuments.map((document) => [document.id, document]));

  return rows
    .filter((row) => row.organization_id === scope.organizationId)
    .filter((row) => {
      const document = documentById.get(row.document_id);
      if (!document) return false;
      if (row.role_allowlist.length > 0 && !row.role_allowlist.includes(scope.role)) return false;
      return canRetrieveDocument(scope, document, permissions);
    })
    .map((row): RagCitation => {
      const score = row.embedding_hash.reduce((sum, value, index) => sum + value * (questionVector[index] ?? 0), 0);
      return {
        sourceType: "document",
        sourceId: row.document_id,
        title: row.metadata?.title ?? documentById.get(row.document_id)?.title ?? "Institutional document",
        score,
        excerpt: summarizeText(row.chunk_text, 1),
      };
    })
    .filter((citation) => citation.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

export async function answerTenantQuestion(
  repositories: TenantRagRepositories,
  scope: TenantScope,
  question: string,
  options: { limit?: number } = {},
): Promise<RagAnswer & { aiOutputAuditId?: string; modelUsed?: string; providerUsed?: string; latencyMs?: number; costTier?: string }> {
  const limit = options.limit ?? 5;
  const citations = await persistentCitationsForQuestion(repositories, scope, question, limit);
  let baseAnswer: RagAnswer;
  if (citations.length) {
    const rawConfidence = Math.min(0.96, Math.max(0.42, citations.reduce((sum, citation) => sum + citation.score, 0) / citations.length + 0.28));
    const { confidence, explanation } = buildConfidenceExplanation({
      citations,
      rawConfidence,
      humanReviewRequired: citations.some((citation) => citation.score < 0.5),
      // Known limitation (documented in the RAG Remediation Sprint 2 closeout): RagCitation does
      // not carry document classification for this persistent-chunk path, unlike governedRag.ts's
      // in-memory path, so restricted-source detection isn't available here yet.
      hasRestrictedSource: false,
    });
    baseAnswer = {
      answer: contextAnswer(citations),
      confidence,
      humanReviewRequired: explanation.humanReviewRequired,
      sources: citations,
      keywords: extractKeywords(question, 6),
      rationale: `Synthesized from ${citations.length} governed source${citations.length === 1 ? "" : "s"} (top match: "${citations[0].title}", ${Math.round(citations[0].score * 100)}% relevance).`,
      confidenceExplanation: explanation,
    };
  } else {
    baseAnswer = await answerWithGovernedRag(repositories, scope, { question, limit });
  }

  const routeResult = await routeAiRequest({
    prompt: `${question}\n\nAuthorized source summary:\n${baseAnswer.sources.map((source) => `${source.title}: ${source.excerpt}`).join("\n")}`,
    task: "rag_answer",
    context: {
      organizationId: scope.organizationId,
      userId: scope.userId,
      userRole: scope.role,
      documentIds: baseAnswer.sources.map((source) => source.sourceId),
      requiresCitation: true,
      sensitivity: baseAnswer.humanReviewRequired ? "confidential" : "internal",
      costPreference: "balanced",
      latencyPreference: "balanced",
    },
  });

  // 2026-07-30: routeAiRequest was already being called here, but only routeResult.confidence was
  // ever used -- routeResult.answer (the model's actual synthesized text) was silently discarded,
  // and the final answer always stayed baseAnswer's local extractive summary. Founder-reported:
  // "I still do not see AI routing working; default is RAGpull." Fixed: when the router genuinely
  // reached a live OpenRouter-backed model (kimi/deepseek) with real output -- not
  // remotePlaceholderProvider's stub text for providers like OpenAI/Anthropic with no live adapter
  // yet -- use that grounded synthesis as the answer instead of the local one.
  const isLiveModelAnswer = baseAnswer.sources.length > 0
    && openRouterBackedProviders.has(routeResult.providerUsed)
    && Boolean(routeResult.answer?.trim());
  const answer = {
    ...baseAnswer,
    answer: isLiveModelAnswer ? routeResult.answer : baseAnswer.answer,
    confidence: Math.min(baseAnswer.confidence, routeResult.confidence),
    humanReviewRequired: baseAnswer.humanReviewRequired || routeResult.humanReviewRequired,
    confidenceExplanation: isLiveModelAnswer
      ? { ...baseAnswer.confidenceExplanation, answerMode: "model_synthesis" as const }
      : baseAnswer.confidenceExplanation,
  };

  let aiOutputAuditId: string | undefined;
  if (isSupabaseAdminConfigured()) {
    const auditRows = await supabaseAdminRest<AiOutputAuditRow[]>("ai_output_audit", {
      method: "POST",
      body: {
        organization_id: scope.organizationId,
        user_id: scope.userId,
        user_role: scope.role,
        prompt_version: 1,
        model: routeResult.modelUsed,
        confidence_score: Number(answer.confidence.toFixed(4)),
        source_document_ids: answer.sources.filter((source) => source.sourceType === "document").map((source) => source.sourceId),
        source_chunk_ids: answer.sources.map((source) => `${source.sourceType}:${source.sourceId}`),
        human_review_required: answer.humanReviewRequired,
        human_review_status: answer.humanReviewRequired ? "pending_review" : "not_required",
        finalization_status: "draft",
        metadata: {
          question,
          answer: answer.answer,
          providerUsed: routeResult.providerUsed,
          routingReason: routeResult.routingReason,
          latencyMs: routeResult.latencyMs,
          costTier: routeResult.costTier,
          citations: answer.sources,
        },
      },
    }).catch(() => []);
    aiOutputAuditId = auditRows[0]?.id;

    // Sprint 2 (Live Golden Path Execution): every generated answer becomes an AI Review Inbox
    // item, not just ones a caller happens to route there. Before this, ai_output_audit rows
    // (written above) and ai_operation_reviews rows (what the Review Inbox actually reads, see
    // src/services/ai/reviewInbox.ts) were two disconnected tables -- nothing ever inserted into
    // ai_operation_reviews, so the inbox stayed empty no matter how many questions were asked.
    // Everything downstream of this row existing (approve/reject, "approve and create" ->
    // createWorkflowActionFromAiReview) was already fully built; this was the one missing write.
    await supabaseAdminRest("ai_operation_reviews", {
      method: "POST",
      body: {
        organization_id: scope.organizationId,
        created_by_user_id: scope.userId,
        source_audit_id: aiOutputAuditId,
        task_category: "governed_rag_answer",
        status: "pending",
        confidence: Number(answer.confidence.toFixed(4)),
        human_review_flag: answer.humanReviewRequired,
        answer_excerpt: summarizeText(answer.answer, 1),
        citations: answer.sources.map((source) => ({
          title: source.title,
          sourceId: source.sourceId,
          excerpt: source.excerpt,
          score: source.score,
        })),
        // RAG Remediation Sprint 2 (A-63): the review row previously carried only a one-sentence
        // excerpt of the answer and never the original question at all, so anything created from
        // an approved review (createWorkflowActionFromAiReview) could not include either -- fixed
        // by using the existing ai_operation_reviews.metadata jsonb column (no migration needed).
        metadata: {
          question,
          fullAnswer: answer.answer,
          confidenceExplanation: answer.confidenceExplanation,
        },
      },
    }).catch(() => undefined);
  }

  const auditLog = await repositories.auditLogsRepository?.record(scope, {
    action: "rag.answer.generated",
    resourceType: "ai_output_audit",
    resourceId: aiOutputAuditId,
    category: "ai-governance",
    metadata: {
      question,
      confidence: answer.confidence,
      humanReviewRequired: answer.humanReviewRequired,
      sourceIds: answer.sources.map((source) => source.sourceId),
      providerUsed: routeResult.providerUsed,
      modelUsed: routeResult.modelUsed,
      latencyMs: routeResult.latencyMs,
      costTier: routeResult.costTier,
    },
  }).catch(() => undefined);

  // Sprint 2 (Live Golden Path Execution): the timeline event schema already had an
  // "ai_answer_generated" / "ai_review" pair defined (workflowEvidence.ts) for exactly this
  // moment, but nothing ever wrote one -- the golden path's timeline previously jumped straight
  // from "document_indexed" to "human_decision" with the answer-generation step missing entirely.
  await recordWorkflowTimelineEvent({
    organizationId: scope.organizationId,
    resourceType: "ai_review",
    resourceId: aiOutputAuditId,
    eventType: "ai_answer_generated",
    title: "Cited answer generated",
    description: answer.answer.slice(0, 200),
    actorUserId: scope.userId,
    actorLabel: scope.role,
    sourceType: "ai_output_audit",
    sourceId: aiOutputAuditId,
    auditLogId: auditLog?.id,
    metadata: {
      question,
      confidence: answer.confidence,
      humanReviewRequired: answer.humanReviewRequired,
      sourceCount: answer.sources.length,
    },
  }).catch(() => undefined);

  return {
    ...answer,
    aiOutputAuditId,
    modelUsed: routeResult.modelUsed,
    providerUsed: routeResult.providerUsed,
    latencyMs: routeResult.latencyMs,
    costTier: routeResult.costTier,
  };
}

export async function reviewTenantRagAnswer(
  repositories: TenantRagRepositories,
  scope: TenantScope,
  input: {
    aiOutputAuditId: string;
    decision: "approved" | "rejected";
    notes?: string;
    createTask?: boolean;
    taskTitle?: string;
  },
) {
  if (!input.aiOutputAuditId) throw new Error("AI output audit id is required.");
  const now = new Date().toISOString();
  let reviewId: string | undefined;
  let task: Task | undefined;

  if (isSupabaseAdminConfigured()) {
    await supabaseAdminRest("ai_output_audit", {
      method: "PATCH",
      query: new URLSearchParams({ id: `eq.${input.aiOutputAuditId}`, organization_id: `eq.${scope.organizationId}` }),
      body: {
        human_review_status: input.decision,
        finalization_status: input.decision === "approved" ? "finalized" : "blocked",
        human_reviewer_user_id: scope.userId,
        approved_at: input.decision === "approved" ? now : null,
        operator_notes: input.notes ?? null,
      },
    }).catch(() => undefined);

    const reviews = await supabaseAdminRest<WorkflowActionReviewRow[]>("workflow_action_reviews", {
      method: "POST",
      body: {
        organization_id: scope.organizationId,
        ai_output_audit_id: input.aiOutputAuditId,
        reviewer_user_id: scope.userId,
        decision: input.decision,
        notes: input.notes ?? null,
        action_type: input.createTask ? "task_create" : "answer_review",
        status: input.decision === "approved" ? "approved" : "rejected",
        metadata: { taskTitle: input.taskTitle ?? null },
      },
    }).catch(() => []);
    reviewId = reviews[0]?.id;
  }

  if (input.decision === "approved" && input.createTask && repositories.tasksRepository) {
    task = await repositories.tasksRepository.create(scope, {
      organizationId: scope.organizationId,
      title: input.taskTitle?.trim() || "Review AXXESS AI recommendation",
      description: input.notes ?? "Task created from a human-approved governed AI answer.",
      assigneeId: scope.userId,
      priority: "medium",
      status: "pending",
      tags: ["ai-review", "governance"],
    });
  }

  await repositories.auditLogsRepository?.record(scope, {
    action: input.decision === "approved" ? "rag.answer.approved" : "rag.answer.rejected",
    resourceType: "ai_output_audit",
    resourceId: input.aiOutputAuditId,
    category: "ai-governance",
    metadata: {
      reviewId,
      notes: input.notes,
      createTask: Boolean(task),
      taskId: task?.id,
    },
  }).catch(() => undefined);

  return { ok: true, reviewId, task };
}
