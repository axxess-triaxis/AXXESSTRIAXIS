// @vitest-environment node
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import corpusV1 from "./golden/v1/corpus.json";
import questionsV1 from "./golden/v1/questions.json";
import corpusV2 from "./golden/v2/corpus.json";
import questionsV2 from "./golden/v2/questions.json";
import { goldenSetProblems, type GoldenCorpus, type GoldenQuestion } from "./goldenSet";

const sha256 = (file: string) =>
  createHash("sha256")
    .update(readFileSync(path.join(process.cwd(), "src/services/rag/evaluation/golden", file), "utf8").replaceAll("\r\n", "\n"))
    .digest("hex");

describe("golden sets", () => {
  it.each([
    ["v1/corpus.json", "c1c0d20604004bf3a2c540c654fb08c552987a9b8704b87d9a803e689d5b25c6"],
    ["v1/questions.json", "6f7b752c6e50760b570424cb4d1471da4f76779d39c1776397f5b68ba6671b61"],
    ["v2/corpus.json", "be50914f74e86ebffb52bb91fd694f0cbba070655c37b82e2d5b3a53b3101d0e"],
    ["v2/questions.json", "f984c39dcd03f14e4b6c895523a50bf220b359204d5f98dd685a4a84adc064cf"],
  ])("%s is frozen", (file, expected) => {
    expect(sha256(file)).toBe(expected);
  });

  it("v2 is consistent, synthetic and shares no tenant, document or question with v1", () => {
    const golden = { corpus: corpusV2 as GoldenCorpus, questions: questionsV2.questions as GoldenQuestion[] };
    expect(goldenSetProblems(golden)).toEqual([]);
    const tenants = new Set(corpusV1.tenants.map((tenant) => tenant.key));
    expect(corpusV2.tenants.filter((tenant) => tenants.has(tenant.key))).toEqual([]);
    const bodies = new Set(corpusV1.documents.map((document) => document.body));
    expect(corpusV2.documents.filter((document) => bodies.has(document.body))).toEqual([]);
    const asked = new Set(questionsV1.questions.map((question) => question.question));
    expect(questionsV2.questions.filter((question) => asked.has(question.question))).toEqual([]);
  });

  it("v2 has more no-answer questions than v1, including near misses and codes that exist nowhere", () => {
    const noAnswer = questionsV2.questions.filter((question) => question.category === "no_answer");
    const count = (prefix: string) => noAnswer.filter((question) => question.id.startsWith(prefix)).length;
    expect([count("N"), count("M"), count("C"), noAnswer.length]).toEqual([15, 12, 6, 33]);
    const text = corpusV2.documents.map((document) => `${document.title} ${document.body}`).join(" ");
    for (const question of noAnswer.filter((item) => item.id.startsWith("C"))) {
      expect(text).not.toContain(question.question.split(" ").at(-1));
    }
  });
});
