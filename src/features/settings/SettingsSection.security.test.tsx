import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettingsSection } from "./SettingsSection";

// SA-1 (2026-07-28): the Security tab's 6 "Configure" buttons had no onClick handler at all --
// real dead ends, not placeholder-styled ones, and none of them has a real destination screen
// yet. These tests lock in that every one is now a genuinely disabled control carrying an
// accessible reason, instead of an active-looking button that silently does nothing.
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

function setSecurityTab() {
  window.history.pushState({}, "", "/settings?tab=security");
}

describe("Settings Security tab (SA-1 dead-button fix)", () => {
  it("renders all 6 Configure controls as disabled, not as active no-op buttons", () => {
    setSecurityTab();
    render(<SettingsSection />);

    const configureButtons = screen.getAllByRole("button", { name: /pending production security configuration|managed by tenant policy|requires organization admin setup/i });
    expect(configureButtons).toHaveLength(6);
    for (const button of configureButtons) {
      expect(button).toBeDisabled();
    }
  });

  it("each disabled control carries an honest, accessible reason instead of a bare 'Configure' label", () => {
    setSecurityTab();
    render(<SettingsSection />);

    expect(screen.queryByRole("button", { name: "Configure" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Requires organization admin setup" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Managed by tenant policy" })).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: "Pending production security configuration" })).toHaveLength(2);
  });
});
