import { describe, expect, it } from "vitest";
import { demoApprovalQueue } from "./demoApprovals";
import { demoDocumentCards } from "./demoDocuments";
import { executiveDemoMetrics } from "./demoMetrics";
import { demoProjects } from "./seedData";
import { demoStakeholderCards } from "./demoStakeholders";
import { guidedDemoSteps } from "./demoWorkflow";

describe("Sprint 15 demo seed consistency", () => {
  it("keeps the guided demo and presentation data coherent", () => {
    expect(guidedDemoSteps).toHaveLength(6);
    expect(executiveDemoMetrics.length).toBeGreaterThanOrEqual(8);
    expect(demoDocumentCards.some((document) => document.title === "Dibrugarh Oxygen Risk Register")).toBe(true);

    const projectNames = new Set(demoProjects.map((project) => project.name));
    for (const approval of demoApprovalQueue) {
      expect(projectNames.has(approval.linkedProject)).toBe(true);
    }

    const stakeholderProjects = new Set(demoStakeholderCards.map((stakeholder) => stakeholder.linkedProject));
    expect(stakeholderProjects.has("Dibrugarh Oxygen Resilience Upgrade")).toBe(true);
    expect(stakeholderProjects.has("MSME Credit Workflow Pilot")).toBe(true);
  });
});
