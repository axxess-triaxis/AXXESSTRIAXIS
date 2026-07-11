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
});
