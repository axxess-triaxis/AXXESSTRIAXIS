"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, Plus } from "lucide-react";
import type { Reminder, Task } from "../../../domain";
import { applicationServices } from "../../../providers/serviceProvider";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { EmptyState } from "../../../components/feedback/EmptyState";
import { MobileActionButton } from "../MobileActionButton";
import { useMobileTenantScope } from "../useMobileTenantScope";
import { useMobileTabletLayout } from "../useMobileTabletLayout";
import { readAndClearAgenticDraft } from "../../../services/agentic/agenticDraftHandoff";

type TabId = "tasks" | "reminders";

// MN-2 (2026-08-23): real Tasks + Reminders workflow -- list/filter/create/complete/detail against
// the same tasksRepository/remindersRepository every desktop TasksSection.tsx already uses (see
// packages/core/src/repositories/interfaces.ts's MutableTenantRepository<Task|Reminder>). No mobile
// shortcut model: create/update calls the identical repository methods with the identical shape.
export function MobileTasksScreen() {
  const scope = useMobileTenantScope();
  const isTablet = useMobileTabletLayout();

  const [tab, setTab] = useState<TabId>("tasks");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  // MN-2 (2026-08-23): consumes the same sessionStorage handoff desktop TasksSection.tsx already
  // reads (src/services/agentic/agenticDraftHandoff.ts) -- lets "Create task from this answer" in
  // MobileAskAiScreen pre-fill (never auto-submit) a real task draft here.
  useEffect(() => {
    const draft = readAndClearAgenticDraft("task");
    if (draft) {
      setNewTitle(draft.summary.slice(0, 200));
      setShowCreate(true);
      setTab("tasks");
    }
  }, []);

  useEffect(() => {
    if (!scope) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      applicationServices.tasksRepository.list(scope, { pageSize: 100 }),
      applicationServices.remindersRepository.list(scope, { pageSize: 100 }),
    ])
      .then(([taskRows, reminderRows]) => {
        if (cancelled) return;
        setTasks(taskRows);
        setReminders(reminderRows);
      })
      .catch(() => {
        if (cancelled) return;
        setTasks([]);
        setReminders([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scope]);

  const openTasks = useMemo(() => tasks.filter((t) => t.status !== "completed"), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((t) => t.status === "completed"), [tasks]);
  const selectedTask = useMemo(() => tasks.find((t) => t.id === selectedTaskId), [tasks, selectedTaskId]);

  async function handleCreateTask() {
    if (!scope || !newTitle.trim()) return;
    setSaving(true);
    try {
      const created = await applicationServices.tasksRepository.create(scope, {
        title: newTitle.trim(),
        status: "pending",
        priority: "medium",
        dueDate: newDueDate ? new Date(newDueDate).toISOString() : undefined,
        tags: [],
      });
      setTasks((prev) => [created, ...prev]);
      setNewTitle("");
      setNewDueDate("");
      setShowCreate(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleComplete(task: Task) {
    if (!scope) return;
    const nextStatus = task.status === "completed" ? "pending" : "completed";
    const updated = await applicationServices.tasksRepository.update(scope, task.id, { status: nextStatus });
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
  }

  async function handleToggleReminder(reminder: Reminder) {
    if (!scope) return;
    const nextStatus = reminder.status === "completed" ? "pending" : "completed";
    const updated = await applicationServices.remindersRepository.update(scope, reminder.id, { status: nextStatus });
    setReminders((prev) => prev.map((r) => (r.id === reminder.id ? updated : r)));
  }

  if (loading) return <LoadingState label="Tasks" />;

  const taskListPanel = (
    <div className="flex flex-col gap-4 px-4 py-4">
      <div className="flex gap-2">
        <button
          onClick={() => setTab("tasks")}
          className={`min-h-[36px] flex-1 rounded-lg text-xs font-semibold ${tab === "tasks" ? "bg-[#8B1E2D] text-white" : "bg-white text-[#5F6B73] border border-[rgba(15,17,23,0.1)]"}`}
        >
          Tasks ({openTasks.length})
        </button>
        <button
          onClick={() => setTab("reminders")}
          className={`min-h-[36px] flex-1 rounded-lg text-xs font-semibold ${tab === "reminders" ? "bg-[#8B1E2D] text-white" : "bg-white text-[#5F6B73] border border-[rgba(15,17,23,0.1)]"}`}
        >
          Reminders ({reminders.length})
        </button>
      </div>

      {tab === "tasks" && (
        <>
          {showCreate ? (
            <div className="flex flex-col gap-2 rounded-xl border border-[rgba(15,17,23,0.1)] bg-white p-3">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Task title"
                className="min-h-[44px] rounded-lg border border-[rgba(15,17,23,0.12)] px-3 text-sm"
              />
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="min-h-[44px] rounded-lg border border-[rgba(15,17,23,0.12)] px-3 text-sm"
              />
              <div className="flex gap-2">
                <MobileActionButton onClick={handleCreateTask} disabled={saving || !newTitle.trim()} className="flex-1">
                  {saving ? "Saving…" : "Save task"}
                </MobileActionButton>
                <MobileActionButton variant="secondary" onClick={() => setShowCreate(false)}>Cancel</MobileActionButton>
              </div>
            </div>
          ) : (
            <MobileActionButton onClick={() => setShowCreate(true)} className="w-full justify-center">
              <Plus size={16} /> New task
            </MobileActionButton>
          )}

          {openTasks.length === 0 && completedTasks.length === 0 ? (
            <EmptyState title="No tasks yet" message="Tasks assigned to your organization will appear here." />
          ) : (
            <div className="flex flex-col gap-2">
              {[...openTasks, ...completedTasks].map((task) => (
                <button
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className={`flex min-h-[52px] w-full items-center gap-3 rounded-xl border bg-white px-3.5 py-3 text-left ${selectedTaskId === task.id && isTablet ? "border-[#8B1E2D]" : "border-[rgba(15,17,23,0.08)]"}`}
                >
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={task.status === "completed" ? "Mark task incomplete" : "Mark task complete"}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleToggleComplete(task);
                    }}
                    className="flex-shrink-0"
                  >
                    {task.status === "completed" ? (
                      <CheckCircle2 size={20} className="text-[#2E7D32]" />
                    ) : (
                      <Circle size={20} className="text-[#5F6B73]" />
                    )}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className={`block truncate text-sm font-medium ${task.status === "completed" ? "text-[#5F6B73] line-through" : "text-[#0F1117]"}`}>
                      {task.title}
                    </span>
                    <span className="block text-[11px] text-[#5F6B73]">
                      {task.priority} priority{task.dueDate ? ` · due ${new Date(task.dueDate).toLocaleDateString()}` : ""}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "reminders" && (
        reminders.length === 0 ? (
          <EmptyState title="No reminders" message="Reminders you create will appear here with their due time." />
        ) : (
          <div className="flex flex-col gap-2">
            {reminders.map((reminder) => (
              <div key={reminder.id} className="flex min-h-[52px] items-center gap-3 rounded-xl border border-[rgba(15,17,23,0.08)] bg-white px-3.5 py-3">
                <button
                  onClick={() => void handleToggleReminder(reminder)}
                  aria-label={reminder.status === "completed" ? "Mark reminder pending" : "Mark reminder complete"}
                >
                  {reminder.status === "completed" ? (
                    <CheckCircle2 size={20} className="text-[#2E7D32]" />
                  ) : (
                    <Circle size={20} className="text-[#5F6B73]" />
                  )}
                </button>
                <span className="flex-1 min-w-0">
                  <span className={`block truncate text-sm font-medium ${reminder.status === "completed" ? "text-[#5F6B73] line-through" : "text-[#0F1117]"}`}>
                    {reminder.title}
                  </span>
                  <span className="block text-[11px] text-[#5F6B73]">
                    {new Date(reminder.remindAt).toLocaleString()} · {reminder.recurrence}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );

  const detailPanel = selectedTask ? (
    <div className="flex flex-col gap-3 px-4 py-4">
      <h2 className="text-base font-semibold text-[#0F1117]">{selectedTask.title}</h2>
      {selectedTask.description && <p className="text-sm text-[#5F6B73]">{selectedTask.description}</p>}
      <dl className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="text-[#5F6B73]">Status</dt>
          <dd className="font-medium text-[#0F1117]">{selectedTask.status}</dd>
        </div>
        <div>
          <dt className="text-[#5F6B73]">Priority</dt>
          <dd className="font-medium text-[#0F1117]">{selectedTask.priority}</dd>
        </div>
        <div>
          <dt className="text-[#5F6B73]">Due date</dt>
          <dd className="font-medium text-[#0F1117]">{selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : "None"}</dd>
        </div>
      </dl>
      <MobileActionButton onClick={() => void handleToggleComplete(selectedTask)} className="w-full justify-center">
        {selectedTask.status === "completed" ? "Mark incomplete" : "Mark complete"}
      </MobileActionButton>
      {!isTablet && (
        <MobileActionButton variant="secondary" onClick={() => setSelectedTaskId(null)} className="w-full justify-center">
          Back to list
        </MobileActionButton>
      )}
    </div>
  ) : (
    <EmptyState title="Select a task" message="Choose a task from the list to see its details." />
  );

  if (isTablet) {
    return (
      <div className="flex h-full">
        <div className="w-[42%] flex-shrink-0 overflow-y-auto border-r border-[rgba(0,0,0,0.06)]">{taskListPanel}</div>
        <div className="flex-1 overflow-y-auto">{detailPanel}</div>
      </div>
    );
  }

  return selectedTaskId && tab === "tasks" ? detailPanel : taskListPanel;
}
