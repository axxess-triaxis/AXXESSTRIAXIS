"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { Meeting } from "../../../domain";
import { applicationServices } from "../../../providers/serviceProvider";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { EmptyState } from "../../../components/feedback/EmptyState";
import { MobileActionButton } from "../MobileActionButton";
import { useMobileTenantScope } from "../useMobileTenantScope";

// MN-2 (2026-08-23): real Meetings workflow -- list/next-meeting/create-draft/detail against
// meetingsRepository (same MutableTenantRepository<Meeting> desktop MeetingsSection.tsx uses).
// Meeting.decisions/actionItems are plain string[] fields on the row itself (no separate Decision
// table exists anywhere in this codebase -- confirmed during MN-2 research), so "capture a decision"
// here means appending to that array and calling update(), matching how desktop already does it.
export function MobileMeetingsScreen() {
  const scope = useMobileTenantScope();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newStartsAt, setNewStartsAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteKind, setNoteKind] = useState<"decision" | "actionItem">("decision");
  // react-hooks/purity: Date.now() may not be called directly during render (even inside useMemo)
  // -- captured once after mount instead, matching this codebase's established SSR-safe pattern of
  // a safe initial value corrected via useEffect.
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    setNowMs(Date.now());
  }, []);

  useEffect(() => {
    if (!scope) return;
    let cancelled = false;
    setLoading(true);
    applicationServices.meetingsRepository
      .list(scope, { pageSize: 100 })
      .then((rows) => {
        if (!cancelled) setMeetings(rows);
      })
      .catch(() => {
        if (!cancelled) setMeetings([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scope]);

  const upcoming = useMemo(
    () => (nowMs === null ? [] : meetings.filter((m) => new Date(m.startsAt).getTime() >= nowMs).sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())),
    [meetings, nowMs],
  );
  const past = useMemo(
    () => (nowMs === null ? [] : meetings.filter((m) => new Date(m.startsAt).getTime() < nowMs).sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())),
    [meetings, nowMs],
  );
  const selected = useMemo(() => meetings.find((m) => m.id === selectedId), [meetings, selectedId]);

  async function handleCreate() {
    if (!scope || !newTitle.trim() || !newStartsAt) return;
    setSaving(true);
    try {
      const created = await applicationServices.meetingsRepository.create(scope, {
        title: newTitle.trim(),
        startsAt: new Date(newStartsAt).toISOString(),
        attendeeIds: [],
        decisions: [],
        actionItems: [],
      });
      setMeetings((prev) => [created, ...prev]);
      setNewTitle("");
      setNewStartsAt("");
      setShowCreate(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddNote() {
    if (!scope || !selected || !noteDraft.trim()) return;
    const field = noteKind === "decision" ? "decisions" : "actionItems";
    const updated = await applicationServices.meetingsRepository.update(scope, selected.id, {
      [field]: [...selected[field], noteDraft.trim()],
    });
    setMeetings((prev) => prev.map((m) => (m.id === selected.id ? updated : m)));
    setNoteDraft("");
  }

  if (loading || nowMs === null) return <LoadingState label="Meetings" />;

  if (selected) {
    return (
      <div className="flex flex-col gap-4 px-4 py-4">
        <button onClick={() => setSelectedId(null)} className="self-start text-xs font-medium text-[#8B1E2D]">← Back to meetings</button>
        <div>
          <h2 className="text-base font-semibold text-[#0F1117]">{selected.title}</h2>
          <p className="text-xs text-[#5F6B73]">{new Date(selected.startsAt).toLocaleString()}</p>
        </div>
        {selected.agenda && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#5F6B73]">Agenda</h3>
            <p className="text-sm text-[#0F1117]">{selected.agenda}</p>
          </div>
        )}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#5F6B73]">Decisions</h3>
          {selected.decisions.length === 0 ? (
            <p className="text-sm text-[#5F6B73]">No decisions recorded yet.</p>
          ) : (
            <ul className="list-disc space-y-1 pl-4 text-sm text-[#0F1117]">
              {selected.decisions.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          )}
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#5F6B73]">Action items</h3>
          {selected.actionItems.length === 0 ? (
            <p className="text-sm text-[#5F6B73]">No action items recorded yet.</p>
          ) : (
            <ul className="list-disc space-y-1 pl-4 text-sm text-[#0F1117]">
              {selected.actionItems.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          )}
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-[rgba(15,17,23,0.1)] bg-white p-3">
          <div className="flex gap-2">
            <button onClick={() => setNoteKind("decision")} className={`flex-1 min-h-[36px] rounded-lg text-xs font-semibold ${noteKind === "decision" ? "bg-[#8B1E2D] text-white" : "border border-[rgba(15,17,23,0.1)] text-[#5F6B73]"}`}>Decision</button>
            <button onClick={() => setNoteKind("actionItem")} className={`flex-1 min-h-[36px] rounded-lg text-xs font-semibold ${noteKind === "actionItem" ? "bg-[#8B1E2D] text-white" : "border border-[rgba(15,17,23,0.1)] text-[#5F6B73]"}`}>Action item</button>
          </div>
          <input
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder={noteKind === "decision" ? "Record a decision…" : "Record an action item…"}
            className="min-h-[44px] rounded-lg border border-[rgba(15,17,23,0.12)] px-3 text-sm"
          />
          <MobileActionButton onClick={handleAddNote} disabled={!noteDraft.trim()} className="w-full justify-center">Add</MobileActionButton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      {showCreate ? (
        <div className="flex flex-col gap-2 rounded-xl border border-[rgba(15,17,23,0.1)] bg-white p-3">
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Meeting title" className="min-h-[44px] rounded-lg border border-[rgba(15,17,23,0.12)] px-3 text-sm" />
          <input type="datetime-local" value={newStartsAt} onChange={(e) => setNewStartsAt(e.target.value)} className="min-h-[44px] rounded-lg border border-[rgba(15,17,23,0.12)] px-3 text-sm" />
          <div className="flex gap-2">
            <MobileActionButton onClick={handleCreate} disabled={saving || !newTitle.trim() || !newStartsAt} className="flex-1">{saving ? "Saving…" : "Save draft"}</MobileActionButton>
            <MobileActionButton variant="secondary" onClick={() => setShowCreate(false)}>Cancel</MobileActionButton>
          </div>
        </div>
      ) : (
        <MobileActionButton onClick={() => setShowCreate(true)} className="w-full justify-center"><Plus size={16} /> New meeting draft</MobileActionButton>
      )}

      {meetings.length === 0 ? (
        <EmptyState title="No meetings yet" message="Meetings scheduled for your organization will appear here." />
      ) : (
        <>
          {upcoming.length > 0 && (
            <div>
              <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-[#5F6B73]">Upcoming</h3>
              <div className="flex flex-col gap-2">
                {upcoming.map((m) => (
                  <button key={m.id} onClick={() => setSelectedId(m.id)} className="flex min-h-[52px] w-full flex-col items-start rounded-xl border border-[rgba(15,17,23,0.08)] bg-white px-3.5 py-3 text-left">
                    <span className="text-sm font-medium text-[#0F1117]">{m.title}</span>
                    <span className="text-[11px] text-[#5F6B73]">{new Date(m.startsAt).toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-[#5F6B73]">Past</h3>
              <div className="flex flex-col gap-2">
                {past.map((m) => (
                  <button key={m.id} onClick={() => setSelectedId(m.id)} className="flex min-h-[52px] w-full flex-col items-start rounded-xl border border-[rgba(15,17,23,0.08)] bg-white px-3.5 py-3 text-left opacity-80">
                    <span className="text-sm font-medium text-[#0F1117]">{m.title}</span>
                    <span className="text-[11px] text-[#5F6B73]">{new Date(m.startsAt).toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
