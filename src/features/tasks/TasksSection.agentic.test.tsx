import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { writeAgenticDraft } from "../../services/agentic/agenticDraftHandoff";

// A-79: "Create task"/"Reminder" from the AI Workspace actionables pop-up lands here as a
// sessionStorage draft -- proves the New Task form actually opens pre-filled, and that the
// section's own existing create/validation path is otherwise untouched (Save Task still required).
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

vi.mock("../../providers/serviceProvider", () => ({
  applicationServices: {
    tasksRepository: { list: async () => [] },
    projectsRepository: { list: async () => [] },
    programsRepository: { list: async () => [] },
    usersRepository: { listByOrganization: async () => [] },
  },
}));

import { TasksSection } from "./TasksSection";

describe("TasksSection agentic draft pre-fill (A-79)", () => {
  afterEach(() => {
    window.sessionStorage.clear();
  });

  it("opens the New Task form pre-filled from a 'task' draft, with a dismissible banner", async () => {
    writeAgenticDraft({
      actionType: "task",
      summary: "Escalate the Dibrugarh referral SLA variance.",
      sourceType: "rag_answer",
      createdAt: new Date().toISOString(),
    });

    render(<TasksSection />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "New Task" })).toBeInTheDocument();
    });
    expect(screen.getByText(/Drafted from AI Workspace -- review and Save Task/)).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("Escalate the Dibrugarh referral SLA variance.");
  });

  it("opens a 'reminder' draft as a tagged Task, with an honest caveat in the banner", async () => {
    writeAgenticDraft({
      actionType: "reminder",
      summary: "Follow up on the pending approval by Friday.",
      sourceType: "rag_answer",
      createdAt: new Date().toISOString(),
    });

    render(<TasksSection />);

    await waitFor(() => {
      expect(screen.getByText(/AXXESS doesn't yet have a dedicated Reminder type/)).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue("reminder")).toBeInTheDocument();
  });

  it("does not open a pre-filled form when there is no pending draft", async () => {
    render(<TasksSection />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "New Task" })).toBeInTheDocument();
    });
    expect(screen.queryByText(/Drafted from AI Workspace/)).not.toBeInTheDocument();
  });
});
