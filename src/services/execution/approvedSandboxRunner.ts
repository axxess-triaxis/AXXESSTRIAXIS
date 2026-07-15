import { createHash } from "node:crypto";
import { evaluateExecutionReadiness, runExecutionJobDryRun, type ExecutionJob, type ExecutionRun } from "./sandboxRuntime";

export type SandboxPolicyAttestation = {
  id: string;
  organizationId: string;
  executionJobId: string;
  status: "pending" | "approved" | "blocked" | "expired";
  policyHash: string;
  environmentType: ExecutionJob["policy"]["environmentType"];
  securityTier: ExecutionJob["policy"]["securityTier"];
  expiresAt?: string;
  findings: string[];
};

export type ApprovedSandboxInvocation = {
  id: string;
  organizationId: string;
  executionJobId: string;
  status: "queued" | "succeeded" | "blocked";
  runnerMode: "dry_run" | "github_actions" | "kubernetes" | "vercel_sandbox";
  run: ExecutionRun;
  evidence: string[];
};

function digest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function hashExecutionPolicy(job: ExecutionJob) {
  return digest({
    kind: job.kind,
    organizationId: job.organizationId,
    requestedAction: job.requestedAction,
    policy: job.policy,
  });
}

export function createSandboxPolicyAttestation(job: ExecutionJob, approved: boolean): SandboxPolicyAttestation {
  const readiness = evaluateExecutionReadiness(job);
  const status = !readiness.ready ? "blocked" : approved ? "approved" : "pending";
  return {
    id: `attestation-${hashExecutionPolicy(job).slice(0, 16)}`,
    organizationId: job.organizationId,
    executionJobId: job.id,
    status,
    policyHash: hashExecutionPolicy(job),
    environmentType: job.policy.environmentType,
    securityTier: job.policy.securityTier,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    findings: readiness.findings,
  };
}

export function runApprovedSandboxJob(input: {
  job: ExecutionJob;
  attestation: SandboxPolicyAttestation;
  runnerMode?: ApprovedSandboxInvocation["runnerMode"];
}): ApprovedSandboxInvocation {
  const expectedPolicyHash = hashExecutionPolicy(input.job);
  const run = runExecutionJobDryRun(input.job);
  const expired = input.attestation.expiresAt ? Date.parse(input.attestation.expiresAt) < Date.now() : false;
  const blockedReasons = [
    input.attestation.organizationId !== input.job.organizationId ? "Attestation belongs to another organization." : undefined,
    input.attestation.executionJobId !== input.job.id ? "Attestation does not match execution job." : undefined,
    input.attestation.policyHash !== expectedPolicyHash ? "Execution policy changed after attestation." : undefined,
    input.attestation.status !== "approved" ? "Execution requires approved sandbox policy attestation." : undefined,
    expired ? "Sandbox policy attestation has expired." : undefined,
  ].filter((item): item is string => Boolean(item));

  if (blockedReasons.length > 0) {
    return {
      id: `sandbox-invocation-${input.job.id}`,
      organizationId: input.job.organizationId,
      executionJobId: input.job.id,
      status: "blocked",
      runnerMode: input.runnerMode ?? "dry_run",
      run: { ...run, status: "policy_blocked", exitCode: 1, logs: blockedReasons },
      evidence: blockedReasons,
    };
  }

  return {
    id: `sandbox-invocation-${input.job.id}`,
    organizationId: input.job.organizationId,
    executionJobId: input.job.id,
    status: "succeeded",
    runnerMode: input.runnerMode ?? "dry_run",
    run: { ...run, status: "succeeded", exitCode: 0, logs: [...run.logs, "Approved sandbox runner completed in policy-gated dry-run mode."] },
    evidence: [
      "sandbox_policy_attestations",
      "execution_jobs",
      "execution_runs",
      `${input.attestation.environmentType}:${input.attestation.securityTier}`,
    ],
  };
}
