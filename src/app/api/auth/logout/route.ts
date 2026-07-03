import { NextResponse } from "next/server";
import { getServerAuthSession, signOutServerSide } from "../../../../auth/serverSession";
import { auditLogsRepository } from "../../../../repositories/supabaseEnterpriseRepositories";

export async function POST() {
  const session = await getServerAuthSession(false);

  if (session) {
    await auditLogsRepository.record({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      role: session.user.role,
      accessToken: session.accessToken,
    }, {
      action: "auth.logout",
      resourceType: "user",
      resourceId: session.user.id,
      category: "authentication",
    }).catch(() => undefined);
  }

  await signOutServerSide(session?.accessToken);
  return NextResponse.json({ ok: true });
}
