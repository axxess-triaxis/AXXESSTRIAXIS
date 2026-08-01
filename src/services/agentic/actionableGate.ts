import type { RagAnswer } from "../rag/governedRag";
import type { AgenticGateResult, AgenticGateSignals } from "../../components/agentic/agenticActionTypes";

// v1 detection is heuristic (keyword/field matching against data the RAG pipeline already
// returns) -- deliberately NOT a dedicated LLM classification call, since that would double AI
// spend/latency on every single answer, in tension with the strict spend guard built this same
// session (src/services/ai/aiSpendGuard.ts). Founder-confirmed tradeoff: this will sometimes
// misjudge an answer -- that is exactly what the gate's own on/off toggle
// (agenticGateToggle.ts) and the always-available manual "Create actionable from answer" fallback
// exist to absorb, not a defect to silently paper over.

export type AgenticGateInput = {
  answer: Pick<RagAnswer, "answer" | "rationale" | "confidence" | "humanReviewRequired" | "sources">;
  knownStakeholderNames: string[];
  priorSourceIds: Set<string>;
  isFirstAnswerThisSession: boolean;
};

const NAME_SHAPED_TOKEN = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}\b/g;

const TASK_MENTION_NOUNS = /\b(task|meeting|project|program|deadline|assign(?:ment)?|schedule|follow-?up|action item)\b/i;
const TASK_MENTION_VERBS = /\b(create|set up|schedule|assign|review|escalate|follow up|organi[sz]e)\b/i;

const EXPLICIT_WARNING_PHRASES = /\b(critical risk|urgent warning|do not proceed|escalate immediately|non-compliance|breach|severe risk)\b/i;
const SOFT_CAUTION_PHRASES = /\b(caution|please review|recommend verifying|uncertain|low confidence|verify before)\b/i;

function detectNewInformation(answer: AgenticGateInput["answer"]): boolean {
  return answer.sources.length > 0 && answer.confidence >= 0.5;
}

function detectNewStakeholder(answer: AgenticGateInput["answer"], knownStakeholderNames: string[]): boolean {
  const text = `${answer.answer} ${answer.rationale}`;
  const matches = text.match(NAME_SHAPED_TOKEN);
  if (!matches) return false;

  const known = new Set(knownStakeholderNames.map((name) => name.trim().toLowerCase()));
  return matches.some((match) => !known.has(match.trim().toLowerCase()));
}

function detectNewContext(input: AgenticGateInput): boolean {
  if (input.isFirstAnswerThisSession) return true;
  return input.answer.sources.some((source) => !input.priorSourceIds.has(source.sourceId));
}

function detectTaskMention(answer: AgenticGateInput["answer"]): boolean {
  const sentences = answer.answer.split(/(?<=[.!?])\s+/);
  return sentences.some((sentence) => TASK_MENTION_NOUNS.test(sentence) && TASK_MENTION_VERBS.test(sentence));
}

function detectPushbackSeverity(answer: AgenticGateInput["answer"]): AgenticGateSignals["pushbackSeverity"] {
  const text = `${answer.answer} ${answer.rationale}`;
  if (EXPLICIT_WARNING_PHRASES.test(text)) return 5;

  let severity: AgenticGateSignals["pushbackSeverity"] = 1;
  if (answer.humanReviewRequired) severity = 3;
  if (SOFT_CAUTION_PHRASES.test(text) && severity < 3) severity = 3;
  if (answer.confidence < 0.5) severity = Math.min(5, severity + 1) as AgenticGateSignals["pushbackSeverity"];

  return severity;
}

export function evaluateActionableGate(input: AgenticGateInput): AgenticGateResult {
  const signals: AgenticGateSignals = {
    newInformation: detectNewInformation(input.answer),
    newStakeholder: detectNewStakeholder(input.answer, input.knownStakeholderNames),
    newContext: detectNewContext(input),
    newTaskMeetingProjectProgramMention: detectTaskMention(input.answer),
    pushbackSeverity: detectPushbackSeverity(input.answer),
  };

  const booleanTriggerCount = [signals.newInformation, signals.newStakeholder, signals.newContext, signals.newTaskMeetingProjectProgramMention]
    .filter(Boolean).length;
  const pushbackTriggers = signals.pushbackSeverity >= 3;
  const triggerCount = booleanTriggerCount + (pushbackTriggers ? 1 : 0);

  const allFiveTriggered = signals.newInformation && signals.newStakeholder && signals.newContext
    && signals.newTaskMeetingProjectProgramMention && pushbackTriggers;

  return {
    signals,
    triggerCount,
    showPrompt: triggerCount > 0,
    overrideRequired: triggerCount > 2,
    compulsoryChoice: allFiveTriggered,
    hitlClearanceRequired: signals.pushbackSeverity === 3 || signals.pushbackSeverity === 4,
    explicitWarning: signals.pushbackSeverity === 5,
  };
}
