import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = {
  user: { id: "user-1", organizationId: "org-1", role: "Employee" as const },
  tasks: [] as { id: string; organizationId: string; title: string; status: string; priority: string; tags: string[] }[],
};

vi.mock("../../../auth/AuthProvider", () => ({
  useAuth: () => ({ session: { user: state.user, status: "authenticated" } }),
}));
vi.mock("../../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
}));
vi.mock("../../../services/analytics", () => ({ trackEvent: vi.fn() }));

// vi.mock factories are hoisted above regular top-level declarations, so a value referenced
// directly inside one (not lazily, inside a nested closure) must itself be declared via
// vi.hoisted() -- otherwise it's read before its own `const` has initialized (TDZ).
const { createTask, updateTask } = vi.hoisted(() => ({
  createTask: vi.fn(async (_scope: unknown, input: Record<string, unknown>) => ({
    id: "task-new",
    organizationId: "org-1",
    status: "pending",
    tags: [],
    ...input,
  })),
  updateTask: vi.fn(async (_scope: unknown, _id: string, input: Record<string, unknown>) => input),
}));

vi.mock("../../../providers/serviceProvider", () => ({
  applicationServices: {
    tasksRepository: { list: async () => state.tasks, create: createTask, update: updateTask },
    remindersRepository: { list: async () => [], update: vi.fn() },
  },
}));

import { MobileBackHandlerProvider } from "../MobileBackHandlerContext";
import { MobileTasksScreen } from "./MobileTasksScreen";

describe("MobileTasksScreen (MN-2)", () => {
  beforeEach(() => {
    // jsdom has no matchMedia implementation at all -- useMobileTabletLayout() calls it on mount,
    // so it needs a stub here (no global polyfill exists in src/test/setup.ts).
    window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaQueryList);
  });

  afterEach(() => {
    state.tasks = [];
    vi.clearAllMocks();
  });

  it("shows an honest empty state when the organization has no tasks or reminders", async () => {
    render(<MobileBackHandlerProvider><MobileTasksScreen /></MobileBackHandlerProvider>);
    await waitFor(() => expect(screen.getByText("No tasks yet")).toBeInTheDocument());
  });

  it("lists real tasks fetched from tasksRepository", async () => {
    state.tasks = [{ id: "t1", organizationId: "org-1", title: "Follow up with pilot NGO", status: "pending", priority: "high", tags: [] }];
    render(<MobileBackHandlerProvider><MobileTasksScreen /></MobileBackHandlerProvider>);
    await waitFor(() => expect(screen.getByText("Follow up with pilot NGO")).toBeInTheDocument());
  });

  it("creates a real task via tasksRepository.create when the New task form is submitted", async () => {
    render(<MobileBackHandlerProvider><MobileTasksScreen /></MobileBackHandlerProvider>);
    await waitFor(() => expect(screen.getByText("No tasks yet")).toBeInTheDocument());

    fireEvent.click(screen.getByText("New task"));
    fireEvent.change(screen.getByPlaceholderText("Task title"), { target: { value: "Draft investor update" } });
    fireEvent.click(screen.getByText("Save task"));

    await waitFor(() => expect(createTask).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ title: "Draft investor update", status: "pending" }),
    ));
  });

  it("marks a task complete via tasksRepository.update, not a client-only toggle", async () => {
    state.tasks = [{ id: "t1", organizationId: "org-1", title: "Send pitch deck", status: "pending", priority: "medium", tags: [] }];
    render(<MobileBackHandlerProvider><MobileTasksScreen /></MobileBackHandlerProvider>);
    await waitFor(() => expect(screen.getByText("Send pitch deck")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Mark task complete"));
    await waitFor(() => expect(updateTask).toHaveBeenCalledWith(expect.anything(), "t1", { status: "completed" }));
  });
});
