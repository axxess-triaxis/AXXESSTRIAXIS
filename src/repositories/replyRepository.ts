// Reply sorting data access (GTM plan 2026-11-11, Day 3 item 1). Service-role REST like
// outboundRepository.ts. Called only from the signed Resend webhook, so organization_id comes from
// the server setting OUTREACH_ORGANIZATION_ID, never from the request.
import type { ClassifiedBy, ReplyCategory } from "../services/outbound/replySorting";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "./supabaseAdmin";

function ensureConfigured() {
  if (!isSupabaseAdminConfigured()) throw new Error("Reply repository is not configured (Supabase admin credentials missing).");
}

export type ReplyLead = { id: string; stage: string; status: string; ownerUserId: string | null };

/** The most recently created lead with this contact email in the organization, or null. */
export async function findLeadByEmail(organizationId: string, email: string): Promise<ReplyLead | null> {
  ensureConfigured();
  const rows = await supabaseAdminRest<{ id: string; stage: string; status: string; owner_user_id: string | null }[]>("crm_leads", {
    query: new URLSearchParams({
      organization_id: `eq.${organizationId}`, contact_email: `ilike.${email.replace(/[%_*,()]/g, "")}`,
      select: "id,stage,status,owner_user_id", order: "created_at.desc", limit: "1",
    }),
  });
  const row = rows[0];
  return row ? { id: row.id, stage: row.stage, status: row.status, ownerUserId: row.owner_user_id } : null;
}

export async function replyAlreadyStored(organizationId: string, providerEmailId: string): Promise<boolean> {
  ensureConfigured();
  const rows = await supabaseAdminRest<{ id: string }[]>("lead_replies", {
    query: new URLSearchParams({ organization_id: `eq.${organizationId}`, provider_email_id: `eq.${providerEmailId}`, select: "id", limit: "1" }),
  });
  return rows.length > 0;
}

/** Inserts the reply. Returns false when a concurrent delivery already stored it (unique index, 409). */
export async function insertReply(reply: {
  organizationId: string; leadId: string | null; providerEmailId: string; fromEmail: string; subject: string;
  bodyText: string; bodyTruncated: boolean; category: ReplyCategory; classifiedBy: ClassifiedBy;
}): Promise<boolean> {
  ensureConfigured();
  try {
    await supabaseAdminRest("lead_replies", {
      method: "POST", prefer: "return=minimal",
      body: {
        organization_id: reply.organizationId, lead_id: reply.leadId, provider_email_id: reply.providerEmailId,
        from_email: reply.fromEmail, subject: reply.subject, body_text: reply.bodyText, body_truncated: reply.bodyTruncated,
        category: reply.category, classified_by: reply.classifiedBy,
      },
    });
    return true;
  } catch (error) {
    if (error instanceof Error && / 409 /.test(error.message)) return false;
    throw error;
  }
}

/** Stops every active enrollment for the lead. Returns how many were stopped. */
export async function stopActiveEnrollments(organizationId: string, leadId: string, reason: string): Promise<number> {
  const rows = await supabaseAdminRest<{ id: string }[]>("outreach_enrollments", {
    method: "PATCH",
    query: new URLSearchParams({ organization_id: `eq.${organizationId}`, lead_id: `eq.${leadId}`, status: "eq.active", select: "id" }),
    body: { status: "stopped", next_send_at: null, stop_reasons: [reason], updated_at: new Date().toISOString() },
  });
  return rows.length;
}

export async function updateLeadFromReply(organizationId: string, leadId: string, patch: {
  stage?: string; status?: string; nextFollowUpAt?: string;
}): Promise<void> {
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.stage) body.stage = patch.stage;
  if (patch.status) body.status = patch.status;
  if (patch.nextFollowUpAt) body.next_follow_up_at = patch.nextFollowUpAt;
  await supabaseAdminRest("crm_leads", {
    method: "PATCH", prefer: "return=minimal",
    query: new URLSearchParams({ organization_id: `eq.${organizationId}`, id: `eq.${leadId}` }),
    body,
  });
}

export async function createOwnerTask(organizationId: string, task: { title: string; description: string; assigneeId: string | null; dueDate: string }): Promise<void> {
  await supabaseAdminRest("tasks", {
    method: "POST", prefer: "return=minimal",
    body: {
      organization_id: organizationId, title: task.title, description: task.description, assignee_id: task.assigneeId,
      priority: "high", status: "pending", due_date: task.dueDate, tags: ["outreach-reply"],
    },
  });
}

/** System audit row (no signed-in actor), the same way agent tool calls are audited. */
export async function recordSystemAudit(organizationId: string, entry: {
  action: string; resourceType: string; resourceId: string | null; metadata: Record<string, unknown>;
}): Promise<void> {
  await supabaseAdminRest("audit_logs", {
    method: "POST", prefer: "return=minimal",
    body: {
      organization_id: organizationId, actor_user_id: null, action: entry.action, resource_type: entry.resourceType,
      resource_id: entry.resourceId, category: "crm", metadata: entry.metadata,
    },
  });
}
