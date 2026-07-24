import { afterEach, describe, expect, it, vi } from "vitest";

// Sprint 2 (Live Golden Path Execution): before this fix, a generated RAG answer wrote to
// ai_output_audit (via answerTenantQuestion) but nothing ever wrote a matching row into
// ai_operation_reviews -- the table the AI Review Inbox actually reads from
// (src/services/ai/reviewInbox.ts). Two independently complete pipelines existed with no bridge
// between them, so the inbox stayed empty no matter how many questions were asked. This suite
// verifies the bridge insert happens with the fields the inbox needs to render a real item.
//
// Isolated into its own file (rather than extending tenantRagWorkflow.test.ts) because it needs
// isSupabaseAdminConfigured() to report true -- the existing suite deliberately exercises the
// local-fallback path with it false, and vi.mock is file-scoped in Vitest, so this keeps both
// suites independently correct without one's mock setup fighting the other's.
vi.mock("../../repositories/supabaseAdmin", () => ({
  isSupabaseAdminConfigured: () => true,
  supabaseAdminRest: vi.fn(async (table: string) => {
    if (table === "ai_output_audit") return [{ id: "audit-row-1" }];
    return [];
  }),
}));

import { supabaseAdminRest } from "../../repositories/supabaseAdmin";
import type { TenantRagRepositories } from "./tenantRagWorkflow";
import { answerTenantQuestion } from "./tenantRagWorkflow";

const scope = {
  organizationId: "00000000-0000-4000-8000-000000000001",
  userId: "00000000-0000-4000-8000-000000000101",
  role: "Organization Admin" as const,
  accessToken: "token",
};

function repositories(): TenantRagRepositories {
  return {
    documentsRepository: { list: vi.fn(async () => []), getById: vi.fn(), create: vi.fn(), update: vi.fn(), archive: vi.fn(), restore: vi.fn(), softDelete: vi.fn(), listArchived: vi.fn(async () => []), listFavorites: vi.fn(async () => []), listSharedWithMe: vi.fn(async () => []), recordActivity: vi.fn() },
    documentVersionsRepository: { list: vi.fn(async () => []), getById: vi.fn(), create: vi.fn(), update: vi.fn() },
    documentPermissionsRepository: { list: vi.fn(async () => []), getById: vi.fn(), create: vi.fn(), update: vi.fn() },
    knowledgeArticlesRepository: { list: vi.fn(async () => []), getById: vi.fn(), create: vi.fn(), update: vi.fn() },
    tasksRepository: { list: vi.fn(async () => []), getById: vi.fn(), create: vi.fn(), update: vi.fn() },
    auditLogsRepository: { list: vi.fn(async () => []), record: vi.fn(async () => ({ id: "audit-log-1" }) as never) },
  };
}

describe("answerTenantQuestion bridges into the AI Review Inbox (Sprint 2)", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("inserts an ai_operation_reviews row for every generated answer, mapped from the answer's own fields", async () => {
    const repo = repositories();
    await answerTenantQuestion(repo, scope, "What is the district referral risk?");

    const calls = vi.mocked(supabaseAdminRest).mock.calls;
    const reviewInsertCall = calls.find(([table]) => table === "ai_operation_reviews");
    expect(reviewInsertCall).toBeDefined();

    const [, options] = reviewInsertCall!;
    expect(options).toMatchObject({
      method: "POST",
      body: expect.objectContaining({
        organization_id: scope.organizationId,
        created_by_user_id: scope.userId,
        source_audit_id: "audit-row-1",
        status: "pending",
      }),
    });
  });

  it("links the review row back to the same ai_output_audit row the answer itself created", async () => {
    const repo = repositories();
    const answer = await answerTenantQuestion(repo, scope, "What is the maternal referral SLA status?");

    expect(answer.aiOutputAuditId).toBe("audit-row-1");
    const calls = vi.mocked(supabaseAdminRest).mock.calls;
    const reviewInsertCall = calls.find(([table]) => table === "ai_operation_reviews");
    const body = (reviewInsertCall![1] as { body: { source_audit_id?: string } }).body;
    expect(body.source_audit_id).toBe(answer.aiOutputAuditId);
  });
});
