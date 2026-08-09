import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// A-103 (2026-08-09): a real, dedicated Reminder type/view inside Tasks & Workflow.
const state = {
  user: { id: "user-1", organizationId: "org-1", role: "Employee" as const },
};

vi.mock("../../auth/AuthProvider", () => ({
  useAuth: () => ({ session: { user: state.user, status: "authenticated" } }),
}));

vi.mock("../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
}));

vi.mock("../../services/analytics", () => ({
  useAnalytics: () => ({ trackEvent: vi.fn() }),
  trackEvent: vi.fn(),
}));

const createReminder = vi.fn(async (_scope: unknown, input: Record<string, unknown>) => ({
  id: "reminder-new",
  organizationId: "org-1",
  status: "pending",
  recurrence: "none",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  remindAt: new Date().toISOString(),
  title: "",
  ...input,
}));

vi.mock("../../providers/serviceProvider", () => ({
  applicationServices: {
    tasksRepository: { list: async () => [] },
    remindersRepository: {
      list: async () => [],
      create: (...args: [unknown, Record<string, unknown>]) => createReminder(...args),
    },
    projectsRepository: { list: async () => [] },
    programsRepository: { list: async () => [] },
    usersRepository: { listByOrganization: async () => [] },
  },
}));

import { TasksSection } from "./TasksSection";

describe("TasksSection Reminders tab (A-103)", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("defaults to the Tasks tab", async () => {
    render(<TasksSection />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "New Task" })).toBeInTheDocument();
    });
  });

  it("switching to the Reminders tab shows the real Reminders list/form, backed by remindersRepository", async () => {
    render(<TasksSection />);
    await waitFor(() => screen.getByRole("heading", { name: "New Task" }));

    fireEvent.click(screen.getByRole("button", { name: "Reminders" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "New Reminder" })).toBeInTheDocument();
    });
    expect(screen.getByText("No reminders yet")).toBeInTheDocument();
  });

  it("submitting the New Reminder form calls remindersRepository.create with real field values", async () => {
    render(<TasksSection />);
    await waitFor(() => screen.getByRole("heading", { name: "New Task" }));
    fireEvent.click(screen.getByRole("button", { name: "Reminders" }));
    await waitFor(() => screen.getByRole("heading", { name: "New Reminder" }));

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Follow up with district office" } });
    fireEvent.change(screen.getByLabelText("Remind at"), { target: { value: "2026-08-15T09:00" } });
    fireEvent.click(screen.getByRole("button", { name: /Save Reminder/ }));

    await waitFor(() => {
      expect(createReminder).toHaveBeenCalled();
    });
    const [, input] = createReminder.mock.calls[0];
    expect(input.title).toBe("Follow up with district office");
  });

  it("requires a title and a remind-at value before saving", async () => {
    render(<TasksSection />);
    await waitFor(() => screen.getByRole("heading", { name: "New Task" }));
    fireEvent.click(screen.getByRole("button", { name: "Reminders" }));
    await waitFor(() => screen.getByRole("heading", { name: "New Reminder" }));

    fireEvent.click(screen.getByRole("button", { name: /Save Reminder/ }));

    expect(createReminder).not.toHaveBeenCalled();
    expect(screen.getByText("Reminder title is required.")).toBeInTheDocument();
  });
});
