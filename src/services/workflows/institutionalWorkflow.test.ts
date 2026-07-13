import { describe, expect, it } from "vitest";
import { createInstitutionalDemoWorkflow, workflowAuditEvents } from "./institutionalWorkflow";

describe("cross-screen institutional workflow", () => {
  it("covers the core investor demo workflow across modules", () => {
    const steps = createInstitutionalDemoWorkflow();
    expect(steps.map((step) => step.screen)).toEqual(expect.arrayContaining(["crm", "projects", "tasks", "knowledge", "ai-workspace", "approvals", "dashboard"]));
    expect(workflowAuditEvents()).toContain("workflow.rag.generated");
  });
});
