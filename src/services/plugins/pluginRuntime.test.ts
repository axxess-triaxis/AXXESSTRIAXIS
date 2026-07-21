import { describe, expect, it } from "vitest";
import { buildPluginRuntimeSnapshot, evaluatePluginAction } from "./pluginRuntime";

describe("plugin runtime", () => {
  it("builds tenant-owned contracts for every productivity plugin", () => {
    const snapshot = buildPluginRuntimeSnapshot({
      organizationId: "org-north-east-health-mission",
      env: { GOOGLE_CLIENT_ID: "configured" } as unknown as NodeJS.ProcessEnv,
    });

    expect(snapshot.totals.total).toBeGreaterThanOrEqual(20);
    expect(snapshot.contracts.every((contract) => contract.policy.tenantOwned)).toBe(true);
    expect(snapshot.contracts.find((contract) => contract.plugin.id === "gmail")?.providerConfigured).toBe(true);
  });

  it("blocks non-admin connection attempts", () => {
    const snapshot = buildPluginRuntimeSnapshot({ organizationId: "org-1" });
    const decision = evaluatePluginAction(snapshot, {
      organizationId: "org-1",
      userId: "user-employee",
      userRole: "Employee",
      pluginId: "gmail",
      action: "connect",
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("Employee cannot perform");
  });

  it("requires approval for outward-facing write actions", () => {
    const snapshot = buildPluginRuntimeSnapshot({
      organizationId: "org-1",
      env: { GOOGLE_CLIENT_ID: "configured" } as unknown as NodeJS.ProcessEnv,
      installations: [{
        id: "plugin-installation-1",
        organizationId: "org-1",
        pluginId: "gmail",
        status: "connected",
        grantedScopes: ["gmail.send", "gmail.readonly"],
      }],
    });
    const decision = evaluatePluginAction(snapshot, {
      organizationId: "org-1",
      userId: "user-admin",
      userRole: "Organization Admin",
      pluginId: "gmail",
      action: "send_message",
    });

    expect(decision.allowed).toBe(true);
    expect("approvalRequired" in decision && decision.approvalRequired).toBe(true);
  });

  it("only marks pilot-enabled connectors as available before real credentials exist; the rest are honestly provider-gated", () => {
    // Regression test: defaultStatus() used to check plugin.demoConnector, which was true for
    // every one of the ~20 catalogued plugins, so every unconfigured connector reported as
    // "available" -- implying a customer could use it -- rather than "provider_gated". See
    // PRE_DEMO_ACTIONABLES.md A15.
    const snapshot = buildPluginRuntimeSnapshot({ organizationId: "org-1" });
    const gmail = snapshot.contracts.find((contract) => contract.plugin.id === "gmail");
    const jira = snapshot.contracts.find((contract) => contract.plugin.id === "jira");

    expect(gmail?.installation.status).toBe("available");
    expect(jira?.installation.status).toBe("provider_gated");
  });
});
