import { describe, expect, it, vi } from "vitest";
import type { Document, DocumentPermission, KnowledgeArticle } from "../../domain";
import type { DocumentsRepository, DocumentPermissionsRepository, FullTextSearchHit, KnowledgeArticlesRepository, RagFullTextSearchRepository, TenantScope } from "../../repositories/interfaces";
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
  ragFullTextSearchRepository?: RagFullTextSearchRepository;
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
    ragFullTextSearchRepository: input.ragFullTextSearchRepository,
  };
}

function fakeFullTextSearch(input: {
  documentHits?: FullTextSearchHit[];
  articleHits?: FullTextSearchHit[];
  throwOnSearch?: boolean;
}): RagFullTextSearchRepository {
  return {
    async searchDocuments() {
      if (input.throwOnSearch) throw new Error("RPC unavailable");
      return input.documentHits ?? [];
    },
    async searchArticles() {
      if (input.throwOnSearch) throw new Error("RPC unavailable");
      return input.articleHits ?? [];
    },
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

  // A-14 (2026-08-15): originally only proved this for "Employee" -- widened to all 3 non-elevated
  // roles (elevatedRoles in governedRag.ts is Super Admin/Organization Admin/Executive/Manager) so
  // the claim is "no non-elevated role," not just "not this one specific role."
  it.each(["Employee", "Consultant", "Guest"] as const)(
    "excludes restricted documents from retrieval for a non-elevated role: %s (Sprint 3 permission-aware RAG proof)",
    async (role) => {
      const restricted = document({
        id: "doc_restricted",
        organizationId: "org_1",
        title: "Restricted Audit Observation",
        description: "Audit observation for oxygen procurement variance and management response.",
        classification: "restricted",
      });

      const chunks = await retrieveInstitutionalContext(repositories({ documents: [restricted] }), {
        ...scope,
        role,
      }, {
        question: "oxygen procurement audit observation variance",
      });

      expect(chunks.map((chunk) => chunk.sourceId)).not.toContain("doc_restricted");
    },
  );

  it("excludes archived documents from retrieval (RAG Remediation Sprint 1, RAG1-02/09)", async () => {
    const archived = document({
      id: "doc_archived",
      organizationId: "org_1",
      title: "Stale Pitch Deck Placeholder",
      description: "Tenant 0 dummy data placeholder text used for an earlier pipeline test.",
      status: "archived",
    });
    const active = document({
      id: "doc_active",
      organizationId: "org_1",
      title: "Real Institutional Note",
      description: "Tenant 0 dummy data reference case for active retrieval comparison.",
    });

    const chunks = await retrieveInstitutionalContext(repositories({ documents: [archived, active] }), scope, {
      question: "tenant 0 dummy data",
    });

    expect(chunks.map((chunk) => chunk.sourceId)).not.toContain("doc_archived");
    expect(chunks.map((chunk) => chunk.sourceId)).toContain("doc_active");
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

// RAG retrieval quality (2026-09-12): search_documents_fulltext/search_knowledge_articles_fulltext
// narrow the candidate set governedRag.ts scores -- these prove that narrowing can never widen
// what canRetrieveDocument() would otherwise allow, and that any failure of the new path degrades
// to exactly today's full-scan behavior rather than a hard error or a silent recall regression.
describe("governed RAG full-text-search narrowing", () => {
  it("still excludes a restricted document for a non-elevated role even when full-text search surfaces it as a candidate", async () => {
    const restricted = document({
      id: "doc_restricted",
      organizationId: "org_1",
      title: "Restricted Audit Observation",
      description: "Audit observation for oxygen procurement variance and management response.",
      classification: "restricted",
    });

    const chunks = await retrieveInstitutionalContext(
      repositories({
        documents: [restricted],
        ragFullTextSearchRepository: fakeFullTextSearch({ documentHits: [{ id: "doc_restricted", rank: 0.9 }] }),
      }),
      scope, // "Employee" -- non-elevated
      { question: "oxygen procurement audit observation variance" },
    );

    expect(chunks.map((chunk) => chunk.sourceId)).not.toContain("doc_restricted");
  });

  it("reports retrievalMode: fulltext_search when the search repository returns a usable candidate set", async () => {
    const allowed = document({
      id: "doc_allowed",
      organizationId: "org_1",
      title: "Dibrugarh Oxygen Resilience SOP",
      description: "Oxygen resilience mitigation for district biomedical maintenance.",
    });

    const answer = await answerWithGovernedRag(
      repositories({
        documents: [allowed],
        ragFullTextSearchRepository: fakeFullTextSearch({ documentHits: [{ id: "doc_allowed", rank: 0.8 }] }),
      }),
      scope,
      { question: "oxygen resilience" },
    );

    expect(answer.retrievalMode).toBe("fulltext_search");
  });

  it("falls back to the full scan (identical result) when the search repository throws", async () => {
    const allowed = document({
      id: "doc_allowed",
      organizationId: "org_1",
      title: "Dibrugarh Oxygen Resilience SOP",
      description: "Oxygen resilience mitigation for district biomedical maintenance.",
    });
    const query = { question: "oxygen resilience" };

    const withoutFts = await retrieveInstitutionalContext(repositories({ documents: [allowed] }), scope, query);
    const withThrowingFts = await retrieveInstitutionalContext(
      repositories({ documents: [allowed], ragFullTextSearchRepository: fakeFullTextSearch({ throwOnSearch: true }) }),
      scope,
      query,
    );

    expect(withThrowingFts.map((chunk) => chunk.sourceId)).toEqual(withoutFts.map((chunk) => chunk.sourceId));
  });

  it("falls back to the full scan when the search repository returns zero candidates", async () => {
    const allowed = document({
      id: "doc_allowed",
      organizationId: "org_1",
      title: "Dibrugarh Oxygen Resilience SOP",
      description: "Oxygen resilience mitigation for district biomedical maintenance.",
    });

    const answer = await answerWithGovernedRag(
      repositories({ documents: [allowed], ragFullTextSearchRepository: fakeFullTextSearch({}) }),
      scope,
      { question: "oxygen resilience" },
    );

    expect(answer.retrievalMode).toBe("full_scan");
    expect(answer.sources.map((source) => source.sourceId)).toContain("doc_allowed");
  });

  it("does not crash when a full-text-search hit references a document that can no longer be found", async () => {
    const allowed = document({
      id: "doc_allowed",
      organizationId: "org_1",
      title: "Dibrugarh Oxygen Resilience SOP",
      description: "Oxygen resilience mitigation for district biomedical maintenance.",
    });

    const chunks = await retrieveInstitutionalContext(
      repositories({
        documents: [allowed],
        ragFullTextSearchRepository: fakeFullTextSearch({
          documentHits: [{ id: "doc_allowed", rank: 0.8 }, { id: "doc_deleted_or_stale_index", rank: 0.7 }],
        }),
      }),
      scope,
      { question: "oxygen resilience" },
    );

    expect(chunks.map((chunk) => chunk.sourceId)).toEqual(["doc_allowed"]);
  });
});
