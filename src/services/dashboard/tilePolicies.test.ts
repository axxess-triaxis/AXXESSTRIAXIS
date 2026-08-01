import { describe, expect, it } from "vitest";
import {
  aiTokenUsageSpendPolicy,
  approvalSlaRiskPolicy,
  auditLogGapPolicy,
  documentIndexingHealthPolicy,
  integrationHealthPolicy,
  overdueMeetingsPolicy,
  overdueTasksPolicy,
  pendingAiReviewsPolicy,
  projectHealthPolicy,
  socialAlertsProviderGatedPolicy,
  workflowTimelineActivityPolicy,
} from "./tilePolicies";
import { computeScore } from "./tileScoring";

describe("overdueTasksPolicy", () => {
  it.each([
    [0, "green"],
    [1, "yellow"],
    [4, "orange"],
    [8, "amber"],
    [15, "red"],
  ] as const)("maps %i overdue tasks to %s", (count, criticality) => {
    expect(overdueTasksPolicy(count).criticality).toBe(criticality);
  });

  it("never returns a negative or zero priority", () => {
    for (const count of [0, 1, 5, 100]) {
      expect(overdueTasksPolicy(count).priority).toBeGreaterThanOrEqual(1);
      expect(overdueTasksPolicy(count).priority).toBeLessThanOrEqual(5);
    }
  });
});

describe("overdueMeetingsPolicy", () => {
  it.each([
    [0, "green"],
    [1, "yellow"],
    [2, "orange"],
    [5, "red"],
  ] as const)("maps %i missed meetings to %s", (count, criticality) => {
    expect(overdueMeetingsPolicy(count).criticality).toBe(criticality);
  });
});

describe("pendingAiReviewsPolicy", () => {
  it("escalates as the review queue grows", () => {
    const scores = [0, 1, 3, 8, 15].map((count) => {
      const result = pendingAiReviewsPolicy(count);
      return computeScore(result.priority, result.criticality);
    });
    for (let i = 1; i < scores.length; i += 1) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1]);
    }
  });
});

describe("approvalSlaRiskPolicy", () => {
  it("reaches red criticality once pendingApprovals >= 20 (matches existing approvalRisk threshold)", () => {
    expect(approvalSlaRiskPolicy(20).criticality).toBe("red");
    expect(approvalSlaRiskPolicy(19).criticality).not.toBe("red");
  });
});

describe("auditLogGapPolicy", () => {
  it("flags amber when zero audit events exist, green otherwise", () => {
    expect(auditLogGapPolicy(0).criticality).toBe("amber");
    expect(auditLogGapPolicy(5).criticality).toBe("green");
  });
});

describe("documentIndexingHealthPolicy", () => {
  it("flags orange when no documents are indexed", () => {
    expect(documentIndexingHealthPolicy(0).criticality).toBe("orange");
    expect(documentIndexingHealthPolicy(10).criticality).toBe("green");
  });
});

describe("aiTokenUsageSpendPolicy", () => {
  it("reaches red once spend ratio hits or exceeds the budget", () => {
    expect(aiTokenUsageSpendPolicy(1).criticality).toBe("red");
    expect(aiTokenUsageSpendPolicy(0.1).criticality).toBe("green");
  });
});

describe("projectHealthPolicy", () => {
  it("returns green when no projects exist yet", () => {
    expect(projectHealthPolicy(0, 0).criticality).toBe("green");
  });

  it("escalates to red once the majority of projects are at risk", () => {
    expect(projectHealthPolicy(7, 10).criticality).toBe("red");
    expect(projectHealthPolicy(0, 10).criticality).toBe("green");
  });
});

describe("workflowTimelineActivityPolicy", () => {
  it("flags yellow when there has been no activity in 7 days", () => {
    expect(workflowTimelineActivityPolicy(0).criticality).toBe("yellow");
    expect(workflowTimelineActivityPolicy(3).criticality).toBe("green");
  });
});

describe("integrationHealthPolicy", () => {
  it("flags yellow when nothing is connected", () => {
    expect(integrationHealthPolicy(0).criticality).toBe("yellow");
    expect(integrationHealthPolicy(2).criticality).toBe("green");
  });
});

describe("socialAlertsProviderGatedPolicy", () => {
  it("flags yellow when no provider is connected", () => {
    expect(socialAlertsProviderGatedPolicy(false).criticality).toBe("yellow");
    expect(socialAlertsProviderGatedPolicy(true).criticality).toBe("green");
  });
});
