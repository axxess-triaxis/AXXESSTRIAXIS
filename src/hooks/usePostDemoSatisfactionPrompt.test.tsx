import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { markPostDemoSatisfactionPromptPending, usePostDemoSatisfactionPrompt } from "./usePostDemoSatisfactionPrompt";

function Harness() {
  const prompt = usePostDemoSatisfactionPrompt();
  return (
    <div>
      <span>{prompt.visible ? "visible" : "hidden"}</span>
      <span>{prompt.hasBeenShownThisSession ? "shown" : "not-shown"}</span>
      <button onClick={prompt.trigger}>trigger</button>
      <button onClick={prompt.dismiss}>dismiss</button>
    </div>
  );
}

describe("usePostDemoSatisfactionPrompt", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("shows the prompt the first time it's triggered", () => {
    render(<Harness />);
    expect(screen.getByText("hidden")).toBeInTheDocument();

    fireEvent.click(screen.getByText("trigger"));
    expect(screen.getByText("visible")).toBeInTheDocument();
    expect(screen.getByText("shown")).toBeInTheDocument();
    expect(window.sessionStorage.getItem("axxess.post-demo-satisfaction.shown-for-session")).toBe("true");
  });

  it("does not show again within the same session once already shown", () => {
    window.sessionStorage.setItem("axxess.post-demo-satisfaction.shown-for-session", "true");
    render(<Harness />);

    fireEvent.click(screen.getByText("trigger"));
    expect(screen.getByText("hidden")).toBeInTheDocument();
  });

  it("uses sessionStorage, not localStorage -- a new session can prompt again", () => {
    // Unlike the once-ever A9 micro-survey, A10 is scoped to "the natural end of a live demo
    // session" -- it should be able to fire again in a later session, not just once forever.
    expect(window.localStorage.getItem("axxess.post-demo-satisfaction.shown-for-session")).toBeNull();
    render(<Harness />);
    fireEvent.click(screen.getByText("trigger"));
    expect(window.localStorage.getItem("axxess.post-demo-satisfaction.shown-for-session")).toBeNull();
  });

  it("can be dismissed", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("trigger"));
    expect(screen.getByText("visible")).toBeInTheDocument();

    fireEvent.click(screen.getByText("dismiss"));
    expect(screen.getByText("hidden")).toBeInTheDocument();
  });

  it("auto-triggers on mount when a pending flag was left by markPostDemoSatisfactionPromptPending()", () => {
    // Regression scenario: DemoModePanel hard-navigates to /dashboard right after turning demo
    // mode off, destroying any transient "show now" state -- the prompt must pick itself back up
    // on the next page's mount instead, via this pending flag.
    markPostDemoSatisfactionPromptPending();
    render(<Harness />);
    expect(screen.getByText("visible")).toBeInTheDocument();
    expect(window.sessionStorage.getItem("axxess.post-demo-satisfaction.pending")).toBeNull();
  });

  it("does not auto-trigger on mount when no pending flag is present", () => {
    render(<Harness />);
    expect(screen.getByText("hidden")).toBeInTheDocument();
  });
});
