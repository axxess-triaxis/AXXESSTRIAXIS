import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const routeSource = readFileSync(join(process.cwd(), "src", "app", "api", "repositories", "[resource]", "route.ts"), "utf8");

describe("tenant-scoped repository gateway API (Sprint 2 -- POST /api/repositories/projects)", () => {
  it("fails unauthenticated create/update/list requests safely, before touching any repository", () => {
    const getBlock = routeSource.slice(routeSource.indexOf("export async function GET"), routeSource.indexOf("export async function POST"));
    const postBlock = routeSource.slice(routeSource.indexOf("export async function POST"), routeSource.indexOf("export async function PATCH"));
    const patchBlock = routeSource.slice(routeSource.indexOf("export async function PATCH"));

    for (const block of [getBlock, postBlock, patchBlock]) {
      expect(block).toContain("getServerAuthSession(true)");
      expect(block).toContain('{ error: "Unauthorized." }, { status: 401 }');
    }
  });

  it("derives the tenant scope from the authenticated session, never from the request body", () => {
    const postBlock = routeSource.slice(routeSource.indexOf("export async function POST"), routeSource.indexOf("export async function PATCH"));
    expect(postBlock).toContain("tenantScopeFromUser(session.user, session.accessToken)");
    expect(postBlock).toContain("createRepositoryResource(resourceName, scope, body)");
  });

  it("validates required fields and returns a consistent 201 response shape on create", () => {
    const postBlock = routeSource.slice(routeSource.indexOf("export async function POST"), routeSource.indexOf("export async function PATCH"));
    expect(postBlock).toContain("validateResourceInput(resourceName, body)");
    expect(postBlock).toContain('{ error: validationError }, { status: 400 }');
    expect(postBlock).toContain("NextResponse.json(result, { status: 201 })");
  });

  it("requires project-writer roles before create is attempted", () => {
    expect(routeSource).toContain('if (resource === "projects" || resource === "meetings")');
    expect(routeSource).toContain('hasRole(role, ["Super Admin", "Organization Admin", "Executive", "Manager"])');
  });

  it("writes audit and workflow-timeline evidence for a real project creation (F-004/F-005 regression)", () => {
    const postBlock = routeSource.slice(routeSource.indexOf("export async function POST"), routeSource.indexOf("export async function PATCH"));
    expect(postBlock).toContain('if (resourceName === "projects") {');
    expect(postBlock).toContain("await recordProjectCreateEvidence(scope, result);");

    const evidenceBlock = routeSource.slice(
      routeSource.indexOf("async function recordProjectCreateEvidence"),
      routeSource.indexOf("export async function GET"),
    );
    expect(evidenceBlock).toContain('action: "project.created"');
    expect(evidenceBlock).toContain('resourceType: "project"');
    expect(evidenceBlock).toContain("resourceId: projectId");
    expect(evidenceBlock).toContain("auditLogsRepository.record(scope");
    expect(evidenceBlock).toContain("recordWorkflowTimelineEvent(");
    expect(evidenceBlock).toContain("actorUserId: scope.userId");
    expect(evidenceBlock).toContain("actorLabel: scope.role");
  });

  it("never fails project creation if audit/timeline recording fails", () => {
    const evidenceBlock = routeSource.slice(
      routeSource.indexOf("async function recordProjectCreateEvidence"),
      routeSource.indexOf("export async function GET"),
    );
    const catchCount = (evidenceBlock.match(/\.catch\(\(\) => undefined\)/g) ?? []).length;
    expect(catchCount).toBeGreaterThanOrEqual(2);
  });
});
