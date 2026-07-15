import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../../auth/serverSession";
import { auditLogsRepository, tenantScopeFromUser } from "../../../../../repositories/supabaseEnterpriseRepositories";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "../../../../../repositories/supabaseAdmin";
import { createSandboxPolicyAttestation, runApprovedSandboxJob, type ApprovedSandboxInvocation } from "../../../../../services/execution/approvedSandboxRunner";
import { buildDefaultExecutionPolicy, createExecutionJob, type ExecutionJobKind, type ExecutionSecurityTier } from "../../../../../services/execution/sandboxRuntime";

const jobKinds: ExecutionJobKind[] = ["plugin_sync", "ai_tool", "document_extraction", "integration_webhook", "report_export"];
const securityTiers: ExecutionSecurityTier[] = ["standard", "restricted", "regulated"];

function executionKind(value: unknown): ExecutionJobKind {
  return typeof value === "string" && jobKinds.includes(value as ExecutionJobKind) ? value as ExecutionJobKind : "ai_tool";
}

function securityTier(value: unknown): ExecutionSecurityTier {
  return typeof value === "string" && securityTiers.includes(value as ExecutionSecurityTier) ? value as ExecutionSecurityTier : "regulated";
}

export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as {
    kind?: ExecutionJobKind;
    title?: string;
    requestedAction?: string;
    securityTier?: ExecutionSecurityTier;
    approved?: boolean;
    payload?: Record<string, unknown>;
  };

  const job = createExecutionJob({
    organizationId: session.user.organizationId,
    createdByUserId: session.user.id,
    kind: executionKind(body.kind),
    title: body.title?.trim() || "Approved AXXESS sandbox runner job",
    requestedAction: body.requestedAction?.trim() || "approved-runner-dry-run",
    payload: body.payload,
    policy: buildDefaultExecutionPolicy(securityTier(body.securityTier)),
  });
  const attestation = createSandboxPolicyAttestation(job, Boolean(body.approved));
  const invocation = runApprovedSandboxJob({
    job,
    attestation,
    runnerMode: (process.env.AXXESS_SANDBOX_RUNNER_MODE as ApprovedSandboxInvocation["runnerMode"]) || "dry_run",
  });

  if (isSupabaseAdminConfigured()) {
    await supabaseAdminRest("sandbox_policy_attestations", {
      method: "POST",
      body: {
        organization_id: attestation.organizationId,
        execution_job_id: job.id,
        environment_type: attestation.environmentType,
        security_tier: attestation.securityTier,
        status: attestation.status,
        policy_hash: attestation.policyHash,
        findings: attestation.findings,
        kubernetes_spec: invocation.run.sandboxSpec.kubernetes ?? {},
        network_policy: job.policy.networkPolicy,
        secret_policy: job.policy.secretPolicy,
        attested_at: attestation.status === "approved" ? new Date().toISOString() : null,
        expires_at: attestation.expiresAt ?? null,
      },
    }).catch(() => undefined);
    await supabaseAdminRest("sandbox_runner_invocations", {
      method: "POST",
      body: {
        organization_id: invocation.organizationId,
        execution_job_id: invocation.executionJobId,
        runner_mode: invocation.runnerMode,
        status: invocation.status,
        logs: invocation.run.logs,
        artifacts: invocation.run.artifacts,
        evidence: invocation.evidence,
      },
    }).catch(() => undefined);
  }

  const scope = tenantScopeFromUser(session.user, session.accessToken);
  await auditLogsRepository.record(scope, {
    action: `execution.runner.${invocation.status}`,
    resourceType: "sandbox_runner_invocation",
    resourceId: invocation.id,
    category: "operations",
    metadata: {
      jobId: job.id,
      runnerMode: invocation.runnerMode,
      attestationStatus: attestation.status,
      evidence: invocation.evidence,
    },
  }).catch(() => undefined);

  return NextResponse.json({ job, attestation, invocation });
}
