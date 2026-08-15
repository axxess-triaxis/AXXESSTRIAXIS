import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { UserContext } from "../../security/rbac";

// vi.mock factories are hoisted above top-level variables, so every mock referenced inside one
// must come from vi.hoisted rather than a plain top-level const/let.
const { trackEvent, navigateToSection, writeAgenticDraft, commandRegistry } = vi.hoisted(() => ({
  trackEvent: vi.fn(),
  navigateToSection: vi.fn(),
  writeAgenticDraft: vi.fn(),
  commandRegistry: { findChatCommand: vi.fn() },
}));

vi.mock("../../services/analytics", () => ({
  useAnalytics: () => ({ trackEvent }),
}));

vi.mock("../../hooks/useWorkspaceRouting", () => ({
  useWorkspaceRouting: () => ({ navigateToSection }),
}));

vi.mock("../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: UserContext) => ({ organizationId: user.organizationId, userId: user.id, role: user.role }),
}));

vi.mock("../../services/agentic/agenticDraftHandoff", () => ({
  writeAgenticDraft: (draft: unknown) => writeAgenticDraft(draft),
}));

vi.mock("../../services/chatbot/chatCommandRegistry", () => ({
  chatCommandCatalogue: [{ action: "create_task", description: "Create a task.", argsHint: "title" }],
  findChatCommand: (action: string) => commandRegistry.findChatCommand(action),
}));

import { ChatbotPanel } from "./ChatbotPanel";

function baseUser(overrides: Partial<UserContext> = {}): UserContext {
  return { id: "user-1", organizationId: "org-1", role: "Employee", displayName: "Ananya Rao", ...overrides };
}

function mockFetchAnswer(answer: string) {
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: true,
    json: async () => ({ answer }),
  })));
}

describe("ChatbotPanel", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("greets the user by their real first name, derived from displayName", () => {
    render(<ChatbotPanel user={baseUser({ displayName: "Ananya Rao" })} routePath="/dashboard" moduleName="Dashboard" onClose={vi.fn()} />);
    expect(screen.getByText("What can I do for you today, Ananya?")).toBeInTheDocument();
  });

  it("falls back to 'there' when no displayName is set", () => {
    render(<ChatbotPanel user={baseUser({ displayName: undefined })} routePath="/dashboard" moduleName="Dashboard" onClose={vi.fn()} />);
    expect(screen.getByText("What can I do for you today, there?")).toBeInTheDocument();
  });

  it("sends a message to /api/ai with task: general_chat and renders a plain chat reply", async () => {
    mockFetchAnswer(JSON.stringify({ type: "chat", reply: "Sure, tell me more." }));
    render(<ChatbotPanel user={baseUser()} routePath="/dashboard" moduleName="Dashboard" onClose={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/Ask AXXESS Copilot/), { target: { value: "hello" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => expect(screen.getByText("Sure, tell me more.")).toBeInTheDocument());

    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(options.body as string);
    expect(body.task).toBe("general_chat");
    expect(body.prompt).toContain("hello");
  });

  it("renders a confirm card for a recognized command when the role has access, then executes on Confirm", async () => {
    commandRegistry.findChatCommand.mockReturnValue({
      action: "create_task",
      section: "tasks",
      summarize: () => 'Create task "Ship the report".',
      execute: vi.fn(async () => ({ ok: true, entityId: "task-1", entityLabel: "Ship the report" })),
    });
    mockFetchAnswer(JSON.stringify({ type: "command", action: "create_task", args: { title: "Ship the report" }, reply: "On it." }));

    render(<ChatbotPanel user={baseUser({ role: "Employee" })} routePath="/tasks" moduleName="Tasks" onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Ask AXXESS Copilot/), { target: { value: "create a task to ship the report" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => expect(screen.getByText('Create task "Ship the report".')).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(screen.getByText(/Done -- Ship the report/)).toBeInTheDocument());
    expect(trackEvent).toHaveBeenCalledWith("chatbot_command_executed", { action: "create_task" }, expect.anything());
  });

  it("denies a command outright for a role without section access, and never shows a confirm card", async () => {
    commandRegistry.findChatCommand.mockReturnValue({
      action: "create_stakeholder",
      section: "stakeholders",
      summarize: () => 'Add stakeholder "Dr. Rao".',
      execute: vi.fn(),
    });
    mockFetchAnswer(JSON.stringify({ type: "command", action: "create_stakeholder", args: { name: "Dr. Rao" }, reply: "On it." }));

    // "Guest" is excluded from sectionPermissions.stakeholders in src/security/rbac.ts.
    render(<ChatbotPanel user={baseUser({ role: "Guest" })} routePath="/dashboard" moduleName="Dashboard" onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Ask AXXESS Copilot/), { target: { value: "add a stakeholder" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => expect(screen.getByText(/Your role doesn't have access to stakeholders/)).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Confirm" })).not.toBeInTheDocument();
  });

  it("never leaks the raw 401 error body -- shows a safe sign-in message instead (investor-demo persona has no real Supabase session)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      status: 401,
      json: async () => ({ error: "Unauthorized." }),
    })));
    render(<ChatbotPanel user={baseUser()} routePath="/dashboard" moduleName="Dashboard" onClose={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/Ask AXXESS Copilot/), { target: { value: "hello" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => expect(screen.getByText("Sign in to chat with AXXESS Copilot.")).toBeInTheDocument());
    expect(screen.queryByText("Unauthorized.")).not.toBeInTheDocument();
  });

  it("never displays a low-confidence provider fallback string as a real chat reply", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        answer: "OpenAI request failed (429). This response was not generated by a live model call; treat it as unverified.",
        confidence: 0.3,
      }),
    })));
    render(<ChatbotPanel user={baseUser()} routePath="/dashboard" moduleName="Dashboard" onClose={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/Ask AXXESS Copilot/), { target: { value: "hello" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => expect(screen.getByText("AXXESS Copilot's AI provider is temporarily unavailable. Try again shortly.")).toBeInTheDocument());
    expect(screen.queryByText(/not generated by a live model call/)).not.toBeInTheDocument();
  });
});
