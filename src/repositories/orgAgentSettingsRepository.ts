// Customer-fireable stack, PR 5 (2026-11-20). Reads and writes org_agent_settings, the numbers an
// organization has claimed in org_channel_numbers, and agent_message_jobs. Service role only; every
// call names its organization, which the route takes from the session (or, for the platform
// operator, from the URL after its own check).
import type { Registrations } from "../services/outbound/callQueue";
import { DEFAULT_AGENT_SETTINGS, registrationsOf, type AgentSettings, type AgentSettingsPatch, type MessageChannel } from "../services/stack/agentSettings";
import type { TenantScope } from "./interfaces";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "./supabaseAdmin";

type SettingsRow = {
  callismatic_enabled: boolean; omnidamus_enabled: boolean; call_purpose: string | null; sms_opening_text: string | null;
  caller_id_e164: string | null; whatsapp_phone_number_id: string | null; whatsapp_number_e164: string | null;
  whatsapp_template: string | null; sms_origination_identity: string | null; sms_number_e164: string | null;
  dlt_india_registered: boolean; tdra_uae_registered: boolean; counsel_signed_off: boolean; updated_at: string | null;
};

const COLUMNS: Record<keyof Omit<AgentSettings, "updatedAt">, keyof SettingsRow> = {
  callismaticEnabled: "callismatic_enabled", omnidamusEnabled: "omnidamus_enabled", callPurpose: "call_purpose",
  smsOpeningText: "sms_opening_text", callerIdE164: "caller_id_e164", whatsappPhoneNumberId: "whatsapp_phone_number_id",
  whatsappNumberE164: "whatsapp_number_e164", whatsappTemplate: "whatsapp_template",
  smsOriginationIdentity: "sms_origination_identity", smsNumberE164: "sms_number_e164",
  dltIndiaRegistered: "dlt_india_registered", tdraUaeRegistered: "tdra_uae_registered", counselSignedOff: "counsel_signed_off",
};
const SELECT = [...Object.values(COLUMNS), "updated_at"].join(",");

/** Numbers an organization claims, so no other organization can send from them. */
const CLAIMED: Array<{ field: "callerIdE164" | "whatsappNumberE164" | "smsNumberE164"; channel: "voice" | "whatsapp" | "sms" }> = [
  { field: "callerIdE164", channel: "voice" },
  { field: "whatsappNumberE164", channel: "whatsapp" },
  { field: "smsNumberE164", channel: "sms" },
];

export class NumberClaimedError extends Error {
  constructor(readonly field: string) {
    super("number_claimed");
  }
}

function ensureConfigured() {
  if (!isSupabaseAdminConfigured()) throw new Error("Agent settings repository is not configured (Supabase admin credentials missing).");
}

function toSettings(row: SettingsRow | undefined): AgentSettings {
  if (!row) return { ...DEFAULT_AGENT_SETTINGS };
  const settings = { ...DEFAULT_AGENT_SETTINGS, updatedAt: row.updated_at };
  for (const [field, column] of Object.entries(COLUMNS)) {
    (settings as Record<string, unknown>)[field] = row[column] ?? (typeof DEFAULT_AGENT_SETTINGS[field as keyof AgentSettings] === "boolean" ? false : null);
  }
  return settings;
}

/** An organization without a row has every agent off and nothing linked. */
export async function loadAgentSettings(organizationId: string): Promise<AgentSettings> {
  ensureConfigured();
  const rows = await supabaseAdminRest<SettingsRow[]>("org_agent_settings", {
    query: new URLSearchParams({ organization_id: `eq.${organizationId}`, select: SELECT, limit: "1" }),
  });
  return toSettings(rows?.[0]);
}

/**
 * Applies a validated patch. A changed number is claimed in org_channel_numbers first; if another
 * organization holds it, nothing is saved and NumberClaimedError names the field.
 */
export async function saveAgentSettings(organizationId: string, patch: AgentSettingsPatch, userId: string): Promise<AgentSettings> {
  ensureConfigured();
  const current = await loadAgentSettings(organizationId);
  for (const { field, channel } of CLAIMED) {
    if (!(field in patch) || patch[field] === current[field]) continue;
    const next = patch[field] ?? null;
    if (next) {
      const holders = await supabaseAdminRest<Array<{ organization_id: string }>>("org_channel_numbers", {
        query: new URLSearchParams({ channel: `eq.${channel}`, identifier: `eq.${next}`, select: "organization_id", limit: "1" }),
      });
      if (holders?.[0] && holders[0].organization_id !== organizationId) throw new NumberClaimedError(field);
    }
  }
  for (const { field, channel } of CLAIMED) {
    if (!(field in patch) || patch[field] === current[field]) continue;
    if (current[field]) {
      await supabaseAdminRest("org_channel_numbers", {
        method: "DELETE", prefer: "return=minimal",
        query: new URLSearchParams({ organization_id: `eq.${organizationId}`, channel: `eq.${channel}`, identifier: `eq.${current[field]}` }),
      });
    }
    const next = patch[field];
    if (next) {
      try {
        await supabaseAdminRest("org_channel_numbers", {
          method: "POST", prefer: "return=minimal",
          body: { organization_id: organizationId, channel, identifier: next, created_by: userId },
        });
      } catch (error) {
        // The unique (channel, identifier) constraint: another organization claimed it meanwhile.
        if (error instanceof Error && / 409 /.test(error.message)) throw new NumberClaimedError(field);
        throw error;
      }
    }
  }
  const body: Record<string, unknown> = { organization_id: organizationId, updated_by: userId, updated_at: new Date().toISOString() };
  for (const [field, value] of Object.entries(patch)) body[COLUMNS[field as keyof typeof COLUMNS]] = value;
  const rows = await supabaseAdminRest<SettingsRow[]>("org_agent_settings", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    query: new URLSearchParams({ on_conflict: "organization_id", select: SELECT }),
    body,
  });
  return toSettings(rows?.[0]);
}

/** The organization's sender registrations, as Triaxis recorded them. None recorded means all false. */
export async function loadRegistrations(organizationId: string): Promise<Registrations> {
  return registrationsOf(await loadAgentSettings(organizationId));
}

export async function getOrganizationName(organizationId: string): Promise<string | null> {
  ensureConfigured();
  const rows = await supabaseAdminRest<Array<{ name: string | null }>>("organizations", {
    query: new URLSearchParams({ id: `eq.${organizationId}`, select: "name", limit: "1" }),
  });
  return rows?.[0]?.name?.trim() || null;
}

export async function listOrganizations(): Promise<Array<{ id: string; name: string }>> {
  ensureConfigured();
  const rows = await supabaseAdminRest<Array<{ id: string; name: string | null }>>("organizations", {
    query: new URLSearchParams({ select: "id,name", order: "name.asc", limit: "500" }),
  });
  return (rows ?? []).map((r) => ({ id: r.id, name: r.name ?? r.id }));
}

// --- agent_message_jobs ("Message with agent") ---------------------------------------------------

export type AgentMessageJob = {
  id: string; leadId: string; channel: MessageChannel; status: "queued" | "running" | "completed" | "failed";
  summary: string | null; failureReason: string | null; createdAt: string; completedAt: string | null;
};

type MessageJobRow = {
  id: string; lead_id: string; channel: MessageChannel; status: AgentMessageJob["status"]; summary: string | null;
  failure_reason: string | null; created_at: string; completed_at: string | null;
};
const MESSAGE_JOB_SELECT = "id,lead_id,channel,status,summary,failure_reason,created_at,completed_at";

function toMessageJob(row: MessageJobRow): AgentMessageJob {
  return {
    id: row.id, leadId: row.lead_id, channel: row.channel, status: row.status, summary: row.summary,
    failureReason: row.failure_reason, createdAt: row.created_at, completedAt: row.completed_at,
  };
}

export async function createMessageJob(scope: TenantScope, leadId: string, channel: MessageChannel): Promise<AgentMessageJob> {
  ensureConfigured();
  const rows = await supabaseAdminRest<MessageJobRow[]>("agent_message_jobs", {
    method: "POST",
    query: new URLSearchParams({ select: MESSAGE_JOB_SELECT }),
    body: { organization_id: scope.organizationId, lead_id: leadId, channel, status: "queued", requested_by: scope.userId },
  });
  if (!rows?.[0]) throw new Error("agent_message_jobs insert returned no row");
  return toMessageJob(rows[0]);
}

export async function setMessageJobStatus(
  scope: TenantScope, jobId: string, change: { status: "running" } | { status: "failed"; failureReason: string },
): Promise<void> {
  ensureConfigured();
  const body = change.status === "failed"
    ? { status: "failed", failure_reason: change.failureReason.slice(0, 200), completed_at: new Date().toISOString() }
    : { status: "running" };
  await supabaseAdminRest("agent_message_jobs", {
    method: "PATCH", prefer: "return=minimal",
    query: new URLSearchParams({ organization_id: `eq.${scope.organizationId}`, id: `eq.${jobId}`, status: "in.(queued,running)" }),
    body,
  });
}

export async function latestMessageJob(scope: TenantScope, leadId: string): Promise<AgentMessageJob | null> {
  ensureConfigured();
  const rows = await supabaseAdminRest<MessageJobRow[]>("agent_message_jobs", {
    query: new URLSearchParams({
      organization_id: `eq.${scope.organizationId}`, lead_id: `eq.${leadId}`, select: MESSAGE_JOB_SELECT, order: "created_at.desc", limit: "1",
    }),
  });
  return rows?.[0] ? toMessageJob(rows[0]) : null;
}

/** Suppressions and allowed attempts for one lead on one messaging channel, for the contactability gate. */
export async function loadMessageContext(scope: TenantScope, leadId: string, phoneE164: string, channel: MessageChannel, now: Date): Promise<{
  suppressed: boolean; attempts: Array<{ channel: MessageChannel; at: Date }>;
}> {
  ensureConfigured();
  const org = `eq.${scope.organizationId}`;
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const [attempts, suppressions] = await Promise.all([
    supabaseAdminRest<Array<{ created_at: string }>>("contact_attempts", { query: new URLSearchParams({
      organization_id: org, lead_id: `eq.${leadId}`, channel: `eq.${channel}`, decision: "eq.allowed", created_at: `gte.${weekAgo}`,
      select: "created_at", limit: "100",
    }) }),
    supabaseAdminRest<Array<{ identifier: string }>>("contact_suppressions", { query: new URLSearchParams({
      organization_id: org, identifier: `eq.${phoneE164}`, or: `(channel.is.null,channel.eq.${channel})`, select: "identifier", limit: "1",
    }) }),
  ]);
  return { suppressed: (suppressions ?? []).length > 0, attempts: (attempts ?? []).map((a) => ({ channel, at: new Date(a.created_at) })) };
}

export async function recordMessageAttempt(scope: TenantScope, attempt: {
  leadId: string; channel: MessageChannel; decision: "allowed" | "refused"; reasons: string[];
}): Promise<void> {
  ensureConfigured();
  await supabaseAdminRest("contact_attempts", {
    method: "POST", prefer: "return=minimal",
    body: {
      organization_id: scope.organizationId, lead_id: attempt.leadId, channel: attempt.channel,
      decision: attempt.decision, reasons: attempt.reasons, actor_user_id: scope.userId,
    },
  });
}
