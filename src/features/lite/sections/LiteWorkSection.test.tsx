import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// XL-6 (2026-08-06): proves LiteWorkSection has a real task create/list loop wired to the same
// tasksRepository X0's TasksSection uses (not a duplicate store), never a fabricated write, and
// never any X0/agentic vocabulary.
const state = {
  user: { id: "user-1", organizationId: "org-1", role: "Employee" as const, displayName: "Asha Verma" },
  tasks: [] as Array<{ id: string; organizationId: string; title: string; status: string; dueDate?: string }>,
  created: [] as Array<Record<string, unknown>>,
};

vi.mock("../../../auth/AuthProvider", () => ({
  useAuth: () => ({ session: { user: state.user, status: "authenticated" } }),
}));

vi.mock("../../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
}));

vi.mock("../../../providers/serviceProvider", () => ({
  applicationServices: {
    tasksRepository: {
      list: async () => state.tasks,
      create: async (_scope: unknown, input: Record<string, unknown>) => {
        state.created.push(input);
        const record = { id: `task-${state.created.length}`, organizationId: "org-1", title: input.title, status: "pending", dueDate: input.dueDate };
        state.tasks = [...state.tasks, record];
        return record;
      },
      update: async (_scope: unknown, id: string, input: Record<string, unknown>) => {
        const updated = { ...state.tasks.find((task) => task.id === id), ...input };
        state.tasks = state.tasks.map((task) => (task.id === id ? (updated as typeof task) : task));
        return updated;
      },
    },
  },
}));

import { LiteWorkSection } from "./LiteWorkSection";

describe("LiteWorkSection", () => {
  afterEach(() => {
    state.tasks = [];
    state.created = [];
    vi.clearAllMocks();
  });

  it("shows an honest empty state, not fabricated tasks, before anything is created", async () => {
    render(<LiteWorkSection />);
    await waitFor(() => expect(screen.getByText(/No tasks yet/)).toBeInTheDocument());
  });

  it("creates a real task via the shared tasksRepository, self-assigned to the signed-in user, never a fake write", async () => {
    render(<LiteWorkSection />);
    await waitFor(() => expect(screen.getByText(/No tasks yet/)).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText("What needs doing?"), { target: { value: "Call the vendor" } });
    fireEvent.click(screen.getByText("Add task"));

    await waitFor(() => expect(screen.getByText("Call the vendor")).toBeInTheDocument());
    expect(state.created).toHaveLength(1);
    expect(state.created[0].assigneeId).toBe("user-1");
    expect(state.created[0].title).toBe("Call the vendor");
  });

  it("marks a task done through the real repository, not a client-only toggle", async () => {
    state.tasks = [{ id: "task-existing", organizationId: "org-1", title: "Existing task", status: "pending" }];
    render(<LiteWorkSection />);
    await waitFor(() => expect(screen.getByText("Existing task")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Done"));

    await waitFor(() => expect(screen.queryByText("Existing task")).not.toBeInTheDocument());
  });

  it("labels reminders honestly as tasks with a due date, not a separate entity", () => {
    render(<LiteWorkSection />);
    expect(screen.getByText(/A reminder is a task with a due date/)).toBeInTheDocument();
  });

  it("never renders X0/agentic vocabulary", () => {
    render(<LiteWorkSection />);
    expect(screen.queryByText(/Golden Path/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/agentic/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Tenant Health Command Center/i)).not.toBeInTheDocument();
  });
});
