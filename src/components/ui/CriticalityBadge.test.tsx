import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CriticalityBadge } from "./CriticalityBadge";
import type { CriticalityBand } from "../../services/dashboard/tileScoring";

describe("CriticalityBadge", () => {
  it.each(["green", "yellow", "orange", "amber", "red"] as CriticalityBand[])(
    "renders a distinct label for the %s band",
    (criticality) => {
      render(<CriticalityBadge criticality={criticality} />);
      expect(screen.getByText(new RegExp(criticality, "i"))).toBeInTheDocument();
    },
  );

  it("renders all five bands with visually distinct classes (no collapsing to a 3-tone set)", () => {
    const classNames = (["green", "yellow", "orange", "amber", "red"] as CriticalityBand[]).map((criticality) => {
      const { container, unmount } = render(<CriticalityBadge criticality={criticality} />);
      const className = container.querySelector("span")?.className;
      unmount();
      return className;
    });
    expect(new Set(classNames).size).toBe(5);
  });

  it("shows the priority when provided", () => {
    render(<CriticalityBadge criticality="red" priority={5} />);
    expect(screen.getByText(/P5/)).toBeInTheDocument();
  });
});
