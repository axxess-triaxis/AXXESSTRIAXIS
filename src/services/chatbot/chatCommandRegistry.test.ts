import { afterEach, describe, expect, it, vi } from "vitest";

const scope = { organizationId: "org-1", userId: "user-1", role: "Employee" as const };

// vi.mock factories are hoisted above top-level variables, so the mock functions they reference
// must be created via vi.hoisted rather than a plain top-level const.
const mocks = vi.hoisted(() => ({
  tasksCreate: vi.fn(async (_scope: unknown, input: Record<string, unknown>) => ({ id: "task-1", ...input })),
  tasksList: vi.fn(async () => [{ id: "task-1", title: "Ship the report" }]),
  tasksUpdate: vi.fn(async (_scope: unknown, id: string, input: Record<string, unknown>) => ({ id, title: "Ship the report", ...input })),
  meetingsCreate: vi.fn(async (_scope: unknown, input: Record<string, unknown>) => ({ id: "meeting-1", ...input })),
  projectsCreate: vi.fn(async (_scope: unknown, input: Record<string, unknown>) => ({ id: "project-1", ...input })),
  stakeholdersCreate: vi.fn(async (_scope: unknown, input: Record<string, unknown>) => ({ id: "stakeholder-1", ...input })),
}));

vi.mock("../../providers/serviceProvider", () => ({
  applicationServices: {
    tasksRepository: { create: mocks.tasksCreate, list: mocks.tasksList, update: mocks.tasksUpdate },
    meetingsRepository: { create: mocks.meetingsCreate },
    projectsRepository: { create: mocks.projectsCreate },
    stakeholdersRepository: { create: mocks.stakeholdersCreate },
  },
}));

import { chatCommandRegistry, findChatCommand } from "./chatCommandRegistry";

function command(action: string) {
  const definition = findChatCommand(action);
  if (!definition) throw new Error(`no command registered for ${action}`);
  return definition;
}

describe("chatCommandRegistry", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("registers exactly the 6 v1 commands", () => {
    expect(chatCommandRegistry.map((entry) => entry.action).sort()).toEqual([
      "add_stakeholder_note",
      "create_meeting",
      "create_project",
      "create_stakeholder",
      "create_task",
      "update_task_status",
    ]);
  });

  it("create_task calls tasksRepository.create with the given title, not the MCP tool registry", async () => {
    const result = await command("create_task").execute(scope, { title: "Ship the report" });
    expect(mocks.tasksCreate).toHaveBeenCalledWith(scope, expect.objectContaining({ title: "Ship the report" }));
    expect(result).toEqual({ ok: true, entityId: "task-1", entityLabel: "Ship the report" });
  });

  it("create_task fails cleanly with no silent write when title is missing", async () => {
    const result = await command("create_task").execute(scope, {});
    expect(result.ok).toBe(false);
    expect(mocks.tasksCreate).not.toHaveBeenCalled();
  });

  it("create_meeting requires both title and startsAt", async () => {
    const result = await command("create_meeting").execute(scope, { title: "Standup" });
    expect(result.ok).toBe(false);
    expect(mocks.meetingsCreate).not.toHaveBeenCalled();

    await command("create_meeting").execute(scope, { title: "Standup", startsAt: "2026-08-20T09:00:00.000Z" });
    expect(mocks.meetingsCreate).toHaveBeenCalledWith(scope, expect.objectContaining({ title: "Standup", startsAt: "2026-08-20T09:00:00.000Z" }));
  });

  it("create_project calls projectsRepository.create with the given name", async () => {
    await command("create_project").execute(scope, { name: "New Program Rollout" });
    expect(mocks.projectsCreate).toHaveBeenCalledWith(scope, expect.objectContaining({ name: "New Program Rollout" }));
  });

  it("create_stakeholder calls stakeholdersRepository.create with the given name", async () => {
    await command("create_stakeholder").execute(scope, { name: "Dr. Rao", affiliation: "Mission Secretariat" });
    expect(mocks.stakeholdersCreate).toHaveBeenCalledWith(scope, expect.objectContaining({ name: "Dr. Rao", affiliation: "Mission Secretariat" }));
  });

  it("update_task_status resolves a single match then updates its status", async () => {
    const result = await command("update_task_status").execute(scope, { taskTitle: "Ship the report", status: "completed" });
    expect(mocks.tasksList).toHaveBeenCalledWith(scope, { search: "Ship the report" });
    expect(mocks.tasksUpdate).toHaveBeenCalledWith(scope, "task-1", { status: "completed" });
    expect(result).toEqual({ ok: true, entityId: "task-1", entityLabel: "Ship the report" });
  });

  it("update_task_status refuses to guess when the search matches zero or multiple tasks", async () => {
    mocks.tasksList.mockResolvedValueOnce([]);
    const zeroMatch = await command("update_task_status").execute(scope, { taskTitle: "Nonexistent", status: "completed" });
    expect(zeroMatch.ok).toBe(false);
    expect(mocks.tasksUpdate).not.toHaveBeenCalled();

    mocks.tasksList.mockResolvedValueOnce([{ id: "task-1", title: "A" }, { id: "task-2", title: "A2" }]);
    const multiMatch = await command("update_task_status").execute(scope, { taskTitle: "A", status: "completed" });
    expect(multiMatch.ok).toBe(false);
    expect(mocks.tasksUpdate).not.toHaveBeenCalled();
  });

  it("add_stakeholder_note posts to the existing /api/stakeholders/notes route, not a direct repository call", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ note: { id: "note-1", title: "Escalation" } }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await command("add_stakeholder_note").execute(scope, { title: "Escalation", body: "Needs follow-up." });

    expect(fetchMock).toHaveBeenCalledWith("/api/stakeholders/notes", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ title: "Escalation", body: "Needs follow-up." }),
    }));
    expect(result).toEqual({ ok: true, entityId: "note-1", entityLabel: "Escalation" });

    vi.unstubAllGlobals();
  });
});
