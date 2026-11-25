import { describe, expect, it } from "vitest";
import corpusJson from "./golden/v1/corpus.json";
import questionsJson from "./golden/v1/questions.json";
import thresholdsJson from "./golden/v1/thresholds.json";
import { accessVerdict, goldenSetProblems, type GoldenCorpus, type GoldenQuestion, type GoldenSet } from "./goldenSet";
import { ndcgAtK, recallAtK, reciprocalRank } from "./retrievalMetrics";
import { gateFailures, RETRIEVAL_MODES, scoreMode, scoreQuestion, type GateThresholds, type RetrievalObservation } from "./retrievalScoring";

const golden: GoldenSet = {
  corpus: corpusJson as GoldenCorpus,
  questions: questionsJson.questions as GoldenQuestion[],
};
const thresholds = thresholdsJson as unknown as GateThresholds;

function source(key: string | null, excerpt = "") {
  return { key, score: 0.8, excerpt, title: key ?? "Elsewhere" };
}

function observation(questionId: string, overrides: Partial<RetrievalObservation> = {}): RetrievalObservation {
  return { questionId, sources: [], answer: "", humanReviewRequired: false, servedBy: "semantic", ...overrides };
}

function idealObservations() {
  return golden.questions.map((question) => observation(question.id, { sources: question.relevant.map((key) => source(key)) }));
}

describe("ranking metrics", () => {
  it("scores the first relevant document by position and collapses repeated chunks", () => {
    expect(reciprocalRank(["a", "a", "b"], ["b"])).toBe(0.5);
    expect(recallAtK(["a", "a", "a", "a", "a", "b"], ["b"])).toBe(1);
    expect(recallAtK(["a", "b", "c", "d", "e", "f"], ["f"])).toBe(0);
    expect(recallAtK(["a"], ["a", "b"])).toBe(0.5);
    expect(reciprocalRank(["a"], ["z"])).toBe(0);
  });

  it("discounts lower positions in nDCG", () => {
    expect(ndcgAtK(["a"], ["a"])).toBe(1);
    expect(ndcgAtK(["b", "a"], ["a"])).toBeCloseTo(1 / Math.log2(3), 10);
    expect(ndcgAtK([], ["a"])).toBe(0);
  });

  it("refuses to score a question that has no relevant document", () => {
    expect(() => recallAtK(["a"], [])).toThrow();
    expect(() => ndcgAtK(["a"], [])).toThrow();
  });
});

describe("golden set", () => {
  it("is consistent and synthetic", () => {
    expect(goldenSetProblems(golden)).toEqual([]);
  });

  it("covers every category in the brief", () => {
    const counts = Object.fromEntries(
      ["paraphrase", "exact", "no_answer", "restricted_allowed", "restricted_denied", "cross_tenant"].map((category) => [
        category,
        golden.questions.filter((question) => question.category === category).length,
      ]),
    );
    expect(counts).toEqual({ paraphrase: 34, exact: 22, no_answer: 16, restricted_allowed: 10, restricted_denied: 10, cross_tenant: 16 });
  });

  it.each([
    ["harbor.employee", "harbor-travel", "allowed"],
    ["harbor.employee", "clinic-travel", "cross_tenant"],
    ["harbor.super", "clinic-travel", "cross_tenant"],
    ["harbor.employee", "harbor-concession", "unauthorized"],
    ["harbor.manager", "harbor-concession", "allowed"],
    ["harbor.admin", "harbor-reorg", "unauthorized"],
    ["harbor.manager", "harbor-reorg", "allowed"],
    ["harbor.employee", "harbor-leadership", "unauthorized"],
    ["harbor.employee", "harbor-cruise", "allowed"],
    ["harbor.guest", "harbor-cruise", "unauthorized"],
    ["harbor.guest", "harbor-travel", "unauthorized"],
    ["harbor.super", "harbor-mooring-old", "unauthorized"],
  ])("%s reading %s is %s", (userKey, documentKey, verdict) => {
    const user = golden.corpus.users.find((candidate) => candidate.key === userKey)!;
    const document = golden.corpus.documents.find((candidate) => candidate.key === documentKey)!;
    expect(accessVerdict(golden.corpus, user, document)).toBe(verdict);
  });
});

describe("leak detection", () => {
  it("counts a source from another tenant, from outside the set, or that this user may not read", () => {
    const score = scoreQuestion(golden, observation("X01", { sources: [source("clinic-travel"), source(null), source("harbor-concession")] }));
    expect(score.crossTenantLeaks).toEqual(["clinic-travel", "unknown document \"Elsewhere\""]);
    expect(score.unauthorizedLeaks).toEqual(["harbor-concession"]);
  });

  it("finds forbidden text attributed to a permitted document or placed in the answer", () => {
    const excerpt = "The assessment found a camera blind spot beside gate four and an unmonitored fence panel near the fuel store.";
    expect(scoreQuestion(golden, observation("D02", { sources: [source("harbor-travel", excerpt)] })).unauthorizedLeaks).toEqual(["harbor-vulnerability"]);
    expect(scoreQuestion(golden, observation("X14", { answer: "Six hives are placed per hectare when one flower in ten has opened." })).crossTenantLeaks).toEqual(["coop-pollination"]);
  });

  it("does not call a permitted answer a leak", () => {
    const score = scoreQuestion(golden, observation("X01", { sources: [source("harbor-travel", "Staff working away from the harbour may claim up to 85 dollars a day for meals.")] }));
    expect([...score.crossTenantLeaks, ...score.unauthorizedLeaks]).toEqual([]);
  });
});

describe("gate decision", () => {
  const strict = { recallAt5: 1, mrr: 1, ndcgAt5: 1, noAnswerCorrectness: 1, servedByModeShare: 1 };

  it("accepts ideal retrieval", () => {
    const { metrics } = scoreMode(golden, "semantic", idealObservations());
    expect(gateFailures(golden, metrics, strict)).toEqual([]);
  });

  it("fails when retrieval returns nothing, even though nothing leaks", () => {
    const { metrics } = scoreMode(golden, "semantic", golden.questions.map((question) => observation(question.id)));
    expect(gateFailures(golden, metrics, strict)).toEqual(expect.arrayContaining([expect.stringContaining("recallAt5")]));
  });

  it("fails on one leak, one error or one missing question whatever the thresholds are", () => {
    const leaking = idealObservations().map((item) => (item.questionId === "N01" ? { ...item, sources: [source("coop-travel")] } : item));
    expect(gateFailures(golden, scoreMode(golden, "hash", leaking).metrics, {})).toEqual(["hash: 1 cross-tenant leak(s)."]);

    const erroring = idealObservations().map((item) => (item.questionId === "N01" ? { ...item, error: "boom" } : item));
    expect(gateFailures(golden, scoreMode(golden, "hash", erroring).metrics, {})).toEqual(["hash: 1 question(s) ended in an error."]);

    expect(gateFailures(golden, scoreMode(golden, "hash", idealObservations().slice(1)).metrics, {})).toHaveLength(1);
  });

  it("does not count an error as a correct abstention", () => {
    const erroring = idealObservations().map((item) => (item.questionId === "N01" ? { ...item, error: "boom" } : item));
    expect(scoreMode(golden, "hash", erroring).metrics.noAnswerCorrectness).toBe(15 / 16);
  });

  it("fails when a mode was quietly served by another path", () => {
    const degraded = idealObservations().map((item) => ({ ...item, servedBy: "full_scan" }));
    expect(gateFailures(golden, scoreMode(golden, "semantic", degraded).metrics, { servedByModeShare: 0.9 })).toHaveLength(1);
  });

  it("has measured thresholds for every mode", () => {
    for (const mode of RETRIEVAL_MODES) {
      const entries = Object.entries(thresholds.modes[mode]);
      expect(entries.length).toBeGreaterThan(0);
      for (const [, value] of entries) expect(value).toBeGreaterThanOrEqual(0);
    }
  });
});
