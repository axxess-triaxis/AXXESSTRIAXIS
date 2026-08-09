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

// 2026-08-08: default tab changed from "security" (removed) to "profile", so every render in this
// file now mounts ProfilePanel, which calls useAnalytics() -- mock it the same way
// SettingsSection.linkedPhone.test.tsx already does for its own Profile-tab renders.
vi.mock("../../services/analytics", () => ({
  useAnalytics: () => ({ trackEvent: vi.fn() }),
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
    for (const label of ["Profile", "Organization", "Integrations", "Users", "Permissions"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("never shows Security -- removed 2026-08-08, founder: 'is an eyesore and getting it live will be very high effort low reward'", async () => {
    vi.stubEnv("NEXT_PUBLIC_AXXESS_DEMO_MODE", "false");
    const { SettingsSection, validTabs } = await import("./SettingsSection");
    expect(validTabs).not.toContain("security");
    render(<SettingsSection />);
    expect(screen.queryByText("Security")).not.toBeInTheDocument();
  });

  it("falls back to Profile, not the removed Security tab, when no ?tab= is given or an invalid one is requested", async () => {
    vi.stubEnv("NEXT_PUBLIC_AXXESS_DEMO_MODE", "false");
    window.history.pushState({}, "", "/settings?tab=security");
    const { initialTabFromLocation } = await import("./SettingsSection");
    expect(initialTabFromLocation()).toBe("profile");
  });
});
