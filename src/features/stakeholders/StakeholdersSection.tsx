import { useEffect, useMemo, useState } from "react";
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
import { readAndClearAgenticDraft, type AgenticDraft } from "../../services/agentic/agenticDraftHandoff";
import { writeStakeholderNoteDraft } from "../../services/agentic/stakeholderActionHandoff";
import { SendBriefingModal } from "./SendBriefingModal";
import { Plus, Sparkles, X } from "lucide-react";

const engagementOptions: { value: Stakeholder["engagementLevel"]; label: string }[] = [
  { value: "unrated", label: "Unrated (default)" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

// Relationship Network org-chart labels: SVG <text> has no native word-wrap or ellipsis, so long
// org names (e.g. "State Health Directorate") are greedily wrapped onto up to 2 short lines here,
// truncating the last line if it still doesn't fit -- keeps every label legible instead of letting
// it overflow or compress into the illegible cluster the previous radial layout produced.
function wrapLabel(text: string, maxCharsPerLine = 13, maxLines = 2): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1].slice(0, maxCharsPerLine - 1)}…`;
    return kept;
  }
  return lines;
}

function engagementBadgeClass(level: Stakeholder["engagementLevel"]) {
  if (level === "high") return "bg-emerald-50 text-emerald-700";
  if (level === "medium") return "bg-amber-50 text-amber-700";
  if (level === "low") return "bg-gray-100 text-gray-600";
  return "bg-gray-50 text-gray-400 italic";
}

// Normalized shape for the detail tile -- the live table (Stakeholder domain rows: affiliation,
// influenceScore, engagementLevel) and the demo table (institutionalRepository rows: org, influence,
// engagement, avatar, lastContact) have different field names for the same concepts, so both are
// mapped into this common shape before rendering.
type ContactProfile = {
  id: string;
  name: string;
  org: string;
  role: string;
  influence?: number;
  engagement: string;
  lastContact?: string;
};

// institutionalRepository.getStakeholders() rows, normalized to a string id (see the demoStakeholders
// assignment below for why).
type DemoStakeholderRow = { id: string; avatar: string; name: string; org: string; role: string; influence: number; engagement: string; lastContact: string };

const engagementTone: Record<string, string> = {
  high: "bg-emerald-50 text-emerald-700",
  High: "bg-emerald-50 text-emerald-700",
  medium: "bg-amber-50 text-amber-700",
  Medium: "bg-amber-50 text-amber-700",
  low: "bg-gray-100 text-gray-600",
  Low: "bg-gray-100 text-gray-600",
};

export const StakeholdersSection = () => {
  const demoMode = isDemoModeEnabled();
  const { session } = useAuth();
  const userId = session.user?.id;
  const organizationId = session.user?.organizationId;
  const role = session.user?.role;
  // A-104-adjacent fix (2026-08-07): tenantScopeFromUser() returns a new object literal on every
  // call. Calling it directly in the render body made `scope` a fresh reference on every render,
  // which -- as a dependency of the notes-fetching useEffect below -- re-triggered that fetch (and
  // its setNotesLoading(true) reset) on every render, including the render caused by that same
  // fetch's own setNotesLoading(false)/setNotes() completing. The section could get stuck showing
  // "Checking for AI-escalated notes..." indefinitely even after a note was successfully saved,
  // because the next render always re-armed the loading state before the fetch that already
  // resolved could be observed. Memoized on the underlying primitive fields (not the whole
  // session.user object, which may itself be recreated per render) so the effect only re-fires
  // when identity actually changes. No second argument was passed to tenantScopeFromUser here
  // before this fix either -- accessToken stays unset, preserving the exact prior behavior.
  // Deliberately depends on userId/organizationId/role, not session.user itself: session.user is a
  // fresh object reference every render at the AuthProvider level, and including it here would
  // reproduce exactly the bug this fix removes (see the block comment above).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scope = useMemo(() => (session.user ? tenantScopeFromUser(session.user) : undefined), [userId, organizationId, role]);
  const [liveStakeholders, setLiveStakeholders] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(!demoMode);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", affiliation: "", role: "", influenceScore: "", engagementLevel: "unrated" as Stakeholder["engagementLevel"] });
  const [toast, setToast] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(null);
  const [notes, setNotes] = useState<StakeholderNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(!demoMode);
  const [agenticDraft, setAgenticDraft] = useState<AgenticDraft | null>(null);
  const [savingAgenticNote, setSavingAgenticNote] = useState(false);
  const [demoAddedStakeholders, setDemoAddedStakeholders] = useState<DemoStakeholderRow[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [briefingFor, setBriefingFor] = useState<ContactProfile | null>(null);
  // institutionalRepository.getStakeholders() rows carry a numeric `id` -- normalized to string
  // here so it can share selectedContactId/ContactProfile.id (string) with the live-tenant table,
  // which uses real Stakeholder domain rows (string ids), and with demoAddedStakeholders (locally
  // constructed, string ids from Date.now()).
  const stakeholders: DemoStakeholderRow[] = useMemo(() => {
    const rows = demoMode
      ? applicationServices.institutionalRepository.getStakeholders().map((row) => ({ ...row, id: String(row.id) }))
      : [];
    return [...rows, ...demoAddedStakeholders];
  }, [demoMode, demoAddedStakeholders]);

  // Relationship Network: a 2-level org chart (AXXESS -> organization -> contact), replacing the
  // previous radial hub-and-spoke wheel, which crammed every stakeholder onto a fixed-radius ring in
  // a fixed-size viewBox and became an unreadable cluster once there were more than a handful of
  // contacts. Branch width grows with each org's member count (or a legibility floor for orgs with
  // few members), so the chart's total width -- not its label size -- grows with the data.
  const networkLayout = useMemo(() => {
    const leafSlotWidth = 46;
    const orgMinWidth = 78;
    const orgs: string[] = [];
    const byOrg = new Map<string, DemoStakeholderRow[]>();
    stakeholders.forEach((s) => {
      if (!byOrg.has(s.org)) {
        byOrg.set(s.org, []);
        orgs.push(s.org);
      }
      byOrg.get(s.org)!.push(s);
    });
    let cursor = 0;
    const orgBranches = orgs.map((org) => {
      const members = byOrg.get(org)!;
      const branchWidth = Math.max(members.length * leafSlotWidth, orgMinWidth);
      const startX = cursor;
      cursor += branchWidth;
      const leaves = members.map((s, i) => ({ stakeholder: s, x: startX + (i + 0.5) * (branchWidth / members.length) }));
      return { org, orgX: startX + branchWidth / 2, leaves };
    });
    return { orgBranches, width: Math.max(cursor, 220) };
  }, [stakeholders]);

  // A-79: "Save stakeholder mapping" from the AI Workspace actionables pop-up lands here -- a
  // mapping isn't a new Contact, so it offers a "Save as note" card instead of pre-filling the
  // Add Contact form, reusing the already-live stakeholder_notes surface below.
  useEffect(() => {
    if (demoMode) return;
    setAgenticDraft(readAndClearAgenticDraft("stakeholder_mapping"));
  }, [demoMode]);

  async function saveAgenticDraftAsNote() {
    if (!agenticDraft) return;
    setSavingAgenticNote(true);
    setToast(null);
    try {
      const response = await fetch("/api/stakeholders/notes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Stakeholder mapping from AI Workspace", body: agenticDraft.summary }),
      });
      if (!response.ok) throw new Error("request failed");
      const payload = await response.json().catch(() => ({} as { note?: StakeholderNote }));
      if (payload.note) setNotes((current) => [payload.note as StakeholderNote, ...current]);
      setAgenticDraft(null);
      setToast({ tone: "success", message: "Saved as a stakeholder note." });
    } catch {
      setToast({ tone: "error", message: "Could not save this note. Try again." });
    } finally {
      setSavingAgenticNote(false);
    }
  }

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

    // A-116 (2026-08-14): "Add Contact" was fully disabled in demo mode (button + form both gated
    // on !demoMode), so the investor demo's own headline CRM action was dead by design. Demo mode
    // has no real backend to persist to -- this appends a locally-constructed row to session-only
    // state, matching every other demo-interactivity fix this session (Notifications, etc.). Real-
    // tenant behavior (the repository branch below) is unchanged.
    if (demoMode) {
      const initials = form.name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "NC";
      setDemoAddedStakeholders((current) => [
        {
          id: `demo-added-${Date.now()}`,
          avatar: initials,
          name: form.name.trim(),
          org: form.affiliation.trim() || "--",
          role: form.role.trim() || "--",
          influence: influenceScore ?? 0,
          engagement: form.engagementLevel === "unrated" ? "Low" : form.engagementLevel[0].toUpperCase() + form.engagementLevel.slice(1),
          lastContact: new Date().toISOString().slice(0, 10),
        },
        ...current,
      ]);
      setForm({ name: "", affiliation: "", role: "", influenceScore: "", engagementLevel: "unrated" });
      setShowAddForm(false);
      setToast({ tone: "success", message: `${form.name.trim()} added to Stakeholders (session only -- demo data resets on reload).` });
      return;
    }

    if (!scope) return;
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

  // A-116 (2026-08-14): shared by the top-3 demo "AI-generated briefing" cards, the contact table
  // rows (both demo and live), and the Relationship Network nodes -- previously each surface had
  // its own dead/half-wired copy of these three actions (a plain <button> with no handler at all
  // for "Add note", and two plain <a href> links with zero feedback for "Create task"/"Send
  // briefing"). Founder's explicit direction: "They need to work both in demo and live."
  function handleAddNote(profile: ContactProfile) {
    const enrichment = demoStakeholderCardFor(profile.name);
    writeStakeholderNoteDraft({ stakeholderName: profile.name, presetBody: enrichment?.suggestion });
    window.location.assign("/tasks");
  }

  async function handleCreateTask(profile: ContactProfile) {
    if (!demoMode && scope) {
      try {
        await applicationServices.tasksRepository.create(scope, {
          title: `Follow up with ${profile.name}`,
          description: demoStakeholderCardFor(profile.name)?.nextFollowUp ?? "",
          priority: "medium",
        } as Partial<import("../../domain").Task> & { title: string });
      } catch {
        // Real creation failed (e.g. missing required server-side fields) -- still navigate to
        // Tasks & Workflow, matching this action's pre-existing plain-link behavior, rather than
        // leaving the click silently inert.
      }
    }
    window.location.assign("/tasks");
  }

  function openBriefingModal(profile: ContactProfile) {
    setBriefingFor(profile);
  }

  async function saveBriefing(profile: ContactProfile, fields: { to: string; cc: string; bcc: string; subject: string; body: string }) {
    const noteBody = `To: ${fields.to || "--"}\nCC: ${fields.cc || "--"}\nBCC: ${fields.bcc || "--"}\n\n${fields.body}`;
    if (demoMode) {
      setToast({ tone: "success", message: `Briefing recorded for ${profile.name} (session only).` });
    } else if (scope) {
      try {
        await fetch("/api/stakeholders/notes", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: fields.subject, body: noteBody }),
        });
        setToast({ tone: "success", message: `Briefing recorded for ${profile.name}.` });
      } catch {
        setToast({ tone: "error", message: "Could not record this briefing. Try again." });
      }
    }
    setBriefingFor(null);
  }

  function demoStakeholderCardFor(name: string) {
    return demoStakeholderCards.find((card) => card.name === name);
  }

  const selectedProfile: ContactProfile | undefined = useMemo(() => {
    if (!selectedContactId) return undefined;
    const liveMatch = liveStakeholders.find((row) => row.id === selectedContactId);
    if (liveMatch) {
      return {
        id: liveMatch.id,
        name: liveMatch.name,
        org: liveMatch.affiliation || "--",
        role: "--",
        influence: liveMatch.engagementLevel === "unrated" ? undefined : liveMatch.influenceScore,
        engagement: liveMatch.engagementLevel,
        lastContact: undefined,
      };
    }
    const demoMatch = stakeholders.find((row) => row.id === selectedContactId);
    if (demoMatch) {
      return {
        id: demoMatch.id,
        name: demoMatch.name,
        org: demoMatch.org,
        role: demoMatch.role,
        influence: demoMatch.influence,
        engagement: demoMatch.engagement,
        lastContact: demoMatch.lastContact,
      };
    }
    return undefined;
  }, [selectedContactId, liveStakeholders, stakeholders]);

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
          className="text-xs bg-[#8B1E2D] text-white px-3 py-2 rounded-lg flex items-center gap-1.5 hover:bg-[#7a1a27]"
        >
          <Plus size={12} /> Add Contact
        </button>
      }
    />
    {toast && <InlineToast tone={toast.tone} message={toast.message} />}
    {briefingFor && (
      <SendBriefingModal
        open
        stakeholderName={briefingFor.name}
        defaultBody={demoStakeholderCardFor(briefingFor.name)?.suggestion ?? ""}
        onSave={(fields) => void saveBriefing(briefingFor, fields)}
        onCancel={() => setBriefingFor(null)}
      />
    )}
    {showAddForm && (
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

    {selectedProfile && (
      <Card className="border-[#8B1E2D]/20 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5F6B73]">Contact Profile</p>
            <h3 className="mt-1 text-base font-semibold text-[#0F1117]">{selectedProfile.name}</h3>
            <p className="text-xs text-[#5F6B73]">{selectedProfile.org} - {selectedProfile.role}</p>
          </div>
          <button type="button" onClick={() => setSelectedContactId(null)} aria-label="Close profile" className="text-[#5F6B73] hover:text-[#0F1117]"><X size={16} /></button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          <div className="rounded-lg bg-[#F8F9FA] p-3"><span className="block text-[10px] uppercase text-[#5F6B73]">Influence</span><span className="font-mono font-semibold text-[#0F1117]">{selectedProfile.influence ?? "--"}</span></div>
          <div className="rounded-lg bg-[#F8F9FA] p-3"><span className="block text-[10px] uppercase text-[#5F6B73]">Engagement</span><span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${engagementTone[selectedProfile.engagement] ?? "bg-gray-100 text-gray-600"}`}>{selectedProfile.engagement}</span></div>
          <div className="rounded-lg bg-[#F8F9FA] p-3 sm:col-span-2"><span className="block text-[10px] uppercase text-[#5F6B73]">Last contact</span><span className="font-mono text-[#0F1117]">{selectedProfile.lastContact ?? "--"}</span></div>
        </div>
        {(() => {
          const enrichment = demoStakeholderCardFor(selectedProfile.name);
          return enrichment ? (
            <div className="mt-3 space-y-2 text-xs text-[#5F6B73]">
              <p><strong className="text-[#0F1117]">Next follow-up:</strong> {enrichment.nextFollowUp}</p>
              <p><strong className="text-[#0F1117]">Linked project:</strong> {enrichment.linkedProject}</p>
              <p><strong className="text-[#0F1117]">Linked document:</strong> {enrichment.linkedDocument}</p>
              <p className="rounded-lg bg-[#F8F9FA] p-3 leading-relaxed"><strong className="text-[#0F1117]">AI suggestion:</strong> {enrichment.suggestion}</p>
            </div>
          ) : null;
        })()}
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <button onClick={() => handleAddNote(selectedProfile)} className="rounded-lg border border-[rgba(15,17,23,0.1)] px-3 py-2 font-semibold text-[#5F6B73] hover:bg-[#F2F3F5]">Add note</button>
          <button onClick={() => void handleCreateTask(selectedProfile)} className="rounded-lg border border-[rgba(15,17,23,0.1)] px-3 py-2 font-semibold text-[#5F6B73] hover:bg-[#F2F3F5]">Create task</button>
          <button onClick={() => openBriefingModal(selectedProfile)} className="rounded-lg bg-[#8B1E2D] px-3 py-2 font-semibold text-white hover:bg-[#7a1a27]">Send briefing</button>
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
              <tr
                key={stakeholder.id}
                onClick={() => setSelectedContactId(stakeholder.id)}
                className={`cursor-pointer border-b border-[rgba(0,0,0,0.04)] transition-colors hover:bg-[#F8F9FA] ${selectedContactId === stakeholder.id ? "bg-[#F8F9FA]" : ""}`}
              >
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
    {!demoMode && agenticDraft && (
      <Card className="border-[#8B1E2D]/20 bg-[#FFF8F8] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#8B1E2D]">Draft from AI Workspace</h3>
            <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-[#5F6B73]">{agenticDraft.summary}</p>
          </div>
          <button type="button" onClick={() => setAgenticDraft(null)} aria-label="Dismiss" className="text-[#8B1E2D] hover:opacity-70"><X size={14} /></button>
        </div>
        <button
          onClick={() => void saveAgenticDraftAsNote()}
          disabled={savingAgenticNote}
          className="mt-3 rounded-lg bg-[#8B1E2D] px-3 py-2 text-xs font-semibold text-white hover:bg-[#7a1a27] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {savingAgenticNote ? "Saving..." : "Save as note"}
        </button>
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
      {demoStakeholderCards.map((stakeholder) => {
        const profile: ContactProfile = {
          id: stakeholders.find((row) => row.name === stakeholder.name)?.id ?? stakeholder.name,
          name: stakeholder.name,
          org: stakeholder.organization,
          role: stakeholder.type,
          engagement: stakeholder.strength,
        };
        return (
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
              <button onClick={() => handleAddNote(profile)} className="rounded-lg border border-[rgba(15,17,23,0.1)] px-3 py-2 font-semibold text-[#5F6B73] hover:bg-[#F2F3F5]">Add note</button>
              <button onClick={() => void handleCreateTask(profile)} className="rounded-lg border border-[rgba(15,17,23,0.1)] px-3 py-2 font-semibold text-[#5F6B73] hover:bg-[#F2F3F5]">Create task</button>
              <button onClick={() => openBriefingModal(profile)} className="rounded-lg bg-[#8B1E2D] px-3 py-2 font-semibold text-white hover:bg-[#7a1a27]">Send briefing</button>
            </div>
          </div>
        </SectionCard>
        );
      })}
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
                <tr
                  key={s.id}
                  onClick={() => setSelectedContactId(s.id)}
                  className={`border-b border-[rgba(0,0,0,0.04)] hover:bg-[#F8F9FA] transition-colors cursor-pointer ${selectedContactId === s.id ? "bg-[#F8F9FA]" : ""}`}
                >
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
          <div className="overflow-x-auto">
            <svg width={networkLayout.width} height={148} viewBox={`0 0 ${networkLayout.width} 148`} className="block">
              <circle cx={networkLayout.width / 2} cy={20} r={16} fill="#8B1E2D" opacity="0.92" />
              <text x={networkLayout.width / 2} y={23} textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">AXXESS</text>
              {networkLayout.orgBranches.map(({ org, orgX, leaves }) => (
                <g key={org}>
                  <line x1={networkLayout.width / 2} y1={36} x2={orgX} y2={47} stroke="#C9A227" strokeWidth={1.25} strokeOpacity={0.5} />
                  <rect x={orgX - 34} y={47} width={68} height={18} rx={4} fill="#F2F3F5" stroke="#C9A227" strokeOpacity={0.35} />
                  {wrapLabel(org).map((line, i, arr) => (
                    <text key={line} x={orgX} y={47 + 9 + i * 7.5 - ((arr.length - 1) * 3.75)} textAnchor="middle" fill="#5F6B73" fontSize="6.5" fontWeight="600">
                      {line}
                    </text>
                  ))}
                  {leaves.map(({ stakeholder: s, x }) => {
                    const isSelected = selectedContactId === s.id;
                    return (
                      <g key={s.id} onClick={() => setSelectedContactId(s.id)} className="cursor-pointer">
                        <line x1={orgX} y1={65} x2={x} y2={92} stroke="#C9A227" strokeWidth={isSelected ? 1.75 : 1} strokeOpacity={isSelected ? 0.9 : 0.4} />
                        <circle cx={x} cy={104} r={isSelected ? 13 : 11} fill={isSelected ? "#8B1E2D" : "#2C4A7C"} stroke={isSelected ? "#8B1E2D" : "none"} strokeWidth={isSelected ? 2 : 0} />
                        <text x={x} y={107} textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">{s.avatar}</text>
                        <text x={x} y={126} textAnchor="middle" fill="#0F1117" fontSize="6.5" fontWeight={isSelected ? "700" : "500"}>
                          {s.name.length > 12 ? `${s.name.slice(0, 11)}…` : s.name}
                        </text>
                      </g>
                    );
                  })}
                </g>
              ))}
            </svg>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-[#5F6B73]">Organizations branch from AXXESS; click a contact to open their profile above.</p>
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
