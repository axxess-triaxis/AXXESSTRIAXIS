import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useGoldenPathDisplayMode } from "./useGoldenPathDisplayMode";

function Harness() {
  const { mode, setMode } = useGoldenPathDisplayMode();
  return (
    <div>
      <span>{mode}</span>
      <button onClick={() => setMode("guided")}>make guided</button>
      <button onClick={() => setMode("on-demand")}>make on-demand</button>
    </div>
  );
}

describe("useGoldenPathDisplayMode", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("defaults to on-demand so the golden path isn't forced on most users", () => {
    render(<Harness />);
    expect(screen.getByText("on-demand")).toBeInTheDocument();
  });

  it("persists a user's choice to always show the guided journey", () => {
    render(<Harness />);

    fireEvent.click(screen.getByText("make guided"));
    expect(screen.getByText("guided")).toBeInTheDocument();
    expect(window.localStorage.getItem("axxess.golden-path-display-mode")).toBe("guided");

    fireEvent.click(screen.getByText("make on-demand"));
    expect(screen.getByText("on-demand")).toBeInTheDocument();
    expect(window.localStorage.getItem("axxess.golden-path-display-mode")).toBe("on-demand");
  });

  it("ignores corrupt stored values and falls back to the default", () => {
    window.localStorage.setItem("axxess.golden-path-display-mode", "not-a-real-mode");
    render(<Harness />);
    expect(screen.getByText("on-demand")).toBeInTheDocument();
  });
});
