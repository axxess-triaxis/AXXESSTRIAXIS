import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  user: { id: "user-1", organizationId: "org-1", role: "Employee" as const },
  projects: [] as { id: string; organizationId: string; name: string; progress: number; riskLevel: string; priority: string; status: string; tags: string[] }[],
  programs: [] as { id: string; organizationId: string; name: string }[],
};

vi.mock("../../../auth/AuthProvider", () => ({
  useAuth: () => ({ session: { user: state.user, status: "authenticated" } }),
}));
vi.mock("../../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
}));

// vi.mock factories are hoisted above regular top-level declarations, so a value referenced
// directly inside one (not lazily, inside a nested closure) must itself be declared via
// vi.hoisted() -- otherwise it's read before its own `const` has initialized (TDZ).
const { createProject } = vi.hoisted(() => ({
  createProject: vi.fn(async (_scope: unknown, input: Record<string, unknown>) => ({
    id: "project-new",
    organizationId: "org-1",
    progress: 0,
    riskLevel: "medium",
    status: "planning",
    tags: [],
    ...input,
  })),
}));

vi.mock("../../../providers/serviceProvider", () => ({
  applicationServices: {
    projectsRepository: { list: async () => state.projects, create: createProject },
    programsRepository: { list: async () => state.programs },
  },
}));

import { MobileBackHandlerProvider } from "../MobileBackHandlerContext";
import { MobileProjectsScreen } from "./MobileProjectsScreen";

describe("MobileProjectsScreen (MN-2)", () => {
  afterEach(() => {
    state.projects = [];
    state.programs = [];
    vi.clearAllMocks();
  });

  it("shows an honest empty state when there are no projects", async () => {
    render(<MobileBackHandlerProvider><MobileProjectsScreen /></MobileBackHandlerProvider>);
    await waitFor(() => expect(screen.getByText("No projects yet")).toBeInTheDocument());
  });

  it("shows the project's real risk and status badges, and never a fabricated budget/spend figure", async () => {
    state.projects = [{ id: "p1", organizationId: "org-1", name: "Referral SLA rollout", progress: 40, riskLevel: "high", priority: "high", status: "in-progress", tags: [] }];
    render(<MobileBackHandlerProvider><MobileProjectsScreen /></MobileBackHandlerProvider>);
    await waitFor(() => expect(screen.getByText("Referral SLA rollout")).toBeInTheDocument());
    expect(screen.getByText("high risk")).toBeInTheDocument();
    expect(screen.queryByText(/budget|spend/i)).not.toBeInTheDocument();
  });

  it("only shows a program association when the project has a real programId that resolves to a real program", async () => {
    state.programs = [{ id: "prog-1", organizationId: "org-1", name: "NE Health Access Program" }];
    state.projects = [{ id: "p1", organizationId: "org-1", name: "Referral SLA rollout", progress: 40, riskLevel: "medium", priority: "medium", status: "in-progress", tags: [] }];
    render(<MobileBackHandlerProvider><MobileProjectsScreen /></MobileBackHandlerProvider>);
    await waitFor(() => expect(screen.getByText("Referral SLA rollout")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Referral SLA rollout"));
    expect(screen.queryByText("NE Health Access Program")).not.toBeInTheDocument();
  });

  it("creates a real project via projectsRepository.create when the New project form is submitted", async () => {
    render(<MobileBackHandlerProvider><MobileProjectsScreen /></MobileBackHandlerProvider>);
    await waitFor(() => expect(screen.getByText("No projects yet")).toBeInTheDocument());

    fireEvent.click(screen.getByText("New project"));
    fireEvent.change(screen.getByPlaceholderText("Project name"), { target: { value: "Pilot cohort 2 onboarding" } });
    fireEvent.click(screen.getByText("Create project"));

    await waitFor(() => expect(createProject).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ name: "Pilot cohort 2 onboarding" })));
  });
});
