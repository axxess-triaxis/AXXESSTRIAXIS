export type ExecutionEnvironmentType = "local" | "github_actions" | "kubernetes" | "docker" | "vercel_sandbox";
export type ExecutionSecurityTier = "standard" | "restricted" | "regulated";
export type ExecutionJobKind = "plugin_sync" | "ai_tool" | "document_extraction" | "integration_webhook" | "report_export";
export type ExecutionRunStatus = "queued" | "policy_blocked" | "ready" | "running" | "succeeded" | "failed" | "requires_approval";

export type ExecutionPolicy = {
  securityTier: ExecutionSecurityTier;
  environmentType: ExecutionEnvironmentType;
  cpuMillicores: number;
  memoryMb: number;
  timeoutSeconds: number;
  networkPolicy: {
    mode: "deny-all" | "allow-provider-apis" | "allowlisted-domains";
    allowedDomains: string[];
    denyPrivateNetwork: boolean;
  };
  secretPolicy: {
    scope: "none" | "tenant" | "job";
    exposeToRuntime: boolean;
    brokeredOnly: boolean;
  };
  artifactRetentionDays: number;
  approvalRequired: boolean;
};

export type ExecutionJob = {
  id: string;
  organizationId: string;
  createdByUserId: string;
  kind: ExecutionJobKind;
  title: string;
  requestedAction: string;
  status: ExecutionRunStatus;
  pluginId?: string;
  aiAuditId?: string;
  policy: ExecutionPolicy;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type ExecutionArtifact = {
  name: string;
  contentType: string;
  sizeBytes: number;
  retentionDays: number;
};

export type ExecutionRun = {
  id: string;
  jobId: string;
  organizationId: string;
  status: ExecutionRunStatus;
  startedAt?: string;
  completedAt?: string;
  exitCode?: number;
  logs: string[];
  artifacts: ExecutionArtifact[];
  sandboxSpec: SandboxExecutionSpec;
};

export type SandboxExecutionSpec = {
  runtime: ExecutionEnvironmentType;
  command: string;
  args: string[];
  workingDirectory: string;
  env: Record<string, string>;
  networkPolicy: ExecutionPolicy["networkPolicy"];
  resources: {
    cpuMillicores: number;
    memoryMb: number;
    timeoutSeconds: number;
  };
  kubernetes?: {
    apiVersion: "batch/v1";
    kind: "Job";
    metadata: {
      name: string;
      labels: Record<string, string>;
    };
    spec: Record<string, unknown>;
  };
};

function makeId(prefix: string) {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function basePolicyForTier(securityTier: ExecutionSecurityTier): ExecutionPolicy {
  if (securityTier === "regulated") {
    return {
      securityTier,
      environmentType: "kubernetes",
      cpuMillicores: 750,
      memoryMb: 1024,
      timeoutSeconds: 300,
      networkPolicy: {
        mode: "allowlisted-domains",
        allowedDomains: ["ai-gateway.vercel.sh", "api.openai.com", "api.anthropic.com", "generativelanguage.googleapis.com"],
        denyPrivateNetwork: true,
      },
      secretPolicy: {
        scope: "job",
        exposeToRuntime: false,
        brokeredOnly: true,
      },
      artifactRetentionDays: 14,
      approvalRequired: true,
    };
  }

  if (securityTier === "restricted") {
    return {
      securityTier,
      environmentType: "vercel_sandbox",
      cpuMillicores: 500,
      memoryMb: 768,
      timeoutSeconds: 180,
      networkPolicy: {
        mode: "allow-provider-apis",
        allowedDomains: ["ai-gateway.vercel.sh"],
        denyPrivateNetwork: true,
      },
      secretPolicy: {
        scope: "tenant",
        exposeToRuntime: false,
        brokeredOnly: true,
      },
      artifactRetentionDays: 7,
      approvalRequired: true,
    };
  }

  return {
    securityTier,
    environmentType: "github_actions",
    cpuMillicores: 250,
    memoryMb: 512,
    timeoutSeconds: 120,
    networkPolicy: {
      mode: "allow-provider-apis",
      allowedDomains: ["api.github.com"],
      denyPrivateNetwork: true,
    },
    secretPolicy: {
      scope: "tenant",
      exposeToRuntime: false,
      brokeredOnly: true,
    },
    artifactRetentionDays: 3,
    approvalRequired: false,
  };
}

export function buildDefaultExecutionPolicy(
  securityTier: ExecutionSecurityTier = "restricted",
  overrides: Partial<ExecutionPolicy> = {},
): ExecutionPolicy {
  const base = basePolicyForTier(securityTier);
  return {
    ...base,
    ...overrides,
    networkPolicy: {
      ...base.networkPolicy,
      ...overrides.networkPolicy,
      allowedDomains: overrides.networkPolicy?.allowedDomains ?? base.networkPolicy.allowedDomains,
    },
    secretPolicy: {
      ...base.secretPolicy,
      ...overrides.secretPolicy,
    },
  };
}

function commandForKind(kind: ExecutionJobKind) {
  if (kind === "document_extraction") return { command: "node", args: ["scripts/extract-document.mjs"] };
  if (kind === "plugin_sync") return { command: "node", args: ["scripts/run-plugin-sync.mjs"] };
  if (kind === "integration_webhook") return { command: "node", args: ["scripts/process-webhook.mjs"] };
  if (kind === "report_export") return { command: "node", args: ["scripts/export-report.mjs"] };
  return { command: "node", args: ["scripts/run-ai-tool.mjs"] };
}

function jobName(job: Pick<ExecutionJob, "id" | "kind">) {
  return `axxess-${job.kind.replace(/_/g, "-")}-${job.id.slice(0, 8).toLowerCase()}`;
}

export function buildSandboxExecutionSpec(job: ExecutionJob): SandboxExecutionSpec {
  const command = commandForKind(job.kind);
  const spec: SandboxExecutionSpec = {
    runtime: job.policy.environmentType,
    command: command.command,
    args: command.args,
    workingDirectory: "/workspace",
    env: {
      AXXESS_ORGANIZATION_ID: job.organizationId,
      AXXESS_EXECUTION_JOB_ID: job.id,
      AXXESS_EXECUTION_KIND: job.kind,
    },
    networkPolicy: job.policy.networkPolicy,
    resources: {
      cpuMillicores: job.policy.cpuMillicores,
      memoryMb: job.policy.memoryMb,
      timeoutSeconds: job.policy.timeoutSeconds,
    },
  };

  if (job.policy.environmentType === "kubernetes") {
    spec.kubernetes = {
      apiVersion: "batch/v1",
      kind: "Job",
      metadata: {
        name: jobName(job),
        labels: {
          "app.kubernetes.io/name": "axxess-execution",
          "axxess.triaxis/tenant": job.organizationId,
          "axxess.triaxis/kind": job.kind,
        },
      },
      spec: {
        backoffLimit: 0,
        ttlSecondsAfterFinished: job.policy.artifactRetentionDays * 24 * 60 * 60,
        template: {
          spec: {
            restartPolicy: "Never",
            containers: [{
              name: "runner",
              image: "ghcr.io/axxess-triaxis/axxess-runner:latest",
              command: [command.command],
              args: command.args,
              env: Object.entries(spec.env).map(([name, value]) => ({ name, value })),
              resources: {
                requests: {
                  cpu: `${job.policy.cpuMillicores}m`,
                  memory: `${job.policy.memoryMb}Mi`,
                },
                limits: {
                  cpu: `${Math.max(job.policy.cpuMillicores, 500)}m`,
                  memory: `${Math.max(job.policy.memoryMb, 512)}Mi`,
                },
              },
            }],
          },
        },
      },
    };
  }

  return spec;
}

export function createExecutionJob(input: {
  organizationId: string;
  createdByUserId: string;
  kind: ExecutionJobKind;
  title: string;
  requestedAction: string;
  pluginId?: string;
  aiAuditId?: string;
  payload?: Record<string, unknown>;
  policy?: ExecutionPolicy;
}): ExecutionJob {
  const policy = input.policy ?? buildDefaultExecutionPolicy();
  return {
    id: makeId("execution-job"),
    organizationId: input.organizationId,
    createdByUserId: input.createdByUserId,
    kind: input.kind,
    title: input.title,
    requestedAction: input.requestedAction,
    status: policy.approvalRequired ? "requires_approval" : "ready",
    pluginId: input.pluginId,
    aiAuditId: input.aiAuditId,
    policy,
    payload: input.payload ?? {},
    createdAt: new Date().toISOString(),
  };
}

export function evaluateExecutionReadiness(job: ExecutionJob) {
  const findings: string[] = [];
  if (job.policy.secretPolicy.exposeToRuntime) findings.push("Secrets must be brokered or scoped before runtime execution.");
  if (!job.policy.networkPolicy.denyPrivateNetwork) findings.push("Private network egress should remain denied for tenant jobs.");
  if (job.policy.timeoutSeconds > 900) findings.push("Timeout exceeds the recommended initial SaaS execution limit.");
  if (job.policy.networkPolicy.mode === "allowlisted-domains" && job.policy.networkPolicy.allowedDomains.length === 0) {
    findings.push("Allowlisted-domain mode requires at least one approved domain.");
  }
  return {
    ready: findings.length === 0,
    findings,
  };
}

export function runExecutionJobDryRun(job: ExecutionJob): ExecutionRun {
  const readiness = evaluateExecutionReadiness(job);
  const now = new Date().toISOString();
  return {
    id: makeId("execution-run"),
    jobId: job.id,
    organizationId: job.organizationId,
    status: readiness.ready ? job.status : "policy_blocked",
    startedAt: now,
    completedAt: now,
    exitCode: readiness.ready ? 0 : 1,
    logs: readiness.ready
      ? [
        `Prepared ${job.kind} execution spec for ${job.organizationId}.`,
        `Network mode: ${job.policy.networkPolicy.mode}.`,
        `Approval required: ${job.policy.approvalRequired ? "yes" : "no"}.`,
      ]
      : readiness.findings,
    artifacts: [{
      name: `${job.kind}-execution-spec.json`,
      contentType: "application/json",
      sizeBytes: JSON.stringify(buildSandboxExecutionSpec(job)).length,
      retentionDays: job.policy.artifactRetentionDays,
    }],
    sandboxSpec: buildSandboxExecutionSpec(job),
  };
}

export function summarizeExecutionRuntime(runs: ExecutionRun[]) {
  return {
    totalRuns: runs.length,
    readyOrSucceeded: runs.filter((run) => ["ready", "requires_approval", "succeeded"].includes(run.status)).length,
    blocked: runs.filter((run) => run.status === "policy_blocked").length,
    artifacts: runs.reduce((sum, run) => sum + run.artifacts.length, 0),
  };
}
