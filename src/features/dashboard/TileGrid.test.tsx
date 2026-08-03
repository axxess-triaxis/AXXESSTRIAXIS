import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TileGrid } from "./TileGrid";
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

describe("TileGrid", () => {
  it("renders tiles in descending score order, not insertion order", () => {
    const tiles = [
      makeTile({ id: "low", title: "Low", priority: 1, criticality: "green", score: 1 }),
      makeTile({ id: "high", title: "High", priority: 5, criticality: "red", score: 25 }),
      makeTile({ id: "mid", title: "Mid", priority: 3, criticality: "orange", score: 9 }),
    ];

    render(<TileGrid tiles={tiles} />);

    const titles = screen.getAllByText(/^(Low|High|Mid)$/).map((el) => el.textContent);
    expect(titles).toEqual(["High", "Mid", "Low"]);
  });

  it("renders nothing (not an empty placeholder) when given zero tiles", () => {
    const { container } = render(<TileGrid tiles={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
