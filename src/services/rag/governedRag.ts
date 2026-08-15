import type { AuditLogsRepository, DocumentsRepository, DocumentPermissionsRepository, KnowledgeArticlesRepository, TenantScope } from "../../repositories/interfaces";
import type { Document, DocumentPermission, KnowledgeArticle, RoleName } from "../../domain";
import { extractKeywords, summarizeText, tokenize } from "../nlp/localNlp";
import { buildConfidenceExplanation, type RagConfidenceExplanation } from "./confidenceExplanation";

export type RagSourceType = "document" | "knowledge-article";

export type RagChunk = {
  id: string;
  organizationId: string;
  sourceType: RagSourceType;
  sourceId: string;
  title: string;
  text: string;
  tags: string[];
  visibility?: Document["visibility"];
  classification?: Document["classification"];
  ownerId?: string;
  categoryId?: string;
  score: number;
};

export type RagCitation = {
  sourceType: RagSourceType;
  sourceId: string;
  title: string;
  score: number;
  excerpt: string;
};

export type RagAnswer = {
  answer: string;
  confidence: number;
  humanReviewRequired: boolean;
  sources: RagCitation[];
  keywords: string[];
  /** One-line, derived-from-retrieval explanation of how the answer was produced -- not a
   * decorative label. Computed from the actual matched sources, so it stays honest when there
   * are zero sources (a real "no match" answer) as well as when there are several. */
  rationale: string;
  /** RAG Remediation Sprint 2 (A-56): what the confidence number actually measures. */
  confidenceExplanation: RagConfidenceExplanation;
};

export type RagRepositories = {
  documentsRepository: DocumentsRepository;
  documentPermissionsRepository: DocumentPermissionsRepository;
  knowledgeArticlesRepository: KnowledgeArticlesRepository;
  auditLogsRepository?: AuditLogsRepository;
};

export type RagQuery = {
  question: string;
  categoryId?: string;
  tag?: string;
  limit?: number;
};

const elevatedRoles: RoleName[] = ["Super Admin", "Organization Admin", "Executive", "Manager"];

function textForDocument(document: Document) {
  return [
    document.title,
    document.name,
    document.description,
    document.categoryName,
    document.classification,
    document.visibility,
    ...(document.tags ?? []),
  ].filter(Boolean).join(". ");
}

function chunkText(text: string, maxWords = 90) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  for (let index = 0; index < words.length; index += maxWords) {
    chunks.push(words.slice(index, index + maxWords).join(" "));
  }
  return chunks.length ? chunks : [text];
}

function tokenSet(value: string) {
  return new Set(tokenize(value));
}

function similarity(question: string, text: string) {
  const questionTokens = tokenSet(question);
  const textTokens = tokenSet(text);
  if (questionTokens.size === 0 || textTokens.size === 0) return 0;
  let overlap = 0;
  for (const token of questionTokens) {
    if (textTokens.has(token)) overlap += 1;
  }
  return overlap / Math.sqrt(questionTokens.size * textTokens.size);
}

export function canRetrieveDocument(scope: TenantScope, document: Document, permissions: DocumentPermission[]) {
  if (document.organizationId !== scope.organizationId) return false;
  // RAG Remediation Sprint 1 (RAG1-02): archived documents were previously still retrievable --
  // only "deleted" was excluded -- so archiving a stale/placeholder document from Knowledge Hub
  // had no effect on live RAG retrieval. This is the safe, non-destructive cleanup path: archive
  // (already a real, existing UI action) now genuinely removes a document from governed retrieval.
  if (document.status === "deleted" || document.status === "archived") return false;
  if (scope.role === "Super Admin") return true;
  // A-14 (2026-08-15): this role gate is absolute for restricted documents -- it short-circuits
  // before any DocumentPermission grant below is even consulted, so a permission row cannot
  // currently grant a non-elevated user access to a restricted document despite
  // DocumentPermission.principalType/.accessLevel appearing to support finer-grained grants.
  // Deliberate, not an oversight: it fails safe (less access than the type surface implies, never
  // more), and no grant-based override policy has been specified for restricted content.
  if (document.classification === "restricted" && !elevatedRoles.includes(scope.role)) return false;
  if (document.visibility === "private") {
    return document.ownerId === scope.userId || permissions.some((permission) => (
      permission.documentId === document.id
      && permission.organizationId === scope.organizationId
      && (permission.principalType === "user" && permission.principalId === scope.userId)
    ));
  }
  if (document.visibility === "team" || document.visibility === "department") {
    return elevatedRoles.includes(scope.role) || document.ownerId === scope.userId;
  }
  return document.visibility === "organization" || document.visibility === "shared" || document.ownerId === scope.userId;
}

function chunksFromDocument(document: Document) {
  return chunkText(textForDocument(document)).map((text, index): RagChunk => ({
    id: `${document.id}:chunk:${index + 1}`,
    organizationId: document.organizationId,
    sourceType: "document",
    sourceId: document.id,
    title: document.title ?? document.name,
    text,
    tags: document.tags ?? [],
    visibility: document.visibility,
    classification: document.classification,
    ownerId: document.ownerId,
    categoryId: document.categoryId,
    score: 0,
  }));
}

function chunksFromArticle(article: KnowledgeArticle) {
  return chunkText([article.title, article.summary, article.bodyMarkdown, ...article.tags].filter(Boolean).join(". ")).map((text, index): RagChunk => ({
    id: `${article.id}:chunk:${index + 1}`,
    organizationId: article.organizationId,
    sourceType: "knowledge-article",
    sourceId: article.id,
    title: article.title,
    text,
    tags: article.tags,
    categoryId: article.categoryId,
    score: 0,
  }));
}

export async function retrieveInstitutionalContext(repositories: RagRepositories, scope: TenantScope, query: RagQuery) {
  const [documents, articles, permissions] = await Promise.all([
    repositories.documentsRepository.list(scope, { pageSize: 2500 }),
    repositories.knowledgeArticlesRepository.list(scope, { pageSize: 500 }),
    repositories.documentPermissionsRepository.list(scope, { pageSize: 1000 }).catch(() => []),
  ]);

  const documentChunks = documents
    .filter((document) => canRetrieveDocument(scope, document, permissions))
    .filter((document) => !query.categoryId || document.categoryId === query.categoryId)
    .filter((document) => !query.tag || document.tags?.includes(query.tag))
    .flatMap(chunksFromDocument);

  const articleChunks = articles
    .filter((article) => article.organizationId === scope.organizationId && article.status !== "archived")
    .filter((article) => !query.categoryId || article.categoryId === query.categoryId)
    .filter((article) => !query.tag || article.tags.includes(query.tag))
    .flatMap(chunksFromArticle);

  return [...documentChunks, ...articleChunks]
    .map((chunk) => ({ ...chunk, score: similarity(query.question, chunk.text) }))
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, query.limit ?? 5);
}

export async function answerWithGovernedRag(repositories: RagRepositories, scope: TenantScope, query: RagQuery): Promise<RagAnswer> {
  const chunks = await retrieveInstitutionalContext(repositories, scope, query);
  const topText = chunks.map((chunk) => chunk.text).join(" ");
  const rawConfidence = chunks.length === 0 ? 0 : Math.min(0.96, chunks.reduce((sum, chunk) => sum + chunk.score, 0) / chunks.length + 0.35);
  const hasRestrictedSource = chunks.some((chunk) => chunk.classification === "restricted");
  const answer = chunks.length
    ? summarizeText(topText, 3)
    : "No authorized institutional source matched this question. A human review is required before any answer is used.";

  const rationale = chunks.length === 0
    ? "No authorized institutional source matched this question closely enough to generate a governed answer."
    : `Synthesized from ${chunks.length} governed source${chunks.length === 1 ? "" : "s"} (top match: "${chunks[0].title}", ${Math.round(chunks[0].score * 100)}% relevance).`;

  const sources = chunks.map((chunk) => ({
    sourceType: chunk.sourceType,
    sourceId: chunk.sourceId,
    title: chunk.title,
    score: chunk.score,
    excerpt: summarizeText(chunk.text, 1),
  }));

  const { confidence, explanation } = buildConfidenceExplanation({
    citations: sources,
    rawConfidence,
    // Preserves the pre-Sprint-2 threshold (confidence < 0.62) as one of the human-review triggers.
    humanReviewRequired: rawConfidence < 0.62 || hasRestrictedSource,
    hasRestrictedSource,
  });

  const result: RagAnswer = {
    answer,
    confidence,
    humanReviewRequired: explanation.humanReviewRequired,
    keywords: extractKeywords(query.question),
    rationale,
    sources,
    confidenceExplanation: explanation,
  };

  await repositories.auditLogsRepository?.record(scope, {
    action: "rag.answer.generated",
    resourceType: "rag-query",
    category: "knowledge-hub",
    metadata: {
      confidence: result.confidence,
      humanReviewRequired: result.humanReviewRequired,
      sourceIds: result.sources.map((source) => source.sourceId),
      query: query.question,
    },
  }).catch(() => undefined);

  return result;
}
