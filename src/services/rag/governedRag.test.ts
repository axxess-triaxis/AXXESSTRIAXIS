import { describe, expect, it, vi } from "vitest";
import type { Document, DocumentPermission, KnowledgeArticle } from "../../domain";
import type { DocumentsRepository, DocumentPermissionsRepository, KnowledgeArticlesRepository, TenantScope } from "../../repositories/interfaces";
import { answerWithGovernedRag, retrieveInstitutionalContext, type RagRepositories } from "./governedRag";

const now = "2026-07-04T00:00:00.000Z";

const scope: TenantScope = {
  organizationId: "org_1",
  userId: "user_1",
  role: "Employee",
};

function document(input: Partial<Document> & { id: string; organizationId: string; title: string; description: string }): Document {
  return {
    name: input.title,
    storagePath: `organizations/${input.organizationId}/documents/${input.id}.pdf`,
    mimeType: "application/pdf",
    documentType: "pdf",
    status: "active",
    visibility: "organization",
    ownerId: "owner_1",
    tags: [],
    classification: "internal",
    createdAt: now,
    updatedAt: now,
    ...input,
  };
}

function article(input: Partial<KnowledgeArticle> & { id: string; organizationId: string; title: string; bodyMarkdown: string }): KnowledgeArticle {
  return {
    summary: input.bodyMarkdown,
    status: "published",
    authorUserId: "owner_1",
    tags: [],
    createdAt: now,
    updatedAt: now,
    ...input,
  };
}

function repositories(input: {
  documents: Document[];
  permissions?: DocumentPermission[];
  articles?: KnowledgeArticle[];
  record?: ReturnType<typeof vi.fn>;
}): RagRepositories {
  return {
    documentsRepository: {
      list: async () => input.documents,
    } as unknown as DocumentsRepository,
    documentPermissionsRepository: {
      list: async () => input.permissions ?? [],
    } as unknown as DocumentPermissionsRepository,
    knowledgeArticlesRepository: {
      list: async () => input.articles ?? [],
    } as unknown as KnowledgeArticlesRepository,
    auditLogsRepository: input.record
      ? {
        record: input.record,
      } as unknown as RagRepositories["auditLogsRepository"]
      : undefined,
  };
}

describe("governed RAG retrieval", () => {
  it("filters unauthorized private and cross-tenant documents", async () => {
    const allowed = document({
      id: "doc_allowed",
      organizationId: "org_1",
      title: "Dibrugarh Oxygen Resilience SOP",
      description: "Oxygen resilience mitigation for district biomedical maintenance.",
    });
    const privateDocument = document({
      id: "doc_private",
      organizationId: "org_1",
      title: "Confidential Procurement Note",
      description: "Secret procurement award scoring.",
      visibility: "private",
      classification: "confidential",
    });
    const crossTenant = document({
      id: "doc_cross",
      organizationId: "org_2",
      title: "Other Tenant Oxygen Register",
      description: "Oxygen data from another organization.",
    });

    const chunks = await retrieveInstitutionalContext(repositories({ documents: [allowed, privateDocument, crossTenant] }), scope, {
      question: "secret procurement oxygen resilience",
    });

    expect(chunks.map((chunk) => chunk.sourceId)).toContain("doc_allowed");
    expect(chunks.map((chunk) => chunk.sourceId)).not.toContain("doc_private");
    expect(chunks.map((chunk) => chunk.sourceId)).not.toContain("doc_cross");
  });

  it("allows private document retrieval when explicit user permission exists", async () => {
    const privateDocument = document({
      id: "doc_private",
      organizationId: "org_1",
      title: "Private Maternal Referral Review",
      description: "Maternal referral handoff variance and corrective action.",
      visibility: "private",
      classification: "confidential",
    });
    const permissions: DocumentPermission[] = [{
      id: "perm_1",
      organizationId: "org_1",
      documentId: "doc_private",
      principalType: "user",
      principalId: "user_1",
      accessLevel: "viewer",
      createdAt: now,
    }];

    const chunks = await retrieveInstitutionalContext(repositories({ documents: [privateDocument], permissions }), scope, {
      question: "maternal referral corrective action",
    });

    expect(chunks.map((chunk) => chunk.sourceId)).toContain("doc_private");
  });

  it("returns citations, confidence, and audit metadata for generated answers", async () => {
    const record = vi.fn(async () => undefined);
    const restricted = document({
      id: "doc_restricted",
      organizationId: "org_1",
      title: "Restricted Audit Observation",
      description: "Audit observation for oxygen procurement variance and management response.",
      classification: "restricted",
    });
    const playbook = article({
      id: "article_1",
      organizationId: "org_1",
      title: "Oxygen Procurement Playbook",
      bodyMarkdown: "Use district evidence and audit observations before approving procurement variance.",
      tags: ["oxygen", "procurement"],
    });

    const answer = await answerWithGovernedRag(repositories({ documents: [restricted], articles: [playbook], record }), {
      ...scope,
      role: "Executive",
    }, {
      question: "oxygen procurement audit observation variance",
    });

    expect(answer.sources.length).toBeGreaterThan(0);
    expect(answer.confidence).toBeGreaterThan(0.5);
    expect(answer.humanReviewRequired).toBe(true);
    expect(answer.rationale).toContain(`${answer.sources.length} governed source`);
    expect(answer.rationale).toContain(answer.sources[0].title);
    expect(record).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      action: "rag.answer.generated",
      resourceType: "rag-query",
    }));
  });

  it("excludes restricted documents from retrieval for a non-elevated role (Sprint 3 permission-aware RAG proof)", async () => {
    const restricted = document({
      id: "doc_restricted",
      organizationId: "org_1",
      title: "Restricted Audit Observation",
      description: "Audit observation for oxygen procurement variance and management response.",
      classification: "restricted",
    });

    const chunks = await retrieveInstitutionalContext(repositories({ documents: [restricted] }), {
      ...scope,
      role: "Employee",
    }, {
      question: "oxygen procurement audit observation variance",
    });

    expect(chunks.map((chunk) => chunk.sourceId)).not.toContain("doc_restricted");
  });

  it("gives an honest rationale instead of a fabricated one when no source matches", async () => {
    const answer = await answerWithGovernedRag(repositories({ documents: [] }), scope, {
      question: "a question with no authorized institutional context",
    });

    expect(answer.sources).toHaveLength(0);
    expect(answer.confidence).toBe(0);
    expect(answer.rationale).toMatch(/no authorized institutional source matched/i);
  });
});
