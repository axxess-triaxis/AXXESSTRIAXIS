import { useEffect, useState } from "react";
import { DataStateBadge, DemoDataNotice, ModuleHeader, PageShell, SectionCard, StatusBadge, TenantScopeBadge } from "../../components/enterprise";
import { InlineToast } from "../../components/forms/InlineToast";
import { EmptyState } from "../../components/feedback/EmptyState";
import { Avatar } from "../../components/ui/Avatar";
import { Card } from "../../components/ui/Card";
import { useAuth } from "../../auth/AuthProvider";
import { isDemoModeEnabled } from "../../demo/demoMode";
import { demoStakeholderCards } from "../../lib/demo/demoStakeholders";
import { applicationServices } from "../../providers/serviceProvider";
import { tenantScopeFromUser } from "../../repositories/supabaseEnterpriseRepositories";
import type { Stakeholder } from "../../domain";
import type { StakeholderNote } from "../../services/workflows/workflowActionRecords";
import { Plus, Sparkles } from "lucide-react";

const engagementOptions: { value: Stakeholder["engagementLevel"]; label: string }[] = [
  { value: "unrated", label: "Unrated (default)" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

function engagementBadgeClass(level: Stakeholder["engagementLevel"]) {
  if (level === "high") return "bg-emerald-50 text-emerald-700";
  if (level === "medium") return "bg-amber-50 text-amber-700";
  if (level === "low") return "bg-gray-100 text-gray-600";
  return "bg-gray-50 text-gray-400 italic";
}

export const StakeholdersSection = () => {
  const demoMode = isDemoModeEnabled();
  const { session } = useAuth();
  const scope = session.user ? tenantScopeFromUser(session.user) : undefined;
  const [liveStakeholders, setLiveStakeholders] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(!demoMode);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", affiliation: "", role: "", influenceScore: "", engagementLevel: "unrated" as Stakeholder["engagementLevel"] });
  const [toast, setToast] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(null);
  const [notes, setNotes] = useState<StakeholderNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(!demoMode);
  const stakeholders = demoMode ? applicationServices.institutionalRepository.getStakeholders() : [];

  useEffect(() => {
    if (demoMode || !scope) {
      setLoading(false);
      return;
    }
    let isMounted = true;
    setLoading(true);
    applicationServices.stakeholdersRepository.list(scope, { pageSize: 100 })
      .then((rows) => { if (isMounted) setLiveStakeholders(rows); })
      .catch(() => { if (isMounted) setLiveStakeholders([]); })
      .finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, [demoMode, scope]);

  // RAG Remediation Sprint 3 (A-57): AI Review Inbox "Create Stakeholder Note" escalations were
  // already persisted as real, tenant-scoped stakeholder_notes rows, but nothing here ever fetched
  // them -- the founder's walkthrough found no trace of the escalation because this section only
  // ever queried Contacts, never Notes. This closes that visibility gap.
  useEffect(() => {
    if (demoMode || !scope) {
      setNotesLoading(false);
      return;
    }
    let isMounted = true;
    setNotesLoading(true);
    fetch("/api/stakeholders/notes", { credentials: "include" })
      .then((response) => response.ok ? response.json() : { notes: [] })
      .then((data: { notes?: StakeholderNote[] }) => { if (isMounted) setNotes(data.notes ?? []); })
      .catch(() => { if (isMounted) setNotes([]); })
      .finally(() => { if (isMounted) setNotesLoading(false); });
    return () => { isMounted = false; };
  }, [demoMode, scope]);

  async function addContact() {
    if (!scope) return;
    if (!form.name.trim()) {
      setToast({ tone: "error", message: "Enter a contact name before saving." });
      return;
    }
    const trimmedInfluence = form.influenceScore.trim();
    const influenceScore = trimmedInfluence ? Number(trimmedInfluence) : undefined;
    if (trimmedInfluence && (Number.isNaN(influenceScore) || influenceScore! < 0 || influenceScore! > 100)) {
      setToast({ tone: "error", message: "Influence must be a number between 0 and 100, or left blank." });
      return;
    }
    setSaving(true);
    setToast(null);
    try {
      const created = await applicationServices.stakeholdersRepository.create(scope, {
        name: form.name.trim(),
        affiliation: form.affiliation.trim(),
        role: form.role.trim() || undefined,
        // RAG Remediation Sprint 3 (A-58): only pass real, user-supplied values -- previously this
        // form collected neither field at all, so the repository layer silently substituted a
        // fabricated 50/"medium" for every live contact. Omitting them here lets the repository's
        // own honest 0/"unrated" default apply until someone provides a real assessment.
        influenceScore,
        engagementLevel: form.engagementLevel === "unrated" ? undefined : form.engagementLevel,
      } as Partial<Stakeholder> & { name: string });
      setLiveStakeholders((current) => [created, ...current]);
      setForm({ name: "", affiliation: "", role: "", influenceScore: "", engagementLevel: "unrated" });
      setShowAddForm(false);
      setToast({ tone: "success", message: `${created.name} added to Stakeholders.` });
    } catch {
      setToast({ tone: "error", message: "Could not save this contact. Try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
  <PageShell>
    <ModuleHeader
      title="Stakeholders & CRM"
      eyebrow="Institutional relationship intelligence"
      description="Relationship strength, linked workflows, follow-ups, and AI-generated briefing suggestions across government, healthcare, NGO, investor, and partner stakeholders."
      badges={[
        <TenantScopeBadge key="tenant" />,
        <DataStateBadge key="demo" state={demoMode ? "Demo" : loading ? "Provider-gated" : "Live"} />,
      ]}
      actions={
        <button
          onClick={() => setShowAddForm((current) => !current)}
          disabled={demoMode}
          className="text-xs bg-[#8B1E2D] text-white px-3 py-2 rounded-lg flex items-center gap-1.5 hover:bg-[#7a1a27] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus size={12} /> Add Contact
        </button>
      }
    />
    {toast && <InlineToast tone={toast.tone} message={toast.message} />}
    {!demoMode && showAddForm && (
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input aria-label="Contact name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Name" className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-xs outline-none" />
          <input aria-label="Affiliation" value={form.affiliation} onChange={(event) => setForm({ ...form, affiliation: event.target.value })} placeholder="Affiliation / organization" className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-xs outline-none" />
          <input aria-label="Role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} placeholder="Role" className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-xs outline-none" />
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#5F6B73]">Influence (0-100, optional)</span>
            <input aria-label="Influence score" type="number" min={0} max={100} value={form.influenceScore} onChange={(event) => setForm({ ...form, influenceScore: event.target.value })} placeholder="Leave blank if unrated" className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-xs outline-none" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#5F6B73]">Engagement (optional)</span>
            <select aria-label="Engagement level" value={form.engagementLevel} onChange={(event) => setForm({ ...form, engagementLevel: event.target.value as Stakeholder["engagementLevel"] })} className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-xs outline-none">
              {engagementOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
        <p className="mt-2 text-[10px] text-[#5F6B73]">Influence and engagement are left unrated unless you supply them -- AXXESS does not fabricate a relationship-intelligence score for a contact no one has assessed yet.</p>
        <div className="mt-3 flex gap-2">
          <button onClick={() => void addContact()} disabled={saving} className="rounded-lg bg-[#8B1E2D] px-3 py-2 text-xs font-semibold text-white hover:bg-[#7a1a27] disabled:opacity-60">Save contact</button>
          <button onClick={() => setShowAddForm(false)} className="rounded-lg border border-[rgba(0,0,0,0.12)] px-3 py-2 text-xs font-semibold text-[#0F1117] hover:bg-[#F2F3F5]">Cancel</button>
        </div>
      </Card>
    )}
    {!demoMode && !loading && liveStakeholders.length === 0 && (
      <Card className="p-8">
        <EmptyState message="No stakeholders yet. Add your first contact to start tracking relationships, follow-ups, and linked workflows." />
      </Card>
    )}
    {!demoMode && liveStakeholders.length > 0 && (
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[rgba(0,0,0,0.06)] bg-[#F8F9FA]">
              {["Contact", "Affiliation", "Influence", "Engagement"].map((h) => (
                <th key={h} className="text-left text-[11px] font-semibold text-[#5F6B73] uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {liveStakeholders.map((stakeholder) => (
              <tr key={stakeholder.id} className="border-b border-[rgba(0,0,0,0.04)]">
                <td className="px-4 py-3 text-xs font-semibold text-[#0F1117]">{stakeholder.name}</td>
                <td className="px-4 py-3 text-xs text-[#5F6B73]">{stakeholder.affiliation || "--"}</td>
                <td className="px-4 py-3 text-xs font-mono text-[#5F6B73]">{stakeholder.engagementLevel === "unrated" ? "--" : stakeholder.influenceScore}</td>
                <td className="px-4 py-3 text-xs">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${engagementBadgeClass(stakeholder.engagementLevel)}`}>
                    {stakeholder.engagementLevel}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    )}
    {!demoMode && (
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles size={14} className="text-[#8B1E2D]" />
          <h3 className="text-sm font-semibold text-[#0F1117]">AI-escalated notes</h3>
        </div>
        {notesLoading ? (
          <p className="text-xs text-[#5F6B73]">Checking for AI-escalated notes...</p>
        ) : notes.length === 0 ? (
          <EmptyState message="No AI-escalated stakeholder notes yet. Approving an AI Review Inbox item with 'Create Stakeholder Note' will add one here." />
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div key={note.id} className="rounded-lg border border-[rgba(0,0,0,0.08)] p-3">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-semibold text-[#0F1117]">{note.title}</h4>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${note.sentiment === "risk" || note.sentiment === "urgent" ? "bg-red-50 text-red-700" : "bg-[#F2F3F5] text-[#5F6B73]"}`}>{note.sentiment}</span>
                </div>
                <p className="mt-1.5 whitespace-pre-line text-[11px] leading-relaxed text-[#5F6B73]">{note.body}</p>
                <p className="mt-2 text-[10px] text-[#5F6B73]">
                  {note.sourceAiReviewId ? `From AI review ${note.sourceAiReviewId.slice(0, 8)} - ` : ""}
                  {new Date(note.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    )}
    {demoMode && <DemoDataNotice label="Stakeholder records use one coherent institutional storyline and link back to projects, approvals, documents, and follow-up tasks." />}
    {demoMode && (
    <>
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      {demoStakeholderCards.map((stakeholder) => (
        <SectionCard key={stakeholder.name} title={stakeholder.name} description={`${stakeholder.organization} - ${stakeholder.lastInteraction}`}>
          <div className="space-y-3 text-xs text-[#5F6B73]">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={stakeholder.type} />
              <StatusBadge status={`Relationship ${stakeholder.strength}`} />
            </div>
            <p><strong className="text-[#0F1117]">Next follow-up:</strong> {stakeholder.nextFollowUp}</p>
            <p><strong className="text-[#0F1117]">Linked project:</strong> {stakeholder.linkedProject}</p>
            <p><strong className="text-[#0F1117]">Linked document:</strong> {stakeholder.linkedDocument}</p>
            <p className="rounded-lg bg-[#F8F9FA] p-3 leading-relaxed"><strong className="text-[#0F1117]">AI suggestion:</strong> {stakeholder.suggestion}</p>
            <div className="flex flex-wrap gap-2">
              <button className="rounded-lg border border-[rgba(15,17,23,0.1)] px-3 py-2 font-semibold text-[#5F6B73] hover:bg-[#F2F3F5]">Add note</button>
              <a href="/tasks" className="rounded-lg border border-[rgba(15,17,23,0.1)] px-3 py-2 font-semibold text-[#5F6B73] hover:bg-[#F2F3F5]">Create task</a>
              <a href="/ai-workspace" className="rounded-lg bg-[#8B1E2D] px-3 py-2 font-semibold text-white hover:bg-[#7a1a27]">Send briefing</a>
            </div>
          </div>
        </SectionCard>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(0,0,0,0.06)] bg-[#F8F9FA]">
                {["Contact", "Organization", "Role", "Influence", "Engagement", "Last Contact"].map((h) => (
                  <th key={h} className="text-left text-[11px] font-semibold text-[#5F6B73] uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stakeholders.map((s) => (
                <tr key={s.id} className="border-b border-[rgba(0,0,0,0.04)] hover:bg-[#F8F9FA] transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar initials={s.avatar} />
                      <span className="font-semibold text-[#0F1117] text-xs">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#5F6B73]">{s.org}</td>
                  <td className="px-4 py-3 text-xs text-[#0F1117]">{s.role}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 h-1.5 bg-[#F2F3F5] rounded-full overflow-hidden">
                        <div className="h-full bg-[#C9A227] rounded-full" style={{ width: `${s.influence}%` }} />
                      </div>
                      <span className="text-[11px] font-mono text-[#5F6B73]">{s.influence}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${s.engagement === "High" ? "bg-emerald-50 text-emerald-700" : s.engagement === "Medium" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-600"}`}>
                      {s.engagement}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[11px] font-mono text-[#5F6B73]">{s.lastContact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
      <div className="space-y-4">
        <Card className="p-4">
          <h3 className="text-xs font-semibold text-[#0F1117] uppercase tracking-wider mb-3">Relationship Network</h3>
          <svg viewBox="0 0 200 160" className="w-full">
            <circle cx="100" cy="80" r="18" fill="#8B1E2D" opacity="0.9" />
            <text x="100" y="84" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">AXXESS</text>
            {stakeholders.map((s, i) => {
              const angle = (i / stakeholders.length) * 2 * Math.PI - Math.PI / 2;
              const r = 60;
              const x = 100 + r * Math.cos(angle);
              const y = 80 + r * Math.sin(angle);
              const strokeW = s.influence > 85 ? 2 : 1;
              return (
                <g key={s.id}>
                  <line x1="100" y1="80" x2={x} y2={y} stroke="#C9A227" strokeWidth={strokeW} strokeOpacity="0.4" />
                  <circle cx={x} cy={y} r="12" fill="#2C4A7C" opacity="0.8" />
                  <text x={x} y={y + 3} textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">{s.avatar}</text>
                </g>
              );
            })}
          </svg>
        </Card>
        <Card className="p-4">
          <h3 className="text-xs font-semibold text-[#0F1117] uppercase tracking-wider mb-3">Engagement Timeline</h3>
          <div className="space-y-2.5">
            {[
              { contact: "Dr. Purnima Bora", type: "Meeting", date: "Jul 4" },
              { contact: "Secretary H. K. Deka", type: "Email", date: "Jul 3" },
              { contact: "Director Lalthansangi", type: "Call", date: "Jun 29" },
              { contact: "Prof. R. K. Singh", type: "Meeting", date: "Jun 24" },
            ].map((ev, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="w-1 h-1 rounded-full bg-[#8B1E2D] flex-shrink-0" />
                <div className="flex-1">
                  <span className="text-xs font-medium text-[#0F1117]">{ev.contact}</span>
                  <span className="text-[11px] text-[#5F6B73] ml-2">{ev.type}</span>
                </div>
                <span className="text-[11px] font-mono text-[#5F6B73]">{ev.date}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
    </>
    )}
  </PageShell>
  );
};

export default StakeholdersSection;
