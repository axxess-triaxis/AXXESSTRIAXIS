import { describe, expect, it } from "vitest";
import {
  buildDefaultExecutionPolicy,
  buildSandboxExecutionSpec,
  createExecutionJob,
  evaluateExecutionReadiness,
  runExecutionJobDryRun,
} from "./sandboxRuntime";

describe("sandbox runtime", () => {
  it("creates approval-gated regulated Kubernetes job specs", () => {
    const job = createExecutionJob({
      organizationId: "org-north-east-health-mission",
      createdByUserId: "user-admin",
      kind: "document_extraction",
      title: "Extract district review note",
      requestedAction: "extract-document",
      policy: buildDefaultExecutionPolicy("regulated"),
    });
    const spec = buildSandboxExecutionSpec(job);

    expect(job.status).toBe("requires_approval");
    expect(spec.runtime).toBe("kubernetes");
    expect(spec.kubernetes?.metadata.labels["axxess.triaxis/tenant"]).toBe("org-north-east-health-mission");
  });

  it("blocks unsafe secret exposure", () => {
    const job = createExecutionJob({
      organizationId: "org-1",
      createdByUserId: "user-1",
      kind: "ai_tool",
      title: "Run AI tool",
      requestedAction: "run-tool",
      policy: buildDefaultExecutionPolicy("restricted", {
        secretPolicy: {
          scope: "tenant",
          exposeToRuntime: true,
          brokeredOnly: false,
        },
      }),
    });

    expect(evaluateExecutionReadiness(job).ready).toBe(false);
    expect(runExecutionJobDryRun(job).status).toBe("policy_blocked");
  });

  it("keeps dry-run artifacts for validation without executing untrusted work", () => {
    const job = createExecutionJob({
      organizationId: "org-1",
      createdByUserId: "user-1",
      kind: "plugin_sync",
      title: "Sync Gmail selected mailbox",
      requestedAction: "plugin-sync",
    });
    const run = runExecutionJobDryRun(job);

    expect(run.artifacts[0].name).toContain("plugin_sync");
    expect(run.logs.some((line) => line.includes("Network mode"))).toBe(true);
  });
});
