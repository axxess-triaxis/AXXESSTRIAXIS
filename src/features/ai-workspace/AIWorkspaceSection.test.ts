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
});
