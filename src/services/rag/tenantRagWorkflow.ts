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
import { extractKeywords, summarizeText } from "../nlp/localNlp";
import { answerWithGovernedRag, canRetrieveDocument, type RagAnswer, type RagCitation } from "./governedRag";
import { deterministicEmbeddingProvider } from "./embeddings/embeddingProvider";
import { buildRagIngestionRecord, chunkInstitutionalText } from "./ingestion/ingestionPipeline";

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
};

export type TenantDocumentIngestResult = {
  document: Document;
  chunkCount: number;
  ingestionRunId?: string;
  indexId: string;
  tags: string[];
  humanReviewRequired: boolean;
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

function contextAnswer(question: string, citations: RagCitation[]) {
  const context = citations.map((citation) => citation.excerpt).join(" ");
  if (!context.trim()) {
    return "No authorized institutional source matched this question. A human review is required before any answer is used.";
  }
  return [
    "Based on the authorized tenant sources,",
    summarizeText(context, 3).replace(/\.$/, ""),
    `The strongest evidence relates to ${extractKeywords(`${question} ${context}`, 5).join(", ")}.`,
  ].join(" ");
}

function confidenceForCitations(citations: RagCitation[]) {
  if (citations.length === 0) return 0;
  const average = citations.reduce((sum, citation) => sum + citation.score, 0) / citations.length;
  return Math.min(0.96, Math.max(0.42, average + 0.28));
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
  const title = input.title.trim();
  const bodyText = input.bodyText.trim();
  if (!title || !bodyText) throw new Error("Document title and text are required for ingestion.");

  const document = await repositories.documentsRepository.create(scope, {
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
    },
  }).catch(() => undefined);

  return {
    document,
    chunkCount: chunks.length,
    ingestionRunId,
    indexId: ingestionRecord.indexId,
    tags: ingestionRecord.tags,
    humanReviewRequired: ingestionRecord.humanReviewRequired,
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
  const baseAnswer = citations.length
    ? {
      answer: contextAnswer(question, citations),
      confidence: confidenceForCitations(citations),
      humanReviewRequired: citations.some((citation) => citation.score < 0.5),
      sources: citations,
      keywords: extractKeywords(question, 6),
    } satisfies RagAnswer
    : await answerWithGovernedRag(repositories, scope, { question, limit });

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

  const answer = {
    ...baseAnswer,
    confidence: Math.min(baseAnswer.confidence, routeResult.confidence),
    humanReviewRequired: baseAnswer.humanReviewRequired || routeResult.humanReviewRequired,
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
  }

  await repositories.auditLogsRepository?.record(scope, {
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
