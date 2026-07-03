import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../auth/serverSession";
import { auditLogsRepository, tenantScopeFromUser } from "../../../repositories/supabaseEnterpriseRepositories";
import type { AuditLogInput } from "../../../repositories/interfaces";

export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const input = await request.json().catch(() => null) as AuditLogInput | null;
  if (!input?.action || !input.resourceType) {
    return NextResponse.json({ error: "Audit action and resource type are required." }, { status: 400 });
  }

  const auditLog = await auditLogsRepository.record(tenantScopeFromUser(session.user, session.accessToken), input);
  return NextResponse.json(auditLog);
}
