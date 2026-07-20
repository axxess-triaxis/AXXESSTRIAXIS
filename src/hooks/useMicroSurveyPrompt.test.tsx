import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useMicroSurveyPrompt } from "./useMicroSurveyPrompt";

function Harness() {
  const survey = useMicroSurveyPrompt();
  return (
    <div>
      <span>{survey.visible ? "visible" : "hidden"}</span>
      <span>{survey.hasBeenShown ? "shown" : "not-shown"}</span>
      <button onClick={survey.trigger}>trigger</button>
      <button onClick={survey.dismiss}>dismiss</button>
    </div>
  );
}

describe("useMicroSurveyPrompt", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows the survey the first time it's triggered", () => {
    render(<Harness />);
    expect(screen.getByText("hidden")).toBeInTheDocument();
    expect(screen.getByText("not-shown")).toBeInTheDocument();

    fireEvent.click(screen.getByText("trigger"));
    expect(screen.getByText("visible")).toBeInTheDocument();
    expect(screen.getByText("shown")).toBeInTheDocument();
    expect(window.localStorage.getItem("axxess.micro-survey.shown")).toBe("true");
  });

  it("never shows again once already shown, even across remounts", () => {
    window.localStorage.setItem("axxess.micro-survey.shown", "true");
    render(<Harness />);

    fireEvent.click(screen.getByText("trigger"));
    expect(screen.getByText("hidden")).toBeInTheDocument();
  });

  it("can be dismissed", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("trigger"));
    expect(screen.getByText("visible")).toBeInTheDocument();

    fireEvent.click(screen.getByText("dismiss"));
    expect(screen.getByText("hidden")).toBeInTheDocument();
  });
});
