import { afterEach, describe, expect, it, vi } from "vitest";

// 2026-07-30: routeAiRequest was already being called inside answerTenantQuestion, but only
// routeResult.confidence was ever read from it -- routeResult.answer (the model's real synthesized
// text) was silently discarded every time, so the final answer always stayed the local extractive
// summary regardless of which provider the router picked. Founder-reported live on
// landing.triaxisventures.com/ai-workspace: "I still do not see AI routing working; default is
// RAGpull." Isolated into its own file (vi.mock is file-scoped) so this suite can control exactly
// what routeAiRequest returns without touching the other tenantRagWorkflow test files.
const routeAiRequestMock = vi.fn();
vi.mock("../ai/router/aiRouter", () => ({
  routeAiRequest: (...args: unknown[]) => routeAiRequestMock(...args),
}));

vi.mock("../../repositories/supabaseAdmin", () => ({
  isSupabaseAdminConfigured: () => false,
  supabaseAdminRest: vi.fn(async () => []),
}));

import type { TenantRagRepositories } from "./tenantRagWorkflow";
import { answerTenantQuestion } from "./tenantRagWorkflow";
import type { Document } from "../../domain";

const scope = {
  organizationId: "00000000-0000-4000-8000-000000000001",
  userId: "00000000-0000-4000-8000-000000000101",
  role: "Employee" as const,
  accessToken: "token",
};

function document(overrides: Partial<Document> & { id: string; title: string }): Document {
  return {
    organizationId: scope.organizationId,
    name: overrides.title,
    description: "Barpeta district oxygen resilience implementation plan",
    storagePath: `organizations/org/documents/${overrides.id}.txt`,
    mimeType: "text/plain",
    status: "active",
    visibility: "organization",
    classification: "internal",
    ownerId: scope.userId,
    tags: ["oxygen", "barpeta"],
    createdAt: "2026-07-26T00:00:00.000Z",
    updatedAt: "2026-07-26T00:00:00.000Z",
    ...overrides,
  };
}

function repositories(documents: Document[]): TenantRagRepositories {
  return {
    documentsRepository: {
      list: vi.fn(async () => documents),
      getById: vi.fn(async (_s, id) => documents.find((d) => d.id === id)),
      create: vi.fn(), update: vi.fn(), archive: vi.fn(), restore: vi.fn(), softDelete: vi.fn(),
      listArchived: vi.fn(async () => []), listFavorites: vi.fn(async () => []), listSharedWithMe: vi.fn(async () => []),
      recordActivity: vi.fn(),
    },
    documentVersionsRepository: { list: vi.fn(async () => []), getById: vi.fn(), create: vi.fn(), update: vi.fn() },
    documentPermissionsRepository: { list: vi.fn(async () => []), getById: vi.fn(), create: vi.fn(), update: vi.fn() },
    knowledgeArticlesRepository: { list: vi.fn(async () => []), getById: vi.fn(), create: vi.fn(), update: vi.fn() },
    tasksRepository: { list: vi.fn(async () => []), getById: vi.fn(), create: vi.fn(), update: vi.fn() },
    auditLogsRepository: { list: vi.fn(async () => []), record: vi.fn(async () => ({ id: "audit-log-1" }) as never) },
  };
}

describe("answerTenantQuestion + AI routing (2026-07-30 fix)", () => {
  afterEach(() => {
    routeAiRequestMock.mockReset();
  });

  it("uses the router's real synthesized answer when a genuine OpenRouter-backed model (kimi/deepseek) responded", async () => {
    routeAiRequestMock.mockResolvedValue({
      answer: "Barpeta's oxygen resilience plan prioritizes biomedical maintenance and referral corridor readiness.",
      providerUsed: "kimi",
      modelUsed: "kimi-adapter",
      confidence: 0.78,
      humanReviewRequired: false,
    });
    const repo = repositories([document({ id: "doc-1", title: "Oxygen resilience plan" })]);

    const answer = await answerTenantQuestion(repo, scope, "What is the Barpeta oxygen resilience plan?");

    expect(answer.answer).toBe("Barpeta's oxygen resilience plan prioritizes biomedical maintenance and referral corridor readiness.");
    expect(answer.confidenceExplanation.answerMode).toBe("model_synthesis");
  });

  it("keeps the local extractive-summary answer when the router only reached the placeholder stub (e.g. Anthropic, no live adapter yet)", async () => {
    routeAiRequestMock.mockResolvedValue({
      answer: "Anthropic / Claude is configured as an adapter-ready provider for rag_answer. Live completion calls remain provider-gated until production credentials, policy review, and audit sampling are enabled.",
      providerUsed: "anthropic",
      modelUsed: "anthropic-adapter",
      confidence: 0.74,
      humanReviewRequired: false,
    });
    const repo = repositories([document({ id: "doc-1", title: "Oxygen resilience plan" })]);

    const answer = await answerTenantQuestion(repo, scope, "What is the Barpeta oxygen resilience plan?");

    expect(answer.answer).not.toContain("is configured as an adapter-ready provider");
    expect(answer.confidenceExplanation.answerMode).toBe("local_extractive_summary");
  });

  it("keeps the local answer when the router falls back to the local deterministic provider", async () => {
    routeAiRequestMock.mockResolvedValue({
      answer: "AXXESS routed this rag answer request to the deterministic local provider.",
      providerUsed: "local",
      modelUsed: "local-deterministic-v1",
      confidence: 0.7,
      humanReviewRequired: false,
    });
    const repo = repositories([document({ id: "doc-1", title: "Oxygen resilience plan" })]);

    const answer = await answerTenantQuestion(repo, scope, "What is the Barpeta oxygen resilience plan?");

    expect(answer.confidenceExplanation.answerMode).toBe("local_extractive_summary");
  });

  it("never calls into a live-model answer path for a question with zero authorized sources", async () => {
    routeAiRequestMock.mockResolvedValue({
      answer: "Should never be used.",
      providerUsed: "kimi",
      modelUsed: "kimi-adapter",
      confidence: 0.78,
      humanReviewRequired: false,
    });
    const repo = repositories([]);

    const answer = await answerTenantQuestion(repo, scope, "Completely unrelated question with nothing on file");

    expect(answer.confidenceExplanation.answerMode).toBe("no_authorized_source");
    expect(answer.answer).toMatch(/no authorized institutional source matched/i);
  });
});
