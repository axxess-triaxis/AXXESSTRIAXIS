// Agent call jobs (agent call pipeline, 2026-11-13). One row per "Call with agent" request, written
// with the service role; organization_id always comes from a server-derived scope (the caller's
// session, or the MCP connection's tenant for log_agent_call). No transcript or phone number here.
import type { CallOutcome } from "../services/outbound/callQueue";
import type { TenantScope } from "./interfaces";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "./supabaseAdmin";

export type AgentCallStatus = "queued" | "calling" | "completed" | "failed";

export type AgentCallJob = {
  id: string;
  leadId: string;
  status: AgentCallStatus;
  outcome: CallOutcome | null;
  summary: string | null;
  actionItems: string[];
  failureReason: string | null;
  createdAt: string;
  completedAt: string | null;
};

type JobRow = {
  id: string; lead_id: string; status: AgentCallStatus; outcome: CallOutcome | null; summary: string | null;
  action_items: unknown; failure_reason: string | null; created_at: string; completed_at: string | null;
};
const JOB_SELECT = "id,lead_id,status,outcome,summary,action_items,failure_reason,created_at,completed_at";

function toJob(row: JobRow): AgentCallJob {
  return {
    id: row.id, leadId: row.lead_id, status: row.status, outcome: row.outcome, summary: row.summary,
    actionItems: Array.isArray(row.action_items) ? row.action_items.filter((a): a is string => typeof a === "string") : [],
    failureReason: row.failure_reason, createdAt: row.created_at, completedAt: row.completed_at,
  };
}

function ensureConfigured() {
  if (!isSupabaseAdminConfigured()) throw new Error("Agent call repository is not configured (Supabase admin credentials missing).");
}

export async function createAgentCallJob(scope: TenantScope, leadId: string): Promise<AgentCallJob> {
  ensureConfigured();
  const rows = await supabaseAdminRest<JobRow[]>("agent_call_jobs", {
    method: "POST",
    query: new URLSearchParams({ select: JOB_SELECT }),
    body: { organization_id: scope.organizationId, lead_id: leadId, status: "queued", requested_by: scope.userId },
  });
  if (!rows?.[0]) throw new Error("Agent call job was not created.");
  return toJob(rows[0]);
}

export async function setAgentCallJobStatus(scope: TenantScope, jobId: string, change: { status: "calling" } | { status: "failed"; failureReason: string }): Promise<void> {
  ensureConfigured();
  await supabaseAdminRest("agent_call_jobs", {
    method: "PATCH",
    prefer: "return=minimal",
    query: new URLSearchParams({ organization_id: `eq.${scope.organizationId}`, id: `eq.${jobId}` }),
    body: change.status === "failed"
      ? { status: "failed", failure_reason: change.failureReason.slice(0, 200), completed_at: new Date().toISOString() }
      : { status: "calling" },
  });
}

export async function latestAgentCallJobs(scope: TenantScope, leadIds: string[]): Promise<Map<string, AgentCallJob>> {
  ensureConfigured();
  const latest = new Map<string, AgentCallJob>();
  if (leadIds.length === 0) return latest;
  const ids = `(${leadIds.map((id) => `"${id.replace(/["\\]/g, "")}"`).join(",")})`;
  const rows = await supabaseAdminRest<JobRow[]>("agent_call_jobs", { query: new URLSearchParams({
    organization_id: `eq.${scope.organizationId}`, lead_id: `in.${ids}`, select: JOB_SELECT, order: "created_at.desc", limit: "500",
  }) });
  for (const row of rows ?? []) if (!latest.has(row.lead_id)) latest.set(row.lead_id, toJob(row));
  return latest;
}

export type AgentCallResult =
  | { status: "completed"; outcome: CallOutcome; summary: string; actionItems: string[] }
  | { status: "failed"; failureReason: string };

/**
 * Records the result Callismatic reported for a job. Idempotent: a job that already finished is
 * returned unchanged with alreadyDone, so a replayed STILL event changes nothing. Null if the job
 * is not in this organization.
 */
export async function completeAgentCallJob(organizationId: string, jobId: string, result: AgentCallResult): Promise<{ job: AgentCallJob; alreadyDone: boolean } | null> {
  ensureConfigured();
  const org = `eq.${organizationId}`;
  const found = await supabaseAdminRest<JobRow[]>("agent_call_jobs", { query: new URLSearchParams({ organization_id: org, id: `eq.${jobId}`, select: JOB_SELECT }) });
  const current = found?.[0];
  if (!current) return null;
  if (current.status === "completed" || current.status === "failed") return { job: toJob(current), alreadyDone: true };

  const body = result.status === "completed"
    ? { status: "completed", outcome: result.outcome, summary: result.summary.slice(0, 1000), action_items: result.actionItems.slice(0, 10).map((a) => a.slice(0, 300)) }
    : { status: "failed", failure_reason: result.failureReason.slice(0, 200) };
  const updated = await supabaseAdminRest<JobRow[]>("agent_call_jobs", {
    method: "PATCH",
    query: new URLSearchParams({ organization_id: org, id: `eq.${jobId}`, status: "in.(queued,calling)", select: JOB_SELECT }),
    body: { ...body, completed_at: new Date().toISOString() },
  });
  if (!updated?.[0]) {
    const again = await supabaseAdminRest<JobRow[]>("agent_call_jobs", { query: new URLSearchParams({ organization_id: org, id: `eq.${jobId}`, select: JOB_SELECT }) });
    return again?.[0] ? { job: toJob(again[0]), alreadyDone: true } : null;
  }
  return { job: toJob(updated[0]), alreadyDone: false };
}
