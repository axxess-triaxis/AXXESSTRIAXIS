"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { Stakeholder } from "../../../domain";
import { applicationServices } from "../../../providers/serviceProvider";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { EmptyState } from "../../../components/feedback/EmptyState";
import { MobileActionButton } from "../MobileActionButton";
import { useMobileTenantScope } from "../useMobileTenantScope";
import { useMobileTabletLayout } from "../useMobileTabletLayout";
import { useRegisterMobileBackHandler } from "../MobileBackHandlerContext";

type StakeholderNote = { id: string; title: string; body: string; createdAt: string };

const engagementLabel: Record<Stakeholder["engagementLevel"], string> = {
  unrated: "Not yet rated",
  low: "Low engagement",
  medium: "Medium engagement",
  high: "High engagement",
};

// MN-2 (2026-08-23): real CRM quick-notes workflow -- stakeholder list from stakeholdersRepository,
// notes via GET/POST /api/stakeholders/notes (stakeholderNotesRepository is service-role-key-gated,
// confirmed unsafe for direct client import during MN-2 research, so this goes through the route
// exactly like desktop StakeholdersSection.tsx does). Deliberately shows the real engagementLevel
// enum (honest "unrated" default, RAG Remediation Sprint 3/A-58) and never a fabricated influence
// score -- there is no real per-note scoring signal in this codebase to show instead.
export function MobileStakeholdersScreen() {
  const scope = useMobileTenantScope();
  const isTablet = useMobileTabletLayout();
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [notes, setNotes] = useState<StakeholderNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // MN-4 (2026-08-23): Android back button -- closes the New quick note form first if open, else
  // pops the phone-layout detail view back to the list (tablet's two-pane view has no separate
  // detail "screen" to leave).
  useRegisterMobileBackHandler(() => {
    if (showCreate) {
      setShowCreate(false);
      return true;
    }
    if (!isTablet && selectedId) {
      setSelectedId(null);
      return true;
    }
    return false;
  });

  useEffect(() => {
    if (!scope) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      applicationServices.stakeholdersRepository.list(scope, { pageSize: 100 }),
      fetch("/api/stakeholders/notes", { credentials: "include" }).then((res) => res.json()),
    ])
      .then(([stakeholderRows, noteData]: [Stakeholder[], { notes?: StakeholderNote[] }]) => {
        if (cancelled) return;
        setStakeholders(stakeholderRows);
        setNotes(noteData.notes ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setStakeholders([]);
        setNotes([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scope]);

  const selected = useMemo(() => stakeholders.find((s) => s.id === selectedId), [stakeholders, selectedId]);

  async function handleAddNote() {
    if (!noteTitle.trim() || !noteBody.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/stakeholders/notes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: noteTitle.trim(), body: noteBody.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotes((prev) => [data.note, ...prev]);
        setNoteTitle("");
        setNoteBody("");
        setShowCreate(false);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="CRM" />;

  const listPanel = (
    <div className="flex flex-col gap-4 px-4 py-4">
      {showCreate ? (
        <div className="flex flex-col gap-2 rounded-xl border border-[rgba(15,17,23,0.1)] bg-white p-3">
          <input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="Note title" className="min-h-[44px] rounded-lg border border-[rgba(15,17,23,0.12)] px-3 text-sm" />
          <textarea value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="Note details…" rows={3} className="rounded-lg border border-[rgba(15,17,23,0.12)] px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <MobileActionButton onClick={handleAddNote} disabled={saving || !noteTitle.trim() || !noteBody.trim()} className="flex-1">{saving ? "Saving…" : "Save note"}</MobileActionButton>
            <MobileActionButton variant="secondary" onClick={() => setShowCreate(false)}>Cancel</MobileActionButton>
          </div>
        </div>
      ) : (
        <MobileActionButton onClick={() => setShowCreate(true)} className="w-full justify-center"><Plus size={16} /> New quick note</MobileActionButton>
      )}

      {notes.length > 0 && (
        <div>
          <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-[#5F6B73]">Recent notes</h3>
          <div className="flex flex-col gap-2">
            {notes.slice(0, 10).map((note) => (
              <div key={note.id} className="rounded-xl border border-[rgba(15,17,23,0.08)] bg-white px-3.5 py-3">
                <p className="text-sm font-medium text-[#0F1117]">{note.title}</p>
                <p className="text-xs text-[#5F6B73]">{note.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-[#5F6B73]">Stakeholders</h3>
        {stakeholders.length === 0 ? (
          <EmptyState title="No stakeholders yet" message="Stakeholders for your organization will appear here." />
        ) : (
          <div className="flex flex-col gap-2">
            {stakeholders.map((s) => (
              <button key={s.id} onClick={() => setSelectedId(s.id)} className={`flex min-h-[52px] w-full flex-col items-start rounded-xl border bg-white px-3.5 py-3 text-left ${selectedId === s.id && isTablet ? "border-[#8B1E2D]" : "border-[rgba(15,17,23,0.08)]"}`}>
                <span className="text-sm font-medium text-[#0F1117]">{s.name}</span>
                <span className="text-[11px] text-[#5F6B73]">{s.affiliation} · {engagementLabel[s.engagementLevel]}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const detailPanel = selected ? (
    <div className="flex flex-col gap-3 px-4 py-4">
      <h2 className="text-base font-semibold text-[#0F1117]">{selected.name}</h2>
      <p className="text-sm text-[#5F6B73]">{selected.affiliation}</p>
      <span className="w-fit rounded-full bg-[#F2F3F5] px-2.5 py-1 text-[11px] font-semibold text-[#0F1117]">{engagementLabel[selected.engagementLevel]}</span>
      {!isTablet && <button onClick={() => setSelectedId(null)} className="text-xs font-medium text-[#8B1E2D]">← Back to list</button>}
    </div>
  ) : (
    <EmptyState title="Select a stakeholder" message="Choose a stakeholder from the list to see their details." />
  );

  if (isTablet) {
    return (
      <div className="flex h-full">
        <div className="w-[42%] flex-shrink-0 overflow-y-auto border-r border-[rgba(0,0,0,0.06)]">{listPanel}</div>
        <div className="flex-1 overflow-y-auto">{detailPanel}</div>
      </div>
    );
  }

  return selectedId ? detailPanel : listPanel;
}
