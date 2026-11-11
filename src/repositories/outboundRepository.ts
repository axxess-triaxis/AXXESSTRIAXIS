// Outbound data access (GTM plan 2026-11-11): suppression list, known lead contacts, and bulk lead
// import. Service-role REST like crmRepository.ts; organization_id always comes from the caller's
// server-derived TenantScope.
import type { ImportedLead } from "../services/outbound/leadImport";
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
