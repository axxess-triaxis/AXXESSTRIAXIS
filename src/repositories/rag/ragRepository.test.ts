import { describe, expect, it } from "vitest";
import type { TenantScope } from "../interfaces";
import { InMemoryRagRepository } from "./ragRepository";

const executiveScope: TenantScope = {
  organizationId: "org-a",
  userId: "user-a",
  role: "Executive",
};

describe("RAG repository foundation", () => {
  it("keeps chunks scoped to the current organization", async () => {
    const repository = new InMemoryRagRepository();
    await repository.upsertChunks(executiveScope, [
      {
        id: "chunk-a",
        organizationId: "org-a",
        documentId: "doc-a",
        text: "Kamrup oxygen resilience dashboard and maintenance notes",
        vector: [1, 0, 0],
        metadata: { visibility: "organization" },
      },
      {
        id: "chunk-b",
        organizationId: "org-b",
        documentId: "doc-b",
        text: "Dhubri private procurement observation",
        vector: [0, 1, 0],
        metadata: { visibility: "organization" },
      },
    ]);

    const chunks = await repository.listByDocument(executiveScope, "doc-a");
    expect(chunks).toHaveLength(1);
    expect(chunks[0].organizationId).toBe("org-a");
  });

  it("rejects cross-tenant ingestion status writes", async () => {
    const repository = new InMemoryRagRepository();
    await expect(repository.upsertIngestionStatus(executiveScope, {
      documentId: "doc-b",
      organizationId: "org-b",
      title: "Cross Tenant Record",
      stage: "ready",
      classification: "risk-register",
      chunkCount: 1,
      indexId: "rag:org-b:doc-b",
      tags: ["risk-register"],
      humanReviewRequired: false,
    })).rejects.toThrow("cross-tenant");
  });
});
