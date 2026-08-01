import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AgenticActionablesPrompt } from "./AgenticActionablesPrompt";
import type { AgenticGateResult, AgenticPromptSource } from "./agenticActionTypes";

const source: AgenticPromptSource = { sourceType: "rag_answer", summary: "The referral SLA needs review." };

function baseGate(overrides: Partial<AgenticGateResult> = {}): AgenticGateResult {
  return {
    signals: { newInformation: true, newStakeholder: false, newContext: false, newTaskMeetingProjectProgramMention: false, pushbackSeverity: 1 },
    triggerCount: 1,
    showPrompt: true,
    overrideRequired: false,
    compulsoryChoice: false,
    hitlClearanceRequired: false,
    explicitWarning: false,
    ...overrides,
  };
}

describe("AgenticActionablesPrompt", () => {
  it("renders all 14 first-step options with the personalized title", () => {
    render(
      <AgenticActionablesPrompt open firstName="Ananya" source={source} onResolved={vi.fn()} onClose={vi.fn()} />,
    );

    expect(screen.getByText("What do you want me to do with this, Ananya?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create\/edit task/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Set up\/modify\/reschedule meeting/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create\/edit reminder/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create\/edit program/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create\/edit project/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save stakeholder mapping matrix/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Store insights in Notion/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Make analytics dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create slides\/PPT/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create doc\/Notion/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create Sheets\/Excel/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Integrate into next query/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Other$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Nothing for now, thank you/i })).toBeInTheDocument();
  });

  it("uses a neutral fallback when no first name is available", () => {
    render(
      <AgenticActionablesPrompt open firstName="there" source={source} onResolved={vi.fn()} onClose={vi.fn()} />,
    );
    expect(screen.getByText("What do you want me to do with this, there?")).toBeInTheDocument();
  });

  it("moves to an action-specific second step, e.g. Task -> Create/Edit", () => {
    render(<AgenticActionablesPrompt open firstName="Ananya" source={source} onResolved={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Create\/edit task/i }));
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("moves to a different second step for Meeting -> Create/Cancel/Reschedule", () => {
    render(<AgenticActionablesPrompt open firstName="Ananya" source={source} onResolved={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Set up\/modify\/reschedule meeting/i }));
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reschedule" })).toBeInTheDocument();
  });

  it("dismisses immediately with no second step when 'Nothing for now' is chosen", () => {
    const onResolved = vi.fn();
    render(<AgenticActionablesPrompt open firstName="Ananya" source={source} onResolved={onResolved} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Nothing for now, thank you/i }));

    expect(onResolved).toHaveBeenCalledWith({ firstAction: "nothing", dismissedVia: "nothing_option" });
    expect(screen.getByText("What do you want me to do with this, Ananya?")).toBeInTheDocument();
  });

  it("shows a visible (not tooltip-only) reason for an unavailable action and resolves without a second step", () => {
    const onResolved = vi.fn();
    render(
      <AgenticActionablesPrompt
        open
        firstName="Ananya"
        source={source}
        disabledReasons={{ slides_ppt: "Slide/PPT export isn't built yet in AXXESS." }}
        onResolved={onResolved}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Slide/PPT export isn't built yet in AXXESS.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Create slides\/PPT/i }));
    expect(onResolved).toHaveBeenCalledWith({ firstAction: "slides_ppt", dismissedVia: "unavailable_action" });
  });

  it("hides the close control when the gate requires an explicit override (more than 2 signals fired)", () => {
    render(
      <AgenticActionablesPrompt
        open
        firstName="Ananya"
        source={source}
        gateContext={baseGate({ overrideRequired: true, triggerCount: 3 })}
        onResolved={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
  });

  it("shows the close control when passive dismiss is allowed", () => {
    render(<AgenticActionablesPrompt open firstName="Ananya" source={source} onResolved={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("replaces the 14 options with exactly two compulsory choices when all 5 signals fire", () => {
    const onResolved = vi.fn();
    render(
      <AgenticActionablesPrompt
        open
        firstName="Ananya"
        source={source}
        gateContext={baseGate({ compulsoryChoice: true, overrideRequired: true, triggerCount: 5 })}
        onResolved={onResolved}
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: /Create\/edit task/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "No action now, save context for later" }));
    expect(onResolved).toHaveBeenCalledWith({ firstAction: "nothing", dismissedVia: "gate_required_no_action_now" });
  });
});
