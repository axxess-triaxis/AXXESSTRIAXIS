import { NextResponse } from "next/server";
import { signInServerSide } from "../../../../auth/serverSession";
import { auditLogsRepository } from "../../../../repositories/supabaseEnterpriseRepositories";
import { getPostHogClient } from "../../../../lib/posthog-server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: string; password?: string } | null;
  const email = body?.email?.trim();
  const password = body?.password;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  try {
    const session = await signInServerSide(email, password);
    await auditLogsRepository.record({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      role: session.user.role,
      accessToken: session.accessToken,
    }, {
      action: "auth.login",
      resourceType: "user",
      resourceId: session.user.id,
      category: "authentication",
      metadata: { email },
    }).catch(() => undefined);

    const posthog = getPostHogClient();
    if (posthog) {
      posthog.identify({
        distinctId: session.user.id,
        properties: {
          email: session.user.email ?? email,
          user_role: session.user.role,
          organization_id: session.user.organizationId,
        },
      });
      posthog.capture({
        distinctId: session.user.id,
        event: "user_login",
        properties: {
          auth_method: "password",
          user_role: session.user.role,
          organization_id: session.user.organizationId,
        },
      });
      await posthog.flush();
    }

    return NextResponse.json({ user: session.user });
  } catch {
    return NextResponse.json({ error: "Unable to sign in with the supplied email and password." }, { status: 401 });
  }
}
