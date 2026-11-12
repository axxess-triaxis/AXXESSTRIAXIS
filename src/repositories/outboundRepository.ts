// Outbound data access (GTM plan 2026-11-11): suppression list, known lead contacts, and bulk lead
// import. Service-role REST like crmRepository.ts; organization_id always comes from the caller's
// server-derived TenantScope.
import type { ContactChannel } from "../compliance/contactability";
import type { ImportedLead } from "../services/outbound/leadImport";
import type { TickSequence, TickState } from "../services/outbound/outreachTick";
import type { SequenceDefinition } from "../services/outbound/sequenceDefinition";
import type { TenantScope } from "./interfaces";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "./supabaseAdmin";

const PAGE = 1000;

async function readAll<T>(table: string, select: string, scope: TenantScope, extra: Record<string, string> = {}): Promise<T[]> {
  const out: T[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const query = new URLSearchParams({
      organization_id: `eq.${scope.organizationId}`,
      select,
      order: "id.asc",
      limit: String(PAGE),
      offset: String(offset),
      ...extra,
    });
    const rows = await supabaseAdminRest<T[]>(table, { query });
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}

/** Suppressed identifiers (any channel) and identifiers already on a lead, for import checks. */
export async function loadImportContext(scope: TenantScope): Promise<{ suppressed: Set<string>; existing: Set<string> }> {
  if (!isSupabaseAdminConfigured()) throw new Error("Outbound repository is not configured (Supabase admin credentials missing).");
  const [suppressions, leads] = await Promise.all([
    readAll<{ identifier: string }>("contact_suppressions", "identifier", scope),
    readAll<{ contact_email: string | null; contact_phone_e164: string | null }>(
      "crm_leads", "contact_email,contact_phone_e164", scope, { or: "(contact_email.not.is.null,contact_phone_e164.not.is.null)" },
    ),
  ]);
  const existing = new Set<string>();
  for (const lead of leads) {
    if (lead.contact_email) existing.add(lead.contact_email.toLowerCase());
    if (lead.contact_phone_e164) existing.add(lead.contact_phone_e164);
  }
  return { suppressed: new Set(suppressions.map((s) => s.identifier)), existing };
}

/**
 * Adds a suppression. A duplicate (same organization, identifier and channel) already suppresses,
 * so the unique-index conflict (409) counts as success.
 */
export async function addSuppression(entry: {
  organizationId: string;
  identifier: string;
  channel: "email" | "whatsapp" | "sms" | "voice_human" | "voice_ai" | null;
  reason: "unsubscribe" | "opt_out" | "complaint" | "bounce" | "manual";
  createdBy?: string;
}): Promise<void> {
  if (!isSupabaseAdminConfigured()) throw new Error("Outbound repository is not configured (Supabase admin credentials missing).");
  try {
    await supabaseAdminRest("contact_suppressions", {
      method: "POST",
      prefer: "return=minimal",
      body: {
        organization_id: entry.organizationId,
        identifier: entry.identifier.trim().toLowerCase(),
        channel: entry.channel,
        reason: entry.reason,
        created_by: entry.createdBy ?? null,
      },
    });
  } catch (error) {
    if (error instanceof Error && / 409 /.test(error.message)) return;
    throw error;
  }
}

/** Inserts imported leads owned by the importing user. Returns the number of rows created. */
export async function insertImportedLeads(scope: TenantScope, leads: ImportedLead[]): Promise<number> {
  if (leads.length === 0) return 0;
  if (!isSupabaseAdminConfigured()) throw new Error("Outbound repository is not configured (Supabase admin credentials missing).");
  const now = new Date().toISOString();
  const rows = await supabaseAdminRest<{ id: string }[]>("crm_leads", {
    method: "POST",
    query: new URLSearchParams({ select: "id" }),
    body: leads.map((lead) => ({
      organization_id: scope.organizationId,
      title: lead.contactName ? `${lead.organizationName} - ${lead.contactName}` : lead.organizationName,
      organization_name: lead.organizationName,
      contact_name: lead.contactName ?? null,
      contact_email: lead.contactEmail ?? null,
      contact_phone_e164: lead.contactPhoneE164 ?? null,
      country: lead.country,
      consent_basis: lead.consentBasis,
      consent_source: lead.source,
      consent_recorded_at: now,
      source: lead.source,
      stage: "new",
      status: "open",
      priority: "medium",
      owner_user_id: scope.userId,
      created_by: scope.userId,
    })),
  });
  return rows.length;
}

// ---- Outreach tick (Day 2) ----------------------------------------------------------------

type EnrollmentRow = { id: string; lead_id: string; sequence_id: string; step_index: number; next_send_at: string | null; status: "active" | "completed" | "stopped" };
type TickLeadRow = {
  id: string; country: string | null; consent_basis: "opt_in" | "b2b_legitimate_interest" | null; contact_email: string | null;
  contact_name: string | null; organization_name: string | null; status: "open" | "stalled" | "won" | "lost";
  registry_status: "clear" | "listed" | "unchecked"; registry_checked_at: string | null;
};

const quoteIn = (values: string[]) => `(${values.map((v) => `"${v.replace(/["\\]/g, "")}"`).join(",")})`;

export async function loadTickState(organizationId: string, now: Date): Promise<TickState> {
  if (!isSupabaseAdminConfigured()) throw new Error("Outbound repository is not configured (Supabase admin credentials missing).");
  const org = `eq.${organizationId}`;
  const dayAgo = new Date(now.getTime() - 86_400_000).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();

  const [enrollments, sentTodayRows] = await Promise.all([
    supabaseAdminRest<EnrollmentRow[]>("outreach_enrollments", { query: new URLSearchParams({
      organization_id: org, status: "eq.active", next_send_at: `lte.${now.toISOString()}`,
      select: "id,lead_id,sequence_id,step_index,next_send_at,status", order: "next_send_at.asc", limit: "500",
    }) }),
    supabaseAdminRest<{ id: string }[]>("contact_attempts", { query: new URLSearchParams({
      organization_id: org, channel: "eq.email", decision: "eq.allowed", created_at: `gte.${dayAgo}`, select: "id", limit: "5000",
    }) }),
  ]);
  const empty: TickState = { enrollments: [], leads: new Map(), sequences: new Map(), suppressed: new Set(), attemptsByLead: new Map(), sentToday: sentTodayRows.length };
  if (enrollments.length === 0) return empty;

  const leadIds = [...new Set(enrollments.map((e) => e.lead_id))];
  const sequenceIds = [...new Set(enrollments.map((e) => e.sequence_id))];
  const [leads, sequences, attempts] = await Promise.all([
    supabaseAdminRest<TickLeadRow[]>("crm_leads", { query: new URLSearchParams({
      organization_id: org, id: `in.${quoteIn(leadIds)}`,
      select: "id,country,consent_basis,contact_email,contact_name,organization_name,status,registry_status,registry_checked_at",
    }) }),
    supabaseAdminRest<{ id: string; steps: TickSequence["steps"] }[]>("outreach_sequences", { query: new URLSearchParams({
      organization_id: org, id: `in.${quoteIn(sequenceIds)}`, status: "eq.approved", select: "id,steps",
    }) }),
    supabaseAdminRest<{ lead_id: string; channel: ContactChannel; created_at: string }[]>("contact_attempts", { query: new URLSearchParams({
      organization_id: org, lead_id: `in.${quoteIn(leadIds)}`, decision: "eq.allowed", created_at: `gte.${weekAgo}`, select: "lead_id,channel,created_at",
    }) }),
  ]);

  const emails = leads.map((l) => l.contact_email?.trim().toLowerCase()).filter((e): e is string => Boolean(e));
  const suppressions = emails.length === 0 ? [] : await supabaseAdminRest<{ identifier: string }[]>("contact_suppressions", { query: new URLSearchParams({
    organization_id: org, identifier: `in.${quoteIn(emails)}`, or: "(channel.is.null,channel.eq.email)", select: "identifier",
  }) });

  const attemptsByLead = new Map<string, { channel: ContactChannel; at: Date }[]>();
  for (const a of attempts) {
    const list = attemptsByLead.get(a.lead_id) ?? [];
    list.push({ channel: a.channel, at: new Date(a.created_at) });
    attemptsByLead.set(a.lead_id, list);
  }

  return {
    enrollments: enrollments.map((e) => ({
      id: e.id, leadId: e.lead_id, sequenceId: e.sequence_id, stepIndex: e.step_index,
      nextSendAt: e.next_send_at ? new Date(e.next_send_at) : null, status: e.status,
    })),
    leads: new Map(leads.map((l) => [l.id, {
      id: l.id, country: l.country ?? undefined, consentBasis: l.consent_basis, contactEmail: l.contact_email ?? undefined,
      contactName: l.contact_name ?? undefined, organizationName: l.organization_name ?? undefined, status: l.status,
      registryStatus: l.registry_status, registryCheckedAt: l.registry_checked_at ? new Date(l.registry_checked_at) : null,
    }])),
    sequences: new Map(sequences.map((s) => [s.id, { id: s.id, steps: s.steps }])),
    suppressed: new Set(suppressions.map((s) => s.identifier)),
    attemptsByLead,
    sentToday: sentTodayRows.length,
  };
}

export async function recordContactAttempt(attempt: {
  organizationId: string; leadId: string; enrollmentId: string | null; channel: ContactChannel;
  decision: "allowed" | "refused"; reasons: string[]; providerMessageId: string | null; actorUserId?: string | null;
}): Promise<void> {
  await supabaseAdminRest("contact_attempts", { method: "POST", prefer: "return=minimal", body: {
    organization_id: attempt.organizationId, lead_id: attempt.leadId, enrollment_id: attempt.enrollmentId, channel: attempt.channel,
    decision: attempt.decision, reasons: attempt.reasons, provider_message_id: attempt.providerMessageId, actor_user_id: attempt.actorUserId ?? null,
  } });
}

export async function updateEnrollment(organizationId: string, id: string, patch: {
  stepIndex?: number; nextSendAt: Date | null; status: "active" | "completed" | "stopped"; stopReasons: string[];
}): Promise<void> {
  await supabaseAdminRest("outreach_enrollments", {
    method: "PATCH",
    prefer: "return=minimal",
    query: new URLSearchParams({ organization_id: `eq.${organizationId}`, id: `eq.${id}` }),
    body: {
      ...(patch.stepIndex === undefined ? {} : { step_index: patch.stepIndex }),
      next_send_at: patch.nextSendAt?.toISOString() ?? null,
      status: patch.status,
      stop_reasons: patch.stopReasons,
      updated_at: new Date().toISOString(),
    },
  });
}

// ---- Sequence management ----------------------------------------------------------------

export async function createSequence(scope: TenantScope, definition: SequenceDefinition): Promise<string> {
  if (!isSupabaseAdminConfigured()) throw new Error("Outbound repository is not configured (Supabase admin credentials missing).");
  const rows = await supabaseAdminRest<{ id: string }[]>("outreach_sequences", {
    method: "POST",
    query: new URLSearchParams({ select: "id" }),
    body: { organization_id: scope.organizationId, name: definition.name, steps: definition.steps, status: "draft", created_by: scope.userId },
  });
  if (!rows[0]) throw new Error("Sequence creation did not return a row.");
  return rows[0].id;
}

/** Draft to approved only. Returns false if no draft sequence with that id exists in the organization. */
export async function approveSequence(scope: TenantScope, sequenceId: string): Promise<boolean> {
  const now = new Date().toISOString();
  const rows = await supabaseAdminRest<{ id: string }[]>("outreach_sequences", {
    method: "PATCH",
    query: new URLSearchParams({ organization_id: `eq.${scope.organizationId}`, id: `eq.${sequenceId}`, status: "eq.draft", select: "id" }),
    body: { status: "approved", approved_by: scope.userId, approved_at: now, updated_at: now },
  });
  return rows.length === 1;
}

export type EnrollSkip = { leadId: string; reason: "not_found" | "no_email" | "no_lawful_basis" | "lead_closed" | "already_enrolled" };

/** Enrolls eligible leads in an approved sequence, first step due now. Ineligible leads are reported, not enrolled. */
export async function enrollLeads(scope: TenantScope, sequenceId: string, leadIds: string[]): Promise<{ sequenceFound: boolean; enrolled: number; skipped: EnrollSkip[] }> {
  const org = `eq.${scope.organizationId}`;
  const sequences = await supabaseAdminRest<{ id: string }[]>("outreach_sequences", {
    query: new URLSearchParams({ organization_id: org, id: `eq.${sequenceId}`, status: "eq.approved", select: "id" }),
  });
  if (sequences.length === 0) return { sequenceFound: false, enrolled: 0, skipped: [] };

  const ids = [...new Set(leadIds)];
  const [leads, existing] = await Promise.all([
    supabaseAdminRest<{ id: string; contact_email: string | null; consent_basis: string | null; status: string }[]>("crm_leads", {
      query: new URLSearchParams({ organization_id: org, id: `in.${quoteIn(ids)}`, select: "id,contact_email,consent_basis,status" }),
    }),
    supabaseAdminRest<{ lead_id: string }[]>("outreach_enrollments", {
      query: new URLSearchParams({ organization_id: org, sequence_id: `eq.${sequenceId}`, lead_id: `in.${quoteIn(ids)}`, select: "lead_id" }),
    }),
  ]);
  const byId = new Map(leads.map((l) => [l.id, l]));
  const enrolledAlready = new Set(existing.map((e) => e.lead_id));
  const skipped: EnrollSkip[] = [];
  const eligible: string[] = [];
  for (const id of ids) {
    const lead = byId.get(id);
    if (!lead) skipped.push({ leadId: id, reason: "not_found" });
    else if (enrolledAlready.has(id)) skipped.push({ leadId: id, reason: "already_enrolled" });
    else if (!lead.contact_email) skipped.push({ leadId: id, reason: "no_email" });
    else if (!lead.consent_basis) skipped.push({ leadId: id, reason: "no_lawful_basis" });
    else if (lead.status === "won" || lead.status === "lost") skipped.push({ leadId: id, reason: "lead_closed" });
    else eligible.push(id);
  }
  if (eligible.length) {
    const now = new Date().toISOString();
    await supabaseAdminRest("outreach_enrollments", {
      method: "POST",
      prefer: "return=minimal,resolution=ignore-duplicates",
      query: new URLSearchParams({ on_conflict: "sequence_id,lead_id" }),
      body: eligible.map((leadId) => ({
        organization_id: scope.organizationId, sequence_id: sequenceId, lead_id: leadId,
        step_index: 0, next_send_at: now, status: "active", created_by: scope.userId,
      })),
    });
  }
  return { sequenceFound: true, enrolled: eligible.length, skipped };
}
