import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KanbanBoard } from "./KanbanBoard";
import type { KanbanColumnData } from "./types";

describe("KanbanBoard", () => {
  it("renders nothing (not an empty placeholder) when given zero columns", () => {
    const { container } = render(<KanbanBoard columns={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders every column with its own card count and cards", () => {
    const columns: KanbanColumnData[] = [
      {
        id: "needs-setup",
        title: "Needs setup",
        cards: [
          { id: "org_a", title: "Org A", metrics: [{ label: "Users", value: "4" }] },
        ],
      },
      {
        id: "pilot-ready",
        title: "Pilot-ready",
        cards: [
          { id: "org_b", title: "Org B", metrics: [] },
          { id: "org_c", title: "Org C", metrics: [] },
        ],
      },
    ];

    render(<KanbanBoard columns={columns} />);

    expect(screen.getByText("Needs setup")).toBeInTheDocument();
    expect(screen.getByText("Pilot-ready")).toBeInTheDocument();
    expect(screen.getByText("Org A")).toBeInTheDocument();
    expect(screen.getByText("Org B")).toBeInTheDocument();
    expect(screen.getByText("Org C")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument(); // "Needs setup" card count
    expect(screen.getByText("2")).toBeInTheDocument(); // "Pilot-ready" card count
  });

  it("links a card to its route when provided, and renders as a plain card otherwise", () => {
    const columns: KanbanColumnData[] = [
      {
        id: "col",
        title: "Col",
        cards: [
          { id: "linked", title: "Linked Card", metrics: [], route: "/admin/pilot-conversion" },
          { id: "plain", title: "Plain Card", metrics: [] },
        ],
      },
    ];

    render(<KanbanBoard columns={columns} />);

    const link = screen.getByText("Linked Card").closest("a");
    expect(link).toHaveAttribute("href", "/admin/pilot-conversion");
    const plain = screen.getByText("Plain Card").closest("a");
    expect(plain).toBeNull();
  });
});
