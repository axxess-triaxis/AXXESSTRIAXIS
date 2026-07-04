import { Edit3, Plus, Save, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { InlineToast } from "../../components/forms/InlineToast";
import { SelectField, TextAreaField, TextField } from "../../components/forms/FormField";
import { LoadingState } from "../../components/feedback/LoadingState";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { Avatar } from "../../components/ui/Avatar";
import { Card } from "../../components/ui/Card";
import { RiskBadge } from "../../components/ui/RiskBadge";
import { StatusBadge } from "../../components/ui/StatusBadge";
import type { Organization, Program, Project, User } from "../../domain";
import { applicationServices } from "../../providers/serviceProvider";
import { ownerInitialsForProject, projectDepartment, tenantScopeFromUser } from "../../repositories/supabaseEnterpriseRepositories";
import { useAnalytics } from "../../services/analytics";

type ProjectFormState = {
  organizationId: string;
  programId: string;
  name: string;
  description: string;
  ownerId: string;
  status: Project["status"];
  priority: Project["priority"];
  riskLevel: Project["riskLevel"];
  startDate: string;
  dueDate: string;
  tags: string;
};

const projectStatuses: { value: Project["status"]; label: string }[] = [
  { value: "planning", label: "Planning" },
  { value: "in-progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "at-risk", label: "At Risk" },
  { value: "complete", label: "Complete" },
];

const priorities = ["low", "medium", "high", "urgent"].map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }));

function statusLabel(status: Project["status"]) {
  if (status === "in-progress") return "In Progress";
  if (status === "at-risk") return "At Risk";
  if (status === "complete") return "Complete";
  if (status === "review") return "Review";
  return "Planning";
}

function projectForm(project: Project | undefined, organizationId: string, userId: string): ProjectFormState {
  return {
    organizationId: project?.organizationId ?? organizationId,
    programId: project?.programId ?? "",
    name: project?.name ?? "",
    description: project?.description ?? "",
    ownerId: project?.ownerId ?? userId,
    status: project?.status ?? "planning",
    priority: project?.priority ?? "medium",
    riskLevel: project?.riskLevel ?? "medium",
    startDate: project?.startDate?.slice(0, 10) ?? "",
    dueDate: project?.dueDate?.slice(0, 10) ?? "",
    tags: project?.tags.join(", ") ?? "",
  };
}

function tagArray(tags: string) {
  return tags.split(",").map((tag) => tag.trim()).filter(Boolean);
}

export const ProjectsSection = () => {
  const { session } = useAuth();
  const analytics = useAnalytics();
  const user = session.user;
  const scope = useMemo(() => user ? tenantScopeFromUser(user) : undefined, [user]);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [projects, setProjects] = useState<Project[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | undefined>();
  const [editingProject, setEditingProject] = useState<Project | undefined>();
  const [form, setForm] = useState<ProjectFormState>(() => projectForm(undefined, user?.organizationId ?? "", user?.id ?? ""));
  const [toast, setToast] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const canManageProjects = Boolean(user && ["Super Admin", "Organization Admin", "Executive", "Manager"].includes(user.role));

  const loadProjects = useCallback(async () => {
    if (!scope) return;
    setLoading(true);
    setToast(null);
    try {
      const [projectRows, programRows, userRows, organizationRows] = await Promise.all([
        applicationServices.projectsRepository.list(scope),
        applicationServices.programsRepository.list(scope),
        applicationServices.usersRepository.listByOrganization(scope),
        applicationServices.organizationsRepository.list(scope),
      ]);
      setProjects(projectRows);
      setPrograms(programRows);
      setUsers(userRows);
      setOrganizations(organizationRows);
    } catch {
      setToast({ tone: "error", message: "Unable to load project workflow data." });
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const openForm = (project?: Project) => {
    if (!user) return;
    setErrors({});
    setEditingProject(project);
    setSelectedProject(project);
    setForm(projectForm(project, user.organizationId, user.id));
  };

  const closeForm = () => {
    setEditingProject(undefined);
    setErrors({});
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = "Project name is required.";
    if (!form.ownerId) nextErrors.ownerId = "Owner is required.";
    if (!form.organizationId) nextErrors.organizationId = "Organization is required.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 && user) {
      analytics.trackEvent("form_validation_failed", { form_name: "project", fields: Object.keys(nextErrors) }, {
        organization_id: user.organizationId,
        user_id: user.id,
        user_role: user.role,
        module_name: "projects",
        route: "/projects",
      });
    }
    return Object.keys(nextErrors).length === 0;
  };

  const submitProject = async () => {
    if (!scope || !validate()) return;
    setSaving(true);
    setToast(null);
    try {
      const payload = {
        organizationId: form.organizationId,
        programId: form.programId || undefined,
        name: form.name.trim(),
        description: form.description.trim(),
        ownerId: form.ownerId,
        status: form.status,
        priority: form.priority,
        riskLevel: form.riskLevel,
        startDate: form.startDate || undefined,
        dueDate: form.dueDate || undefined,
        tags: tagArray(form.tags),
      };
      const saved = editingProject
        ? await applicationServices.projectsRepository.update(scope, editingProject.id, payload)
        : await applicationServices.projectsRepository.create(scope, { ...payload, progress: 0 });
      analytics.trackEvent(editingProject ? "project_updated" : "project_created", {
        project_id: saved.id,
        status: saved.status,
        priority: saved.priority,
        risk_level: saved.riskLevel,
      }, {
        organization_id: saved.organizationId,
        user_id: scope.userId,
        user_role: scope.role,
        module_name: "projects",
        route: "/projects",
      });
      setSelectedProject(saved);
      setEditingProject(undefined);
      setToast({ tone: "success", message: editingProject ? "Project updated." : "Project created." });
      await loadProjects();
    } catch {
      setToast({ tone: "error", message: "Project could not be saved. Check permissions and required fields." });
    } finally {
      setSaving(false);
    }
  };

  const ownerOptions = users.map((owner) => ({ value: owner.id, label: `${owner.displayName} (${owner.role})` }));
  const organizationOptions = organizations.map((org) => ({ value: org.id, label: org.name }));
  const programOptions = [{ value: "", label: "No program" }, ...programs.map((program) => ({ value: program.id, label: program.name }))];
  const columns = [
    { label: "Planning", key: "planning", color: "#5F6B73" },
    { label: "In Progress", key: "in-progress", color: "#2C4A7C" },
    { label: "Under Review", key: "review", color: "#C9A227" },
    { label: "Complete", key: "complete", color: "#1A6B4A" },
  ] as const;

  if (loading) return <LoadingState label="Loading project workflows" />;

  return (
    <div className="h-full min-h-0">
      <SectionHeader
        title="Projects & Programs"
        subtitle={`${projects.length} active initiatives across ${organizations.length || 1} organization${organizations.length === 1 ? "" : "s"}`}
        action={
          <div className="flex items-center gap-2">
            <div className="flex overflow-hidden rounded-lg border border-[rgba(0,0,0,0.08)]">
              {(["kanban", "list"] as const).map((value) => (
                <button
                  key={value}
                  onClick={() => setView(value)}
                  className={`px-3 py-1.5 text-xs capitalize transition-colors ${view === value ? "bg-[#8B1E2D] text-white" : "text-[#5F6B73] hover:bg-[#F2F3F5]"}`}
                >
                  {value}
                </button>
              ))}
            </div>
            <button
              disabled={!canManageProjects}
              onClick={() => openForm()}
              className="flex items-center gap-1.5 rounded-lg bg-[#8B1E2D] px-3 py-1.5 text-xs text-white hover:bg-[#7a1a27] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={12} /> New Project
            </button>
          </div>
        }
      />

      <div className="grid h-[calc(100%-72px)] min-h-[520px] grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 overflow-hidden">
          {toast && <div className="mb-3"><InlineToast tone={toast.tone} message={toast.message} /></div>}
          {view === "kanban" ? (
            <div className="h-full overflow-x-auto pb-4">
              <div className="flex h-full min-w-max gap-4">
                {columns.map((column) => {
                  const columnProjects = projects.filter((project) => project.status === column.key);
                  return (
                    <div key={column.key} className="flex w-72 flex-col">
                      <div className="mb-3 flex items-center gap-2 px-1">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: column.color }} />
                        <span className="text-xs font-semibold text-[#0F1117]">{column.label}</span>
                        <span className="ml-auto rounded-full bg-[#F2F3F5] px-2 py-0.5 font-mono text-xs text-[#5F6B73]">{columnProjects.length}</span>
                      </div>
                      <div className="flex-1 space-y-3 overflow-y-auto">
                        {columnProjects.map((project) => (
                          <Card key={project.id} className="cursor-pointer p-3.5 transition-shadow hover:shadow-md">
                            <button type="button" onClick={() => {
                              setSelectedProject(project);
                              analytics.trackEvent("project_viewed", { project_id: project.id, status: project.status }, {
                                organization_id: project.organizationId,
                                user_id: user?.id,
                                user_role: user?.role,
                                module_name: "projects",
                                route: "/projects",
                              });
                            }} className="w-full text-left">
                              <div className="mb-2 flex items-start justify-between">
                                <span className="text-[10px] font-medium uppercase tracking-wide text-[#5F6B73]">{projectDepartment(project, programs)}</span>
                                <RiskBadge level={project.riskLevel} />
                              </div>
                              <h4 className="mb-3 text-sm font-semibold leading-snug text-[#0F1117]">{project.name}</h4>
                              <div className="mb-3">
                                <div className="mb-1 flex justify-between text-[10px] text-[#5F6B73]">
                                  <span>Progress</span><span className="font-mono">{project.progress}%</span>
                                </div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-[#F2F3F5]">
                                  <div className="h-full rounded-full bg-[#8B1E2D]" style={{ width: `${project.progress}%` }} />
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <Avatar initials={ownerInitialsForProject(project, users)} />
                                  <span className="text-[11px] font-medium text-[#5F6B73]">{project.priority}</span>
                                </div>
                                <div className="text-right">
                                  <div className="text-[10px] text-[#5F6B73]">Due</div>
                                  <div className="font-mono text-[11px] text-[#0F1117]">{project.dueDate?.slice(5) ?? "TBD"}</div>
                                </div>
                              </div>
                            </button>
                          </Card>
                        ))}
                        {columnProjects.length === 0 && (
                          <div className="flex h-20 items-center justify-center rounded-xl border-2 border-dashed border-[rgba(0,0,0,0.08)] text-xs text-[#5F6B73]">
                            No projects
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(0,0,0,0.06)]">
                    {["Project", "Program", "Progress", "Owner", "Risk", "Status", "Due"].map((heading) => (
                      <th key={heading} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#5F6B73] first:pl-5">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr key={project.id} onClick={() => {
                      setSelectedProject(project);
                      analytics.trackEvent("project_viewed", { project_id: project.id, status: project.status }, {
                        organization_id: project.organizationId,
                        user_id: user?.id,
                        user_role: user?.role,
                        module_name: "projects",
                        route: "/projects",
                      });
                    }} className="cursor-pointer border-b border-[rgba(0,0,0,0.04)] transition-colors hover:bg-[#F8F9FA]">
                      <td className="px-4 py-3 pl-5 text-xs font-medium text-[#0F1117]">{project.name}</td>
                      <td className="px-4 py-3 text-xs text-[#5F6B73]">{projectDepartment(project, programs)}</td>
                      <td className="px-4 py-3 text-[11px] font-mono text-[#5F6B73]">{project.progress}%</td>
                      <td className="px-4 py-3"><Avatar initials={ownerInitialsForProject(project, users)} /></td>
                      <td className="px-4 py-3"><RiskBadge level={project.riskLevel} /></td>
                      <td className="px-4 py-3"><StatusBadge status={statusLabel(project.status)} /></td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[#5F6B73]">{project.dueDate?.slice(0, 10) ?? "TBD"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>

        <Card className="h-full overflow-y-auto p-4">
          {editingProject || !selectedProject ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#0F1117]">{editingProject ? "Edit Project" : "New Project"}</h3>
                {editingProject && <button onClick={closeForm} className="rounded-lg p-1.5 text-[#5F6B73] hover:bg-[#F2F3F5]"><X size={14} /></button>}
              </div>
              <TextField label="Name" value={form.name} error={errors.name} onChange={(event) => setForm({ ...form, name: event.target.value })} disabled={!canManageProjects || saving} />
              <TextAreaField label="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} disabled={!canManageProjects || saving} />
              <SelectField label="Organization" value={form.organizationId} error={errors.organizationId} options={organizationOptions} onChange={(event) => setForm({ ...form, organizationId: event.target.value })} disabled={user?.role !== "Super Admin" || saving} />
              <SelectField label="Program" value={form.programId} options={programOptions} onChange={(event) => setForm({ ...form, programId: event.target.value })} disabled={!canManageProjects || saving} />
              <SelectField label="Owner" value={form.ownerId} error={errors.ownerId} options={ownerOptions} onChange={(event) => setForm({ ...form, ownerId: event.target.value })} disabled={!canManageProjects || saving} />
              <div className="grid grid-cols-2 gap-3">
                <SelectField label="Status" value={form.status} options={projectStatuses} onChange={(event) => setForm({ ...form, status: event.target.value as Project["status"] })} disabled={!canManageProjects || saving} />
                <SelectField label="Priority" value={form.priority} options={priorities} onChange={(event) => setForm({ ...form, priority: event.target.value as Project["priority"], riskLevel: event.target.value as Project["riskLevel"] })} disabled={!canManageProjects || saving} />
                <TextField label="Start Date" type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} disabled={!canManageProjects || saving} />
                <TextField label="Due Date" type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} disabled={!canManageProjects || saving} />
              </div>
              <TextField label="Tags" value={form.tags} placeholder="security, workflow" onChange={(event) => setForm({ ...form, tags: event.target.value })} disabled={!canManageProjects || saving} />
              <button
                onClick={submitProject}
                disabled={!canManageProjects || saving}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#8B1E2D] px-3 py-2 text-xs font-semibold text-white hover:bg-[#7a1a27] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={13} /> {saving ? "Saving..." : "Save Project"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5F6B73]">Project Details</p>
                  <h3 className="mt-1 text-base font-semibold leading-snug text-[#0F1117]">{selectedProject.name}</h3>
                </div>
                <button
                  onClick={() => openForm(selectedProject)}
                  disabled={!canManageProjects}
                  className="flex items-center gap-1 rounded-lg border border-[rgba(0,0,0,0.1)] px-2 py-1.5 text-xs font-semibold text-[#5F6B73] hover:bg-[#F2F3F5] disabled:opacity-60"
                >
                  <Edit3 size={12} /> Edit
                </button>
              </div>
              <p className="text-xs leading-relaxed text-[#5F6B73]">{selectedProject.description || "No description recorded."}</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-[#F8F9FA] p-3"><span className="block text-[10px] uppercase text-[#5F6B73]">Status</span><StatusBadge status={statusLabel(selectedProject.status)} /></div>
                <div className="rounded-lg bg-[#F8F9FA] p-3"><span className="block text-[10px] uppercase text-[#5F6B73]">Risk</span><RiskBadge level={selectedProject.riskLevel} /></div>
                <div className="rounded-lg bg-[#F8F9FA] p-3"><span className="block text-[10px] uppercase text-[#5F6B73]">Owner</span><span className="font-semibold text-[#0F1117]">{users.find((row) => row.id === selectedProject.ownerId)?.displayName ?? "Unassigned"}</span></div>
                <div className="rounded-lg bg-[#F8F9FA] p-3"><span className="block text-[10px] uppercase text-[#5F6B73]">Due</span><span className="font-mono text-[#0F1117]">{selectedProject.dueDate?.slice(0, 10) ?? "TBD"}</span></div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedProject.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-[#F2F3F5] px-2 py-1 text-[10px] font-medium text-[#5F6B73]">{tag}</span>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ProjectsSection;
