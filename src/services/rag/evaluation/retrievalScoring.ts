import type { RetrievalEvidence } from "../retrievalEvidence";
import { accessVerdict, type GoldenCategory, type GoldenSet } from "./goldenSet";
import { dedupeRanked, mean, ndcgAtK, recallAtK, reciprocalRank } from "./retrievalMetrics";

export const RETRIEVAL_MODES = ["hash", "fulltext", "semantic"] as const;
export type RetrievalMode = (typeof RETRIEVAL_MODES)[number];

/** What one question actually returned. Built only from a real answerTenantQuestion call. */
export type RetrievalObservation = {
  questionId: string;
  /** Golden document key per citation, best first; null for a source id the golden set does not own. */
  sources: Array<{ key: string | null; score: number; excerpt: string; title: string }>;
  answer: string;
  humanReviewRequired: boolean;
  /** The path the code under test says served the answer. */
  servedBy: string;
  evidence?: RetrievalEvidence;
  error?: string;
};

export type QuestionScore = {
  questionId: string;
  category: GoldenCategory;
  ranked: string[];
  topScore?: number;
  evidence?: RetrievalEvidence;
  recallAt5?: number;
  reciprocalRank?: number;
  ndcgAt5?: number;
  abstained: boolean;
  crossTenantLeaks: string[];
  unauthorizedLeaks: string[];
  servedBy: string;
  error?: string;
};

export type ModeMetrics = {
  mode: RetrievalMode;
  questions: number;
  answerable: number;
  recallAt5: number;
  mrr: number;
  ndcgAt5: number;
  noAnswerQuestions: number;
  /** Share of no-answer questions that returned zero sources. */
  noAnswerCorrectness: number;
  /** Share of no-answer questions that returned zero sources or were flagged for human review. */
  noAnswerAbstainedOrFlagged: number;
  crossTenantLeaks: number;
  unauthorizedLeaks: number;
  errors: number;
  servedBy: Record<string, number>;
  byCategory: Record<string, { questions: number; recallAt5: number; mrr: number; ndcgAt5: number }>;
};

export type ModeThresholds = Partial<
  Record<"recallAt5" | "mrr" | "ndcgAt5" | "noAnswerCorrectness" | "noAnswerAbstainedOrFlagged" | "servedByModeShare", number>
>;

/** The RagRetrievalMode value that shows each mode was served by its own path. */
export const SERVED_BY: Record<RetrievalMode, string> = { semantic: "semantic", fulltext: "fulltext_search", hash: "full_scan" };

function plain(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function sentences(body: string) {
  return body.split(/(?<=[.!?])\s+/).map(plain).filter((sentence) => sentence.split(" ").length >= 6);
}

export function scoreQuestion(golden: GoldenSet, observation: RetrievalObservation): QuestionScore {
  const question = golden.questions.find((candidate) => candidate.id === observation.questionId);
  if (!question) throw new Error(`Observation for unknown question ${observation.questionId}.`);
  const user = golden.corpus.users.find((candidate) => candidate.key === question.user);
  if (!user) throw new Error(`Question ${question.id} is asked by an unknown user.`);

  const documents = new Map(golden.corpus.documents.map((document) => [document.key, document]));
  const crossTenant = new Set<string>();
  const unauthorized = new Set<string>();

  for (const source of observation.sources) {
    const document = source.key === null ? undefined : documents.get(source.key);
    // A source the golden set does not own came from somewhere outside these tenants.
    if (!document) {
      crossTenant.add(`unknown document "${source.title}"`);
      continue;
    }
    const verdict = accessVerdict(golden.corpus, user, document);
    if (verdict === "cross_tenant") crossTenant.add(document.key);
    if (verdict === "unauthorized") unauthorized.add(document.key);
  }

  // A forbidden document can leak through text attributed to a permitted one, so the answer and every
  // excerpt are also searched for whole sentences of forbidden documents.
  const returnedText = plain([observation.answer, ...observation.sources.map((source) => source.excerpt)].join(" "));
  const permittedSentences = new Set<string>();
  for (const document of documents.values()) {
    if (accessVerdict(golden.corpus, user, document) === "allowed") {
      for (const sentence of sentences(document.body)) permittedSentences.add(sentence);
    }
  }
  for (const document of documents.values()) {
    const verdict = accessVerdict(golden.corpus, user, document);
    if (verdict === "allowed") continue;
    if (sentences(document.body).some((sentence) => !permittedSentences.has(sentence) && returnedText.includes(sentence))) {
      (verdict === "cross_tenant" ? crossTenant : unauthorized).add(document.key);
    }
  }

  const ranked = dedupeRanked(observation.sources.map((source) => source.key ?? "unknown"));
  return {
    questionId: question.id,
    category: question.category,
    ranked,
    topScore: observation.sources[0]?.score,
    evidence: observation.evidence,
    ...(question.relevant.length > 0
      ? {
          recallAt5: recallAtK(ranked, question.relevant),
          reciprocalRank: reciprocalRank(ranked, question.relevant),
          ndcgAt5: ndcgAtK(ranked, question.relevant),
        }
      : {}),
    abstained: observation.sources.length === 0 && !observation.error,
    crossTenantLeaks: [...crossTenant],
    unauthorizedLeaks: [...unauthorized],
    servedBy: observation.servedBy,
    error: observation.error,
  };
}

export function scoreMode(golden: GoldenSet, mode: RetrievalMode, observations: RetrievalObservation[]) {
  const scores = observations.map((observation) => scoreQuestion(golden, observation));
  const flagged = new Set(observations.filter((observation) => observation.humanReviewRequired).map((observation) => observation.questionId));
  const answerable = scores.filter((score) => score.recallAt5 !== undefined);
  const noAnswer = scores.filter((score) => score.category === "no_answer");
  const servedBy: Record<string, number> = {};
  for (const score of scores) servedBy[score.servedBy] = (servedBy[score.servedBy] ?? 0) + 1;

  const summary = (subset: QuestionScore[]) => ({
    questions: subset.length,
    recallAt5: mean(subset.map((score) => score.recallAt5 ?? 0)),
    mrr: mean(subset.map((score) => score.reciprocalRank ?? 0)),
    ndcgAt5: mean(subset.map((score) => score.ndcgAt5 ?? 0)),
  });
  const { questions: answerableCount, ...overall } = summary(answerable);

  const metrics: ModeMetrics = {
    mode,
    questions: scores.length,
    answerable: answerableCount,
    ...overall,
    noAnswerQuestions: noAnswer.length,
    noAnswerCorrectness: mean(noAnswer.map((score) => (score.abstained ? 1 : 0))),
    noAnswerAbstainedOrFlagged: mean(
      noAnswer.map((score) => (score.abstained || (!score.error && flagged.has(score.questionId)) ? 1 : 0)),
    ),
    crossTenantLeaks: scores.reduce((sum, score) => sum + score.crossTenantLeaks.length, 0),
    unauthorizedLeaks: scores.reduce((sum, score) => sum + score.unauthorizedLeaks.length, 0),
    errors: scores.filter((score) => score.error).length,
    servedBy,
    byCategory: Object.fromEntries(
      [...new Set(answerable.map((score) => score.category))].map((category) => [
        category,
        summary(answerable.filter((score) => score.category === category)),
      ]),
    ),
  };
  return { metrics, scores };
}

/** Every reason this mode fails the gate. Leaks, errors and missing questions are never tolerated. */
export function gateFailures(golden: GoldenSet, metrics: ModeMetrics, thresholds: ModeThresholds): string[] {
  const failures: string[] = [];
  const { mode } = metrics;
  if (metrics.questions !== golden.questions.length) {
    failures.push(`${mode}: ${metrics.questions} of ${golden.questions.length} questions were observed.`);
  }
  if (metrics.crossTenantLeaks > 0) failures.push(`${mode}: ${metrics.crossTenantLeaks} cross-tenant leak(s).`);
  if (metrics.unauthorizedLeaks > 0) failures.push(`${mode}: ${metrics.unauthorizedLeaks} unauthorized-document leak(s).`);
  if (metrics.errors > 0) failures.push(`${mode}: ${metrics.errors} question(s) ended in an error.`);

  const measured: Required<ModeThresholds> = {
    recallAt5: metrics.recallAt5,
    mrr: metrics.mrr,
    ndcgAt5: metrics.ndcgAt5,
    noAnswerCorrectness: metrics.noAnswerCorrectness,
    noAnswerAbstainedOrFlagged: metrics.noAnswerAbstainedOrFlagged,
    servedByModeShare: metrics.questions === 0 ? 0 : (metrics.servedBy[SERVED_BY[mode]] ?? 0) / metrics.questions,
  };
  for (const [name, minimum] of Object.entries(thresholds) as Array<[keyof ModeThresholds, number]>) {
    if (measured[name] < minimum) {
      failures.push(`${mode}: ${name} ${measured[name].toFixed(4)} is below the required ${minimum.toFixed(4)}.`);
    }
  }
  return failures;
}
