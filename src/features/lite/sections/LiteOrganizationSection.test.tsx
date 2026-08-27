import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Lite Settings real-modules pass (2026-08-27): proves the Organization tab's logo control is
// enabled only for Super Admin/Organization Admin (canManageOrganization, the same hardened,
// same-tenant-only check desktop/mobile Settings already use) and shows an honest disabled reason
// for every other role -- this is the one Lite Settings surface with an RBAC gate.
const state = {
  user: { id: "user-1", organizationId: "org-1", role: "Employee" as string, displayName: "Asha Verma" },
  org: { id: "org-1", name: "Triaxis Ventures", logoPath: undefined as string | undefined },
};

vi.mock("../../../auth/AuthProvider", () => ({
  useAuth: () => ({ session: { user: state.user, status: "authenticated" } }),
}));

vi.mock("../../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
}));

vi.mock("../../../providers/serviceProvider", () => ({
  applicationServices: {
    organizationsRepository: { getById: async () => state.org },
  },
}));

import { LiteOrganizationSection } from "./LiteOrganizationSection";

describe("LiteOrganizationSection", () => {
  afterEach(() => {
    state.user = { id: "user-1", organizationId: "org-1", role: "Employee", displayName: "Asha Verma" };
    vi.clearAllMocks();
  });

  it("shows the organization name once loaded", async () => {
    render(<LiteOrganizationSection />);
    await waitFor(() => expect(screen.getByText("Triaxis Ventures")).toBeInTheDocument());
  });

  it("disables the logo upload control with a reason for a non-admin role", async () => {
    state.user.role = "Employee";
    render(<LiteOrganizationSection />);
    await waitFor(() => expect(screen.getByText("Triaxis Ventures")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /change logo/i })).toBeDisabled();
    expect(screen.getByText(/only super admin and organization admin/i)).toBeInTheDocument();
  });

  it("enables the logo upload control for an Organization Admin in the same org", async () => {
    state.user.role = "Organization Admin";
    render(<LiteOrganizationSection />);
    await waitFor(() => expect(screen.getByText("Triaxis Ventures")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /change logo/i })).toBeEnabled();
  });
});
