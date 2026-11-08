import type { StackRun, StackSnapshot } from "../services/agents/stackWorkflowSnapshot";

// Sample runs for deployments forced into demo mode (investor). The page labels them as sample data.
// Times are relative to now so the page never looks stale.
export function createDemoStackSnapshot(now: Date = new Date()): StackSnapshot {
  const at = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * 60_000).toISOString();
  const runs: StackRun[] = [
    { id: "demo-run-1", createdAt: at(12), source: "callismatic", status: "task-created", title: "Call back: budget approved, wants to sign by Friday", priority: "high", stillEventId: "evt-demo-0412" },
    { id: "demo-run-2", createdAt: at(47), source: "omnidamus", status: "task-created", title: "Omnidamus follow-up: demo time: Thursday 11:00", priority: "medium", stillEventId: "evt-demo-0409" },
    { id: "demo-run-3", createdAt: at(95), source: "callismatic", status: "task-created", title: "Send revised quote for 40 seats", priority: "high", stillEventId: "evt-demo-0401" },
    { id: "demo-run-4", createdAt: at(180), source: "omnidamus", status: "task-created", title: "Omnidamus follow-up: site visit: Monday", priority: "medium", stillEventId: "evt-demo-0388" },
    { id: "demo-run-5", createdAt: at(258), source: "callismatic", status: "task-created", title: "Confirm delivery address", priority: "medium", stillEventId: "evt-demo-0371" },
    { id: "demo-run-6", createdAt: at(260), source: "callismatic", status: "failed", title: "Confirm delivery address", priority: "medium", stillEventId: "evt-demo-0371", error: "Database timeout. STILL retried two minutes later." },
  ];
  return {
    windowDays: 7,
    generatedAt: now.toISOString(),
    totals: { runs: runs.length, tasksCreated: 5, pending: 0, failed: 1 },
    bySource: { callismatic: { runs: 4, tasksCreated: 3 }, omnidamus: { runs: 2, tasksCreated: 2 }, other: { runs: 0, tasksCreated: 0 } },
    lastRunAt: runs[0].createdAt,
    runs,
  };
}
