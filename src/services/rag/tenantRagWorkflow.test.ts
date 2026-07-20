import { describe, expect, it, vi } from "vitest";
import type { Document, DocumentVersion } from "../../domain";
import type { TenantRagRepositories } from "./tenantRagWorkflow";
import { answerTenantQuestion, ingestTenantDocument } from "./tenantRagWorkflow";

const scope = {
  organizationId: "00000000-0000-4000-8000-000000000001",
  userId: "00000000-0000-4000-8000-000000000101",
  role: "Organization Admin" as const,
  accessToken: "token",
};

function repositories(): TenantRagRepositories {
  const documents: Document[] = [];
  return {
    documentsRepository: {
      async list() {
        return documents;
      },
      async getById(_scope, id) {
        return documents.find((document) => document.id === id);
      },
      async create(_scope, input) {
        const document: Document = {
          id: `doc-${documents.length + 1}`,
          organizationId: scope.organizationId,
          name: String(input.name ?? input.title),
          title: String(input.title ?? input.name),
          description: String(input.description ?? ""),
          storagePath: String(input.storagePath),
          fileName: String(input.fileName),
          fileSize: Number(input.fileSize ?? 0),
          mimeType: String(input.mimeType ?? "text/plain"),
          documentType: "text",
          status: "active",
          visibility: "organization",
          classification: "internal",
          ownerId: scope.userId,
          createdByUserId: scope.userId,
          currentVersion: 1,
          tags: Array.isArray(input.tags) ? input.tags : [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        documents.push(document);
        return document;
      },
      async update(_scope, id, input) {
        const index = documents.findIndex((document) => document.id === id);
        documents[index] = { ...documents[index], ...input } as Document;
        return documents[index];
      },
      archive: vi.fn(),
      restore: vi.fn(),
      softDelete: vi.fn(),
      listArchived: vi.fn(async () => []),
      listFavorites: vi.fn(async () => []),
      listSharedWithMe: vi.fn(async () => []),
      recordActivity: vi.fn(async () => undefined),
    },
    documentVersionsRepository: {
      list: vi.fn(async () => []),
      getById: vi.fn(async () => undefined),
      create: vi.fn(async (_scope, input) => ({
        id: "version-1",
        organizationId: scope.organizationId,
        documentId: String(input.documentId),
        versionNumber: 1,
        fileName: String(input.fileName),
        fileSize: Number(input.fileSize),
        mimeType: String(input.mimeType),
        storagePath: String(input.storagePath),
        createdAt: new Date().toISOString(),
      } satisfies DocumentVersion)),
      update: vi.fn(),
    },
    documentPermissionsRepository: {
      list: vi.fn(async () => []),
      getById: vi.fn(async () => undefined),
      create: vi.fn(),
      update: vi.fn(),
    },
    knowledgeArticlesRepository: {
      list: vi.fn(async () => []),
      getById: vi.fn(async () => undefined),
      create: vi.fn(),
      update: vi.fn(),
    },
    tasksRepository: {
      list: vi.fn(async () => []),
      getById: vi.fn(async () => undefined),
      create: vi.fn(),
      update: vi.fn(),
    },
    auditLogsRepository: {
      list: vi.fn(async () => []),
      record: vi.fn(async () => undefined),
    },
  };
}

describe("tenant RAG workflow", () => {
  it("ingests document text into tenant metadata and an audit-ready chunk count", async () => {
    const repo = repositories();
    const result = await ingestTenantDocument(repo, scope, {
      title: "Dibrugarh Oxygen Resilience Note",
      bodyText: "The biomedical maintenance team must review oxygen manifold uptime and submit district variance notes before Friday.",
    });

    expect(result.document.organizationId).toBe(scope.organizationId);
    expect(result.chunkCount).toBeGreaterThan(0);
    expect(repo.auditLogsRepository?.record).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: "document.ingested" }));
  });

  it("answers questions only from tenant-authorized repository context when persistent chunks are unavailable", async () => {
    const repo = repositories();
    await ingestTenantDocument(repo, scope, {
      title: "Cachar Maternal Referral Review",
      bodyText: "Cachar referral transfer turnaround is delayed at night because ambulance dispatch confirmation is not consistently recorded.",
    });

    const answer = await answerTenantQuestion(repo, scope, "What is the Cachar maternal referral risk?");
    expect(answer.sources[0]?.title).toContain("Cachar");
    expect(answer.confidence).toBeGreaterThan(0);
    expect(answer.rationale).toContain("governed source");
    expect(answer.rationale).toContain("Cachar");
    expect(repo.auditLogsRepository?.record).toHaveBeenCalled();
  });
});
