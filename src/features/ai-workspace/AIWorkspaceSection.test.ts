import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/features/ai-workspace/AIWorkspaceSection.tsx"), "utf8");

describe("AIWorkspaceSection (Sprint 3 -- does not hang, no raw backend error text)", () => {
  it("bounds the governed question request with a timeout and abort, so it cannot hang indefinitely", () => {
    expect(source).toContain("QUERY_TIMEOUT_MS = 20_000");
    expect(source).toContain("new AbortController()");
    expect(source).toContain("controller.abort()");
    expect(source).toContain("This is taking longer than usual. You can retry the same question.");
  });

  it("never throws the raw backend error string for a failed governed question or review decision", () => {
    expect(source).not.toContain("throw new Error(result.error ?? \"AXXESS could not complete the governed question.\")");
    expect(source).not.toContain("throw new Error(result.error ?? \"Review could not be recorded.\")");
  });

  it("maps unauthorized/forbidden governed-question and review failures to safe, specific copy", () => {
    expect(source).toContain("Sign in to ask AXXESS a governed question.");
    expect(source).toContain("Your role does not have permission to ask governed questions.");
    expect(source).toContain("Sign in to record this review decision.");
    expect(source).toContain("Your role does not have permission to record this decision.");
  });

  it("TP-2 (A-28 failure class): the sample 'North East Health Mission' RAG query only auto-fires in demo mode, not for every real tenant", () => {
    const queryIndex = source.indexOf("North East Health Mission district risks");
    expect(queryIndex).toBeGreaterThan(-1);
    const precedingBlock = source.slice(Math.max(0, queryIndex - 400), queryIndex);
    expect(precedingBlock).toContain('getRuntimeMode(Boolean(session.user)) !== "demo"');
  });

  it("2026-07-30: the AI Router panel fetches real status server-side instead of calling a server-env function from client code (always reported missing_credentials in production)", () => {
    // Regression: getAiRouterStatusSnapshot() reads process.env.OPENAI_API_KEY etc. directly. This
    // component has no "use client" of its own and renders inside the app's client shell, so a
    // module-level call ran in the browser, where non-NEXT_PUBLIC_ env vars are never present --
    // every remote provider always reported "missing_credentials" and mode always "demo",
    // regardless of real production configuration. Confirmed live 2026-07-30.
    expect(source).not.toContain('from "../../services/ai/router/aiRouter"');
    expect(source).not.toMatch(/const aiRouterStatus = /);
    expect(source).toContain('fetch("/api/ai/model-policy"');
    expect(source).toContain("setRouterStatus(data.router)");
  });

  it("2026-07-30: suggestion chips are live -- clicking one asks the question, not a decorative placeholder", () => {
    // Founder-reported: "hovering options over query space are simply placeholders."
    expect(source).toContain("onClick={() => { setInput(suggestion); void askGovernedQuestion(suggestion); }}");
    expect(source).toContain("async function askGovernedQuestion(overrideQuestion?: string)");
  });

  it("2026-07-30: pressing Enter in the question input submits, not only the send button", () => {
    // Founder-reported: "'Send' button has to be pressed... Query should be simply executable by pressing 'Enter'."
    const onKeyDownIndex = source.indexOf("onKeyDown={(event) => {");
    expect(onKeyDownIndex).toBeGreaterThan(-1);
    const handlerBlock = source.slice(onKeyDownIndex, onKeyDownIndex + 200);
    expect(handlerBlock).toContain('event.key === "Enter"');
    expect(handlerBlock).toContain("void askGovernedQuestion()");
  });
});

describe("AIWorkspaceSection (Sprint 4 -- real conversation memory + Context Window + AI Audit Trail)", () => {
  it("removes the dead getAiMessages() call -- institutionalRepository is hardwired to always-empty for real tenants", () => {
    expect(source).not.toContain("getAiMessages()");
    expect(source).not.toContain('"No conversation history yet"\n                  message="Ask a governed question below');
  });

  it("threads conversationId through the request body and captures it back from the response", () => {
    expect(source).toMatch(/body:\s*JSON\.stringify\(\{[\s\S]{0,120}conversationId,/);
    expect(source).toContain("if (typedResult.conversationId) setConversationId(typedResult.conversationId);");
  });

  it("sends Context Window selections as documentIds, scoping the next question's retrieval", () => {
    expect(source).toContain("documentIds: contextItems.length ? contextItems.map((item) => item.id) : undefined");
  });

  it("pushes the just-superseded answer into real conversation history, never the initial empty/demo answer", () => {
    expect(source).toContain("if (ragAnswer.answer) {");
    expect(source).toContain("setPriorTurns((current) => [...current, { question: lastQuestionRef.current, answer: ragAnswer }]);");
  });

  it("Context Window's Add button actually fetches real documents and is no longer a dead <button> with no handler", () => {
    expect(source).toContain("async function openContextPicker()");
    expect(source).toContain("applicationServices.documentsRepository.list(tenantScope, { pageSize: 100 })");
    expect(source).toContain('onClick={() => void openContextPicker()}');
  });

  it("AI Audit Trail loads real entries via the same auditLogsRepository.list pattern as AuditLogsSection.tsx, filtered on resourceType", () => {
    expect(source).toContain("applicationServices.auditLogsRepository.list(tenantScope, { pageSize: 100 })");
    expect(source).toContain('log.resourceType === "ai_output_audit"');
  });

  it("Sources Used shows an honest empty state instead of silently rendering nothing", () => {
    expect(source).toContain("No sources yet -- ask a governed question to see cited sources here.");
  });
});
