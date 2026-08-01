import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NavSection } from "../app/navigation";
import { useGuidedDemo } from "./useGuidedDemo";

function Harness() {
  const [section, setSection] = useState<NavSection>("dashboard");
  const navigate = vi.fn((nextSection: NavSection) => setSection(nextSection));
  const demo = useGuidedDemo(section, navigate);
  return (
    <div>
      <span>{demo.active ? "active" : "inactive"}</span>
      <span>{demo.currentStep.title}</span>
      <span data-testid="next-cta">{demo.nextStep.cta}</span>
      <span data-testid="current-section">{section}</span>
      <span>{demo.progressPercent}</span>
      <button onClick={demo.startDemo}>start</button>
      <button onClick={demo.goNext}>next</button>
      <button onClick={demo.stopDemo}>stop</button>
    </div>
  );
}

describe("useGuidedDemo", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, "", "/dashboard");
  });

  it("starts, advances, and stops the guided demo", () => {
    render(<Harness />);

    expect(screen.getByText("inactive")).toBeInTheDocument();

    fireEvent.click(screen.getByText("start"));
    expect(screen.getByText("active")).toBeInTheDocument();
    expect(screen.getByText("Executive command view")).toBeInTheDocument();
    expect(window.localStorage.getItem("axxess.guided-demo")).toContain("executive-dashboard");

    fireEvent.click(screen.getByText("next"));
    expect(window.localStorage.getItem("axxess.guided-demo")).toContain("knowledge-source");

    fireEvent.click(screen.getByText("stop"));
    expect(screen.getByText("inactive")).toBeInTheDocument();
    expect(window.localStorage.getItem("axxess.guided-demo")).toBeNull();
  });

  // RAG Remediation Sprint 2 (A-64/A-59): the "Next" CTA was labeled with the CURRENT step's own
  // action name (e.g. "Ask AI Workspace") but clicking it navigated to the NEXT step's section
  // (e.g. Tasks & Workflow) -- a direct, confirmed cause of both A-64 and A-59's reported
  // "button says X but goes to Y" symptom.
  it("labels the Next button with the destination step's own cta, not the current step's (A-64/A-59 root cause)", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("start")); // step 0: executive-dashboard
    fireEvent.click(screen.getByText("next")); // -> step 1: knowledge-source
    fireEvent.click(screen.getByText("next")); // now viewing step 2: ai-answer

    expect(screen.getByText("Ask governed AI")).toBeInTheDocument();
    expect(screen.getByTestId("next-cta")).toHaveTextContent("Create follow-up task");

    fireEvent.click(screen.getByText("next")); // clicking should land on the "tasks" section
    expect(screen.getByTestId("current-section")).toHaveTextContent("tasks");
  });
});
