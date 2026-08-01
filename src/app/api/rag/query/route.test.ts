import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src", "app", "api", "rag", "query", "route.ts"), "utf8");

// TP-2 (2026-07-28): "Document/RAG retrieval does not return another tenant's document" --
// verifies the route never accepts or trusts a client-supplied organization/tenant identifier,
// always deriving scope from the authenticated session, and passes that scope through to every
// tenant-scoped repository the RAG answer is built from (see
// TENANT_PARTITIONING_REPOSITORY_BOUNDARY_AUDIT_2026_07_28.md for why those repositories
// themselves are safe).
describe("POST /api/rag/query (tenant-scoped RAG retrieval)", () => {
  it("requires an authenticated session before running any query", () => {
    expect(source).toContain("getServerAuthSession(true)");
    expect(source).toContain('if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });');
  });

  it("derives tenant scope from the authenticated session, not from the request body", () => {
    expect(source).toContain("tenantScopeFromUser(session.user, session.accessToken)");
    // The only fields read from the request body are the question text and an optional result
    // limit -- never an organization/tenant id.
    expect(source).toContain("{ question?: string; limit?: number }");
    expect(source).not.toMatch(/organizationId\s*[:=]\s*body\./);
  });

  it("passes the session-derived scope, not a client-supplied one, into the RAG answer builder", () => {
    const callSite = source.slice(source.indexOf("answerTenantQuestion("));
    expect(callSite.slice(0, 300)).toContain("scope, question");
  });
});
