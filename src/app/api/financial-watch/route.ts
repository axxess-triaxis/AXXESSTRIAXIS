import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../auth/serverSession";
import type { FinancialWatchCategory, FinancialWatchThresholdType } from "../../../domain";
import { auditLogsRepository, tenantScopeFromUser } from "../../../repositories/supabaseEnterpriseRepositories";
import { createFinancialWatchItem, listFinancialWatchItems, type CreateFinancialWatchItemInput } from "../../../repositories/financialWatchRepository";

// Executive Dashboard Redesign Sprint ED-R3. organization_id/userId are derived from the
// authenticated server session -- never accepted from the client. This is a MANUAL watchlist API,
// not a bank integration.
export async function GET() {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const scope = tenantScopeFromUser(session.user, session.accessToken);
  const items = await listFinancialWatchItems(scope);
  return NextResponse.json({ items });
}

type CreateWatchItemRequest = {
  title?: string;
  category?: FinancialWatchCategory;
  thresholdType?: FinancialWatchThresholdType;
  thresholdAmount?: number;
  currentAmount?: number;
  currency?: string;
  dueAt?: string;
  notes?: string;
};

export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await request.json().catch(() => ({})) as CreateWatchItemRequest;
  if (!body.title?.trim()) return NextResponse.json({ error: "Watch item title is required." }, { status: 400 });
  if (!body.category) return NextResponse.json({ error: "Watch item category is required." }, { status: 400 });
  if (!body.thresholdType) return NextResponse.json({ error: "Watch item threshold type is required." }, { status: 400 });
  if (typeof body.thresholdAmount !== "number") return NextResponse.json({ error: "Watch item threshold amount is required." }, { status: 400 });

  const scope = tenantScopeFromUser(session.user, session.accessToken);
  const input: CreateFinancialWatchItemInput = {
    title: body.title.trim(),
    category: body.category,
    thresholdType: body.thresholdType,
    thresholdAmount: body.thresholdAmount,
    currentAmount: body.currentAmount,
    currency: body.currency,
    dueAt: body.dueAt,
    notes: body.notes,
  };

  const item = await createFinancialWatchItem(scope, input);
  await auditLogsRepository.record(scope, {
    action: "financial_watch_item.created",
    resourceType: "financial_watch_item",
    resourceId: item.id,
    category: "finance",
    metadata: { category: item.category, thresholdType: item.thresholdType },
  }).catch(() => undefined);

  return NextResponse.json({ item }, { status: 201 });
}
