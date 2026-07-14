import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { auditLogsRepository, tenantScopeFromUser } from "../../../../repositories/supabaseEnterpriseRepositories";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "../../../../repositories/supabaseAdmin";
import {
  buildDefaultExecutionPolicy,
  createExecutionJob,
  runExecutionJobDryRun,
  summarizeExecutionRuntime,
  type ExecutionJobKind,
  type ExecutionSecurityTier,
} from "../../../../services/execution/sandboxRuntime";

const jobKinds: ExecutionJobKind[] = ["plugin_sync", "ai_tool", "document_extraction", "integration_webhook", "report_export"];
const securityTiers: ExecutionSecurityTier[] = ["standard", "restricted", "regulated"];

function executionKind(value: unknown): ExecutionJobKind {
  return typeof value === "string" && jobKinds.includes(value as ExecutionJobKind) ? value as ExecutionJobKind : "ai_tool";
}

function securityTier(value: unknown): ExecutionSecurityTier {
  return typeof value === "string" && securityTiers.includes(value as ExecutionSecurityTier) ? value as ExecutionSecurityTier : "restricted";
}

export async function GET() {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const sampleJob = createExecutionJob({
    organizationId: session.user.organizationId,
    createdByUserId: session.user.id,
    kind: "ai_tool",
    title: "AI tool execution preview",
    requestedAction: "dry-run",
  });
  const sampleRun = runExecutionJobDryRun(sampleJob);

  return NextResponse.json({
    policies: {
      standard: buildDefaultExecutionPolicy("standard"),
      restricted: buildDefaultExecutionPolicy("restricted"),
      regulated: buildDefaultExecutionPolicy("regulated"),
    },
    sampleRun,
    summary: summarizeExecutionRuntime([sampleRun]),
  });
}

export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await request.json().catch(() => ({})) as {
    kind?: ExecutionJobKind;
    title?: string;
    requestedAction?: string;
    securityTier?: ExecutionSecurityTier;
    pluginId?: string;
    aiAuditId?: string;
    payload?: Record<string, unknown>;
  };

  const policy = buildDefaultExecutionPolicy(securityTier(body.securityTier));
  const job = createExecutionJob({
    organizationId: session.user.organizationId,
    createdByUserId: session.user.id,
    kind: executionKind(body.kind),
    title: body.title?.trim() || "AXXESS controlled execution job",
    requestedAction: body.requestedAction?.trim() || "dry-run",
    pluginId: body.pluginId,
    aiAuditId: body.aiAuditId,
    payload: body.payload,
    policy,
  });
  const run = runExecutionJobDryRun(job);
  const scope = tenantScopeFromUser(session.user, session.accessToken);

  await auditLogsRepository.record(scope, {
    action: "execution.job.prepared",
    resourceType: "execution_job",
    resourceId: job.id,
    category: "operations",
    metadata: {
      kind: job.kind,
      status: run.status,
      environmentType: job.policy.environmentType,
      networkPolicy: job.policy.networkPolicy.mode,
      approvalRequired: job.policy.approvalRequired,
    },
  }).catch(() => undefined);

  if (isSupabaseAdminConfigured()) {
    await supabaseAdminRest("execution_jobs", {
      method: "POST",
      body: {
        id: job.id,
        organization_id: job.organizationId,
        created_by_user_id: job.createdByUserId,
        kind: job.kind,
        title: job.title,
        requested_action: job.requestedAction,
        status: job.status,
        plugin_id: job.pluginId ?? null,
        ai_audit_id: job.aiAuditId ?? null,
        policy: job.policy,
        payload: job.payload,
      },
    }).catch(() => undefined);
    await supabaseAdminRest("execution_runs", {
      method: "POST",
      body: {
        id: run.id,
        job_id: run.jobId,
        organization_id: run.organizationId,
        status: run.status,
        started_at: run.startedAt,
        completed_at: run.completedAt,
        exit_code: run.exitCode,
        logs: run.logs,
        artifacts: run.artifacts,
        sandbox_spec: run.sandboxSpec,
      },
    }).catch(() => undefined);
  }

  return NextResponse.json({ job, run });
}
