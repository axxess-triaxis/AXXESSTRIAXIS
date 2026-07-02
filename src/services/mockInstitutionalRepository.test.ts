import { describe, expect, it } from "vitest";
import { institutionalMockRepository } from "./mockInstitutionalRepository";

describe("institutional mock repository", () => {
  it("exposes core dashboard data", () => {
    expect(institutionalMockRepository.getProjects().length).toBeGreaterThan(0);
    expect(institutionalMockRepository.getPerformanceData().length).toBeGreaterThan(0);
  });

  it("returns immutable repository-shaped arrays by contract", () => {
    const documents = institutionalMockRepository.getDocuments();
    expect(documents[0]).toHaveProperty("name");
    expect(documents[0]).toHaveProperty("aiSummary");
  });
});
