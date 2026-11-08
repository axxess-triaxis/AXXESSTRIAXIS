import { describe, expect, it } from "vitest";
import { summarizeStackRuns, type StackAuditRow } from "./stackWorkflowSnapshot";

const NOW = new Date("2026-11-08T12:00:00Z");

function row(overrides: Partial<StackAuditRow> & { metadata?: Record<string, unknown> } = {}): StackAuditRow {
  return {
    id: overrides.id ?? "log-1",
    action: overrides.action ?? "agent.custom.tool.create_task",
    created_at: overrides.created_at ?? "2026-11-08T10:00:00Z",
    metadata: overrides.metadata ?? {
      provider: "custom",
      toolName: "create_task",
      success: true,
      args: {
        title: "Call back about the signed quote",
        priority: "high",
        description: "Budget approved.\nCaller: +91 98765 43210\nFrom Callismatic (lead, voice) item c-1, triaged 2026-11-08T09:59:00Z. STILL event evt-123.",
      },
    },
  };
}

describe("summarizeStackRuns", () => {
  it("labels a Callismatic lead and an Omnidamus conversation by their source", () => {
    const snapshot = summarizeStackRuns([
      row({ id: "a" }),
      row({
        id: "b",
        metadata: {
          toolName: "create_task",
          success: true,
          args: { title: "Omnidamus follow-up: demo time: Friday", priority: "medium", description: "Agent summary: booked.\nFrom Omnidamus conversation conv-9 (closed on whatsapp, 2026-11-08). STILL event evt-456." },
        },
      }),
    ], NOW);

    expect(snapshot.runs.map((run) => [run.id, run.source, run.stillEventId])).toEqual([
      ["a", "callismatic", "evt-123"],
      ["b", "omnidamus", "evt-456"],
    ]);
    expect(snapshot.bySource.callismatic).toEqual({ runs: 1, tasksCreated: 1 });
    expect(snapshot.bySource.omnidamus).toEqual({ runs: 1, tasksCreated: 1 });
  });

  it("never returns the task description, which can hold phone numbers and emails", () => {
    const snapshot = summarizeStackRuns([row()], NOW);
    const serialized = JSON.stringify(snapshot);

    expect(serialized).not.toContain("98765");
    expect(serialized).not.toContain("Budget approved");
    expect(snapshot.runs[0]).toMatchObject({ title: "Call back about the signed quote", priority: "high", status: "task-created" });
  });

  it("maps outcomes the same way the agent activity feed does", () => {
    const snapshot = summarizeStackRuns([
      row({ id: "ok" }),
      row({ id: "pending", metadata: { toolName: "create_task", success: false, errorMessage: "pending_approval", args: {} } }),
      row({ id: "denied", metadata: { toolName: "create_task", success: false, errorMessage: "capability not granted", args: {} } }),
      row({ id: "failed", metadata: { toolName: "create_task", success: false, errorMessage: "Title is required.", args: {} } }),
    ], NOW);

    expect(snapshot.runs.map((run) => run.status)).toEqual(["task-created", "pending", "denied", "failed"]);
    expect(snapshot.totals).toEqual({ runs: 4, tasksCreated: 1, pending: 1, failed: 2 });
    expect(snapshot.runs[3].error).toBe("Title is required.");
  });

  it("counts only create_task calls from the last 7 days", () => {
    const snapshot = summarizeStackRuns([
      row({ id: "recent" }),
      row({ id: "old", created_at: "2026-10-31T11:59:00Z" }),
      row({ id: "other-tool", action: "agent.custom.tool.list_tasks", metadata: { toolName: "list_tasks", success: true, args: {} } }),
    ], NOW);

    expect(snapshot.runs.map((run) => run.id)).toEqual(["recent"]);
    expect(snapshot.totals.runs).toBe(1);
  });

  it("calls a run with no recognisable source 'other', rather than guessing", () => {
    const snapshot = summarizeStackRuns([
      row({ metadata: { toolName: "create_task", success: true, args: { title: "Typed by a person's agent", description: "No source line." } } }),
    ], NOW);

    expect(snapshot.runs[0].source).toBe("other");
    expect(snapshot.runs[0].stillEventId).toBeUndefined();
  });

  it("shows at most 20 runs but counts every run in the window", () => {
    const rows = Array.from({ length: 25 }, (_, index) => row({ id: `r${index}` }));
    const snapshot = summarizeStackRuns(rows, NOW);

    expect(snapshot.runs).toHaveLength(20);
    expect(snapshot.totals.runs).toBe(25);
    expect(snapshot.lastRunAt).toBe("2026-11-08T10:00:00Z");
  });

  it("returns honest zeros when nothing has run", () => {
    const snapshot = summarizeStackRuns([], NOW);

    expect(snapshot.totals).toEqual({ runs: 0, tasksCreated: 0, pending: 0, failed: 0 });
    expect(snapshot.runs).toEqual([]);
    expect(snapshot.lastRunAt).toBeUndefined();
  });
});
