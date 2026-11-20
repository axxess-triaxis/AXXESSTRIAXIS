// Stack org routing (2026-11-20). Looks up which organization started a Callismatic or Omnidamus job,
// so STILL's result is filed there and nowhere else. These reads deliberately span organizations: the
// job id is the only thing the caller knows, and the organization comes back from this table, never
// from the event. Service role only; nothing here is reachable from a user session.
import { isSupabaseAdminConfigured, supabaseAdminRest } from "./supabaseAdmin";

export type StackProduct = "callismatic" | "omnidamus";

export type StackJobOwner = { organizationId: string; leadId: string; requestedBy: string | null; status: string };

export type OrgAgentSettings = { callismaticEnabled: boolean; omnidamusEnabled: boolean };

export type MessageJobResult =
  | { status: "completed"; summary: string; taskId: string | null }
  | { status: "failed"; failureReason: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ensureConfigured() {
  if (!isSupabaseAdminConfigured()) throw new Error("Stack jobs repository is not configured (Supabase admin credentials missing).");
}

type OwnerRow = { organization_id: string; lead_id: string; requested_by: string | null; status: string };

/** The organization that owns a job, or null when no such job exists. */
export async function findStackJobOwner(product: StackProduct, jobId: string): Promise<StackJobOwner | null> {
  if (!UUID.test(jobId)) return null;
  ensureConfigured();
  const table = product === "callismatic" ? "agent_call_jobs" : "agent_message_jobs";
  const rows = await supabaseAdminRest<OwnerRow[]>(table, {
    query: new URLSearchParams({ id: `eq.${jobId}`, select: "organization_id,lead_id,requested_by,status", limit: "1" }),
  });
  const row = rows?.[0];
  return row ? { organizationId: row.organization_id, leadId: row.lead_id, requestedBy: row.requested_by, status: row.status } : null;
}

/** Per-organization product switches. An organization without a row has every product off. */
export async function getOrgAgentSettings(organizationId: string): Promise<OrgAgentSettings> {
  ensureConfigured();
  const rows = await supabaseAdminRest<Array<{ callismatic_enabled: boolean; omnidamus_enabled: boolean }>>("org_agent_settings", {
    query: new URLSearchParams({ organization_id: `eq.${organizationId}`, select: "callismatic_enabled,omnidamus_enabled", limit: "1" }),
  });
  const row = rows?.[0];
  return { callismaticEnabled: row?.callismatic_enabled === true, omnidamusEnabled: row?.omnidamus_enabled === true };
}

/**
 * Records an Omnidamus result on its job. Idempotent: only a queued or running job changes, so a
 * replayed event returns false and changes nothing.
 */
export async function completeMessageJob(organizationId: string, jobId: string, result: MessageJobResult): Promise<boolean> {
  ensureConfigured();
  const body = result.status === "completed"
    ? { status: "completed", summary: result.summary.slice(0, 1000), task_id: result.taskId }
    : { status: "failed", failure_reason: result.failureReason.slice(0, 200) };
  const updated = await supabaseAdminRest<Array<{ id: string }>>("agent_message_jobs", {
    method: "PATCH",
    query: new URLSearchParams({ organization_id: `eq.${organizationId}`, id: `eq.${jobId}`, status: "in.(queued,running)", select: "id" }),
    body: { ...body, completed_at: new Date().toISOString() },
  });
  return Boolean(updated?.[0]);
}

/** Links the follow-up task to a job that completeMessageJob already closed. */
export async function setMessageJobTask(organizationId: string, jobId: string, taskId: string): Promise<void> {
  ensureConfigured();
  await supabaseAdminRest("agent_message_jobs", {
    method: "PATCH",
    prefer: "return=minimal",
    query: new URLSearchParams({ organization_id: `eq.${organizationId}`, id: `eq.${jobId}` }),
    body: { task_id: taskId },
  });
}
