import { NextResponse } from "next/server";
import { loadLeadHistory } from "../../../../../../repositories/leadWorkRepository";
import { loadVisibleLead, requireCrmAccess } from "../../../leadAccess";

// A lead's history for the leads page (GTM plan 2026-11-11, Day 3): every contact attempt (emails
// and calls, allowed or refused, with call outcomes) and every audited change, newest first.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireCrmAccess("/api/crm/leads/[id]/history", "GET");
  if (access instanceof NextResponse) return access;
  const lead = await loadVisibleLead(access, id);
  if (lead instanceof NextResponse) return lead;
  return NextResponse.json({ history: await loadLeadHistory(access.scope, id) });
}
