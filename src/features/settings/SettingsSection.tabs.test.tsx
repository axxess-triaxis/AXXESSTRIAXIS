import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// SA-3 (2026-07-29): "AI Configuration" removed entirely -- founder's own words, "I don't think
// this tab is user relevant anymore with OpenRouter coming in." "Demo" is gated out of the live
// beta's own tab list (A-32) but kept reachable on deployments where demo mode is the deployment's
// own forced configuration (investor.triaxisventures.com), where "Reset Preview Data" is still
// operationally needed.
vi.mock("../../auth/AuthProvider", () => ({
  useAuth: () => ({ session: { user: { id: "user-1", organizationId: "org-1", role: "Organization Admin" }, status: "authenticated" } }),
}));

vi.mock("../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
}));

vi.mock("../../providers/serviceProvider", () => ({
  applicationServices: {
    organizationsRepository: { getById: async () => undefined },
    projectsRepository: { list: async () => [] },
    documentsRepository: { list: async () => [] },
  },
}));

describe("Settings tab list (SA-3 -- AI Configuration removed, Demo gated)", () => {
  beforeEach(() => {
    vi.resetModules();
    window.history.pushState({}, "", "/settings");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    window.history.pushState({}, "", "/settings");
  });

  it("never shows AI Configuration, on a live beta deployment or a forced-demo one", async () => {
    vi.stubEnv("NEXT_PUBLIC_AXXESS_DEMO_MODE", "false");
    const { SettingsSection, validTabs } = await import("./SettingsSection");
    expect(validTabs).not.toContain("ai configuration");
    render(<SettingsSection />);
    expect(screen.queryByText("AI Configuration")).not.toBeInTheDocument();
  });

  it("hides the Demo tab on a live beta deployment (not forced demo mode)", async () => {
    vi.stubEnv("NEXT_PUBLIC_AXXESS_DEMO_MODE", "false");
    const { SettingsSection, validTabs } = await import("./SettingsSection");
    expect(validTabs).not.toContain("demo");
    render(<SettingsSection />);
    expect(screen.queryByText("Demo")).not.toBeInTheDocument();
  });

  it("keeps the Demo tab reachable on a deployment where demo mode is the forced configuration", async () => {
    vi.stubEnv("NEXT_PUBLIC_AXXESS_DEMO_MODE", "true");
    const { SettingsSection, validTabs } = await import("./SettingsSection");
    expect(validTabs).toContain("demo");
    render(<SettingsSection />);
    expect(screen.getByText("Demo")).toBeInTheDocument();
  });

  it("still shows the rest of the real tabs unaffected", async () => {
    vi.stubEnv("NEXT_PUBLIC_AXXESS_DEMO_MODE", "false");
    const { SettingsSection } = await import("./SettingsSection");
    render(<SettingsSection />);
    for (const label of ["Profile", "Organization", "Security", "Integrations", "Users", "Permissions"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });
});
