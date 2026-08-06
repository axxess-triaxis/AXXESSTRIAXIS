import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// XL-6 (2026-08-06): proves LiteHomeSection is a simple, real-count dashboard -- not X0's
// tiered/scored/criticality-banded Executive Dashboard -- and that counts come from the same
// tasks/meetings/stakeholders repositories the other Lite sections use, with an honest "--" (not
// a fabricated 0) when a fetch fails.
const state = {
  user: { id: "user-1", organizationId: "org-1", role: "Employee" as const, displayName: "Asha Verma" },
  tasks: [] as Array<{ status: string }>,
  meetings: [] as Array<{ startsAt: string }>,
  stakeholders: [] as Array<{ id: string }>,
  failTasks: false,
};

vi.mock("../../../auth/AuthProvider", () => ({
  useAuth: () => ({ session: { user: state.user, status: "authenticated" } }),
}));

vi.mock("../../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
}));

vi.mock("../../../providers/serviceProvider", () => ({
  applicationServices: {
    tasksRepository: { list: async () => { if (state.failTasks) throw new Error("boom"); return state.tasks; } },
    meetingsRepository: { list: async () => state.meetings },
    stakeholdersRepository: { list: async () => state.stakeholders },
  },
}));

import { LiteHomeSection } from "./LiteHomeSection";

describe("LiteHomeSection", () => {
  afterEach(() => {
    state.tasks = [];
    state.meetings = [];
    state.stakeholders = [];
    state.failTasks = false;
    vi.clearAllMocks();
  });

  it("shows real, live counts, not fabricated ones", async () => {
    state.tasks = [{ status: "pending" }, { status: "completed" }];
    state.meetings = [{ startsAt: "2099-01-01T00:00:00Z" }];
    state.stakeholders = [{ id: "1" }, { id: "2" }, { id: "3" }];

    render(<LiteHomeSection />);

    await waitFor(() => {
      expect(screen.getByText("Open tasks").previousSibling).toHaveTextContent("1");
      expect(screen.getByText("Upcoming").previousSibling).toHaveTextContent("1");
      expect(screen.getByText("Contacts").previousSibling).toHaveTextContent("3");
    });
  });

  it("shows an honest -- (not a fabricated 0) when a count fetch fails", async () => {
    state.failTasks = true;
    render(<LiteHomeSection />);
    await waitFor(() => expect(screen.getAllByText("--").length).toBeGreaterThan(0));
  });

  it("renders the simple shortcut grid, not X0's Executive Dashboard", () => {
    render(<LiteHomeSection />);
    expect(screen.getByText("Ask AXXESS")).toBeInTheDocument();
    expect(screen.queryByText(/Executive Dashboard/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Golden Path/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Tenant Health Command Center/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Social Alerts/i)).not.toBeInTheDocument();
  });
});
