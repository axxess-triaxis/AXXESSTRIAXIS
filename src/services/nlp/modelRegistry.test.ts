import { describe, expect, it } from "vitest";
import { languageCoverage, modelsForCapability, openSourceNlpModelRegistry } from "./modelRegistry";

describe("open-source NLP model registry", () => {
  it("covers required Indic and multilingual model families", () => {
    const ids = openSourceNlpModelRegistry.map((entry) => entry.id);
    expect(ids).toEqual(expect.arrayContaining(["indicbert-v2", "muril", "indictrans2", "labse", "xlm-roberta", "multilingual-e5", "bge-m3", "fasttext-language-id", "nllb"]));
  });

  it("maps embedding models and Assamese language coverage", () => {
    expect(modelsForCapability("embeddings").length).toBeGreaterThanOrEqual(3);
    expect(languageCoverage.some((entry) => entry.language === "Assamese")).toBe(true);
  });
});
