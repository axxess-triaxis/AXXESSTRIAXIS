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
    expect(postBlock).toContain("await recordResourceCreateEvidence(resourceName, scope, result);");

    const evidenceBlock = routeSource.slice(
      routeSource.indexOf("async function recordResourceCreateEvidence"),
      routeSource.indexOf("export async function GET"),
    );
    expect(evidenceBlock).toContain("auditLogsRepository.record(scope");
    expect(evidenceBlock).toContain("recordWorkflowTimelineEvent(");
    expect(evidenceBlock).toContain("actorUserId: scope.userId");
    expect(evidenceBlock).toContain("actorLabel: scope.role");

    const configBlock = routeSource.slice(
      routeSource.indexOf("const EVIDENCE_RESOURCE_CONFIG"),
      routeSource.indexOf("async function recordResourceCreateEvidence"),
    );
    expect(configBlock).toContain('projects: { singular: "project", actionVerb: "project.created"');
  });

  it("never fails resource creation if audit/timeline recording fails", () => {
    const evidenceBlock = routeSource.slice(
      routeSource.indexOf("async function recordResourceCreateEvidence"),
      routeSource.indexOf("export async function GET"),
    );
    const catchCount = (evidenceBlock.match(/\.catch\(\(\) => undefined\)/g) ?? []).length;
    expect(catchCount).toBeGreaterThanOrEqual(2);
  });

  it("extends audit/timeline evidence beyond projects to tasks, documents, knowledge articles and meetings (Sprint 5, gap-analysis Section 2)", () => {
    const configBlock = routeSource.slice(
      routeSource.indexOf("const EVIDENCE_RESOURCE_CONFIG"),
      routeSource.indexOf("async function recordResourceCreateEvidence"),
    );
    expect(configBlock).toContain('tasks: { singular: "task", actionVerb: "task.created"');
    expect(configBlock).toContain('documents: { singular: "document", actionVerb: "document.created"');
    expect(configBlock).toContain('knowledge_articles: { singular: "knowledge_article", actionVerb: "knowledge_article.created"');
    expect(configBlock).toContain('meetings: { singular: "meeting", actionVerb: "meeting.created"');
  });

  it("only writes evidence after createRepositoryResource has already succeeded, never before or on a thrown error", () => {
    const postBlock = routeSource.slice(routeSource.indexOf("export async function POST"), routeSource.indexOf("export async function PATCH"));
    const createIndex = postBlock.indexOf("await createRepositoryResource(resourceName, scope, body)");
    const evidenceIndex = postBlock.indexOf("await recordResourceCreateEvidence(resourceName, scope, result);");
    expect(createIndex).toBeGreaterThan(-1);
    expect(evidenceIndex).toBeGreaterThan(createIndex);
  });

  it("does not write evidence for resource types outside EVIDENCE_RESOURCE_CONFIG (e.g. organizations, users, notifications)", () => {
    const evidenceBlock = routeSource.slice(
      routeSource.indexOf("async function recordResourceCreateEvidence"),
      routeSource.indexOf("export async function GET"),
    );
    expect(evidenceBlock).toContain("const config = EVIDENCE_RESOURCE_CONFIG[resourceName];");
    expect(evidenceBlock).toContain("if (!config) return;");
  });
});
