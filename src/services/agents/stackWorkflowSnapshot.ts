// Stack status page (2026-11-08): what the cross-product flow has done for one organization, read
// from the audit rows /api/agents/mcp already writes for every agent tool call. STILL is the agent
// that creates tasks here (STILL src/still/adapters/axxess.py). It ends each task description with
// "From Callismatic ..." or "From Omnidamus ...", plus "STILL event <id>.", and that is how a run's
// source is known. The description itself is never returned, because it can hold callers' phone
// numbers and emails.
//
// Duplicates, spam and malformed events stop inside STILL or in its AWS failure queue before any
// call reaches AXXESS, so they cannot be counted from here.
import { supabaseAdminRest } from "../../repositories/supabaseAdmin";

export const STACK_WINDOW_DAYS = 7;
const MAX_RUNS_SHOWN = 20;
const MAX_ROWS_READ = 500;
const TITLE_LIMIT = 120;
const ERROR_LIMIT = 140;

export type StackSource = "callismatic" | "omnidamus" | "other";
export type StackRunStatus = "task-created" | "pending" | "denied" | "failed";

export type StackRun = {
  id: string;
  createdAt: string;
  source: StackSource;
  status: StackRunStatus;
  title?: string;
  priority?: string;
  stillEventId?: string;
  error?: string;
};

export type StackSnapshot = {
  windowDays: number;
  generatedAt: string;
  totals: { runs: number; tasksCreated: number; pending: number; failed: number };
  bySource: Record<StackSource, { runs: number; tasksCreated: number }>;
  lastRunAt?: string;
  runs: StackRun[];
};

export type StackAuditRow = {
  id: string;
  action: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function clip(value: string | undefined, limit: number) {
  if (!value) return undefined;
  return value.length > limit ? `${value.slice(0, limit - 3).trimEnd()}...` : value;
}

function toolNameOf(row: StackAuditRow) {
  return readString(row.metadata?.toolName) ?? row.action.split(".").slice(-1)[0];
}

// Same mapping as agentGovernanceSnapshot's activityStatus, so both pages agree on an outcome.
function statusOf(metadata: Record<string, unknown>): StackRunStatus {
  if (metadata.success === true) return "task-created";
  const errorMessage = readString(metadata.errorMessage);
  if (errorMessage === "pending_approval") return "pending";
  if (errorMessage?.toLowerCase().includes("capability")) return "denied";
  return "failed";
}

function sourceOf(description: string | undefined): StackSource {
  if (!description) return "other";
  if (/\bFrom Callismatic\b/.test(description)) return "callismatic";
  if (/\bFrom Omnidamus\b/.test(description)) return "omnidamus";
  return "other";
}

function toRun(row: StackAuditRow): StackRun {
  const metadata = row.metadata ?? {};
  const args = (metadata.args && typeof metadata.args === "object" ? metadata.args : {}) as Record<string, unknown>;
  const description = readString(args.description);
  const status = statusOf(metadata);
  return {
    id: row.id,
    createdAt: row.created_at,
    source: sourceOf(description),
    status,
    title: clip(readString(args.title), TITLE_LIMIT),
    priority: readString(args.priority),
    stillEventId: description?.match(/STILL event ([A-Za-z0-9_-]+)/)?.[1],
    error: status === "failed" || status === "denied" ? clip(readString(metadata.errorMessage), ERROR_LIMIT) : undefined,
  };
}

export function summarizeStackRuns(rows: StackAuditRow[], now: Date = new Date()): StackSnapshot {
  const windowStart = now.getTime() - STACK_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const runs = rows
    .filter((row) => toolNameOf(row) === "create_task" && Date.parse(row.created_at) >= windowStart)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(toRun);

  const totals = { runs: runs.length, tasksCreated: 0, pending: 0, failed: 0 };
  const bySource: StackSnapshot["bySource"] = {
    callismatic: { runs: 0, tasksCreated: 0 },
    omnidamus: { runs: 0, tasksCreated: 0 },
    other: { runs: 0, tasksCreated: 0 },
  };
  for (const run of runs) {
    bySource[run.source].runs += 1;
    if (run.status === "task-created") {
      totals.tasksCreated += 1;
      bySource[run.source].tasksCreated += 1;
    } else if (run.status === "pending") {
      totals.pending += 1;
    } else {
      totals.failed += 1;
    }
  }

  return {
    windowDays: STACK_WINDOW_DAYS,
    generatedAt: now.toISOString(),
    totals,
    bySource,
    lastRunAt: runs[0]?.createdAt,
    runs: runs.slice(0, MAX_RUNS_SHOWN),
  };
}

// Does no authorization itself: its caller must check the session's role first.
export async function buildStackWorkflowSnapshot(organizationId: string, now: Date = new Date()): Promise<StackSnapshot> {
  const since = new Date(now.getTime() - STACK_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const rows = await supabaseAdminRest<StackAuditRow[]>("audit_logs", {
    query: new URLSearchParams({
      select: "id,action,created_at,metadata",
      organization_id: `eq.${organizationId}`,
      resource_type: "eq.agent_tool_call",
      created_at: `gte.${since}`,
      order: "created_at.desc",
      limit: String(MAX_ROWS_READ),
    }),
  }).catch(() => [] as StackAuditRow[]);
  return summarizeStackRuns(rows, now);
}
