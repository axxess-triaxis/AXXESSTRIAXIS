import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../auth/serverSession";
import { updateTenantProfile, type ProfileInput } from "../../../auth/provisioning";
import { auditLogsRepository, tenantScopeFromUser } from "../../../repositories/supabaseEnterpriseRepositories";

async function profileInput(request: Request) {
  const body = await request.json().catch(() => ({})) as ProfileInput;
  return {
    displayName: body.displayName,
    email: body.email,
    avatarInitials: body.avatarInitials,
    department: body.department,
    title: body.title,
    timezone: body.timezone,
  } satisfies ProfileInput;
}

export async function GET() {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  return NextResponse.json({ user: session.user });
}

export async function POST(request: Request) {
  return PATCH(request);
}

export async function PATCH(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  try {
    const user = await updateTenantProfile(session.user, await profileInput(request));
    await auditLogsRepository.record(tenantScopeFromUser(user, session.accessToken), {
      action: "profile.updated",
      resourceType: "user",
      resourceId: user.id,
      category: "user-management",
      metadata: { fields: ["displayName", "email", "avatarInitials", "department", "title", "timezone"] },
    }).catch(() => undefined);
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Profile could not be updated.",
    }, { status: 400 });
  }
}
