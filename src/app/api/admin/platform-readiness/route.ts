import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { canManageOrganization } from "../../../../security/rbac";
import { buildDefaultExecutionPolicy, createExecutionJob, runExecutionJobDryRun } from "../../../../services/execution/sandboxRuntime";
import { buildEnterpriseReadinessSnapshot, buildDefaultUsageLimits } from "../../../../services/platform/platformReadiness";
import { buildPluginRuntimeSnapshot } from "../../../../services/plugins/pluginRuntime";

export async function GET() {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!canManageOrganization(session.user, session.user.organizationId)) {
    return NextResponse.json({ error: "Organization admin access is required." }, { status: 403 });
  }

  const plugins = buildPluginRuntimeSnapshot({ organizationId: session.user.organizationId });
  const executionJob = createExecutionJob({
    organizationId: session.user.organizationId,
    createdByUserId: session.user.id,
    kind: "plugin_sync",
    title: "Plugin sync readiness dry run",
    requestedAction: "platform-readiness",
    policy: buildDefaultExecutionPolicy("restricted"),
  });
  const executionRun = runExecutionJobDryRun(executionJob);
  const snapshot = buildEnterpriseReadinessSnapshot({
    plugins,
    executionRuns: [executionRun],
    usage: buildDefaultUsageLimits("pilot", {
      ai_requests: 84,
      rag_queries: 62,
      plugin_actions: 18,
      sandbox_runs: 3,
      audit_exports: 2,
    }),
  });

  return NextResponse.json(snapshot);
}
