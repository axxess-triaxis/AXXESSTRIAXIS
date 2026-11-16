// Automation plan Phase 1 (2026-11-16): data access for the lead context layer. Service-role REST like
// leadWorkRepository.ts; organization_id always comes from the caller's scope (an agent connection's
// organization or a human's server-derived TenantScope), never from tool arguments.
import type { CrmLeadStage } from "../domain";
import type { ConversationInput, ExistingLeadFields, UpsertLeadInput } from "../services/crm/leadContext";
import { agentLeadPatch, leadTitleFor, MAX_SEARCH_RESULTS } from "../services/crm/leadContext";
import { loadLeadHistory, type HistoryEntry } from "./leadWorkRepository";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "./supabaseAdmin";

type LeadRow = {
  id: string; title: string; organization_name: string | null; contact_name: string | null; contact_email: string | null;
  contact_phone_e164: string | null; country: string | null; consent_basis: string | null; stage: CrmLeadStage; status: string;
  owner_user_id: string | null; source: string | null; next_follow_up_at: string | null; created_at: string; updated_at: string;
};
const LEAD_SELECT = "id,title,organization_name,contact_name,contact_email,contact_phone_e164,country,consent_basis,stage,status,owner_user_id,source,next_follow_up_at,created_at,updated_at";

export type ContextLead = {
  id: string; title: string; organizationName?: string; contactName?: string; contactEmail?: string; contactPhoneE164?: string;
  country?: string; consentBasis?: string; stage: CrmLeadStage; status: string; ownerUserId?: string; source?: string;
  nextFollowUpAt?: string; createdAt: string; updatedAt: string;
};

export type ConversationEntry = {
  kind: "conversation"; at: string; channel: string; direction: string; source: string; summary: string; externalId: string | null;
};

export type LeadContext = { lead: ContextLead; timeline: Array<HistoryEntry | ConversationEntry> };

function toLead(row: LeadRow): ContextLead {
  return {
    id: row.id, title: row.title, organizationName: row.organization_name ?? undefined, contactName: row.contact_name ?? undefined,
    contactEmail: row.contact_email ?? undefined, contactPhoneE164: row.contact_phone_e164 ?? undefined, country: row.country ?? undefined,
    consentBasis: row.consent_basis ?? undefined, stage: row.stage, status: row.status, ownerUserId: row.owner_user_id ?? undefined,
    source: row.source ?? undefined, nextFollowUpAt: row.next_follow_up_at ?? undefined, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function existingFields(lead: ContextLead): ExistingLeadFields {
  return {
    contactName: lead.contactName, organizationName: lead.organizationName, country: lead.country,
    contactEmail: lead.contactEmail, contactPhoneE164: lead.contactPhoneE164, stage: lead.stage, status: lead.status,
  };
}

function ensureConfigured() {
  if (!isSupabaseAdminConfigured()) throw new Error("Lead context repository is not configured (Supabase admin credentials missing).");
}

export async function getContextLead(organizationId: string, leadId: string): Promise<ContextLead | null> {
  ensureConfigured();
  const rows = await supabaseAdminRest<LeadRow[]>("crm_leads", { query: new URLSearchParams({
    organization_id: `eq.${organizationId}`, id: `eq.${leadId}`, select: LEAD_SELECT,
  }) });
  return rows[0] ? toLead(rows[0]) : null;
}

/** Leads whose email or phone matches exactly, oldest first, so the original record wins. */
export async function findLeadsByContact(organizationId: string, contact: { email?: string; phoneE164?: string }): Promise<ContextLead[]> {
  ensureConfigured();
  const filters: string[] = [];
  if (contact.email) filters.push(`contact_email.eq."${contact.email}"`);
  if (contact.phoneE164) filters.push(`contact_phone_e164.eq."${contact.phoneE164}"`);
  if (!filters.length) return [];
  const rows = await supabaseAdminRest<LeadRow[]>("crm_leads", { query: new URLSearchParams({
    organization_id: `eq.${organizationId}`, or: `(${filters.join(",")})`, select: LEAD_SELECT, order: "created_at.asc", limit: "5",
  }) });
  return rows.map(toLead);
}

export async function searchContextLeads(organizationId: string, term: string, ownerUserId?: string): Promise<ContextLead[]> {
  ensureConfigured();
  const like = `"*${term}*"`;
  const query = new URLSearchParams({
    organization_id: `eq.${organizationId}`,
    or: `(title.ilike.${like},contact_name.ilike.${like},organization_name.ilike.${like},contact_email.ilike.${like},contact_phone_e164.ilike.${like})`,
    select: LEAD_SELECT, order: "updated_at.desc", limit: String(MAX_SEARCH_RESULTS),
  });
  if (ownerUserId) query.set("owner_user_id", `eq.${ownerUserId}`);
  return (await supabaseAdminRest<LeadRow[]>("crm_leads", { query })).map(toLead);
}

export type UpsertResult = { lead: ContextLead; created: boolean; changed: string[] };

/**
 * Creates the lead if no lead has this email or phone, else fills blanks and moves it forward under the
 * agent rules in agentLeadPatch. A new lead is owned by the human who issued the agent's key.
 */
export async function upsertAgentLead(organizationId: string, ownerUserId: string | undefined, input: UpsertLeadInput): Promise<UpsertResult> {
  const [existing] = await findLeadsByContact(organizationId, input);
  if (existing) {
    const patch = agentLeadPatch(existingFields(existing), input);
    const changed = Object.keys(patch);
    if (!changed.length) return { lead: existing, created: false, changed };
    const rows = await supabaseAdminRest<LeadRow[]>("crm_leads", {
      method: "PATCH",
      query: new URLSearchParams({ organization_id: `eq.${organizationId}`, id: `eq.${existing.id}`, select: LEAD_SELECT }),
      body: { ...patch, updated_at: new Date().toISOString() },
    });
    return { lead: rows[0] ? toLead(rows[0]) : existing, created: false, changed };
  }
  const rows = await supabaseAdminRest<LeadRow[]>("crm_leads", {
    method: "POST",
    query: new URLSearchParams({ select: LEAD_SELECT }),
    body: {
      organization_id: organizationId,
      title: leadTitleFor(input),
      organization_name: input.organizationName ?? null,
      contact_name: input.contactName ?? null,
      contact_email: input.email ?? null,
      contact_phone_e164: input.phoneE164 ?? null,
      country: input.country ?? null,
      stage: input.stage ?? "new",
      status: "open",
      priority: "medium",
      source: input.source,
      owner_user_id: ownerUserId ?? null,
      created_by: ownerUserId ?? null,
    },
  });
  if (!rows[0]) throw new Error("Lead creation did not return a row.");
  return { lead: toLead(rows[0]), created: true, changed: [] };
}

/** Appends one conversation; a repeat of the same (source, externalId) is reported, not stored twice. */
export async function recordConversation(organizationId: string, agentConnectionId: string | null, input: ConversationInput): Promise<{ id: string | null; duplicate: boolean }> {
  ensureConfigured();
  if (input.externalId) {
    const existing = await supabaseAdminRest<{ id: string }[]>("lead_conversations", { query: new URLSearchParams({
      organization_id: `eq.${organizationId}`, source: `eq.${input.source}`, external_id: `eq.${input.externalId}`, select: "id",
    }) });
    if (existing[0]) return { id: existing[0].id, duplicate: true };
  }
  try {
    const rows = await supabaseAdminRest<{ id: string }[]>("lead_conversations", {
      method: "POST",
      query: new URLSearchParams({ select: "id" }),
      body: {
        organization_id: organizationId, lead_id: input.leadId, channel: input.channel, direction: input.direction, source: input.source,
        external_id: input.externalId ?? null, summary: input.summary, occurred_at: input.occurredAt,
        recorded_by_agent_connection_id: agentConnectionId,
      },
    });
    return { id: rows[0]?.id ?? null, duplicate: false };
  } catch (error) {
    // A concurrent retry lost the race to the unique index: the conversation is already stored.
    if (error instanceof Error && / 409 /.test(error.message)) return { id: null, duplicate: true };
    throw error;
  }
}

export async function loadLeadContext(organizationId: string, leadId: string): Promise<LeadContext | null> {
  const lead = await getContextLead(organizationId, leadId);
  if (!lead) return null;
  const [history, conversations] = await Promise.all([
    // loadLeadHistory reads only the scope's organization; the role and user are not used for reads.
    loadLeadHistory({ organizationId, userId: lead.ownerUserId ?? organizationId, role: "Organization Admin" }, leadId),
    supabaseAdminRest<{ occurred_at: string; channel: string; direction: string; source: string; summary: string; external_id: string | null }[]>(
      "lead_conversations", { query: new URLSearchParams({
        organization_id: `eq.${organizationId}`, lead_id: `eq.${leadId}`,
        select: "occurred_at,channel,direction,source,summary,external_id", order: "occurred_at.desc", limit: "200",
      }) }),
  ]);
  const timeline: Array<HistoryEntry | ConversationEntry> = [
    ...history,
    ...conversations.map((c) => ({ kind: "conversation" as const, at: c.occurred_at, channel: c.channel, direction: c.direction, source: c.source, summary: c.summary, externalId: c.external_id })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  return { lead, timeline };
}
