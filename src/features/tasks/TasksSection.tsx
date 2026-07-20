import { Check, CheckSquare, Edit3, Filter, Plus, Save, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { isDemoModeEnabled } from "../../demo/demoMode";
import { InlineToast } from "../../components/forms/InlineToast";
import { SelectField, TextAreaField, TextField } from "../../components/forms/FormField";
import { BetaFeedbackModal } from "../../components/feedback/BetaFeedbackModal";
import { EmptyState } from "../../components/feedback/EmptyState";
import { LoadingState } from "../../components/feedback/LoadingState";
import { DataStateBadge, DemoDataNotice, ModuleHeader, PageShell, TenantScopeBadge, WorkflowStepCard } from "../../components/enterprise";
import { WorkflowTimelinePanel } from "../../components/enterprise/WorkflowTimelinePanel";
import { Avatar } from "../../components/ui/Avatar";
import { Card } from "../../components/ui/Card";
import { RiskBadge } from "../../components/ui/RiskBadge";
import { StatusBadge } from "../../components/ui/StatusBadge";
import type { Program, Project, Task, User } from "../../domain";
import { applicationServices } from "../../providers/serviceProvider";
import { tenantScopeFromUser } from "../../repositories/supabaseEnterpriseRepositories";
import { useAnalytics } from "../../services/analytics";
import { demoAuditTimeline } from "../../lib/demo/demoActivity";
import { useWorkflowTimeline } from "../../hooks/useWorkflowTimeline";

type TaskFormState = {
  title: string;
  description: string;
  status: Task["status"];
  priority: Task["priority"];
  assigneeId: string;
  programId: string;
  projectId: string;
  dueDate: string;
  tags: string;
};

const taskStatuses: { value: Task["status"]; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "in-progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "completed", label: "Completed" },
];

const priorities = ["urgent", "high", "medium", "low"].map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }));

function statusLabel(status: Task["status"]) {
  if (status === "in-progress") return "In Progress";
  if (status === "blocked") return "At Risk";
  if (status === "completed") return "Completed";
  return "Pending";
}

function taskForm(task?: Task): TaskFormState {
  return {
    title: task?.title ?? "",
    description: task?.description ?? "",
    status: task?.status ?? "pending",
    priority: task?.priority ?? "medium",
    assigneeId: task?.assigneeId ?? "",
    programId: task?.programId ?? "",
    projectId: task?.projectId ?? "",
    dueDate: task?.dueDate?.slice(0, 10) ?? "",
    tags: task?.tags.join(", ") ?? "",
  };
}

function tagArray(tags: string) {
  return tags.split(",").map((tag) => tag.trim()).filter(Boolean);
}

export const TasksSection = () => {
  const { session } = useAuth();
  const analytics = useAnalytics();
  const user = session.user;
  const scope = useMemo(() => user ? tenantScopeFromUser(user) : undefined, [user]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>();
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [form, setForm] = useState<TaskFormState>(() => taskForm());
  const [toast, setToast] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCompletionFeedbackPrompt, setShowCompletionFeedbackPrompt] = useState(false);
  const [completionFeedbackPromptShown, setCompletionFeedbackPromptShown] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const taskTimeline = useWorkflowTimeline(scope, { limit: 5, resourceType: selectedTask ? "task" : undefined, resourceId: selectedTask?.id });

  const canManageTasks = Boolean(user && ["Super Admin", "Organization Admin", "Executive", "Manager", "Employee"].includes(user.role));

  const loadTasks = useCallback(async () => {
    if (!scope) return;
    setLoading(true);
    setToast(null);
    try {
      const [taskRows, projectRows, programRows, userRows] = await Promise.all([
        applicationServices.tasksRepository.list(scope),
        applicationServices.projectsRepository.list(scope),
        applicationServices.programsRepository.list(scope),
        applicationServices.usersRepository.listByOrganization(scope),
      ]);
      setTasks(taskRows);
      setProjects(projectRows);
      setPrograms(programRows);
      setUsers(userRows);
    } catch {
      setToast({ tone: "error", message: "Unable to load task workflow data." });
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const openForm = (task?: Task) => {
    setErrors({});
    setEditingTask(task);
    setSelectedTask(task);
    setForm(taskForm(task));
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.title.trim()) nextErrors.title = "Task title is required.";
    if (!form.assigneeId) nextErrors.assigneeId = "Assignee is required.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 && user) {
      analytics.trackEvent("form_validation_failed", { form_name: "task", fields: Object.keys(nextErrors) }, {
        organization_id: user.organizationId,
        user_id: user.id,
        user_role: user.role,
        module_name: "tasks",
        route: "/tasks",
      });
    }
    return Object.keys(nextErrors).length === 0;
  };

  const submitTask = async () => {
    if (!scope || !validate()) return;
    setSaving(true);
    setToast(null);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        status: form.status,
        priority: form.priority,
        assigneeId: form.assigneeId,
        programId: form.programId || undefined,
        projectId: form.projectId || undefined,
        dueDate: form.dueDate || undefined,
        tags: tagArray(form.tags),
      };
      const saved = editingTask
        ? await applicationServices.tasksRepository.update(scope, editingTask.id, payload)
        : await applicationServices.tasksRepository.create(scope, payload);
      analytics.trackEvent(editingTask ? "task_updated" : "task_created", {
        task_id: saved.id,
        status: saved.status,
        priority: saved.priority,
      }, {
        organization_id: saved.organizationId,
        user_id: scope.userId,
        user_role: scope.role,
        module_name: "tasks",
        route: "/tasks",
      });
      if (saved.assigneeId) {
        analytics.trackEvent("task_assigned", {
          task_id: saved.id,
          assigned_user_id: saved.assigneeId,
        }, {
          organization_id: saved.organizationId,
          user_id: scope.userId,
          user_role: scope.role,
          module_name: "tasks",
          route: "/tasks",
        });
      }
      setSelectedTask(saved);
      setEditingTask(undefined);
      setToast({ tone: "success", message: editingTask ? "Task updated." : "Task created." });
      await loadTasks();
    } catch {
      setToast({ tone: "error", message: "Task could not be saved. Check permissions and required fields." });
    } finally {
      setSaving(false);
    }
  };

  const toggleTaskStatus = async (task: Task) => {
    if (!scope || !canManageTasks) return;
    const nextStatus: Task["status"] = task.status === "completed" ? "pending" : "completed";
    try {
      const saved = await applicationServices.tasksRepository.update(scope, task.id, { status: nextStatus });
      analytics.trackEvent("task_status_changed", {
        task_id: saved.id,
        previous_status: task.status,
        next_status: saved.status,
      }, {
        organization_id: saved.organizationId,
        user_id: scope.userId,
        user_role: scope.role,
        module_name: "tasks",
        route: "/tasks",
      });
      setTasks((current) => current.map((row) => row.id === saved.id ? saved : row));
      setSelectedTask(saved);
      setToast({ tone: "success", message: "Task status updated." });
      if (nextStatus === "completed") {
        analytics.trackEvent("workflow_action_completed", { task_id: saved.id }, {
          organization_id: saved.organizationId,
          user_id: scope.userId,
          user_role: scope.role,
          module_name: "tasks",
          route: "/tasks",
        });
        if (!completionFeedbackPromptShown) {
          setShowCompletionFeedbackPrompt(true);
          setCompletionFeedbackPromptShown(true);
        }
      }
    } catch {
      setToast({ tone: "error", message: "Unable to update task status." });
    }
  };

  const priorityOrder = ["urgent", "high", "medium", "low"];
  const sorted = [...tasks].sort((a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority));
  const assigneeOptions = [{ value: "", label: "Unassigned" }, ...users.map((assignee) => ({ value: assignee.id, label: `${assignee.displayName} (${assignee.role})` }))];
  const projectOptions = [{ value: "", label: "No project" }, ...projects.map((project) => ({ value: project.id, label: project.name }))];
  const programOptions = [{ value: "", label: "No program" }, ...programs.map((program) => ({ value: program.id, label: program.name }))];

  if (loading) return <LoadingState label="Loading task workflows" />;

  const demoMode = isDemoModeEnabled();

  return (
    <PageShell className="h-full min-h-0">
      <ModuleHeader
        title="Tasks & Workflow"
        eyebrow="Accountable follow-through"
        description={`${tasks.length} active tasks across ${projects.length} projects. Tasks can be created from AI answers, linked to documents, escalated to approvals, and reflected in activity history.`}
        badges={[
          <TenantScopeBadge key="tenant" />,
          <DataStateBadge key="demo" state={demoMode ? "Demo" : "Live"} />,
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 rounded-lg border border-[rgba(0,0,0,0.1)] px-3 py-1.5 text-xs text-[#5F6B73] hover:bg-[#F2F3F5]">
              <Filter size={12} /> Filter
            </button>
            <button
              onClick={() => openForm()}
              disabled={!canManageTasks}
              className="flex items-center gap-1.5 rounded-lg bg-[#8B1E2D] px-3 py-1.5 text-xs text-white hover:bg-[#7a1a27] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={12} /> New Task
            </button>
          </div>
        }
      />

      {demoMode && (
        <>
          <DemoDataNotice label="The workflow surface demonstrates how AI output becomes assigned work, approval requests, and audit history rather than static analysis." />
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {demoAuditTimeline.map((item, index) => (
              <WorkflowStepCard key={item.title} index={index + 1} title={item.title} description={item.description ?? ""} status={item.tone === "warning" ? "Human Review" : "Complete"} />
            ))}
          </div>
        </>
      )}

      <div className="grid min-h-[520px] grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          {toast && <div className="mb-3"><InlineToast tone={toast.tone} message={toast.message} /></div>}
          {showCompletionFeedbackPrompt && (
            <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 py-2 text-xs">
              <span className="text-[#5F6B73]">Task completed! Got a moment to share feedback on this workflow?</span>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setFeedbackModalOpen(true)} className="font-semibold text-[#8B1E2D] hover:underline">
                  Send feedback
                </button>
                <button type="button" onClick={() => setShowCompletionFeedbackPrompt(false)} aria-label="Dismiss" className="text-[#5F6B73] hover:text-[#0F1117]">
                  <X size={12} />
                </button>
              </div>
            </div>
          )}
          {feedbackModalOpen && user && (
            <BetaFeedbackModal
              user={user}
              moduleName="Tasks"
              route="/tasks"
              onClose={() => {
                setFeedbackModalOpen(false);
                setShowCompletionFeedbackPrompt(false);
              }}
            />
          )}
          <Card className="overflow-hidden">
            <div className="flex items-center gap-4 border-b border-[rgba(0,0,0,0.06)] bg-[#F8F9FA] px-4 py-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5F6B73]">Task</span>
              <span className="ml-auto hidden text-[11px] font-semibold uppercase tracking-wider text-[#5F6B73] lg:block">Project</span>
              <span className="hidden w-20 text-center text-[11px] font-semibold uppercase tracking-wider text-[#5F6B73] lg:block">Priority</span>
              <span className="w-20 text-center text-[11px] font-semibold uppercase tracking-wider text-[#5F6B73]">Assignee</span>
              <span className="w-24 text-right text-[11px] font-semibold uppercase tracking-wider text-[#5F6B73]">Due Date</span>
            </div>
            {sorted.length === 0 && (
              <div className="p-8">
                <EmptyState
                  icon={<CheckSquare size={28} />}
                  title="No tasks yet"
                  message="Create your first task to start assigning and tracking accountable work."
                  action={
                    <button
                      type="button"
                      disabled={!canManageTasks}
                      onClick={() => openForm()}
                      className="flex items-center gap-1.5 rounded-lg bg-[#8B1E2D] px-3 py-1.5 text-xs text-white hover:bg-[#7a1a27] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Plus size={12} /> Create your first task
                    </button>
                  }
                />
              </div>
            )}
            {sorted.map((task) => {
              const assignee = users.find((row) => row.id === task.assigneeId);
              const project = projects.find((row) => row.id === task.projectId);
              const completed = task.status === "completed";
              return (
                <div key={task.id} className={`flex items-center gap-3 border-b border-[rgba(0,0,0,0.04)] px-4 py-3 transition-colors hover:bg-[#F8F9FA] ${completed ? "opacity-60" : ""}`}>
                  <button
                    onClick={() => void toggleTaskStatus(task)}
                    className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors ${completed ? "border-emerald-500 bg-emerald-500" : "border-[rgba(0,0,0,0.2)] hover:border-[#8B1E2D]"}`}
                    aria-label={completed ? "Reopen task" : "Complete task"}
                  >
                    {completed && <Check size={9} className="text-white" />}
                  </button>
                  <button onClick={() => setSelectedTask(task)} className="min-w-0 flex-1 text-left">
                    <span className={`block truncate text-sm font-medium text-[#0F1117] ${completed ? "line-through" : ""}`}>{task.title}</span>
                    <span className="text-[10px] text-[#5F6B73]">{statusLabel(task.status)}</span>
                  </button>
                  <span className="hidden w-40 truncate text-[11px] text-[#5F6B73] lg:block">{project?.name ?? "Unlinked"}</span>
                  <div className="hidden w-20 justify-center text-center lg:flex"><RiskBadge level={task.priority} /></div>
                  <div className="flex w-20 justify-center"><Avatar initials={assignee?.avatarInitials ?? "UA"} /></div>
                  <span className="w-24 text-right font-mono text-[11px] text-[#5F6B73]">{task.dueDate?.slice(5) ?? "TBD"}</span>
                </div>
              );
            })}
          </Card>
        </div>

        <Card className="h-full overflow-y-auto p-4">
          {editingTask || !selectedTask ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#0F1117]">{editingTask ? "Edit Task" : "New Task"}</h3>
                {editingTask && <button onClick={() => setEditingTask(undefined)} className="rounded-lg p-1.5 text-[#5F6B73] hover:bg-[#F2F3F5]"><X size={14} /></button>}
              </div>
              <TextField label="Title" value={form.title} error={errors.title} onChange={(event) => setForm({ ...form, title: event.target.value })} disabled={!canManageTasks || saving} />
              <TextAreaField label="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} disabled={!canManageTasks || saving} />
              <SelectField label="Assignee" value={form.assigneeId} error={errors.assigneeId} options={assigneeOptions} onChange={(event) => setForm({ ...form, assigneeId: event.target.value })} disabled={!canManageTasks || saving} />
              <div className="grid grid-cols-2 gap-3">
                <SelectField label="Status" value={form.status} options={taskStatuses} onChange={(event) => setForm({ ...form, status: event.target.value as Task["status"] })} disabled={!canManageTasks || saving} />
                <SelectField label="Priority" value={form.priority} options={priorities} onChange={(event) => setForm({ ...form, priority: event.target.value as Task["priority"] })} disabled={!canManageTasks || saving} />
              </div>
              <SelectField label="Project" value={form.projectId} options={projectOptions} onChange={(event) => setForm({ ...form, projectId: event.target.value })} disabled={!canManageTasks || saving} />
              <SelectField label="Program" value={form.programId} options={programOptions} onChange={(event) => setForm({ ...form, programId: event.target.value })} disabled={!canManageTasks || saving} />
              <TextField label="Due Date" type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} disabled={!canManageTasks || saving} />
              <TextField label="Tags" value={form.tags} placeholder="maternal-referral, sla" onChange={(event) => setForm({ ...form, tags: event.target.value })} disabled={!canManageTasks || saving} />
              <button
                onClick={submitTask}
                disabled={!canManageTasks || saving}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#8B1E2D] px-3 py-2 text-xs font-semibold text-white hover:bg-[#7a1a27] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={13} /> {saving ? "Saving..." : "Save Task"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5F6B73]">Task Details</p>
                  <h3 className="mt-1 text-base font-semibold leading-snug text-[#0F1117]">{selectedTask.title}</h3>
                </div>
                <button
                  onClick={() => openForm(selectedTask)}
                  disabled={!canManageTasks}
                  className="flex items-center gap-1 rounded-lg border border-[rgba(0,0,0,0.1)] px-2 py-1.5 text-xs font-semibold text-[#5F6B73] hover:bg-[#F2F3F5] disabled:opacity-60"
                >
                  <Edit3 size={12} /> Edit
                </button>
              </div>
              <p className="text-xs leading-relaxed text-[#5F6B73]">{selectedTask.description || "No description recorded."}</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-[#F8F9FA] p-3"><span className="block text-[10px] uppercase text-[#5F6B73]">Status</span><StatusBadge status={statusLabel(selectedTask.status)} /></div>
                <div className="rounded-lg bg-[#F8F9FA] p-3"><span className="block text-[10px] uppercase text-[#5F6B73]">Priority</span><RiskBadge level={selectedTask.priority} /></div>
                <div className="rounded-lg bg-[#F8F9FA] p-3"><span className="block text-[10px] uppercase text-[#5F6B73]">Assignee</span><span className="font-semibold text-[#0F1117]">{users.find((row) => row.id === selectedTask.assigneeId)?.displayName ?? "Unassigned"}</span></div>
                <div className="rounded-lg bg-[#F8F9FA] p-3"><span className="block text-[10px] uppercase text-[#5F6B73]">Due</span><span className="font-mono text-[#0F1117]">{selectedTask.dueDate?.slice(0, 10) ?? "TBD"}</span></div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedTask.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-[#F2F3F5] px-2 py-1 text-[10px] font-medium text-[#5F6B73]">{tag}</span>
                ))}
              </div>
              <WorkflowTimelinePanel
                title="Task timeline"
                description="Source, approval, work update, and audit evidence linked to this task."
                events={taskTimeline.timeline}
                compact
                framed={false}
              />
            </div>
          )}
        </Card>
      </div>
    </PageShell>
  );
};

export default TasksSection;
