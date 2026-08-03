import { describe, expect, it } from "vitest";
import { evaluateActionableGate, type AgenticGateInput } from "./actionableGate";

function baseInput(overrides: Partial<AgenticGateInput["answer"]> = {}, rest: Partial<AgenticGateInput> = {}): AgenticGateInput {
  return {
    answer: {
      answer: "Everything looks fine today.",
      rationale: "",
      confidence: 0.9,
      humanReviewRequired: false,
      sources: [],
      ...overrides,
    },
    knownStakeholderNames: [],
    priorSourceIds: new Set(),
    isFirstAnswerThisSession: false,
    ...rest,
  };
}

describe("evaluateActionableGate", () => {
  it("shows no prompt when none of the 5 signals fire", () => {
    const result = evaluateActionableGate(baseInput());
    expect(result.triggerCount).toBe(0);
    expect(result.showPrompt).toBe(false);
    expect(result.overrideRequired).toBe(false);
    expect(result.compulsoryChoice).toBe(false);
  });

  it("shows the prompt (without override) when exactly one signal fires -- new information only", () => {
    const result = evaluateActionableGate(baseInput({
      answer: "The report is ready.",
      confidence: 0.8,
      sources: [{ sourceType: "document", sourceId: "s1", title: "Report", score: 0.9, excerpt: "..." }],
    }, { priorSourceIds: new Set(["s1"]) }));

    expect(result.signals.newInformation).toBe(true);
    expect(result.signals.newStakeholder).toBe(false);
    expect(result.signals.newContext).toBe(false);
    expect(result.signals.newTaskMeetingProjectProgramMention).toBe(false);
    expect(result.triggerCount).toBe(1);
    expect(result.showPrompt).toBe(true);
    expect(result.overrideRequired).toBe(false);
    expect(result.compulsoryChoice).toBe(false);
  });

  it("requires an explicit override to dismiss once more than 2 of 5 signals fire", () => {
    const result = evaluateActionableGate(baseInput({
      answer: "Ravi Kumar confirmed the update.",
      confidence: 0.7,
      sources: [{ sourceType: "document", sourceId: "s2", title: "Update", score: 0.8, excerpt: "..." }],
    }, { isFirstAnswerThisSession: true }));

    expect(result.signals.newInformation).toBe(true);
    expect(result.signals.newStakeholder).toBe(true);
    expect(result.signals.newContext).toBe(true);
    expect(result.signals.newTaskMeetingProjectProgramMention).toBe(false);
    expect(result.triggerCount).toBe(3);
    expect(result.showPrompt).toBe(true);
    expect(result.overrideRequired).toBe(true);
    expect(result.compulsoryChoice).toBe(false);
  });

  it("requires the compulsory two-choice resolution when all 5 signals fire", () => {
    const result = evaluateActionableGate(baseInput({
      answer: "Ravi Kumar said we must schedule an urgent follow-up meeting for the project. Critical risk requires escalate immediately.",
      confidence: 0.8,
      sources: [{ sourceType: "document", sourceId: "s3", title: "Escalation", score: 0.9, excerpt: "..." }],
    }, { isFirstAnswerThisSession: true }));

    expect(result.signals.newInformation).toBe(true);
    expect(result.signals.newStakeholder).toBe(true);
    expect(result.signals.newContext).toBe(true);
    expect(result.signals.newTaskMeetingProjectProgramMention).toBe(true);
    expect(result.signals.pushbackSeverity).toBe(5);
    expect(result.triggerCount).toBe(5);
    expect(result.overrideRequired).toBe(true);
    expect(result.compulsoryChoice).toBe(true);
    expect(result.explicitWarning).toBe(true);
  });

  it("flags HITL clearance (severity 3) when the answer itself requires human review, independent of other signals", () => {
    const result = evaluateActionableGate(baseInput({
      answer: "Standard update, nothing unusual.",
      humanReviewRequired: true,
    }));

    expect(result.signals.pushbackSeverity).toBe(3);
    expect(result.hitlClearanceRequired).toBe(true);
    expect(result.explicitWarning).toBe(false);
    expect(result.triggerCount).toBe(1);
    expect(result.showPrompt).toBe(true);
  });

  it("does not count a known stakeholder's name as a new-stakeholder signal", () => {
    const result = evaluateActionableGate(baseInput({
      answer: "Ravi Kumar confirmed the update.",
    }, { knownStakeholderNames: ["Ravi Kumar"] }));

    expect(result.signals.newStakeholder).toBe(false);
  });

  // A-81 (2026-08-02): a live OpenAI 429 previously still opened "What do you want me to do with
  // this?" and let a user turn the honest failure-explanation text into a real, saved Task --
  // confirmed via founder screenshot showing multiple such tasks already created. The bug was that
  // detectNewContext fires on "first answer this session" regardless of confidence, and no signal
  // ever checked whether the text was a real answer at all.
  it("never shows the prompt for a provider-failure placeholder answer, even when every other signal would otherwise fire (A-81)", () => {
    const result = evaluateActionableGate(baseInput({
      answer: "OpenAI / ChatGPT request failed (429). This response was not generated by a live model call; treat it as unverified.",
      confidence: 0.3,
      humanReviewRequired: true,
      sources: [{ sourceType: "document", sourceId: "s3", title: "Report", score: 0.9, excerpt: "..." }],
    }, { isFirstAnswerThisSession: true, priorSourceIds: new Set() }));

    expect(result.showPrompt).toBe(false);
    expect(result.triggerCount).toBe(0);
    expect(result.overrideRequired).toBe(false);
    expect(result.compulsoryChoice).toBe(false);
    expect(result.signals.newContext).toBe(false);
  });

  it("matches the marker regardless of which provider's fallback text produced it (OpenAI vs OpenRouter phrasing)", () => {
    const result = evaluateActionableGate(baseInput({
      answer: "OpenRouter returned no content. This response was not generated by a live model call; treat it as unverified.",
    }, { isFirstAnswerThisSession: true }));

    expect(result.showPrompt).toBe(false);
  });

  it("still shows the prompt for a genuine, real answer with the same low confidence a failure would have", () => {
    const result = evaluateActionableGate(baseInput({
      answer: "Ravi Kumar should review the budget variance before Friday.",
      confidence: 0.3,
    }, { isFirstAnswerThisSession: true }));

    expect(result.showPrompt).toBe(true);
  });
});
