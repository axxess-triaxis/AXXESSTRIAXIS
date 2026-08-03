// Executive Dashboard Redesign Sprint ED-R3: tenant-scoped repository for the MANUAL financial
// watchlist (supabase/migrations/20260801140000_financial_watch_items.sql). Same service-role
// supabaseAdminRest pattern as crmRepository.ts. This is a manual watchlist, not a bank
// integration -- callers must never present it as "bank connected."
import type { EntityId, FinancialWatchCategory, FinancialWatchItem, FinancialWatchStatus, FinancialWatchThresholdType, ISODateTime } from "../domain";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "./supabaseAdmin";
import type { TenantScope } from "./interfaces";

type FinancialWatchItemRow = {
  id: string;
  organization_id: string;
  title: string;
  category: FinancialWatchCategory;
  threshold_type: FinancialWatchThresholdType;
  threshold_amount: number;
  current_amount: number | null;
  currency: string;
  status: FinancialWatchStatus;
  owner_user_id: string | null;
  due_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function fromRow(row: FinancialWatchItemRow): FinancialWatchItem {
  return {
    id: row.id,
    organizationId: row.organization_id,
    title: row.title,
    category: row.category,
    thresholdType: row.threshold_type,
    thresholdAmount: row.threshold_amount,
    currentAmount: row.current_amount ?? undefined,
    currency: row.currency,
    status: row.status,
    ownerUserId: row.owner_user_id ?? undefined,
    dueAt: row.due_at ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type CreateFinancialWatchItemInput = {
  title: string;
  category: FinancialWatchCategory;
  thresholdType: FinancialWatchThresholdType;
  thresholdAmount: number;
  currentAmount?: number;
  currency?: string;
  ownerUserId?: EntityId;
  dueAt?: ISODateTime;
  notes?: string;
};

export type UpdateFinancialWatchItemInput = Partial<CreateFinancialWatchItemInput> & { status?: FinancialWatchStatus };

// A real tenant with an empty watchlist must see a genuinely empty list -- never fabricated
// balances or thresholds.
export async function listFinancialWatchItems(scope: TenantScope): Promise<FinancialWatchItem[]> {
  if (!isSupabaseAdminConfigured()) return [];
  const query = new URLSearchParams({
    organization_id: `eq.${scope.organizationId}`,
    select: "id,organization_id,title,category,threshold_type,threshold_amount,current_amount,currency,status,owner_user_id,due_at,notes,created_at,updated_at",
    order: "created_at.desc",
    limit: "500",
  });
  const rows = await supabaseAdminRest<FinancialWatchItemRow[]>("financial_watch_items", { query }).catch(() => []);
  return rows.map(fromRow);
}

export async function createFinancialWatchItem(scope: TenantScope, input: CreateFinancialWatchItemInput): Promise<FinancialWatchItem> {
  if (!isSupabaseAdminConfigured()) throw new Error("Financial watch repository is not configured (Supabase admin credentials missing).");
  const rows = await supabaseAdminRest<FinancialWatchItemRow[]>("financial_watch_items", {
    method: "POST",
    body: {
      organization_id: scope.organizationId,
      title: input.title,
      category: input.category,
      threshold_type: input.thresholdType,
      threshold_amount: input.thresholdAmount,
      current_amount: input.currentAmount ?? null,
      currency: input.currency ?? "USD",
      owner_user_id: input.ownerUserId ?? scope.userId,
      due_at: input.dueAt ?? null,
      notes: input.notes ?? null,
      created_by: scope.userId,
    },
  });
  if (!rows[0]) throw new Error("Financial watch item creation did not return a row.");
  return fromRow(rows[0]);
}

export async function updateFinancialWatchItem(scope: TenantScope, itemId: EntityId, input: UpdateFinancialWatchItemInput): Promise<FinancialWatchItem> {
  if (!isSupabaseAdminConfigured()) throw new Error("Financial watch repository is not configured (Supabase admin credentials missing).");
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.title !== undefined) body.title = input.title;
  if (input.category !== undefined) body.category = input.category;
  if (input.thresholdType !== undefined) body.threshold_type = input.thresholdType;
  if (input.thresholdAmount !== undefined) body.threshold_amount = input.thresholdAmount;
  if (input.currentAmount !== undefined) body.current_amount = input.currentAmount;
  if (input.currency !== undefined) body.currency = input.currency;
  if (input.ownerUserId !== undefined) body.owner_user_id = input.ownerUserId;
  if (input.dueAt !== undefined) body.due_at = input.dueAt;
  if (input.notes !== undefined) body.notes = input.notes;
  if (input.status !== undefined) body.status = input.status;

  const query = new URLSearchParams({
    id: `eq.${itemId}`,
    organization_id: `eq.${scope.organizationId}`,
    select: "id,organization_id,title,category,threshold_type,threshold_amount,current_amount,currency,status,owner_user_id,due_at,notes,created_at,updated_at",
  });
  const rows = await supabaseAdminRest<FinancialWatchItemRow[]>("financial_watch_items", { method: "PATCH", query, body });
  if (!rows[0]) throw new Error("Financial watch item not found for this organization.");
  return fromRow(rows[0]);
}

export async function markFinancialWatchItemResolved(scope: TenantScope, itemId: EntityId): Promise<FinancialWatchItem> {
  return updateFinancialWatchItem(scope, itemId, { status: "resolved" });
}
