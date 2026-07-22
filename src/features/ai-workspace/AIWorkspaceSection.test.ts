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
});
