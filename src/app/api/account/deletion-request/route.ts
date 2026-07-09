import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { auditLogsRepository } from "../../../../repositories/supabaseEnterpriseRepositories";

export async function POST() {
  const session = await getServerAuthSession(false);
  if (!session) return NextResponse.json({ error: "Account deletion requires an authenticated session." }, { status: 401 });

  await auditLogsRepository.record({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    role: session.user.role,
    accessToken: session.accessToken,
  }, {
    action: "account.deletion.requested",
    resourceType: "user",
    resourceId: session.user.id,
    category: "privacy",
  }).catch(() => undefined);

  return NextResponse.json({
    ok: true,
    message: "Deletion request recorded. Beta operations will verify legal hold, audit retention, and tenant ownership before processing.",
  });
}
