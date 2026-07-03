import { describe, expect, it } from "vitest";
import { legacyInstitutionalViewRepository } from "./legacyInstitutionalViewRepository";

describe("legacy institutional view repository", () => {
  it("preserves static view data for modules outside the Sprint 6 repository scope", () => {
    expect(legacyInstitutionalViewRepository.getProjects().length).toBeGreaterThan(0);
    expect(legacyInstitutionalViewRepository.getPerformanceData().length).toBeGreaterThan(0);
  });

  it("keeps existing document view contracts intact", () => {
    const documents = legacyInstitutionalViewRepository.getDocuments();
    expect(documents[0]).toHaveProperty("name");
    expect(documents[0]).toHaveProperty("aiSummary");
  });
});
