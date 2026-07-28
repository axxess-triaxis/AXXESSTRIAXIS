import { NextResponse } from "next/server";
import { getServerAuthSession, signOutServerSide } from "../../../../auth/serverSession";
import { auditLogsRepository } from "../../../../repositories/supabaseEnterpriseRepositories";
import { getPostHogClient } from "../../../../lib/posthog-server";

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

  if (session) {
    const posthog = getPostHogClient();
    if (posthog) {
      posthog.capture({
        distinctId: session.user.id,
        event: "user_logout",
        properties: {
          user_role: session.user.role,
          organization_id: session.user.organizationId,
        },
      });
      await posthog.flush();
    }
  }

  await signOutServerSide(session?.accessToken);
  return NextResponse.json({ ok: true });
}
