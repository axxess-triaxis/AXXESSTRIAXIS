import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TierUrgentBar } from "./TierUrgentBar";
import type { ScoredTile } from "../../services/dashboard/tileScoring";

function makeTile(overrides: Partial<ScoredTile>): ScoredTile {
  return {
    id: "tile",
    tier: 1,
    title: "Tile",
    value: "1",
    detail: "detail",
    priority: 1,
    criticality: "green",
    score: 1,
    dataState: "live",
    ...overrides,
  };
}

describe("TierUrgentBar", () => {
  it("collapses to nothing when its tier has no qualifying tiles", () => {
    const tiles = [makeTile({ id: "low", tier: 1, priority: 1, criticality: "green", score: 1 })];
    const { container } = render(<TierUrgentBar tier={1} tiles={tiles} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a qualifying Priority 4 x Red tile", () => {
    const tiles = [makeTile({ id: "urgent", title: "Urgent item", tier: 1, priority: 4, criticality: "red", score: 20 })];
    render(<TierUrgentBar tier={1} tiles={tiles} />);
    expect(screen.getByText("Urgent item")).toBeInTheDocument();
  });

  it("renders a qualifying Priority 4 x Amber tile (score 16, deliberately included)", () => {
    const tiles = [makeTile({ id: "urgent", title: "Amber urgent item", tier: 1, priority: 4, criticality: "amber", score: 16 })];
    render(<TierUrgentBar tier={1} tiles={tiles} />);
    expect(screen.getByText("Amber urgent item")).toBeInTheDocument();
  });

  it("excludes a Priority 3 x Red tile (score 15, the known trap case)", () => {
    const tiles = [makeTile({ id: "not-urgent", title: "Should not appear", tier: 1, priority: 3, criticality: "red", score: 15 })];
    const { container } = render(<TierUrgentBar tier={1} tiles={tiles} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText("Should not appear")).not.toBeInTheDocument();
  });

  it("only shows tiles belonging to the requested tier", () => {
    const tiles = [
      makeTile({ id: "tier1-urgent", title: "Tier 1 urgent", tier: 1, priority: 5, criticality: "red", score: 25 }),
      makeTile({ id: "tier2-urgent", title: "Tier 2 urgent", tier: 2, priority: 5, criticality: "red", score: 25 }),
    ];
    render(<TierUrgentBar tier={1} tiles={tiles} />);
    expect(screen.getByText("Tier 1 urgent")).toBeInTheDocument();
    expect(screen.queryByText("Tier 2 urgent")).not.toBeInTheDocument();
  });
});
