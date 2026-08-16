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

// Every legacy-path test below routes through the same blanket "agentic_unavailable" response for
// /api/ai/agentic-chat, then the mocked answer for /api/ai -- this exercises the panel's real
// disclosed fallback rather than assuming the legacy path is reached some other way.
function mockFetchAnswer(answer: string, extra: Record<string, unknown> = {}) {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url === "/api/ai/agentic-chat") {
      return { ok: true, json: async () => ({ status: "agentic_unavailable", reason: "test fixture: no agentic override configured" }) };
    }
    return { ok: true, json: async () => ({ answer, ...extra }) };
  }));
}

function findFetchCallTo(url: string) {
  return (fetch as ReturnType<typeof vi.fn>).mock.calls.find((call) => call[0] === url);
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

    const legacyCall = findFetchCallTo("/api/ai");
    const body = JSON.parse((legacyCall?.[1] as RequestInit).body as string);
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

  it("renders each completed tool step then the final reply when the agentic route finishes a multi-step turn, without ever falling back to /api/ai", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url === "/api/ai/agentic-chat") {
        return {
          ok: true,
          json: async () => ({
            status: "final",
            reply: "Checked your tasks and created a follow-up.",
            steps: [{ toolName: "list_tasks", summary: "Checked your tasks." }, { toolName: "create_task", summary: "Created a task." }],
            costUsd: 0,
          }),
        };
      }
      throw new Error(`Unexpected fetch to ${url} -- the agentic route should have handled this turn.`);
    }));

    render(<ChatbotPanel user={baseUser()} routePath="/tasks" moduleName="Tasks" onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Ask AXXESS Copilot/), { target: { value: "check my tasks then create a follow-up" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => expect(screen.getByText("Checked your tasks and created a follow-up.")).toBeInTheDocument());
    expect(screen.getByText("Checked your tasks.")).toBeInTheDocument();
    expect(screen.getByText("Created a task.")).toBeInTheDocument();
  });

  it("renders an inline confirm card for a paused agentic turn and resumes correctly on Confirm", async () => {
    let agenticCallCount = 0;
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (url !== "/api/ai/agentic-chat") throw new Error(`Unexpected fetch to ${url}`);
      agenticCallCount += 1;
      if (agenticCallCount === 1) {
        return {
          ok: true,
          json: async () => ({
            status: "paused",
            transcript: [{ role: "assistant", content: null, toolCalls: [{ id: "call_1", name: "create_stakeholder", arguments: { name: "Acme Corp" } }] }],
            pendingTool: { id: "call_1", name: "create_stakeholder", arguments: { name: "Acme Corp" } },
            userMessage: "add Acme Corp as a stakeholder",
            iterationsUsed: 1,
            summary: "This will add a real stakeholder to your CRM. Confirm to proceed?",
            steps: [],
            costUsd: 0,
          }),
        };
      }
      const body = JSON.parse(init?.body as string) as { resume?: { confirmed?: boolean; pendingTool?: { name: string } } };
      expect(body.resume?.confirmed).toBe(true);
      expect(body.resume?.pendingTool?.name).toBe("create_stakeholder");
      return {
        ok: true,
        json: async () => ({
          status: "final",
          reply: "Added Acme Corp as a stakeholder.",
          steps: [{ toolName: "create_stakeholder", summary: "Added a stakeholder." }],
          costUsd: 0,
        }),
      };
    }));

    render(<ChatbotPanel user={baseUser()} routePath="/stakeholders" moduleName="Stakeholders" onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Ask AXXESS Copilot/), { target: { value: "add Acme Corp as a stakeholder" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => expect(screen.getByText("This will add a real stakeholder to your CRM. Confirm to proceed?")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(screen.getByText("Added Acme Corp as a stakeholder.")).toBeInTheDocument());
    expect(agenticCallCount).toBe(2);
  });

  it("shows the disclosed limited-mode note exactly once, then keeps using the legacy path silently for later messages in the same session", async () => {
    mockFetchAnswer(JSON.stringify({ type: "chat", reply: "First reply." }));
    render(<ChatbotPanel user={baseUser()} routePath="/dashboard" moduleName="Dashboard" onClose={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/Ask AXXESS Copilot/), { target: { value: "hello" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => expect(screen.getByText("First reply.")).toBeInTheDocument());
    expect(screen.getByText(/Running in limited mode/)).toBeInTheDocument();

    mockFetchAnswer(JSON.stringify({ type: "chat", reply: "Second reply." }));
    fireEvent.change(screen.getByPlaceholderText(/Ask AXXESS Copilot/), { target: { value: "hello again" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => expect(screen.getByText("Second reply.")).toBeInTheDocument());

    expect(screen.getAllByText(/Running in limited mode/)).toHaveLength(1);
  });
});
