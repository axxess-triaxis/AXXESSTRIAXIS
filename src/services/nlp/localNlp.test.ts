import { describe, expect, it } from "vitest";
import {
  classifyDocument,
  detectLanguage,
  extractEntities,
  extractKeywords,
  suggestTags,
  summarizeText,
} from "./localNlp";

describe("local NLP utilities", () => {
  it("classifies institutional document types with deterministic rules", () => {
    expect(classifyDocument("Hospital SOP for triage ward infection control")).toBe("hospital-sop");
    expect(classifyDocument("Procurement tender vendor scoring and award recommendation")).toBe("procurement");
    expect(classifyDocument("Audit observation with management response and closure")).toBe("audit");
  });

  it("extracts local keywords, entities, and tag suggestions", () => {
    const text = "North East Health Mission budget variance review for Dibrugarh and Gauhati Medical College Hospital on Q2 FY2026 with Rs 4.2 crore exposure.";

    expect(extractKeywords(text)).toContain("dibrugarh");
    expect(extractEntities(text).locations).toContain("Dibrugarh");
    expect(extractEntities(text).organizations).toContain("North East Health Mission");
    expect(suggestTags(text)).toContain("dibrugarh");
  });

  it("summarizes and detects regional language scripts without external models", () => {
    const assamese = "\u0985\u09B8\u09AE\u09C0\u09AF\u09BC\u09BE \u09F0\u09BE\u099C\u09CD\u09AF \u09B8\u09CD\u09AC\u09BE\u09B8\u09CD\u09A5\u09CD\u09AF";
    const summary = summarizeText("Dhubri stockout variance is above threshold. Pharmacy reconciliation is required. Mission Secretariat review is scheduled.", 2);

    expect(detectLanguage(assamese)).toBe("assamese");
    expect(summary).toContain("stockout");
  });
});
