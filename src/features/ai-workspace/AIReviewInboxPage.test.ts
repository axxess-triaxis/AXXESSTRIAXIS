import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/features/ai-workspace/AIReviewInboxPage.tsx"), "utf8");

describe("AIReviewInboxPage (Sprint 3 -- no raw backend error text, F-016)", () => {
  it("never surfaces the raw backend error/payload string to the user via setMessage", () => {
    expect(source).not.toContain("setMessage(payload.error");
    expect(source).not.toContain("setMessage(error instanceof Error ? error.message");
  });

  it("maps unauthorized and forbidden review-inbox load failures to safe, specific copy", () => {
    const loadReviewsBlock = source.slice(source.indexOf("async function loadReviews"), source.indexOf("async function decide"));
    expect(loadReviewsBlock).toContain('response.status === 401');
    expect(loadReviewsBlock).toContain("Sign in to view the AI review inbox.");
    expect(loadReviewsBlock).toContain('response.status === 403');
    expect(loadReviewsBlock).toContain("Your role does not have permission to view the AI review inbox.");
    expect(loadReviewsBlock).toContain("AI review inbox could not be loaded. Please try again.");
  });

  it("maps unauthorized and forbidden review-decision failures to safe, specific copy", () => {
    const decideBlock = source.slice(source.indexOf("async function decide"), source.length);
    expect(decideBlock).toContain("Sign in to record this review decision.");
    expect(decideBlock).toContain("Your role does not have permission to record this decision.");
    expect(decideBlock).toContain("AI review decision could not be recorded. Please try again.");
  });

  it("logs the raw backend detail for developer diagnostics instead of discarding it", () => {
    expect(source).toContain("console.error(\"AI review inbox request failed.\", payload.error)");
    expect(source).toContain("console.error(\"AI review decision request failed.\"");
  });
});
