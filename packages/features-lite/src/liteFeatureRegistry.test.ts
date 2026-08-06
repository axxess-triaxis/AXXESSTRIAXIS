import { describe, expect, it } from "vitest";
import { liteFeatureLimit, liteFeatures } from "./liteFeatureRegistry";

// XL-5 (2026-08-06): moved here from src/features/lite/liteFeatureRegistry.test.ts alongside the
// module itself.
const forbiddenLiteFeatureLabels = [
  "Golden Path",
  "Social Alerts",
  "Large Stakeholder Maps",
  "Complex Analytics",
  "Agent Connections",
  "Pilot Command Center",
  "Customer Success Live Ops",
  "Store Release Console",
] as const;

describe("AXXESS Lite feature registry", () => {
  it("contains the founder-approved 14 Lite feature surfaces and no extras", () => {
    expect(liteFeatures).toHaveLength(liteFeatureLimit);
    expect(liteFeatures.map((feature) => feature.id)).toEqual([
      "dashboard",
      "meetings",
      "tasks",
      "reminders",
      "projects",
      "programs",
      "crmStakeholders",
      "approvalsGovernance",
      "settings",
      "integrations",
      "aiWorkspace",
      "auditCompliance",
      "documentsKnowledgeHub",
      "analytics",
    ]);
  });

  it("routes every Lite feature only into the /lite surface", () => {
    for (const feature of liteFeatures) {
      expect(feature.route.startsWith("/lite")).toBe(true);
      expect(feature.webAllowed).toBe(true);
    }
  });

  it("keeps forbidden enterprise and demo surfaces out of the Lite feature registry", () => {
    const registryText = liteFeatures.map((feature) => `${feature.id} ${feature.label}`).join(" ");
    for (const forbidden of forbiddenLiteFeatureLabels) {
      expect(registryText).not.toContain(forbidden);
    }
  });

  it("does not mark every feature live before implementation evidence exists", () => {
    expect(liteFeatures.some((feature) => feature.status === "pending")).toBe(true);
    expect(liteFeatures.some((feature) => feature.status === "scaffold")).toBe(true);
  });
});
