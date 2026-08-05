"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckSquare } from "lucide-react";
import { useAuth } from "../../../auth/AuthProvider";
import { applicationServices } from "../../../providers/serviceProvider";
import { tenantScopeFromUser } from "../../../repositories/supabaseEnterpriseRepositories";
import type { Task } from "../../../domain";

// XL-6 (2026-08-06): AXXESS Lite's own Work section -- tasks and reminders, wired to the same
// tasksRepository X0's TasksSection uses (src/providers/serviceProvider.ts), not a duplicate
// store. Deliberately does not reuse TasksSection.tsx itself: that component pulls in a project/
// program/user picker, an agentic-draft handoff, and a workflow-timeline panel, none of which fit
// "useful in 10 minutes." AXXESS has no dedicated Reminder entity -- a reminder here is honestly a
// task with a due date, stated in the UI, not silently reinterpreted.
//
// Backend requires assigneeId (see TasksSection.tsx's own validation) -- Lite defaults it to the
// current signed-in user (a real id, self-assignment), never a fake or placeholder id.
export function LiteWorkSection() {
  const { session } = useAuth();
  const user = session.user;
  const scope = useMemo(() => (user ? tenantScopeFromUser(user) : undefined), [user]);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isReminder, setIsReminder] = useState(false);

  const load = useCallback(async () => {
    if (!scope) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await applicationServices.tasksRepository.list(scope);
      setTasks(rows);
    } catch {
      setError("Couldn't load your tasks right now.");
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    if (!scope || !user || !title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await applicationServices.tasksRepository.create(scope, {
        title: title.trim(),
        description: "",
        status: "pending",
        priority: "medium",
        assigneeId: user.id,
        dueDate: dueDate || undefined,
        tags: isReminder ? ["reminder"] : [],
      });
      setTasks((current) => [created, ...current]);
      setTitle("");
      setDueDate("");
      setIsReminder(false);
    } catch {
      setError("Couldn't save that -- please try again.");
    } finally {
      setSaving(false);
    }
  };

  const markDone = async (task: Task) => {
    if (!scope) return;
    try {
      const updated = await applicationServices.tasksRepository.update(scope, task.id, { status: "completed" });
      setTasks((current) => current.map((row) => (row.id === updated.id ? updated : row)));
    } catch {
      setError("Couldn't update that task -- please try again.");
    }
  };

  const openTasks = tasks.filter((task) => task.status !== "completed");
  const doneTasks = tasks.filter((task) => task.status === "completed");

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <div>
        <h1 className="text-sm font-semibold text-[#0F1117]">Work</h1>
        <p className="mt-0.5 text-xs text-[#5F6B73]">Tasks and reminders. A reminder is a task with a due date -- AXXESS Lite doesn&apos;t have a separate reminder type.</p>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-3.5">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What needs doing?"
          className="rounded-lg border border-[rgba(0,0,0,0.1)] px-3 py-2 text-xs outline-none focus:border-[#8B1E2D]"
        />
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            className="flex-1 rounded-lg border border-[rgba(0,0,0,0.1)] px-3 py-2 text-xs outline-none focus:border-[#8B1E2D]"
          />
          <label className="flex items-center gap-1.5 text-[11px] text-[#5F6B73]">
            <input type="checkbox" checked={isReminder} onChange={(event) => setIsReminder(event.target.checked)} />
            Reminder
          </label>
        </div>
        <button
          onClick={submit}
          disabled={saving || !title.trim()}
          className="rounded-lg bg-[#8B1E2D] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
        >
          {saving ? "Saving..." : "Add task"}
        </button>
        {error && <p className="text-[11px] text-[#B54708]">{error}</p>}
      </div>

      {loading ? (
        <p className="text-center text-xs text-[#5F6B73]">Loading...</p>
      ) : tasks.length === 0 ? (
        <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white px-6 py-8 text-center">
          <CheckSquare size={20} className="mx-auto mb-2 text-[#8B1E2D]" />
          <p className="text-xs text-[#5F6B73]">No tasks yet. Add your first one above.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {openTasks.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-[rgba(0,0,0,0.06)] bg-white">
              {openTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between gap-2 border-b border-[rgba(0,0,0,0.04)] px-4 py-3 last:border-b-0">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-[#0F1117]">{task.title}</p>
                    {task.dueDate && <p className="text-[10px] text-[#5F6B73]">Due {task.dueDate.slice(0, 10)}</p>}
                  </div>
                  <button
                    onClick={() => markDone(task)}
                    className="flex-shrink-0 rounded-lg border border-[rgba(0,0,0,0.1)] px-2.5 py-1 text-[10px] font-medium text-[#5F6B73] hover:border-[#8B1E2D] hover:text-[#8B1E2D]"
                  >
                    Done
                  </button>
                </div>
              ))}
            </div>
          )}
          {doneTasks.length > 0 && (
            <p className="px-1 text-[10px] text-[#5F6B73]">{doneTasks.length} completed</p>
          )}
        </div>
      )}
    </div>
  );
}
