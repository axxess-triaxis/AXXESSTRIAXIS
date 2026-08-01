import { NextResponse } from "next/server";
import { establishServerSessionFromOAuthTokens } from "../../../../../auth/serverSession";
import { auditLogsRepository } from "../../../../../repositories/supabaseEnterpriseRepositories";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { accessToken?: string; refreshToken?: string } | null;
  const accessToken = body?.accessToken;

  if (!accessToken) {
    return NextResponse.json({ error: "Missing OAuth access token." }, { status: 400 });
  }

  try {
    const session = await establishServerSessionFromOAuthTokens(accessToken, body?.refreshToken);
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
      metadata: { method: "oauth" },
    }).catch(() => undefined);

    return NextResponse.json({ user: session.user });
  } catch {
    return NextResponse.json({ error: "Unable to complete sign-in with the selected provider." }, { status: 401 });
  }
}
