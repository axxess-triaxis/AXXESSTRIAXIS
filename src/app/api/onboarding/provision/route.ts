import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { provisionTenantForUser, type TenantProvisioningInput } from "../../../../auth/provisioning";
import { auditLogsRepository, tenantScopeFromUser } from "../../../../repositories/supabaseEnterpriseRepositories";
import { getPostHogClient } from "../../../../lib/posthog-server";

export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await request.json().catch(() => ({})) as Partial<TenantProvisioningInput>;
  const organizationName = body.organizationName?.trim();
  if (!organizationName) {
    return NextResponse.json({ error: "Organization name is required." }, { status: 400 });
  }

  try {
    const result = await provisionTenantForUser(session.user, {
      organizationName,
      sector: body.sector,
      role: body.role,
      departmentName: body.departmentName,
      workspaceName: body.workspaceName,
      acceptedNotices: body.acceptedNotices,
    });
    await auditLogsRepository.record(tenantScopeFromUser(result.user, session.accessToken), {
      action: "organization.provisioned",
      resourceType: "organization",
      resourceId: result.organization.id,
      category: "onboarding",
      metadata: {
        departmentId: result.departmentId,
        workspaceId: result.workspaceId,
        acceptedNotices: body.acceptedNotices ?? [],
      },
    }).catch(() => undefined);

    const posthog = getPostHogClient();
    if (posthog) {
      posthog.identify({
        distinctId: result.user.id,
        properties: {
          user_role: result.user.role,
          organization_id: result.organization.id,
        },
      });
      posthog.capture({
        distinctId: result.user.id,
        event: "organization_created",
        properties: {
          organization_id: result.organization.id,
          sector: body.sector ?? null,
          user_role: result.user.role,
        },
      });
      await posthog.flush();
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Tenant provisioning failed.",
    }, { status: 400 });
  }
}
