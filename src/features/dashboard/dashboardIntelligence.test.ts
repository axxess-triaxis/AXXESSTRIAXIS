import { describe, expect, it } from "vitest";
import { aggregateProjectRisk, deriveDashboardRecommendations } from "./DashboardSection";

// Executive Dashboard Sprint ED-3: pure-function unit tests for the two new intelligence MVPs.
// Both functions operate only on data already loaded on the page (no new fetch), so they are
// tested directly here rather than through a full component render.
describe("aggregateProjectRisk (Risk Heatmap MVP)", () => {
  it("buckets projects into high/medium/low from their real risk levels, treating urgent as high", () => {
    const result = aggregateProjectRisk([
      { risk: "urgent" },
      { risk: "high" },
      { risk: "medium" },
      { risk: "medium" },
      { risk: "low" },
    ]);

    expect(result.find((bucket) => bucket.label === "High risk projects")?.count).toBe(2);
    expect(result.find((bucket) => bucket.label === "Medium risk projects")?.count).toBe(2);
    expect(result.find((bucket) => bucket.label === "Low risk projects")?.count).toBe(1);
  });

  it("returns all-zero buckets for an empty project list, never fabricated counts", () => {
    const result = aggregateProjectRisk([]);
    expect(result.every((bucket) => bucket.count === 0)).toBe(true);
  });
});

describe("deriveDashboardRecommendations (AI Recommendations MVP)", () => {
  const project = (overrides: Partial<{ id: number; name: string; risk: string }>) => ({
    id: 1,
    name: "Sample Project",
    dept: "Enterprise Portfolio",
    progress: 40,
    risk: "medium",
    owner: "AU",
    dueDate: "2026-12-31",
    status: "In Progress",
    ...overrides,
  }) as never;

  it("includes a governance recommendation only when there are real pending AI reviews", () => {
    expect(deriveDashboardRecommendations(0, [])).toHaveLength(0);

    const withReviews = deriveDashboardRecommendations(3, []);
    expect(withReviews).toHaveLength(1);
    expect(withReviews[0].type).toBe("Governance recommendation");
    expect(withReviews[0].title).toContain("3 AI outputs");
    expect(withReviews[0].route).toBe("/ai-workspace/review-inbox");
  });

  it("includes an operational recommendation per at-risk project, capped at 3, and ignores low/medium risk", () => {
    const projects = [
      project({ id: 1, name: "A", risk: "high" }),
      project({ id: 2, name: "B", risk: "urgent" }),
      project({ id: 3, name: "C", risk: "high" }),
      project({ id: 4, name: "D", risk: "high" }),
      project({ id: 5, name: "E", risk: "low" }),
      project({ id: 6, name: "F", risk: "medium" }),
    ];

    const recommendations = deriveDashboardRecommendations(0, projects);

    expect(recommendations).toHaveLength(3);
    expect(recommendations.every((recommendation) => recommendation.type === "Operational recommendation")).toBe(true);
    expect(recommendations.every((recommendation) => recommendation.route === "/projects")).toBe(true);
  });

  it("never claims autonomous AI authorship in its labels", () => {
    const recommendations = deriveDashboardRecommendations(1, [project({ risk: "high" })]);
    for (const recommendation of recommendations) {
      expect(recommendation.type).not.toMatch(/AI[- ]generated|autonomous/i);
    }
  });
});
