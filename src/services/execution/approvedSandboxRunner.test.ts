import { describe, expect, it } from "vitest";
import { createSandboxPolicyAttestation, hashExecutionPolicy, runApprovedSandboxJob } from "./approvedSandboxRunner";
import { buildDefaultExecutionPolicy, createExecutionJob } from "./sandboxRuntime";

describe("approved sandbox runner", () => {
  function job() {
    return createExecutionJob({
      organizationId: "org-1",
      createdByUserId: "user-1",
      kind: "ai_tool",
      title: "Approved test run",
      requestedAction: "rag-answer-to-workflow-action",
      policy: buildDefaultExecutionPolicy("regulated"),
    });
  }

  it("runs only after policy attestation is approved", () => {
    const executionJob = job();
    const pending = createSandboxPolicyAttestation(executionJob, false);
    const blocked = runApprovedSandboxJob({ job: executionJob, attestation: pending });
    expect(blocked.status).toBe("blocked");

    const approved = createSandboxPolicyAttestation(executionJob, true);
    const invocation = runApprovedSandboxJob({ job: executionJob, attestation: approved });
    expect(invocation.status).toBe("succeeded");
    expect(invocation.evidence).toContain("sandbox_policy_attestations");
  });

  it("blocks execution if the policy changed after attestation", () => {
    const executionJob = job();
    const approved = createSandboxPolicyAttestation(executionJob, true);
    const changedJob = { ...executionJob, requestedAction: "different-action" };
    expect(hashExecutionPolicy(changedJob)).not.toBe(approved.policyHash);
    expect(runApprovedSandboxJob({ job: changedJob, attestation: approved }).status).toBe("blocked");
  });
});
