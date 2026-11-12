import { NextResponse } from "next/server";
import { listActiveStaff } from "../../../../repositories/leadWorkRepository";
import { recordDeniedAttempt } from "../../../../services/audit/auditEvents";
import { requireCrmAccess } from "../leadAccess";

// Active staff members a lead can be assigned to (GTM plan 2026-11-11, Day 3). Senior roles only,
// since only they may reassign leads. Returns ids and display names, no contact details.
export async function GET() {
  const access = await requireCrmAccess("/api/crm/staff", "GET");
  if (access instanceof NextResponse) return access;
  if (!access.senior) {
    await recordDeniedAttempt(access.session, { route: "/api/crm/staff", method: "GET" });
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  return NextResponse.json({ staff: await listActiveStaff(access.scope) });
}
