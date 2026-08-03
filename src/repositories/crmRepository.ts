// Executive Dashboard Redesign Sprint ED-R2: minimal tenant-scoped CRM leads repository, over the
// new crm_leads table (supabase/migrations/20260801120000_crm_leads.sql). Uses the same
// service-role supabaseAdminRest pattern as reviewInbox.ts and workflowActionRepositories.ts --
// organization_id is always taken from the caller's TenantScope (itself derived server-side from
// the authenticated session), never from an unscoped client value.
import type { CrmLead, CrmLeadStage, CrmLeadStatus, EntityId, ISODateTime, PriorityLevel } from "../domain";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "./supabaseAdmin";
import type { TenantScope } from "./interfaces";

type CrmLeadRow = {
  id: string;
  organization_id: string;
  stakeholder_id: string | null;
  title: string;
  organization_name: string | null;
  contact_name: string | null;
  stage: CrmLeadStage;
  estimated_value: number | null;
  currency: string | null;
  priority: PriorityLevel;
  owner_user_id: string | null;
  next_follow_up_at: string | null;
  status: CrmLeadStatus;
  source: string | null;
  created_at: string;
  updated_at: string;
};

function fromRow(row: CrmLeadRow): CrmLead {
  return {
    id: row.id,
    organizationId: row.organization_id,
    stakeholderId: row.stakeholder_id ?? undefined,
    title: row.title,
    organizationName: row.organization_name ?? undefined,
    contactName: row.contact_name ?? undefined,
    stage: row.stage,
    estimatedValue: row.estimated_value ?? undefined,
    currency: row.currency ?? undefined,
    priority: row.priority,
    ownerUserId: row.owner_user_id ?? undefined,
    nextFollowUpAt: row.next_follow_up_at ?? undefined,
    status: row.status,
    source: row.source ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type CreateCrmLeadInput = {
  title: string;
  stakeholderId?: EntityId;
  organizationName?: string;
  contactName?: string;
  stage?: CrmLeadStage;
  estimatedValue?: number;
  currency?: string;
  priority?: PriorityLevel;
  ownerUserId?: EntityId;
  nextFollowUpAt?: ISODateTime;
  status?: CrmLeadStatus;
  source?: string;
};

export type UpdateCrmLeadInput = Partial<CreateCrmLeadInput>;

// A real tenant with zero leads must see a genuinely empty list -- never fabricated pipeline data.
export async function listCrmLeads(scope: TenantScope): Promise<CrmLead[]> {
  if (!isSupabaseAdminConfigured()) return [];
  const query = new URLSearchParams({
    organization_id: `eq.${scope.organizationId}`,
    select: "id,organization_id,stakeholder_id,title,organization_name,contact_name,stage,estimated_value,currency,priority,owner_user_id,next_follow_up_at,status,source,created_at,updated_at",
    order: "created_at.desc",
    limit: "500",
  });
  const rows = await supabaseAdminRest<CrmLeadRow[]>("crm_leads", { query }).catch(() => []);
  return rows.map(fromRow);
}

export async function createCrmLead(scope: TenantScope, input: CreateCrmLeadInput): Promise<CrmLead> {
  if (!isSupabaseAdminConfigured()) throw new Error("CRM repository is not configured (Supabase admin credentials missing).");
  const rows = await supabaseAdminRest<CrmLeadRow[]>("crm_leads", {
    method: "POST",
    body: {
      organization_id: scope.organizationId,
      stakeholder_id: input.stakeholderId ?? null,
      title: input.title,
      organization_name: input.organizationName ?? null,
      contact_name: input.contactName ?? null,
      stage: input.stage ?? "new",
      estimated_value: input.estimatedValue ?? null,
      currency: input.currency ?? null,
      priority: input.priority ?? "medium",
      owner_user_id: input.ownerUserId ?? scope.userId,
      next_follow_up_at: input.nextFollowUpAt ?? null,
      status: input.status ?? "open",
      source: input.source ?? null,
      created_by: scope.userId,
    },
  });
  if (!rows[0]) throw new Error("CRM lead creation did not return a row.");
  return fromRow(rows[0]);
}

export async function updateCrmLead(scope: TenantScope, leadId: EntityId, input: UpdateCrmLeadInput): Promise<CrmLead> {
  if (!isSupabaseAdminConfigured()) throw new Error("CRM repository is not configured (Supabase admin credentials missing).");
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.title !== undefined) body.title = input.title;
  if (input.stakeholderId !== undefined) body.stakeholder_id = input.stakeholderId;
  if (input.organizationName !== undefined) body.organization_name = input.organizationName;
  if (input.contactName !== undefined) body.contact_name = input.contactName;
  if (input.stage !== undefined) body.stage = input.stage;
  if (input.estimatedValue !== undefined) body.estimated_value = input.estimatedValue;
  if (input.currency !== undefined) body.currency = input.currency;
  if (input.priority !== undefined) body.priority = input.priority;
  if (input.ownerUserId !== undefined) body.owner_user_id = input.ownerUserId;
  if (input.nextFollowUpAt !== undefined) body.next_follow_up_at = input.nextFollowUpAt;
  if (input.status !== undefined) body.status = input.status;
  if (input.source !== undefined) body.source = input.source;

  const query = new URLSearchParams({
    id: `eq.${leadId}`,
    organization_id: `eq.${scope.organizationId}`,
    select: "id,organization_id,stakeholder_id,title,organization_name,contact_name,stage,estimated_value,currency,priority,owner_user_id,next_follow_up_at,status,source,created_at,updated_at",
  });
  const rows = await supabaseAdminRest<CrmLeadRow[]>("crm_leads", { method: "PATCH", query, body });
  if (!rows[0]) throw new Error("CRM lead not found for this organization.");
  return fromRow(rows[0]);
}

export function listFollowUpsDue(leads: CrmLead[], now = new Date()): CrmLead[] {
  return leads.filter((lead) => lead.status === "open" && lead.nextFollowUpAt && new Date(lead.nextFollowUpAt).getTime() <= now.getTime());
}

export function countStalledLeads(leads: CrmLead[]): number {
  return leads.filter((lead) => lead.status === "stalled").length;
}
