import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = { demoMode: false, forcedDemoMode: false };

vi.mock("../../demo/demoMode", () => ({
  isDemoModeEnabled: () => state.demoMode,
  isDemoModeForcedByEnv: () => state.forcedDemoMode,
}));

import { StackStatusSection } from "./StackStatusSection";

function snapshot(overrides: Record<string, unknown> = {}) {
  return {
    windowDays: 7,
    generatedAt: "2026-11-08T12:00:00Z",
    totals: { runs: 2, tasksCreated: 1, pending: 0, failed: 1 },
    bySource: { callismatic: { runs: 1, tasksCreated: 1 }, omnidamus: { runs: 1, tasksCreated: 0 }, other: { runs: 0, tasksCreated: 0 } },
    lastRunAt: "2026-11-08T10:00:00Z",
    runs: [
      { id: "a", createdAt: "2026-11-08T10:00:00Z", source: "callismatic", status: "task-created", title: "Call back about the signed quote", priority: "high", stillEventId: "evt-123" },
      { id: "b", createdAt: "2026-11-08T09:00:00Z", source: "omnidamus", status: "failed", title: "Omnidamus follow-up", error: "Title is required." },
    ],
    ...overrides,
  };
}

describe("StackStatusSection", () => {
  afterEach(() => {
    state.demoMode = false;
    state.forcedDemoMode = false;
    vi.unstubAllGlobals();
  });

  it("shows the flow between the four products", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => snapshot() })));
    render(<StackStatusSection />);

    for (const name of ["Callismatic", "Omnidamus", "Event bus", "STILL", "AXXESS TRIaxis"]) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    }
    await screen.findByText("Call back about the signed quote");
  });

  it("shows real stats and runs from the API, with outcomes", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => snapshot() })));
    render(<StackStatusSection />);

    await screen.findByText("Call back about the signed quote");
    expect(screen.getByTestId("stack-stat-runs")).toHaveTextContent("2");
    expect(screen.getByTestId("stack-stat-tasks")).toHaveTextContent("1");
    expect(screen.getByTestId("stack-stat-failed")).toHaveTextContent("1");
    expect(screen.getByText("Task created")).toBeInTheDocument();
    expect(screen.getByText("Title is required.")).toBeInTheDocument();
    expect(screen.queryByText(/Sample data/)).not.toBeInTheDocument();
  });

  it("shows an honest empty state, not sample runs, when a real workspace has no runs", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => snapshot({ totals: { runs: 0, tasksCreated: 0, pending: 0, failed: 0 }, runs: [], lastRunAt: undefined }) })));
    render(<StackStatusSection />);

    await screen.findByText(/No workflow runs in the last 7 days/);
    expect(screen.queryByText(/Sample data/)).not.toBeInTheDocument();
  });

  it("says when the runs could not be loaded", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 403, json: async () => ({ error: "nope" }) })));
    render(<StackStatusSection />);

    await screen.findByText(/Could not load workflow runs \(403\)/);
  });

  it("makes no API call on a deployment forced into demo mode, and labels its sample runs", async () => {
    state.demoMode = true;
    state.forcedDemoMode = true;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<StackStatusSection />);

    await waitFor(() => expect(screen.getByText(/Sample data/)).toBeInTheDocument());
    expect(screen.getAllByText("Task created").length).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
