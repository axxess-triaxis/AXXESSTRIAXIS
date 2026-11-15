import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Regression (2026-11-15 staging e2e triage): submitTask set "Task created." and then reloaded the
// list, and the reload cleared the toast in the same render batch, so the message never showed.
const user = { id: "user-1", organizationId: "org-1", role: "Employee" as const, displayName: "Asha Das", email: "asha@example.test" };
const created = {
  id: "task-1",
  organizationId: "org-1",
  title: "Follow up with the district team",
  description: "",
  status: "pending",
  priority: "medium",
  assigneeId: "user-1",
  tags: [],
  createdAt: "2026-11-15T00:00:00.000Z",
  updatedAt: "2026-11-15T00:00:00.000Z",
};

vi.mock("../../auth/AuthProvider", () => ({
  useAuth: () => ({ session: { user, status: "authenticated" } }),
}));

vi.mock("../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (u: { id: string; organizationId: string; role: string }) => ({ userId: u.id, organizationId: u.organizationId, role: u.role }),
}));

vi.mock("../../services/analytics", () => ({
  useAnalytics: () => ({ trackEvent: vi.fn() }),
  trackEvent: vi.fn(),
}));

vi.mock("../../providers/serviceProvider", () => ({
  applicationServices: {
    tasksRepository: { list: async () => [], create: async () => created },
    remindersRepository: { list: async () => [] },
    projectsRepository: { list: async () => [] },
    programsRepository: { list: async () => [] },
    usersRepository: { listByOrganization: async () => [user] },
  },
}));

import { TasksSection } from "./TasksSection";

describe("TasksSection create toast", () => {
  it("keeps the 'Task created.' message visible after the list reloads", async () => {
    render(<TasksSection />);

    fireEvent.click(await screen.findByRole("button", { name: "New Task" }));
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: created.title } });
    fireEvent.change(screen.getByLabelText("Assignee"), { target: { value: user.id } });
    fireEvent.click(screen.getByRole("button", { name: "Save Task" }));

    await waitFor(() => {
      expect(screen.getByText("Task created.")).toBeInTheDocument();
    });
  });
});
