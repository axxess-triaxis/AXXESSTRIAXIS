import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useWorkflowCompletionCelebration } from "./useWorkflowCompletionCelebration";

function Harness() {
  const celebration = useWorkflowCompletionCelebration();
  return (
    <div>
      <span>{celebration.visible ? "visible" : "hidden"}</span>
      <span>{celebration.message}</span>
      <button onClick={() => celebration.celebrate("Task completed!")}>celebrate</button>
      <button onClick={() => celebration.celebrate("Review approved!")}>celebrate-again</button>
      <button onClick={celebration.dismiss}>dismiss</button>
    </div>
  );
}

describe("useWorkflowCompletionCelebration", () => {
  it("becomes visible with the given message when celebrate() is called", () => {
    render(<Harness />);
    expect(screen.getByText("hidden")).toBeInTheDocument();

    fireEvent.click(screen.getByText("celebrate"));
    expect(screen.getByText("visible")).toBeInTheDocument();
    expect(screen.getByText("Task completed!")).toBeInTheDocument();
  });

  it("can be dismissed", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("celebrate"));
    fireEvent.click(screen.getByText("dismiss"));
    expect(screen.getByText("hidden")).toBeInTheDocument();
  });

  it("can celebrate repeatedly, unlike the once-per-scope A9/A10/A16 prompts", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("celebrate"));
    fireEvent.click(screen.getByText("dismiss"));
    expect(screen.getByText("hidden")).toBeInTheDocument();

    fireEvent.click(screen.getByText("celebrate-again"));
    expect(screen.getByText("visible")).toBeInTheDocument();
    expect(screen.getByText("Review approved!")).toBeInTheDocument();
  });
});
