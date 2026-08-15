import type { PriorityLevel, Task } from "../../domain";
import { applicationServices } from "../../providers/serviceProvider";
import type { ChatCommandDefinition } from "./chatCommandTypes";

const PRIORITY_LEVELS: PriorityLevel[] = ["low", "medium", "high", "urgent"];
const TASK_STATUSES: Task["status"][] = ["pending", "in-progress", "blocked", "completed"];

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asPriority(value: unknown): PriorityLevel | undefined {
  return typeof value === "string" && (PRIORITY_LEVELS as string[]).includes(value) ? (value as PriorityLevel) : undefined;
}

function asTaskStatus(value: unknown): Task["status"] | undefined {
  return typeof value === "string" && (TASK_STATUSES as string[]).includes(value) ? (value as Task["status"]) : undefined;
}

export const chatCommandRegistry: ChatCommandDefinition[] = [
  {
    action: "create_task",
    section: "tasks",
    summarize: (args) => `Create task "${asString(args.title) ?? "(untitled)"}"${asString(args.dueDate) ? ` due ${asString(args.dueDate)}` : ""}.`,
    execute: async (scope, args) => {
      const title = asString(args.title);
      if (!title) return { ok: false, error: "I need a task title to create this." };
      const task = await applicationServices.tasksRepository.create(scope, {
        title,
        description: asString(args.description),
        assigneeId: asString(args.assigneeId),
        projectId: asString(args.projectId),
        dueDate: asString(args.dueDate),
        priority: asPriority(args.priority),
      });
      return { ok: true, entityId: task.id, entityLabel: task.title };
    },
  },
  {
    action: "create_meeting",
    section: "meetings",
    summarize: (args) => `Schedule meeting "${asString(args.title) ?? "(untitled)"}"${asString(args.startsAt) ? ` at ${asString(args.startsAt)}` : ""}.`,
    execute: async (scope, args) => {
      const title = asString(args.title);
      const startsAt = asString(args.startsAt);
      if (!title || !startsAt) return { ok: false, error: "I need a title and a start time to schedule this meeting." };
      const meeting = await applicationServices.meetingsRepository.create(scope, {
        title,
        startsAt,
        endsAt: asString(args.endsAt),
        agenda: asString(args.agenda),
      });
      return { ok: true, entityId: meeting.id, entityLabel: meeting.title };
    },
  },
  {
    action: "create_project",
    section: "projects",
    summarize: (args) => `Create project "${asString(args.name) ?? "(untitled)"}".`,
    execute: async (scope, args) => {
      const name = asString(args.name);
      if (!name) return { ok: false, error: "I need a project name to create this." };
      const project = await applicationServices.projectsRepository.create(scope, {
        name,
        description: asString(args.description),
        dueDate: asString(args.dueDate),
        priority: asPriority(args.priority),
      });
      return { ok: true, entityId: project.id, entityLabel: project.name };
    },
  },
  {
    action: "create_stakeholder",
    section: "stakeholders",
    summarize: (args) => `Add stakeholder "${asString(args.name) ?? "(unnamed)"}".`,
    execute: async (scope, args) => {
      const name = asString(args.name);
      if (!name) return { ok: false, error: "I need a name to add this stakeholder." };
      const stakeholder = await applicationServices.stakeholdersRepository.create(scope, {
        name,
        affiliation: asString(args.affiliation) ?? "",
      });
      return { ok: true, entityId: stakeholder.id, entityLabel: stakeholder.name };
    },
  },
  {
    action: "update_task_status",
    section: "tasks",
    summarize: (args) => `Mark task "${asString(args.taskTitle) ?? "(unspecified)"}" as ${asString(args.status) ?? "(unspecified)"}.`,
    execute: async (scope, args) => {
      const titleQuery = asString(args.taskTitle);
      const status = asTaskStatus(args.status);
      if (!titleQuery || !status) return { ok: false, error: "I need a task title and a valid status to update this." };

      const matches = await applicationServices.tasksRepository.list(scope, { search: titleQuery });
      if (matches.length === 0) return { ok: false, error: `I couldn't find a task matching "${titleQuery}".` };
      if (matches.length > 1) return { ok: false, error: `That matched ${matches.length} tasks -- be more specific about which one.` };

      const updated = await applicationServices.tasksRepository.update(scope, matches[0].id, { status });
      return { ok: true, entityId: updated.id, entityLabel: updated.title };
    },
  },
  {
    action: "add_stakeholder_note",
    section: "stakeholders",
    summarize: (args) => `Add note "${asString(args.title) ?? "(untitled)"}" to Stakeholders.`,
    execute: async (_scope, args) => {
      const title = asString(args.title);
      const body = asString(args.body);
      if (!title || !body) return { ok: false, error: "I need both a title and note text to save this." };

      // stakeholderNotesRepository is service-role (bypasses RLS) -- only reachable through this
      // existing session-authenticated route, never called directly from client code.
      const response = await fetch("/api/stakeholders/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({} as { error?: string }));
        return { ok: false, error: typeof payload.error === "string" ? payload.error : "Couldn't save that note." };
      }
      const payload = await response.json() as { note: { id: string; title: string } };
      return { ok: true, entityId: payload.note.id, entityLabel: payload.note.title };
    },
  },
];

export function findChatCommand(action: string): ChatCommandDefinition | undefined {
  return chatCommandRegistry.find((definition) => definition.action === action);
}

export const chatCommandCatalogue = [
  { action: "create_task", description: "Create a task.", argsHint: "title (required), description, assigneeId, projectId, dueDate (ISO date), priority (low|medium|high|urgent)" },
  { action: "create_meeting", description: "Schedule a meeting.", argsHint: "title (required), startsAt (required, ISO datetime), endsAt (ISO datetime), agenda" },
  { action: "create_project", description: "Create a project.", argsHint: "name (required), description, dueDate (ISO date), priority (low|medium|high|urgent)" },
  { action: "create_stakeholder", description: "Add a stakeholder contact.", argsHint: "name (required), affiliation" },
  { action: "update_task_status", description: "Change an existing task's status.", argsHint: "taskTitle (required, text to search for), status (required: pending|in-progress|blocked|completed)" },
  { action: "add_stakeholder_note", description: "Save a note against Stakeholders.", argsHint: "title (required), body (required)" },
];
