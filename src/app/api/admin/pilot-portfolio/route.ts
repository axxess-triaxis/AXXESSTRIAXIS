import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "../../../../repositories/supabaseAdmin";
import { auditLogsRepository, tenantScopeFromUser } from "../../../../repositories/supabaseEnterpriseRepositories";
import { canViewCrossTenantPilotPortfolio } from "../../../../security/rbac";
import { fetchAsanaPortfolioHealth } from "../../../../services/integrations/asanaPortfolioHealth";
import { fetchMixpanelQueryHealth } from "../../../../services/integrations/mixpanelQueryHealth";
import { fetchPostHogQueryHealth } from "../../../../services/integrations/postHogQueryHealth";
import { fetchSentryProjectHealth } from "../../../../services/integrations/sentryProjectHealth";
import { buildPilotPortfolioSnapshot, type PilotPortfolioReadinessEvent, type PilotPortfolioWorkflowProgressRow } from "../../../../services/pilot/pilotPortfolio";

// Sprint 1 pilot portfolio (2026-08-15): the sole cross-tenant read in this codebase. Every other
// query in this app is RLS-scoped to the caller's own organization by design; this route is a
// deliberate, narrow exception, gated by canViewCrossTenantPilotPortfolio (Super Admin of
// AXXESS_PLATFORM_OPERATOR_ORGANIZATION_ID only) and reading only structural/aggregate columns
// (never metadata, never tenant-authored content) via the Supabase service-role key -- never a
// client-side RLS-scoped query.

type OrganizationRow = { id: string; name: string };
type PilotReadinessEventRow = { id: string; organization_id: string; step_id: string; event_type: string; source: string; created_at: string };
type WorkflowProgressRow = { organization_id: string; step_id: string; status: string };
type OrganizationMemberRow = { organization_id: string };

export async function GET() {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!canViewCrossTenantPilotPortfolio(session.user)) {
    return NextResponse.json({ error: "Cross-tenant pilot portfolio access is restricted." }, { status: 403 });
  }

  const [sentry, postHogQuery, mixpanelQuery, asana] = await Promise.all([
    fetchSentryProjectHealth(),
    fetchPostHogQueryHealth(),
    fetchMixpanelQueryHealth(),
    fetchAsanaPortfolioHealth(),
  ]);
  const integrations = { sentry, postHogQuery, mixpanelQuery, asana };

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({
      snapshot: { generatedAt: new Date().toISOString(), tenants: [], dataState: "not-configured" },
      integrations,
    });
  }

  const operatorOrganizationId = session.user.organizationId;
  const [organizationRows, memberRows, pilotEventRows, workflowRows] = await Promise.all([
    supabaseAdminRest<OrganizationRow[]>("organizations", { query: new URLSearchParams({ select: "id,name", id: `neq.${operatorOrganizationId}` }) }),
    supabaseAdminRest<OrganizationMemberRow[]>("organization_members", { query: new URLSearchParams({ select: "organization_id", status: "eq.active" }) }),
    supabaseAdminRest<PilotReadinessEventRow[]>("pilot_readiness_events", { query: new URLSearchParams({ select: "id,organization_id,step_id,event_type,source,created_at" }) }),
    supabaseAdminRest<WorkflowProgressRow[]>("enterprise_workflow_progress", { query: new URLSearchParams({ select: "organization_id,step_id,status" }) }),
  ]);

  const userCountsByOrganizationId: Record<string, number> = {};
  memberRows.forEach((row) => {
    userCountsByOrganizationId[row.organization_id] = (userCountsByOrganizationId[row.organization_id] ?? 0) + 1;
  });

  const pilotEvents: PilotPortfolioReadinessEvent[] = pilotEventRows.map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    stepId: row.step_id as PilotPortfolioReadinessEvent["stepId"],
    eventType: row.event_type as PilotPortfolioReadinessEvent["eventType"],
    source: row.source,
    createdAt: row.created_at,
  }));
  const workflowProgress: PilotPortfolioWorkflowProgressRow[] = workflowRows.map((row) => ({
    organizationId: row.organization_id,
    stepId: row.step_id,
    status: row.status as PilotPortfolioWorkflowProgressRow["status"],
  }));

  const snapshot = buildPilotPortfolioSnapshot({
    organizations: organizationRows.map((row) => ({ id: row.id, name: row.name })),
    pilotEvents,
    workflowProgress,
    userCountsByOrganizationId,
  });

  const scope = tenantScopeFromUser(session.user, session.accessToken);
  await auditLogsRepository.record(scope, {
    action: "platform.pilot_portfolio.viewed",
    resourceType: "pilot_portfolio_snapshot",
    resourceId: "pilot-portfolio",
    category: "platform",
    metadata: { tenantsViewed: snapshot.tenants.length },
  }).catch(() => undefined);

  return NextResponse.json({ snapshot, integrations });
}
