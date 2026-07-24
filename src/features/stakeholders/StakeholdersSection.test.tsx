import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Sprint 5, Priority 4: before this fix, "Add Contact" was a dead-end button on every tenant --
// no live stakeholdersRepository existed at all. These tests preserve the Sprint 3 F-011
// non-hanging guarantee (the page must never block on an unresolved spinner) while proving the
// new minimal live path is real, and that a live tenant never sees the demo storyline as if it
// were their own data.
const state = {
  user: { id: "user-1", organizationId: "org-1", role: "Employee" as const },
  stakeholders: [] as Array<{ id: string; organizationId: string; name: string; affiliation: string; influenceScore: number; engagementLevel: string }>,
  created: [] as Array<Record<string, unknown>>,
};

vi.mock("../../auth/AuthProvider", () => ({
  useAuth: () => ({ session: { user: state.user, status: "authenticated" } }),
}));

vi.mock("../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
}));

vi.mock("../../providers/serviceProvider", () => ({
  applicationServices: {
    institutionalRepository: { getStakeholders: () => [] },
    stakeholdersRepository: {
      list: async () => state.stakeholders,
      create: async (_scope: unknown, input: Record<string, unknown>) => {
        state.created.push(input);
        const record = { id: `stakeholder-${state.created.length}`, organizationId: "org-1", name: input.name, affiliation: input.affiliation ?? "", influenceScore: 50, engagementLevel: "medium" };
        state.stakeholders = [...state.stakeholders, record];
        return record;
      },
    },
  },
}));

import { StakeholdersSection } from "./StakeholdersSection";

describe("StakeholdersSection (Sprint 3 F-011 non-hanging guarantee, Sprint 5 live Stakeholders/CRM path)", () => {
  afterEach(() => {
    window.localStorage.clear();
    state.stakeholders = [];
    state.created = [];
    vi.clearAllMocks();
  });

  it("renders its content immediately, with no unresolved loading gate blocking the page", () => {
    render(<StakeholdersSection />);

    expect(screen.getByText("Stakeholders & CRM")).toBeInTheDocument();
    expect(screen.queryByText(/^Loading/)).not.toBeInTheDocument();
  });

  it("shows an honest empty state for a live tenant with zero real stakeholders, not the demo storyline", async () => {
    render(<StakeholdersSection />);

    await waitFor(() => {
      expect(screen.getByText(/No stakeholders yet/i)).toBeInTheDocument();
    });
    expect(screen.queryByText("Dr. Purnima Bora")).not.toBeInTheDocument();
  });

  it("shows the demo storyline only in Demo Mode, with Add Contact disabled", () => {
    window.localStorage.setItem("axxess.demoMode.enabled", "true");
    render(<StakeholdersSection />);

    expect(screen.getByText(/Investor Preview:/i)).toBeInTheDocument();
    const addButton = screen.getByRole("button", { name: /Add Contact/i });
    expect(addButton).toBeDisabled();
  });

  it("Add Contact opens a real form and saving creates a real stakeholder via the repository", async () => {
    render(<StakeholdersSection />);
    await waitFor(() => expect(screen.getByText(/No stakeholders yet/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /Add Contact/i }));
    fireEvent.change(screen.getByLabelText("Contact name"), { target: { value: "Dr. Purnima Bora" } });
    fireEvent.click(screen.getByRole("button", { name: /Save contact/i }));

    await waitFor(() => {
      expect(state.created).toHaveLength(1);
    });
    expect(state.created[0].name).toBe("Dr. Purnima Bora");
    await waitFor(() => {
      expect(screen.getByText("Dr. Purnima Bora")).toBeInTheDocument();
    });
  });

  it("lists real stakeholders for a live tenant that has them", async () => {
    state.stakeholders = [{ id: "s1", organizationId: "org-1", name: "Real Contact", affiliation: "Ministry of Health", influenceScore: 72, engagementLevel: "high" }];
    render(<StakeholdersSection />);

    await waitFor(() => {
      expect(screen.getByText("Real Contact")).toBeInTheDocument();
    });
    expect(screen.getByText("Ministry of Health")).toBeInTheDocument();
  });
});
