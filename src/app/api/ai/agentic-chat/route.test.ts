import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const routeSource = readFileSync(join(process.cwd(), "src", "app", "api", "ai", "agentic-chat", "route.ts"), "utf8");

describe("agentic chat API", () => {
  it("requires a real session -- never trusts a client-sent scope or role", () => {
    expect(routeSource).toContain("getServerAuthSession(true)");
    expect(routeSource).toContain("Unauthorized.");
    expect(routeSource).toContain("tenantScopeFromUser(session.user, session.accessToken)");
    // The role passed into the loop must come from the session, never the request body.
    expect(routeSource).toContain("role: session.user.role");
  });

  it("returns the agentic_unavailable status string ChatbotPanel.tsx's disclosed fallback depends on, rather than a bare error", () => {
    expect(routeSource).toContain('status === "unavailable"');
    expect(routeSource).toContain('"agentic_unavailable"');
  });

  it("writes its own audit entry since it bypasses routeAiRequest's own audit write", () => {
    expect(routeSource).toContain("ai.agentic_chat.turn.completed");
    expect(routeSource).toContain("auditLogsRepository.record");
  });

  it("rejects a request with neither userMessage nor resume before touching the session", () => {
    expect(routeSource).toContain("userMessage or resume is required");
  });
});
