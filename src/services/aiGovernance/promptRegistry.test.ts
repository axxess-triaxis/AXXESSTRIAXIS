import { describe, expect, it } from "vitest";
import { approvePromptVersion, buildAiOutputAuditRecord, createPromptVersion } from "./promptRegistry";

describe("prompt registry", () => {
  it("versions prompts and records high-impact AI output governance evidence", () => {
    const draft = createPromptVersion({
      currentVersions: [],
      body: "Answer with cited institutional sources only.",
      ownerUserId: "user_owner",
      changeSummary: "Initial governed RAG prompt",
      createdAt: "2026-07-09T08:00:00.000Z",
    });

    const approved = approvePromptVersion(draft, "user_approver", "2026-07-09T09:00:00.000Z");
    const record = buildAiOutputAuditRecord({
      id: "ai_audit_1",
      organizationId: "org_ne_hm",
      userId: "user_analyst",
      userRole: "Member",
      prompt: {
        id: "prompt_rag_answer",
        organizationId: "org_ne_hm",
        name: "Institutional RAG Answer",
        purpose: "Answer questions against approved institutional documents.",
        impactLevel: "high",
        versions: [approved],
      },
      model: "local-deterministic-retriever",
      generatedAt: "2026-07-09T10:00:00.000Z",
      confidenceScore: 0.81,
      sourceDocumentIds: ["doc_1", "doc_1", "doc_2"],
    });

    expect(record.promptVersion).toBe(1);
    expect(record.sourceDocumentIds).toEqual(["doc_1", "doc_2"]);
    expect(record.humanReviewRequired).toBe(true);
  });
});
