import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetDemoEnvironment, setDemoModeEnabled } from "../../demo/demoMode";
import { SettingsSection } from "./SettingsSection";

// TP-01 (2026-07-28): OrganizationPanel used to render demoDatasetSummary unconditionally, so a
// real, live tenant's own Settings > Organization tab showed the seeded investor-demo institution
// ("North East Health Mission") instead of its own organization -- a real, founder-reported,
// cross-tenant-looking data leak. These tests lock in the fix: live tenants see their own real
// organization, demo/investor mode still sees the seeded institution, and a missing organization
// record shows an honest setup state instead of silently falling back to demo data.
const state = {
  organization: undefined as { id: string; name: string; slug: string; sector: string; createdAt: string; updatedAt: string } | undefined,
  projects: [] as Array<{ id: string }>,
  documents: [] as Array<{ id: string }>,
};

const getByIdMock = vi.fn(async () => state.organization);

vi.mock("../../auth/AuthProvider", () => ({
  useAuth: () => ({ session: { user: { id: "user-1", organizationId: "org-1", role: "Organization Admin" }, status: "authenticated" } }),
}));

vi.mock("../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
}));

vi.mock("../../providers/serviceProvider", () => ({
  applicationServices: {
    organizationsRepository: { getById: (scope: unknown, id: string) => getByIdMock(scope, id) },
    projectsRepository: { list: async () => state.projects },
    documentsRepository: { list: async () => state.documents },
  },
}));

function setOrganizationTab() {
  window.history.pushState({}, "", "/settings?tab=organization");
}

describe("Settings Organization panel (TP-01 tenant/demo leakage fix)", () => {
  afterEach(() => {
    resetDemoEnvironment();
    setDemoModeEnabled(false);
    window.history.pushState({}, "", "/settings");
    state.organization = undefined;
    state.projects = [];
    state.documents = [];
    getByIdMock.mockClear();
  });

  it("live tenant mode: shows the real organization's own name, not the seeded demo institution", async () => {
    setDemoModeEnabled(false);
    state.organization = { id: "org-1", name: "Triaxis Ventures Private Limited", slug: "triaxis-ventures", sector: "enterprise", createdAt: "2026-07-24T00:00:00.000Z", updatedAt: "2026-07-24T00:00:00.000Z" };
    state.projects = [{ id: "p1" }, { id: "p2" }];
    state.documents = [{ id: "d1" }];
    setOrganizationTab();

    render(<SettingsSection />);

    await waitFor(() => {
      expect(screen.getByText("Triaxis Ventures Private Limited")).toBeInTheDocument();
    });
    expect(screen.queryByText("North East Health Mission")).not.toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Production")).toBeInTheDocument();
  });

  it("live tenant mode, no organization record yet: shows an honest setup state, never the demo fallback", async () => {
    setDemoModeEnabled(false);
    state.organization = undefined;
    setOrganizationTab();

    render(<SettingsSection />);

    await waitFor(() => {
      expect(screen.getByText("Not set up yet")).toBeInTheDocument();
    });
    expect(screen.queryByText("North East Health Mission")).not.toBeInTheDocument();
  });

  it("demo/investor preview mode: still shows the seeded institution, unaffected by the fix", async () => {
    setDemoModeEnabled(true);
    setOrganizationTab();

    render(<SettingsSection />);

    await waitFor(() => {
      expect(screen.getByText("North East Health Mission")).toBeInTheDocument();
    });
    expect(screen.getByText("Investor Preview")).toBeInTheDocument();
  });

  it("live tenant mode looks up the organization using the real session organization id, not a demo/placeholder one", async () => {
    setDemoModeEnabled(false);
    state.organization = { id: "org-1", name: "Real Org", slug: "real-org", sector: "enterprise", createdAt: "2026-07-24T00:00:00.000Z", updatedAt: "2026-07-24T00:00:00.000Z" };
    setOrganizationTab();

    render(<SettingsSection />);

    await waitFor(() => {
      expect(screen.getByText("Real Org")).toBeInTheDocument();
    });
    expect(getByIdMock).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-1" }), "org-1");
  });
});
