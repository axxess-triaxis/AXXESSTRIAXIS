"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { Program, Project } from "../../../domain";
import { applicationServices } from "../../../providers/serviceProvider";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { EmptyState } from "../../../components/feedback/EmptyState";
import { MobileActionButton } from "../MobileActionButton";
import { useAuth } from "../../../auth/AuthProvider";
import { useMobileTenantScope } from "../useMobileTenantScope";

const riskColor: Record<Project["riskLevel"], string> = {
  low: "bg-[#E6F4EA] text-[#2E7D32]",
  medium: "bg-[#FFF4E5] text-[#B26A00]",
  high: "bg-[#FDE7E7] text-[#B3261E]",
  urgent: "bg-[#FDE7E7] text-[#B3261E]",
};

// MN-2 (2026-08-23): real Projects workflow -- list/detail/create against projectsRepository (a
// genuine MutableTenantRepository<Project>, confirmed during MN-2 research). No budget/spend field
// exists on the real Project type at all, so this screen never shows one. Program association is
// only rendered when the project actually has a programId, resolved against the real (read-only)
// programsRepository -- never a fabricated program name.
export function MobileProjectsScreen() {
  const scope = useMobileTenantScope();
  const { session } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!scope) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      applicationServices.projectsRepository.list(scope, { pageSize: 100 }),
      applicationServices.programsRepository.list(scope, { pageSize: 100 }),
    ])
      .then(([projectRows, programRows]) => {
        if (cancelled) return;
        setProjects(projectRows);
        setPrograms(programRows);
      })
      .catch(() => {
        if (cancelled) return;
        setProjects([]);
        setPrograms([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scope]);

  const selected = useMemo(() => projects.find((p) => p.id === selectedId), [projects, selectedId]);
  const selectedProgram = useMemo(() => (selected?.programId ? programs.find((p) => p.id === selected.programId) : undefined), [selected, programs]);

  async function handleCreate() {
    if (!scope || !newName.trim()) return;
    setSaving(true);
    try {
      const created = await applicationServices.projectsRepository.create(scope, {
        name: newName.trim(),
        ownerId: session.user?.id,
        progress: 0,
        riskLevel: "medium",
        priority: "medium",
        status: "planning",
        tags: [],
      });
      setProjects((prev) => [created, ...prev]);
      setNewName("");
      setShowCreate(false);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Projects" />;

  if (selected) {
    return (
      <div className="flex flex-col gap-4 px-4 py-4">
        <button onClick={() => setSelectedId(null)} className="self-start text-xs font-medium text-[#8B1E2D]">← Back to projects</button>
        <div>
          <h2 className="text-base font-semibold text-[#0F1117]">{selected.name}</h2>
          {selected.description && <p className="mt-1 text-sm text-[#5F6B73]">{selected.description}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${riskColor[selected.riskLevel]}`}>{selected.riskLevel} risk</span>
          <span className="rounded-full bg-[#F2F3F5] px-2.5 py-1 text-[11px] font-semibold text-[#0F1117]">{selected.status}</span>
          {selectedProgram && <span className="rounded-full bg-[#EEF1FE] px-2.5 py-1 text-[11px] font-semibold text-[#3B4FBF]">{selectedProgram.name}</span>}
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#5F6B73]">Progress</h3>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#F2F3F5]">
            <div className="h-full rounded-full bg-[#8B1E2D]" style={{ width: `${Math.min(100, Math.max(0, selected.progress))}%` }} />
          </div>
          <p className="mt-1 text-xs text-[#5F6B73]">{selected.progress}% complete</p>
        </div>
        {selected.dueDate && (
          <p className="text-xs text-[#5F6B73]">Due {new Date(selected.dueDate).toLocaleDateString()}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      {showCreate ? (
        <div className="flex flex-col gap-2 rounded-xl border border-[rgba(15,17,23,0.1)] bg-white p-3">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Project name" className="min-h-[44px] rounded-lg border border-[rgba(15,17,23,0.12)] px-3 text-sm" />
          <div className="flex gap-2">
            <MobileActionButton onClick={handleCreate} disabled={saving || !newName.trim()} className="flex-1">{saving ? "Saving…" : "Create project"}</MobileActionButton>
            <MobileActionButton variant="secondary" onClick={() => setShowCreate(false)}>Cancel</MobileActionButton>
          </div>
        </div>
      ) : (
        <MobileActionButton onClick={() => setShowCreate(true)} className="w-full justify-center"><Plus size={16} /> New project</MobileActionButton>
      )}

      {projects.length === 0 ? (
        <EmptyState title="No projects yet" message="Projects for your organization will appear here." />
      ) : (
        <div className="flex flex-col gap-2">
          {projects.map((project) => (
            <button key={project.id} onClick={() => setSelectedId(project.id)} className="flex min-h-[64px] w-full flex-col items-start gap-1 rounded-xl border border-[rgba(15,17,23,0.08)] bg-white px-3.5 py-3 text-left">
              <span className="text-sm font-medium text-[#0F1117]">{project.name}</span>
              <span className="flex gap-1.5">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${riskColor[project.riskLevel]}`}>{project.riskLevel} risk</span>
                <span className="rounded-full bg-[#F2F3F5] px-2 py-0.5 text-[10px] font-semibold text-[#0F1117]">{project.status}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
