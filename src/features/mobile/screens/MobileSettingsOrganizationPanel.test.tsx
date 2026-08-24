import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  user: { id: "user-1", organizationId: "org-1", role: "Employee" as const },
  organization: undefined as { id: string; name: string } | undefined,
  projects: [] as { id: string }[],
  documents: [] as { id: string }[],
};

vi.mock("../../../auth/AuthProvider", () => ({
  useAuth: () => ({ session: { user: state.user, status: "authenticated" } }),
}));
vi.mock("../../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
}));
vi.mock("../../../providers/serviceProvider", () => ({
  applicationServices: {
    organizationsRepository: { getById: async () => state.organization },
    projectsRepository: { list: async () => state.projects },
    documentsRepository: { list: async () => state.documents },
  },
}));

import { MobileSettingsOrganizationPanel } from "./MobileSettingsOrganizationPanel";

// MN-7 (2026-08-24): native port of desktop SettingsSection.tsx's OrganizationPanel -- this test
// exists specifically to lock in that no demo-mode branch was ported (the roadmap's own Mobile
// Surface Contract requires demo data never reach the native app), matching the TP-01 regression
// desktop's own live-tenant fix already guards against: a real tenant must see its OWN organization
// data, never a seeded/demo institution, and this panel has no code path that could show one at all.
describe("MobileSettingsOrganizationPanel (MN-7)", () => {
  afterEach(() => {
    state.organization = undefined;
    state.projects = [];
    state.documents = [];
  });

  it("shows an honest loading/zero state before real org data resolves", async () => {
    render(<MobileSettingsOrganizationPanel />);
    await waitFor(() => expect(screen.getByText("Not set up yet")).toBeInTheDocument());
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
  });

  it("renders the real live-tenant organization name and counts, never a seeded/demo dataset", async () => {
    state.organization = { id: "org-1", name: "North East Public Development Society" };
    state.projects = [{ id: "p1" }, { id: "p2" }];
    state.documents = [{ id: "d1" }];
    render(<MobileSettingsOrganizationPanel />);
    await waitFor(() => expect(screen.getByText("North East Public Development Society")).toBeInTheDocument());
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    // TP-01-style regression: this codebase's seeded investor-demo institution must never leak in,
    // and this panel has no import of demo/demoDataset at all to leak it from.
    expect(screen.queryByText("North East Health Mission")).not.toBeInTheDocument();
  });

  it("always shows Production mode, never Investor Preview -- no demo-mode branch exists on mobile", async () => {
    state.organization = { id: "org-1", name: "Live Tenant" };
    render(<MobileSettingsOrganizationPanel />);
    await waitFor(() => expect(screen.getByText("Live Tenant")).toBeInTheDocument());
    expect(screen.getByText("Production")).toBeInTheDocument();
    expect(screen.queryByText("Investor Preview")).not.toBeInTheDocument();
  });
});
