// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const history = vi.hoisted(() => ({ messages: [] as Array<{ role: string; content: string }> }));

vi.mock("../../repositories/supabaseAdmin", () => ({
  isSupabaseAdminConfigured: () => false,
  supabaseAdminRest: vi.fn(async () => []),
}));
vi.mock("../../repositories/aiConversationsRepository", () => ({
  createConversation: vi.fn(async () => "33333333-cccc-4000-8000-000000000003"),
  listConversationMessages: vi.fn(async () => history.messages),
  appendConversationMessage: vi.fn(async () => undefined),
}));

import type { Document } from "../../domain";
import { clearAiTracer } from "../ai/tracing/aiTracing";
import { runsFrom, startRecordedTracing } from "../ai/tracing/langsmithTestRecorder";
import { answerTenantQuestion, type TenantRagRepositories } from "./tenantRagWorkflow";

const scope = {
  organizationId: "11111111-aaaa-4000-8000-000000000001",
  userId: "22222222-bbbb-4000-8000-000000000002",
  role: "Super Admin" as const,
  accessToken: "access-token-value",
};

function oxygenPlan(classification: Document["classification"]): Document {
  return {
    id: "doc-1",
    title: "Oxygen resilience plan",
    organizationId: scope.organizationId,
    name: "Oxygen resilience plan",
    description: "Barpeta district oxygen resilience implementation plan",
    storagePath: "organizations/org/documents/doc-1.txt",
    mimeType: "text/plain",
    status: "active",
    visibility: "organization",
    classification,
    ownerId: scope.userId,
    tags: ["oxygen", "barpeta"],
    createdAt: "2026-07-26T00:00:00.000Z",
    updatedAt: "2026-07-26T00:00:00.000Z",
  };
}

function repositories(document: Document, getById = vi.fn(async () => document as Document | undefined)): TenantRagRepositories {
  const empty = () => ({ list: vi.fn(async () => []), getById: vi.fn(), create: vi.fn(), update: vi.fn() });
  return {
    documentsRepository: {
      list: vi.fn(async () => [document]), getById, create: vi.fn(), update: vi.fn(), archive: vi.fn(), restore: vi.fn(), softDelete: vi.fn(),
      listArchived: vi.fn(async () => []), listFavorites: vi.fn(async () => []), listSharedWithMe: vi.fn(async () => []), recordActivity: vi.fn(),
    },
    documentVersionsRepository: empty(),
    documentPermissionsRepository: empty(),
    knowledgeArticlesRepository: empty(),
    tasksRepository: empty(),
    auditLogsRepository: { list: vi.fn(async () => []), record: vi.fn(async () => ({ id: "audit-log-1" }) as never) },
  } as unknown as TenantRagRepositories;
}

const question = "What is the Barpeta oxygen resilience plan?";

describe("Knowledge Hub answer tracing", () => {
  beforeEach(() => {
    clearAiTracer();
    history.messages = [];
    // No Groq key, no embed function: the local provider answers and nothing leaves the process.
    vi.stubEnv("GROQ_API_KEY", "");
  });
  afterEach(() => {
    clearAiTracer();
    vi.unstubAllEnvs();
  });

  it("records answer, route and model call as one trace", async () => {
    const { sent, tracing } = startRecordedTracing();
    await answerTenantQuestion(repositories(oxygenPlan("internal")), scope, question);
    await tracing!.flush();

    const runs = runsFrom(sent);
    const answer = runs.find((run) => run.name === "axxess-knowledge-answer")!;
    const route = runs.find((run) => run.name === "axxess-ai-route")!;
    const model = runs.find((run) => run.name.startsWith("axxess-model:"))!;
    expect(runs).toHaveLength(3);
    expect(answer.parent_run_id).toBeUndefined();
    expect(route.parent_run_id).toBe(answer.id);
    expect(model.parent_run_id).toBe(route.id);
    expect(answer.inputs).toEqual({ question });
    expect(new Set(runs.map((run) => run.extra.metadata.thread_id)).size).toBe(1);
    expect(answer.extra.metadata.thread_id).toBeTruthy();

    const wire = JSON.stringify(sent);
    for (const leaked of [scope.organizationId, scope.userId, scope.accessToken, "33333333-cccc"]) expect(wire).not.toContain(leaked);
  });

  it.each([
    ["is restricted", repositories(oxygenPlan("restricted"))],
    ["cannot be found", repositories(oxygenPlan("internal"), vi.fn(async () => undefined))],
    ["cannot be read", repositories(oxygenPlan("internal"), vi.fn(async () => { throw new Error("denied"); }))],
  ])("sends no content when a cited document %s", async (_case, repos) => {
    const { sent, tracing } = startRecordedTracing();
    const answer = await answerTenantQuestion(repos, scope, question);
    await tracing!.flush();
    expect(answer.sources.length).toBeGreaterThan(0);
    expect(runsFrom(sent).length).toBeGreaterThan(0);
    expect(JSON.stringify(sent)).not.toMatch(/barpeta|oxygen/i);
  });

  it("sends no content for a follow-up, which carries earlier answers", async () => {
    history.messages = [{ role: "user", content: "Earlier question" }, { role: "assistant", content: "Zebra answer" }];
    const { sent, tracing } = startRecordedTracing();
    await answerTenantQuestion(repositories(oxygenPlan("internal")), scope, question);
    await tracing!.flush();
    expect(runsFrom(sent).length).toBeGreaterThan(0);
    expect(JSON.stringify(sent)).not.toMatch(/zebra|barpeta|oxygen/i);
  });

  it("reads no extra documents and answers the same when tracing is off", async () => {
    const getById = vi.fn(async () => oxygenPlan("internal") as Document | undefined);
    const untraced = await answerTenantQuestion(repositories(oxygenPlan("internal"), getById), scope, question);
    expect(getById).not.toHaveBeenCalled();
    startRecordedTracing();
    const traced = await answerTenantQuestion(repositories(oxygenPlan("internal")), scope, question);
    expect(traced.answer).toBe(untraced.answer);
    expect(traced.confidence).toBe(untraced.confidence);
  });
});
