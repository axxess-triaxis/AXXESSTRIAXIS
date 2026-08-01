"use client";

import { useState } from "react";
import {
  AGENTIC_FIRST_ACTIONS,
  AGENTIC_SECOND_STEP,
  type AgenticFirstAction,
  type AgenticPromptProps,
} from "./agenticActionTypes";

type Step = "first" | "second" | "other-input";

// Extends ConfirmDialog.tsx's exact overlay/card chrome (fixed inset-0 z-[80], role="dialog",
// white rounded card) rather than inventing new modal styling, per the founder's "do not redesign
// the UI" non-negotiable for this feature.
export function AgenticActionablesPrompt({
  open,
  firstName,
  source,
  disabledReasons,
  gateContext,
  onResolved,
  onClose,
}: AgenticPromptProps) {
  const [step, setStep] = useState<Step>("first");
  const [selectedFirst, setSelectedFirst] = useState<AgenticFirstAction | null>(null);
  const [otherText, setOtherText] = useState("");

  if (!open) return null;

  const allowPassiveDismiss = !gateContext?.overrideRequired;
  const compulsoryChoice = Boolean(gateContext?.compulsoryChoice);

  function reset() {
    setStep("first");
    setSelectedFirst(null);
    setOtherText("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  function selectFirstAction(action: AgenticFirstAction) {
    if (action === "nothing") {
      onResolved({ firstAction: "nothing", dismissedVia: "nothing_option" });
      reset();
      return;
    }

    if (disabledReasons?.[action]) {
      onResolved({ firstAction: action, dismissedVia: "unavailable_action" });
      reset();
      return;
    }

    if (action === "other") {
      setSelectedFirst(action);
      setStep("other-input");
      return;
    }

    const secondSteps = AGENTIC_SECOND_STEP[action];
    if (secondSteps.length === 0) {
      onResolved({ firstAction: action, dismissedVia: "second_step" });
      reset();
      return;
    }

    setSelectedFirst(action);
    setStep("second");
  }

  function confirmSecondStep(secondStep: (typeof AGENTIC_SECOND_STEP)[AgenticFirstAction][number]) {
    if (!selectedFirst) return;
    onResolved({ firstAction: selectedFirst, secondStep: secondStep.id, dismissedVia: "second_step" });
    reset();
  }

  function confirmOther() {
    onResolved({ firstAction: "other", otherInstruction: otherText.trim(), dismissedVia: "second_step" });
    reset();
  }

  function resolveCompulsoryChoice(choice: "gate_required_no_action_now" | "gate_required_no_action_required") {
    onResolved({ firstAction: "nothing", dismissedVia: choice });
    reset();
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 px-4" role="dialog" aria-modal="true" aria-labelledby="agentic-prompt-title">
      <div className="w-full max-w-md rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-5 shadow-xl">
        {allowPassiveDismiss && (
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="float-right -mt-1 -mr-1 rounded-lg px-2 py-1 text-xs text-[#5F6B73] hover:bg-[#F2F3F5]"
          >
            ✕
          </button>
        )}

        {compulsoryChoice ? (
          <>
            <h2 id="agentic-prompt-title" className="text-sm font-semibold text-[#0F1117]">
              This needs a decision before you continue, {firstName}
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-[#5F6B73]">{source.summary}</p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => resolveCompulsoryChoice("gate_required_no_action_now")}
                className="rounded-lg border border-[rgba(0,0,0,0.12)] px-3 py-2 text-left text-xs font-semibold text-[#0F1117] hover:bg-[#F2F3F5]"
              >
                No action now, save context for later
              </button>
              <button
                type="button"
                onClick={() => resolveCompulsoryChoice("gate_required_no_action_required")}
                className="rounded-lg border border-[rgba(0,0,0,0.12)] px-3 py-2 text-left text-xs font-semibold text-[#0F1117] hover:bg-[#F2F3F5]"
              >
                No action required
              </button>
            </div>
          </>
        ) : step === "first" ? (
          <>
            <h2 id="agentic-prompt-title" className="text-sm font-semibold text-[#0F1117]">
              What do you want me to do with this, {firstName}?
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[#5F6B73]">{source.summary}</p>
            <div className="mt-4 grid max-h-80 grid-cols-1 gap-1.5 overflow-y-auto">
              {AGENTIC_FIRST_ACTIONS.map((option) => {
                const reason = disabledReasons?.[option.value];
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => selectFirstAction(option.value)}
                    aria-disabled={Boolean(reason)}
                    className={`rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors ${
                      reason
                        ? "border-[rgba(0,0,0,0.08)] text-[#9AA3AB] hover:bg-[#F2F3F5]"
                        : "border-[rgba(0,0,0,0.12)] text-[#0F1117] hover:bg-[#F2F3F5]"
                    }`}
                  >
                    <span>{option.label}</span>
                    {reason && <span className="mt-0.5 block text-[10px] font-normal text-[#9AA3AB]">{reason}</span>}
                  </button>
                );
              })}
            </div>
          </>
        ) : step === "second" && selectedFirst ? (
          <>
            <h2 id="agentic-prompt-title" className="text-sm font-semibold text-[#0F1117]">
              {AGENTIC_FIRST_ACTIONS.find((option) => option.value === selectedFirst)?.label}
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {AGENTIC_SECOND_STEP[selectedFirst].map((secondStep) => (
                <button
                  key={secondStep.id}
                  type="button"
                  onClick={() => confirmSecondStep(secondStep)}
                  className="rounded-lg bg-[#8B1E2D] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#7a1a27]"
                >
                  {secondStep.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setStep("first")}
                className="rounded-lg border border-[rgba(0,0,0,0.12)] px-3 py-1.5 text-xs font-semibold text-[#5F6B73] hover:bg-[#F2F3F5]"
              >
                Back
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 id="agentic-prompt-title" className="text-sm font-semibold text-[#0F1117]">Tell me what to do</h2>
            <textarea
              value={otherText}
              onChange={(event) => setOtherText(event.target.value)}
              rows={3}
              className="mt-3 w-full rounded-lg border border-[rgba(0,0,0,0.12)] px-3 py-2 text-xs outline-none focus:border-[#8B1E2D]"
              placeholder="Describe what you'd like done with this..."
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setStep("first")}
                className="rounded-lg border border-[rgba(0,0,0,0.12)] px-3 py-1.5 text-xs font-semibold text-[#5F6B73] hover:bg-[#F2F3F5]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmOther}
                disabled={!otherText.trim()}
                className="rounded-lg bg-[#8B1E2D] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#7a1a27] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Confirm
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
