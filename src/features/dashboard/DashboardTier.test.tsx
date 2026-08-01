import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardTier } from "./DashboardTier";
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

describe("DashboardTier", () => {
  it("renders only tiles belonging to the given tier", () => {
    const tiles = [
      makeTile({ id: "t1", title: "Tier 1 tile", tier: 1 }),
      makeTile({ id: "t2", title: "Tier 2 tile", tier: 2 }),
    ];
    render(<DashboardTier tier={1} tiles={tiles} />);
    expect(screen.getByText("Tier 1 tile")).toBeInTheDocument();
    expect(screen.queryByText("Tier 2 tile")).not.toBeInTheDocument();
  });

  it("renders a not-connected placeholder honestly, with no fabricated value", () => {
    const tiles = [makeTile({
      id: "not-connected",
      title: "CRM leads / deals",
      tier: 1,
      dataState: "not-connected",
      value: "Not connected yet",
    })];
    render(<DashboardTier tier={1} tiles={tiles} />);
    expect(screen.getByText("CRM leads / deals")).toBeInTheDocument();
    expect(screen.getByText("Not connected yet")).toBeInTheDocument();
  });
});
