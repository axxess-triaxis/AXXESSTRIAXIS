"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { useAuth } from "../../../auth/AuthProvider";
import { applicationServices } from "../../../providers/serviceProvider";
import { tenantScopeFromUser } from "../../../repositories/supabaseEnterpriseRepositories";
import type { Meeting } from "../../../domain";

// XL-6 (2026-08-06): AXXESS Lite's own Meetings section -- wired to the same meetingsRepository
// X0's MeetingsSection uses, not a duplicate store. Meeting.attendeeIds expects real stakeholder/
// user UUIDs (a foreign-key-shaped field) -- Lite deliberately never invents fake ones. Attendees
// are collected as free text instead and folded into the notes field, labelled plainly, so nobody
// mistakes it for a real linked-contact list. decisions/actionItems sent empty (not required by
// the backend) rather than fabricated.
export function LiteMeetingsSection() {
  const { session } = useAuth();
  const user = session.user;
  const scope = useMemo(() => (user ? tenantScopeFromUser(user) : undefined), [user]);

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [attendeesText, setAttendeesText] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    if (!scope) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await applicationServices.meetingsRepository.list(scope);
      setMeetings(rows);
    } catch {
      setError("Couldn't load your meetings right now.");
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    if (!scope || !title.trim() || !startsAt) return;
    setSaving(true);
    setError(null);
    try {
      const combinedNotes = attendeesText.trim()
        ? `Attendees: ${attendeesText.trim()}${notes.trim() ? `\n\n${notes.trim()}` : ""}`
        : notes.trim();
      const created = await applicationServices.meetingsRepository.create(scope, {
        title: title.trim(),
        startsAt: new Date(startsAt).toISOString(),
        status: "scheduled",
        attendeeIds: [],
        agenda: "",
        notes: combinedNotes,
        decisions: [],
        actionItems: [],
      });
      setMeetings((current) => [created, ...current]);
      setTitle("");
      setStartsAt("");
      setAttendeesText("");
      setNotes("");
    } catch {
      setError("Couldn't save that -- please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <div>
        <h1 className="text-sm font-semibold text-[#0F1117]">Meetings</h1>
        <p className="mt-0.5 text-xs text-[#5F6B73]">Meetings, decisions, and follow-ups.</p>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-3.5">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Meeting title"
          className="rounded-lg border border-[rgba(0,0,0,0.1)] px-3 py-2 text-xs outline-none focus:border-[#8B1E2D]"
        />
        <input
          type="datetime-local"
          value={startsAt}
          onChange={(event) => setStartsAt(event.target.value)}
          className="rounded-lg border border-[rgba(0,0,0,0.1)] px-3 py-2 text-xs outline-none focus:border-[#8B1E2D]"
        />
        <input
          value={attendeesText}
          onChange={(event) => setAttendeesText(event.target.value)}
          placeholder="Attendees (names, comma-separated -- optional)"
          className="rounded-lg border border-[rgba(0,0,0,0.1)] px-3 py-2 text-xs outline-none focus:border-[#8B1E2D]"
        />
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Notes (optional)"
          rows={2}
          className="rounded-lg border border-[rgba(0,0,0,0.1)] px-3 py-2 text-xs outline-none focus:border-[#8B1E2D]"
        />
        <button
          onClick={submit}
          disabled={saving || !title.trim() || !startsAt}
          className="rounded-lg bg-[#8B1E2D] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
        >
          {saving ? "Saving..." : "Add meeting"}
        </button>
        {error && <p className="text-[11px] text-[#B54708]">{error}</p>}
      </div>

      {loading ? (
        <p className="text-center text-xs text-[#5F6B73]">Loading...</p>
      ) : meetings.length === 0 ? (
        <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white px-6 py-8 text-center">
          <CalendarDays size={20} className="mx-auto mb-2 text-[#8B1E2D]" />
          <p className="text-xs text-[#5F6B73]">No meetings yet. Add your first one above.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[rgba(0,0,0,0.06)] bg-white">
          {meetings
            .slice()
            .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
            .map((meeting) => (
              <div key={meeting.id} className="border-b border-[rgba(0,0,0,0.04)] px-4 py-3 last:border-b-0">
                <p className="truncate text-xs font-medium text-[#0F1117]">{meeting.title}</p>
                <p className="text-[10px] text-[#5F6B73]">{new Date(meeting.startsAt).toLocaleString()}</p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
