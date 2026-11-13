// Leads page and call queue data access (GTM plan 2026-11-11, Day 3). Service-role REST like
// outboundRepository.ts; organization_id always comes from the caller's server-derived TenantScope,
// and the routes decide which leads a role may see before calling these.
import type { ConsentBasis, ContactChannel } from "../compliance/contactability";
import type { CallOutcome, QueueLead } from "../services/outbound/callQueue";
import type { TenantScope } from "./interfaces";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "./supabaseAdmin";

type LeadRow = {
  id: string; title: string; organization_name: string | null; contact_name: string | null; contact_phone_e164: string | null;
  country: string | null; consent_basis: ConsentBasis | null; stage: string; status: string; owner_user_id: string | null;
  created_by: string | null; next_follow_up_at: string | null; registry_status: "clear" | "listed" | "unchecked"; registry_checked_at: string | null;
};
const LEAD_SELECT = "id,title,organization_name,contact_name,contact_phone_e164,country,consent_basis,stage,status,owner_user_id,created_by,next_follow_up_at,registry_status,registry_checked_at";

export type WorkLead = QueueLead & { status: string; createdBy?: string };

function toLead(row: LeadRow): WorkLead {
  return {
    id: row.id, title: row.title, organizationName: row.organization_name ?? undefined, contactName: row.contact_name ?? undefined,
    phoneE164: row.contact_phone_e164 ?? undefined, country: row.country ?? undefined, consentBasis: row.consent_basis,
    stage: row.stage, status: row.status, ownerUserId: row.owner_user_id ?? undefined, createdBy: row.created_by ?? undefined,
    nextFollowUpAt: row.next_follow_up_at ?? undefined, registryStatus: row.registry_status,
    registryCheckedAt: row.registry_checked_at ? new Date(row.registry_checked_at) : null,
  };
}

const quoteIn = (values: string[]) => `(${values.map((v) => `"${v.replace(/["\\]/g, "")}"`).join(",")})`;

function ensureConfigured() {
  if (!isSupabaseAdminConfigured()) throw new Error("Lead repository is not configured (Supabase admin credentials missing).");
}

/** True if the user owns or created the lead; the same rule listCrmLeads uses for an Employee. */
export function isOwnLead(lead: { ownerUserId?: string; createdBy?: string }, userId: string) {
  return lead.ownerUserId === userId || lead.createdBy === userId;
}

export async function getLead(scope: TenantScope, leadId: string): Promise<WorkLead | null> {
  ensureConfigured();
  const rows = await supabaseAdminRest<LeadRow[]>("crm_leads", { query: new URLSearchParams({
    organization_id: `eq.${scope.organizationId}`, id: `eq.${leadId}`, select: LEAD_SELECT,
  }) });
  return rows[0] ? toLead(rows[0]) : null;
}

/** Open leads for the call queue: all of them for senior roles, the caller's own otherwise. */
export async function listOpenLeads(scope: TenantScope, ownerUserId?: string): Promise<WorkLead[]> {
  ensureConfigured();
  const query = new URLSearchParams({
    organization_id: `eq.${scope.organizationId}`, status: "eq.open", select: LEAD_SELECT, order: "created_at.asc", limit: "500",
  });
  if (ownerUserId) query.set("or", `(owner_user_id.eq.${ownerUserId},created_by.eq.${ownerUserId})`);
  return (await supabaseAdminRest<LeadRow[]>("crm_leads", { query })).map(toLead);
}

/** Suppressed phone numbers and allowed attempts in the last 7 days, for the gate. */
export async function loadCallContext(scope: TenantScope, leads: WorkLead[], now: Date): Promise<{
  suppressed: Set<string>; suppressedAi: Set<string>; attemptsByLead: Map<string, { channel: ContactChannel; at: Date }[]>;
}> {
  ensureConfigured();
  const attemptsByLead = new Map<string, { channel: ContactChannel; at: Date }[]>();
  if (leads.length === 0) return { suppressed: new Set(), suppressedAi: new Set(), attemptsByLead };
  const org = `eq.${scope.organizationId}`;
  const phones = leads.map((l) => l.phoneE164).filter((p): p is string => Boolean(p));
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const [attempts, suppressions] = await Promise.all([
    supabaseAdminRest<{ lead_id: string; channel: ContactChannel; created_at: string }[]>("contact_attempts", { query: new URLSearchParams({
      organization_id: org, lead_id: `in.${quoteIn(leads.map((l) => l.id))}`, decision: "eq.allowed", created_at: `gte.${weekAgo}`,
      select: "lead_id,channel,created_at", limit: "5000",
    }) }),
    phones.length === 0 ? Promise.resolve([]) : supabaseAdminRest<{ identifier: string; channel: ContactChannel | null }[]>("contact_suppressions", { query: new URLSearchParams({
      organization_id: org, identifier: `in.${quoteIn(phones)}`, or: "(channel.is.null,channel.eq.voice_human,channel.eq.voice_ai)", select: "identifier,channel",
    }) }),
  ]);
  for (const a of attempts) {
    const list = attemptsByLead.get(a.lead_id) ?? [];
    list.push({ channel: a.channel, at: new Date(a.created_at) });
    attemptsByLead.set(a.lead_id, list);
  }
  const forChannel = (channel: ContactChannel) =>
    new Set(suppressions.filter((s) => s.channel === null || s.channel === channel).map((s) => s.identifier));
  return { suppressed: forChannel("voice_human"), suppressedAi: forChannel("voice_ai"), attemptsByLead };
}

export async function recordCall(scope: TenantScope, call: {
  leadId: string; decision: "allowed" | "refused"; reasons: string[]; outcome: CallOutcome | null; note: string | null;
  channel?: "voice_human" | "voice_ai";
}): Promise<void> {
  ensureConfigured();
  await supabaseAdminRest("contact_attempts", { method: "POST", prefer: "return=minimal", body: {
    organization_id: scope.organizationId, lead_id: call.leadId, channel: call.channel ?? "voice_human", decision: call.decision,
    reasons: call.reasons, outcome: call.outcome, note: call.note, actor_user_id: scope.userId,
  } });
}

/** True if the user is an active staff member of the caller's organization (a valid lead owner). */
export async function isActiveStaffMember(scope: TenantScope, userId: string): Promise<boolean> {
  ensureConfigured();
  const rows = await supabaseAdminRest<{ id: string }[]>("users", { query: new URLSearchParams({
    organization_id: `eq.${scope.organizationId}`, id: `eq.${userId}`, status: "eq.active",
    role: `in.("Super Admin","Organization Admin","Executive","Manager","Employee")`, select: "id",
  }) });
  return rows.length === 1;
}

export type StaffMember = { id: string; displayName: string };

export async function listActiveStaff(scope: TenantScope): Promise<StaffMember[]> {
  ensureConfigured();
  const rows = await supabaseAdminRest<{ id: string; display_name: string }[]>("users", { query: new URLSearchParams({
    organization_id: `eq.${scope.organizationId}`, status: "eq.active",
    role: `in.("Super Admin","Organization Admin","Executive","Manager","Employee")`, select: "id,display_name", order: "display_name.asc",
  }) });
  return rows.map((r) => ({ id: r.id, displayName: r.display_name }));
}

export type HistoryEntry =
  | { kind: "attempt"; at: string; channel: ContactChannel; decision: "allowed" | "refused"; reasons: string[]; outcome: string | null; note: string | null }
  | { kind: "change"; at: string; action: string; metadata: Record<string, unknown> }
  | { kind: "reply"; at: string; category: string; subject: string; fromEmail: string };

export async function loadLeadHistory(scope: TenantScope, leadId: string): Promise<HistoryEntry[]> {
  ensureConfigured();
  const org = `eq.${scope.organizationId}`;
  const [attempts, changes, replies] = await Promise.all([
    supabaseAdminRest<{ created_at: string; channel: ContactChannel; decision: "allowed" | "refused"; reasons: string[]; outcome: string | null; note: string | null }[]>(
      "contact_attempts", { query: new URLSearchParams({
        organization_id: org, lead_id: `eq.${leadId}`, select: "created_at,channel,decision,reasons,outcome,note", order: "created_at.desc", limit: "200",
      }) }),
    supabaseAdminRest<{ created_at: string; action: string; metadata: Record<string, unknown> | null }[]>(
      "audit_logs", { query: new URLSearchParams({
        organization_id: org, resource_type: "eq.crm_lead", resource_id: `eq.${leadId}`, action: "neq.outreach.reply.received",
        select: "created_at,action,metadata", order: "created_at.desc", limit: "200",
      }) }),
    supabaseAdminRest<{ created_at: string; category: string; subject: string; from_email: string }[]>(
      "lead_replies", { query: new URLSearchParams({
        organization_id: org, lead_id: `eq.${leadId}`, select: "created_at,category,subject,from_email", order: "created_at.desc", limit: "200",
      }) }),
  ]);
  const entries: HistoryEntry[] = [
    ...attempts.map((a) => ({ kind: "attempt" as const, at: a.created_at, channel: a.channel, decision: a.decision, reasons: a.reasons ?? [], outcome: a.outcome, note: a.note })),
    ...changes.map((c) => ({ kind: "change" as const, at: c.created_at, action: c.action, metadata: c.metadata ?? {} })),
    ...replies.map((r) => ({ kind: "reply" as const, at: r.created_at, category: r.category, subject: r.subject, fromEmail: r.from_email })),
  ];
  return entries.sort((a, b) => b.at.localeCompare(a.at));
}
