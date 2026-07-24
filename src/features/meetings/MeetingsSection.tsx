import { Edit3, Plus, Save, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { InlineToast } from "../../components/forms/InlineToast";
import { SelectField, TextAreaField, TextField } from "../../components/forms/FormField";
import { LoadingState } from "../../components/feedback/LoadingState";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { Card } from "../../components/ui/Card";
import { StatusBadge } from "../../components/ui/StatusBadge";
import type { Meeting, Program, Project, User } from "../../domain";
import { applicationServices } from "../../providers/serviceProvider";
import { tenantScopeFromUser } from "../../repositories/supabaseEnterpriseRepositories";
import { useAnalytics } from "../../services/analytics";

type MeetingFormState = {
  title: string;
  startsAt: string;
  endsAt: string;
  status: Meeting["status"];
  projectId: string;
  programId: string;
  stakeholderId: string;
  attendeeIds: string;
  agenda: string;
  notes: string;
  decisions: string;
  actionItems: string;
};

const meetingStatuses: { value: Meeting["status"]; label: string }[] = [
  { value: "scheduled", label: "Upcoming" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function statusLabel(status: Meeting["status"]) {
  if (status === "completed") return "Completed";
  if (status === "cancelled") return "Cancelled";
  return "Upcoming";
}

function toLocalInput(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function lineArray(value: string) {
  return value.split(/\n|,/).map((item) => item.trim()).filter(Boolean);
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Sprint 2 (Live Golden Path Execution): the "Participants" field is free text, but the
// database's attendee_ids column is uuid[] (supabase/migrations/20260703083915_sprint7_crud_
// workflows.sql). Typing anything other than real user IDs there -- exactly what the HITL's
// walkthrough did -- fails at the database with a type-cast error, surfaced only as the generic
// "Meeting could not be saved. Check permissions and required fields." This validates it upfront
// with a specific, actionable message instead of letting a doomed request round-trip and fail.
export function invalidAttendeeIds(value: string) {
  return lineArray(value).filter((entry) => !uuidPattern.test(entry));
}

function meetingForm(meeting?: Meeting): MeetingFormState {
  return {
    title: meeting?.title ?? "",
    startsAt: toLocalInput(meeting?.startsAt),
    endsAt: toLocalInput(meeting?.endsAt),
    status: meeting?.status ?? "scheduled",
    projectId: meeting?.projectId ?? "",
    programId: meeting?.programId ?? "",
    stakeholderId: meeting?.stakeholderId ?? "",
    attendeeIds: meeting?.attendeeIds.join(", ") ?? "",
    agenda: meeting?.agenda ?? "",
    notes: meeting?.notes ?? "",
    decisions: meeting?.decisions.join("\n") ?? "",
    actionItems: meeting?.actionItems.join("\n") ?? "",
  };
}

export const MeetingsSection = () => {
  const { session } = useAuth();
  const analytics = useAnalytics();
  const user = session.user;
  const scope = useMemo(() => user ? tenantScopeFromUser(user) : undefined, [user]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | undefined>();
  const [editingMeeting, setEditingMeeting] = useState<Meeting | undefined>();
  const [form, setForm] = useState<MeetingFormState>(() => meetingForm());
  const [toast, setToast] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const canManageMeetings = Boolean(user && ["Super Admin", "Organization Admin", "Executive", "Manager"].includes(user.role));

  const loadMeetings = useCallback(async () => {
    if (!scope) return;
    setLoading(true);
    setToast(null);
    try {
      const [meetingRows, projectRows, programRows, userRows] = await Promise.all([
        applicationServices.meetingsRepository.list(scope),
        applicationServices.projectsRepository.list(scope),
        applicationServices.programsRepository.list(scope),
        applicationServices.usersRepository.listByOrganization(scope),
      ]);
      setMeetings(meetingRows);
      setProjects(projectRows);
      setPrograms(programRows);
      setUsers(userRows);
    } catch {
      setToast({ tone: "error", message: "Unable to load meeting workflow data." });
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void loadMeetings();
  }, [loadMeetings]);

  const openForm = (meeting?: Meeting) => {
    setErrors({});
    setEditingMeeting(meeting);
    setSelectedMeeting(meeting);
    setForm(meetingForm(meeting));
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.title.trim()) nextErrors.title = "Meeting title is required.";
    if (!form.startsAt) nextErrors.startsAt = "Date and time are required.";
    const badAttendeeIds = invalidAttendeeIds(form.attendeeIds);
    if (badAttendeeIds.length > 0) {
      nextErrors.attendeeIds = `Participants must be user IDs (e.g. ${attendeeHint || "user_demo_executive"}), not names or notes -- remove: ${badAttendeeIds.join(", ")}.`;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 && user) {
      analytics.trackEvent("form_validation_failed", { form_name: "meeting", fields: Object.keys(nextErrors) }, {
        organization_id: user.organizationId,
        user_id: user.id,
        user_role: user.role,
        module_name: "meetings",
        route: "/meetings",
      });
    }
    return Object.keys(nextErrors).length === 0;
  };

  const submitMeeting = async () => {
    if (!scope || !validate()) return;
    setSaving(true);
    setToast(null);
    try {
      const payload = {
        title: form.title.trim(),
        startsAt: form.startsAt,
        endsAt: form.endsAt || undefined,
        status: form.status,
        projectId: form.projectId || undefined,
        programId: form.programId || undefined,
        stakeholderId: form.stakeholderId || undefined,
        attendeeIds: lineArray(form.attendeeIds),
        agenda: form.agenda.trim(),
        notes: form.notes.trim(),
        decisions: lineArray(form.decisions),
        actionItems: lineArray(form.actionItems),
      };
      const saved = editingMeeting
        ? await applicationServices.meetingsRepository.update(scope, editingMeeting.id, payload)
        : await applicationServices.meetingsRepository.create(scope, payload);
      analytics.trackEvent(editingMeeting ? "meeting_updated" : "meeting_created", {
        meeting_id: saved.id,
        status: saved.status,
        attendee_count: saved.attendeeIds.length,
        decision_count: saved.decisions.length,
        action_item_count: saved.actionItems.length,
      }, {
        organization_id: saved.organizationId,
        user_id: scope.userId,
        user_role: scope.role,
        module_name: "meetings",
        route: "/meetings",
      });
      if (saved.decisions.length > 0) {
        analytics.trackEvent("decision_recorded", {
          meeting_id: saved.id,
          decision_count: saved.decisions.length,
        }, {
          organization_id: saved.organizationId,
          user_id: scope.userId,
          user_role: scope.role,
          module_name: "meetings",
          route: "/meetings",
        });
      }
      if (saved.actionItems.length > 0) {
        analytics.trackEvent("action_item_created", {
          meeting_id: saved.id,
          action_item_count: saved.actionItems.length,
        }, {
          organization_id: saved.organizationId,
          user_id: scope.userId,
          user_role: scope.role,
          module_name: "meetings",
          route: "/meetings",
        });
      }
      setSelectedMeeting(saved);
      setEditingMeeting(undefined);
      setToast({ tone: "success", message: editingMeeting ? "Meeting updated." : "Meeting created." });
      await loadMeetings();
    } catch {
      setToast({ tone: "error", message: "Meeting could not be saved. Check permissions and required fields." });
    } finally {
      setSaving(false);
    }
  };

  const projectOptions = [{ value: "", label: "No project" }, ...projects.map((project) => ({ value: project.id, label: project.name }))];
  const programOptions = [{ value: "", label: "No program" }, ...programs.map((program) => ({ value: program.id, label: program.name }))];
  const attendeeHint = users.slice(0, 3).map((row) => row.id).join(", ");

  if (loading) return <LoadingState label="Loading meeting workflows" />;

  return (
    <div className="h-full min-h-0">
      <SectionHeader
        title="Meetings & Decisions"
        subtitle={`${meetings.length} meetings with decisions and action items`}
        action={
          <button
            onClick={() => openForm()}
            disabled={!canManageMeetings}
            className="flex items-center gap-1.5 rounded-lg bg-[#8B1E2D] px-3 py-1.5 text-xs text-white hover:bg-[#7a1a27] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus size={12} /> Schedule Meeting
          </button>
        }
      />

      {toast && <div className="mb-3"><InlineToast tone={toast.tone} message={toast.message} /></div>}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#5F6B73]">Meeting Schedule</h3>
            <div className="space-y-3">
              {meetings.map((meeting) => {
                const startsAt = new Date(meeting.startsAt);
                const project = projects.find((row) => row.id === meeting.projectId);
                return (
                  <Card key={meeting.id} className="cursor-pointer p-4 transition-shadow hover:shadow-md">
                    <button onClick={() => {
                      setSelectedMeeting(meeting);
                      analytics.trackEvent("meeting_viewed", { meeting_id: meeting.id, status: meeting.status }, {
                        organization_id: meeting.organizationId,
                        user_id: user?.id,
                        user_role: user?.role,
                        module_name: "meetings",
                        route: "/meetings",
                      });
                    }} className="w-full text-left">
                      <div className="mb-2 flex items-start justify-between">
                        <div>
                          <h4 className="text-sm font-semibold leading-snug text-[#0F1117]">{meeting.title}</h4>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[11px] text-[#5F6B73]">{startsAt.toLocaleDateString()} {startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            <span className="text-[10px] text-[#5F6B73]">{meeting.attendeeIds.length} participants</span>
                          </div>
                        </div>
                        <StatusBadge status={statusLabel(meeting.status)} />
                      </div>
                      <div className="rounded-lg bg-[#F8F9FA] px-3 py-2 text-[11px] leading-relaxed text-[#5F6B73]">
                        {meeting.agenda || project?.name || "No agenda recorded."}
                      </div>
                    </button>
                  </Card>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#5F6B73]">Decision Log</h3>
            <Card className="overflow-hidden">
              {meetings.flatMap((meeting) => meeting.decisions.map((decision) => ({ meeting, decision }))).map(({ meeting, decision }) => (
                <button key={`${meeting.id}-${decision}`} onClick={() => {
                  setSelectedMeeting(meeting);
                  analytics.trackEvent("meeting_viewed", { meeting_id: meeting.id, status: meeting.status, source: "decision_log" }, {
                    organization_id: meeting.organizationId,
                    user_id: user?.id,
                    user_role: user?.role,
                    module_name: "meetings",
                    route: "/meetings",
                  });
                }} className="flex w-full items-start gap-3 border-b border-[rgba(0,0,0,0.04)] px-4 py-3 text-left transition-colors hover:bg-[#F8F9FA]">
                  <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium leading-snug text-[#0F1117]">{decision}</p>
                    <span className="mt-1 block truncate text-[10px] font-mono text-[#8B1E2D]">{meeting.title}</span>
                  </div>
                  <StatusBadge status={statusLabel(meeting.status)} />
                </button>
              ))}
              {meetings.every((meeting) => meeting.decisions.length === 0) && (
                <div className="px-4 py-6 text-center text-xs text-[#5F6B73]">No decisions recorded</div>
              )}
            </Card>
          </div>
        </div>

        <Card className="h-full overflow-y-auto p-4">
          {editingMeeting || !selectedMeeting ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#0F1117]">{editingMeeting ? "Edit Meeting" : "New Meeting"}</h3>
                {editingMeeting && <button onClick={() => setEditingMeeting(undefined)} className="rounded-lg p-1.5 text-[#5F6B73] hover:bg-[#F2F3F5]"><X size={14} /></button>}
              </div>
              <TextField label="Title" value={form.title} error={errors.title} onChange={(event) => setForm({ ...form, title: event.target.value })} disabled={!canManageMeetings || saving} />
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Starts At" type="datetime-local" value={form.startsAt} error={errors.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} disabled={!canManageMeetings || saving} />
                <TextField label="Ends At" type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} disabled={!canManageMeetings || saving} />
              </div>
              <SelectField label="Status" value={form.status} options={meetingStatuses} onChange={(event) => setForm({ ...form, status: event.target.value as Meeting["status"] })} disabled={!canManageMeetings || saving} />
              <SelectField label="Linked Project" value={form.projectId} options={projectOptions} onChange={(event) => setForm({ ...form, projectId: event.target.value })} disabled={!canManageMeetings || saving} />
              <SelectField label="Linked Program" value={form.programId} options={programOptions} onChange={(event) => setForm({ ...form, programId: event.target.value })} disabled={!canManageMeetings || saving} />
              <TextField label="Linked Stakeholder ID" value={form.stakeholderId} onChange={(event) => setForm({ ...form, stakeholderId: event.target.value })} disabled={!canManageMeetings || saving} />
              <TextAreaField label="Participants" value={form.attendeeIds} error={errors.attendeeIds} placeholder={attendeeHint || "user_demo_executive, user_district_lead"} onChange={(event) => setForm({ ...form, attendeeIds: event.target.value })} disabled={!canManageMeetings || saving} />
              <TextAreaField label="Agenda" value={form.agenda} onChange={(event) => setForm({ ...form, agenda: event.target.value })} disabled={!canManageMeetings || saving} />
              <TextAreaField label="Notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} disabled={!canManageMeetings || saving} />
              <TextAreaField label="Decisions" value={form.decisions} onChange={(event) => setForm({ ...form, decisions: event.target.value })} disabled={!canManageMeetings || saving} />
              <TextAreaField label="Action Items" value={form.actionItems} onChange={(event) => setForm({ ...form, actionItems: event.target.value })} disabled={!canManageMeetings || saving} />
              <button
                onClick={submitMeeting}
                disabled={!canManageMeetings || saving}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#8B1E2D] px-3 py-2 text-xs font-semibold text-white hover:bg-[#7a1a27] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={13} /> {saving ? "Saving..." : "Save Meeting"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5F6B73]">Meeting Details</p>
                  <h3 className="mt-1 text-base font-semibold leading-snug text-[#0F1117]">{selectedMeeting.title}</h3>
                </div>
                <button
                  onClick={() => openForm(selectedMeeting)}
                  disabled={!canManageMeetings}
                  className="flex items-center gap-1 rounded-lg border border-[rgba(0,0,0,0.1)] px-2 py-1.5 text-xs font-semibold text-[#5F6B73] hover:bg-[#F2F3F5] disabled:opacity-60"
                >
                  <Edit3 size={12} /> Edit
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-[#F8F9FA] p-3"><span className="block text-[10px] uppercase text-[#5F6B73]">Status</span><StatusBadge status={statusLabel(selectedMeeting.status)} /></div>
                <div className="rounded-lg bg-[#F8F9FA] p-3"><span className="block text-[10px] uppercase text-[#5F6B73]">Participants</span><span className="font-mono text-[#0F1117]">{selectedMeeting.attendeeIds.length}</span></div>
              </div>
              <DetailBlock label="Agenda" value={selectedMeeting.agenda} />
              <DetailBlock label="Notes" value={selectedMeeting.notes} />
              <ListBlock label="Decisions" values={selectedMeeting.decisions} />
              <ListBlock label="Action Items" values={selectedMeeting.actionItems} />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

function DetailBlock({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#5F6B73]">{label}</h4>
      <p className="rounded-lg bg-[#F8F9FA] p-3 text-xs leading-relaxed text-[#0F1117]">{value || "Not recorded."}</p>
    </div>
  );
}

function ListBlock({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#5F6B73]">{label}</h4>
      <div className="space-y-2">
        {values.length ? values.map((value) => (
          <div key={value} className="rounded-lg bg-[#F8F9FA] px-3 py-2 text-xs text-[#0F1117]">{value}</div>
        )) : <div className="rounded-lg bg-[#F8F9FA] px-3 py-2 text-xs text-[#5F6B73]">Not recorded.</div>}
      </div>
    </div>
  );
}

export default MeetingsSection;
