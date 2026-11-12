"use client";

import { PhoneCall, Users, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { Card } from "../../components/ui/Card";
import { isDemoModeEnabled } from "../../demo/demoMode";
import type { CrmLead, CrmLeadStage, CrmLeadStatus } from "../../domain";
import { canReadAllLeads } from "../../security/rbac";
import { CALL_OUTCOMES, type CallOutcome, type QueueLead, type QueueReason } from "../../services/outbound/callQueue";

// Leads page and daily call queue (GTM plan 2026-11-11, Day 3). Everything comes from the CRM
// routes; the server decides what each role may see and change, and the contactability gate
// decides who may be called. This page only shows those decisions.

const STAGES: CrmLeadStage[] = ["new", "qualifying", "proposal", "negotiation", "won", "lost"];
const STATUSES: CrmLeadStatus[] = ["open", "stalled", "won", "lost"];

export const REASON_LABELS: Record<QueueReason, string> = {
  no_phone_number: "No phone number on the lead",
  suppressed: "On the do-not-contact list",
  no_lawful_basis: "No consent or lawful basis recorded",
  country_not_configured: "Country not set up (India and the UAE only)",
  whatsapp_requires_opt_in: "WhatsApp needs an opt-in",
  dlt_registration_missing: "Cold calls in India need DLT registration",
  tdra_registration_missing: "Cold calls in the UAE need TDRA registration",
  counsel_sign_off_missing: "Cold calls need counsel sign-off",
  on_do_not_call_registry: "On the national do-not-call registry",
  registry_scrub_missing_or_stale: "Not checked against the do-not-call registry in the last 30 days",
  outside_calling_hours: "Outside calling hours (India 09:00-21:00, UAE 09:00-18:00 local)",
  frequency_cap_daily: "Already contacted today",
  frequency_cap_weekly: "Contacted 3 times this week",
};

const OUTCOME_LABELS: Record<CallOutcome, string> = {
  connected: "Connected", no_answer: "No answer", voicemail: "Voicemail", wrong_number: "Wrong number",
  call_back: "Asked for a call back", not_interested: "Not interested", interested: "Interested",
};

type QueueResponse = { callable: (QueueLead & { lastContactAt: string | null })[]; refused: { lead: QueueLead; reasons: QueueReason[] }[] };
type HistoryEntry =
  | { kind: "attempt"; at: string; channel: string; decision: string; reasons: string[]; outcome: string | null; note: string | null }
  | { kind: "change"; at: string; action: string; metadata: Record<string, unknown> }
  | { kind: "reply"; at: string; category: string; subject: string; fromEmail: string };

const REPLY_LABELS: Record<string, string> = {
  interested: "Interested", not_now: "Not now", unsubscribe: "Unsubscribe", out_of_office: "Out of office", other: "Needs reading",
};

const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : "-");
const input = "rounded-md border border-[rgba(0,0,0,0.12)] bg-white px-2 py-1 text-xs text-[#0F1117]";

async function getJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url, { credentials: "include", cache: "no-store" }).catch(() => null);
  if (!response?.ok) return null;
  return response.json() as Promise<T>;
}

function LeadPanel(props: { lead: CrmLead; senior: boolean; staff: { id: string; displayName: string }[]; onClose: () => void; onSaved: () => void }) {
  const { lead } = props;
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getJson<{ history: HistoryEntry[] }>(`/api/crm/leads/${lead.id}/history`).then((data) => { if (active) setHistory(data?.history ?? []); });
    return () => { active = false; };
  }, [lead.id, lead.updatedAt]);

  const save = async (change: Record<string, unknown>) => {
    setError(null);
    const response = await fetch(`/api/crm/leads/${lead.id}`, {
      method: "PATCH", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(change),
    }).catch(() => null);
    if (!response?.ok) {
      setError(((await response?.json().catch(() => null)) as { error?: string } | null)?.error ?? "Could not save the change.");
      return;
    }
    props.onSaved();
  };

  return (
    <div data-testid="lead-panel"><Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[#0F1117]">{lead.title}</p>
          <p className="text-xs text-[#5F6B73]">{[lead.contactPhoneE164, lead.contactEmail, lead.country].filter(Boolean).join(" · ") || "No contact details"}</p>
        </div>
        <button type="button" onClick={props.onClose} aria-label="Close lead"><X size={16} /></button>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className="text-[11px] text-[#5F6B73]">Stage
          <select aria-label="Stage" className={`${input} mt-1 block w-full`} value={lead.stage} onChange={(e) => void save({ stage: e.target.value })}>
            {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="text-[11px] text-[#5F6B73]">Status
          <select aria-label="Status" className={`${input} mt-1 block w-full`} value={lead.status} onChange={(e) => void save({ status: e.target.value })}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        {props.senior ? (
          <label className="text-[11px] text-[#5F6B73]">Owner
            <select aria-label="Owner" className={`${input} mt-1 block w-full`} value={lead.ownerUserId ?? ""} onChange={(e) => void save({ ownerUserId: e.target.value })}>
              <option value="" disabled>Unassigned</option>
              {props.staff.map((m) => <option key={m.id} value={m.id}>{m.displayName}</option>)}
            </select>
          </label>
        ) : null}
      </div>
      {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
      <h3 className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-[#5F6B73]">History</h3>
      {history === null ? <p className="mt-1 text-xs text-[#5F6B73]">Loading...</p> : history.length === 0 ? <p className="mt-1 text-xs text-[#5F6B73]">No contact or changes yet.</p> : (
        <ul className="mt-1 space-y-1">
          {history.map((h, i) => (
            <li key={i} className="text-xs text-[#0F1117]">
              <span className="text-[#5F6B73]">{when(h.at)}</span>{" "}
              {h.kind === "reply"
                ? `Reply: ${REPLY_LABELS[h.category] ?? h.category}${h.subject ? ` - ${h.subject}` : ""}`
                : h.kind === "attempt"
                ? `${h.channel === "voice_human" ? "Call" : h.channel} ${h.decision}${h.outcome ? `: ${OUTCOME_LABELS[h.outcome as CallOutcome] ?? h.outcome}` : ""}${h.note ? ` (${h.note})` : ""}${h.reasons.length ? ` [${h.reasons.join(", ")}]` : ""}`
                : `${h.action.replace("crm.lead.", "Lead ")}${Array.isArray(h.metadata.changed) ? `: ${(h.metadata.changed as string[]).join(", ")}` : ""}`}
            </li>
          ))}
        </ul>
      )}
    </Card></div>
  );
}

function LogCallForm(props: { leadId: string; onLogged: () => void }) {
  const [outcome, setOutcome] = useState<CallOutcome>("connected");
  const [note, setNote] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    setMessage(null);
    const response = await fetch(`/api/crm/leads/${props.leadId}/calls`, {
      method: "POST", credentials: "include", headers: { "content-type": "application/json" },
      body: JSON.stringify({ outcome, ...(note.trim() ? { note: note.trim() } : {}), ...(followUp ? { nextFollowUpAt: new Date(followUp).toISOString() } : {}) }),
    }).catch(() => null);
    const data = (await response?.json().catch(() => null)) as { error?: string; reasons?: QueueReason[] } | null;
    if (response?.status === 201) { props.onLogged(); return; }
    setMessage(data?.reasons?.length ? `Refused: ${data.reasons.map((r) => REASON_LABELS[r] ?? r).join("; ")}` : data?.error ?? "Could not log the call.");
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <select aria-label="Call outcome" className={input} value={outcome} onChange={(e) => setOutcome(e.target.value as CallOutcome)}>
        {CALL_OUTCOMES.map((o) => <option key={o} value={o}>{OUTCOME_LABELS[o]}</option>)}
      </select>
      <input aria-label="Call note" className={`${input} min-w-0 flex-1`} maxLength={500} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      <input aria-label="Next follow-up" type="datetime-local" className={input} value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
      <button type="button" onClick={() => void submit()} className="rounded-md bg-[#8B1E2D] px-3 py-1 text-xs font-semibold text-white">Log call</button>
      {message ? <p className="w-full text-xs text-red-700">{message}</p> : null}
    </div>
  );
}

export function LeadsSection() {
  const { session } = useAuth();
  const user = session.user;
  const senior = user ? canReadAllLeads(user.role) : false;
  const [tab, setTab] = useState<"leads" | "calls">("leads");
  const [leads, setLeads] = useState<CrmLead[] | null>(null);
  const [queue, setQueue] = useState<QueueResponse | null>(null);
  const [staff, setStaff] = useState<{ id: string; displayName: string }[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<string>("");
  const [refresh, setRefresh] = useState(0);
  const demo = isDemoModeEnabled();

  const reload = useCallback(() => setRefresh((n) => n + 1), []);

  useEffect(() => {
    if (demo) return;
    let active = true;
    void getJson<{ leads: CrmLead[] }>("/api/crm/leads").then((d) => { if (active) setLeads(d?.leads ?? []); });
    void getJson<QueueResponse>("/api/crm/call-queue").then((d) => { if (active) setQueue(d ?? { callable: [], refused: [] }); });
    return () => { active = false; };
  }, [demo, refresh]);

  useEffect(() => {
    if (demo || !senior) return;
    void getJson<{ staff: { id: string; displayName: string }[] }>("/api/crm/staff").then((d) => setStaff(d?.staff ?? []));
  }, [demo, senior]);

  const staffName = useMemo(() => new Map(staff.map((m) => [m.id, m.displayName])), [staff]);
  const visible = (leads ?? []).filter((l) => !stageFilter || l.stage === stageFilter);
  const selectedLead = leads?.find((l) => l.id === selected) ?? null;

  return (
    <div className="space-y-6">
      <SectionHeader title="Leads & Calls" subtitle="Your pipeline, and who you may call right now. Calls are checked against consent, do-not-call rules and calling hours." />
      {demo ? <Card className="p-4"><p className="text-xs text-[#5F6B73]">Leads and calls are not part of the demo workspace.</p></Card> : (
        <>
          <div role="tablist" className="flex gap-2">
            <button role="tab" aria-selected={tab === "leads"} type="button" onClick={() => setTab("leads")}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold ${tab === "leads" ? "bg-[#8B1E2D] text-white" : "bg-[#F2F3F5] text-[#0F1117]"}`}>
              <Users size={13} /> Leads{leads ? ` (${leads.length})` : ""}
            </button>
            <button role="tab" aria-selected={tab === "calls"} type="button" onClick={() => setTab("calls")}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold ${tab === "calls" ? "bg-[#8B1E2D] text-white" : "bg-[#F2F3F5] text-[#0F1117]"}`}>
              <PhoneCall size={13} /> Call queue{queue ? ` (${queue.callable.length})` : ""}
            </button>
          </div>

          {tab === "leads" ? (
            <div className="space-y-4">
              <select aria-label="Filter by stage" className={input} value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
                <option value="">All stages</option>
                {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {selectedLead ? <LeadPanel lead={selectedLead} senior={senior} staff={staff} onClose={() => setSelected(null)} onSaved={reload} /> : null}
              <Card className="overflow-x-auto">
                {leads === null ? <p className="p-4 text-xs text-[#5F6B73]">Loading leads...</p> : visible.length === 0 ? <p className="p-4 text-xs text-[#5F6B73]">No leads yet. Import a CSV to add some.</p> : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8F9FA] text-[11px] uppercase tracking-wide text-[#5F6B73]">
                      <tr><th className="px-3 py-2">Lead</th><th className="px-3 py-2">Stage</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Owner</th><th className="px-3 py-2">Country</th><th className="px-3 py-2">Consent</th><th className="px-3 py-2">Follow-up</th></tr>
                    </thead>
                    <tbody>
                      {visible.map((l) => (
                        <tr key={l.id} onClick={() => setSelected(l.id)} className="cursor-pointer border-t border-[rgba(0,0,0,0.06)] hover:bg-[#F8F9FA]">
                          <td className="px-3 py-2 font-medium text-[#0F1117]">{l.title}</td>
                          <td className="px-3 py-2">{l.stage}</td>
                          <td className="px-3 py-2">{l.status}</td>
                          <td className="px-3 py-2">{l.ownerUserId === user?.id ? "You" : staffName.get(l.ownerUserId ?? "") ?? (l.ownerUserId ? "Someone else" : "Unassigned")}</td>
                          <td className="px-3 py-2">{l.country ?? "-"}</td>
                          <td className="px-3 py-2">{l.consentBasis === "opt_in" ? "Opted in" : l.consentBasis === "b2b_legitimate_interest" ? "B2B interest" : "None"}</td>
                          <td className="px-3 py-2">{when(l.nextFollowUpAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            </div>
          ) : (
            <div className="space-y-4">
              {queue === null ? <p className="text-xs text-[#5F6B73]">Checking who you may call...</p> : (
                <>
                  {queue.callable.length === 0 ? <Card className="p-4"><p className="text-xs text-[#5F6B73]">Nobody to call right now.</p></Card> : queue.callable.map((l) => (
                    <div key={l.id} data-testid="callable-lead"><Card className="p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-[#0F1117]">{l.title}</p>
                          <p className="text-xs text-[#5F6B73]">Last contact {when(l.lastContactAt)} · follow-up {when(l.nextFollowUpAt)}</p>
                        </div>
                        <a href={`tel:${l.phoneE164}`} className="rounded-md border border-[#8B1E2D] px-3 py-1 text-xs font-semibold text-[#8B1E2D]">Call {l.phoneE164}</a>
                      </div>
                      <LogCallForm leadId={l.id} onLogged={reload} />
                    </Card></div>
                  ))}
                  {queue.refused.length ? (
                    <details className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-white p-4">
                      <summary className="cursor-pointer text-xs font-semibold text-[#0F1117]">Not callable now ({queue.refused.length})</summary>
                      <ul className="mt-2 space-y-2">
                        {queue.refused.map(({ lead, reasons }) => (
                          <li key={lead.id} data-testid="refused-lead" className="text-xs">
                            <span className="font-medium text-[#0F1117]">{lead.title}</span>
                            <span className="text-[#5F6B73]"> - {reasons.map((r) => REASON_LABELS[r] ?? r).join("; ")}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default LeadsSection;
