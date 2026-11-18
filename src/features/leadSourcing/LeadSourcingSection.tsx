"use client";

import { CalendarClock, Play, Radar, ShieldOff, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { Card } from "../../components/ui/Card";
import { isDemoModeEnabled } from "../../demo/demoMode";
import { canReadAllLeads, canUseCapability } from "../../security/rbac";

// Lead sourcing page (2026-11-18, founder: "Users should be able to use it end to end and set it on
// schedule"). Schedules find companies automatically (Claude on Amazon Bedrock with web search),
// crawl their public sites and import the contacts as open leads. Nobody is contacted from here.
// Review happens afterwards: remove a wrong lead, and keep companies off future runs. Every rule
// (roles, caps, exclusions) is enforced by the server; this page only shows and asks.

type Schedule = {
  id: string; name: string; segment: string; countries: string[]; cities: string[]; perRun: number; cadence: "daily" | "weekly" | "monthly";
  dayOfWeek: number | null; dayOfMonth: number | null; hourLocal: number; timezone: string; enabled: boolean; nextRunAt: string | null;
  lastRunAt: string | null; lastSkipReason: string | null;
};
type RunSummary = {
  id: string; status: string; seedSource: "agent" | "discovery"; scheduleId: string | null; segment: string | null; seedCount: number;
  searchCount: number; stats: Record<string, number | string>; error: string | null; createdAt: string; finishedAt: string | null;
};
type Usage = { searches: number; searchLimit: number; companies: number; companyLimit: number };
type Candidate = {
  id: string; company: string; domain: string | null; country: string; contactName: string; role: string; email: string; emailKind: string;
  status: string; leadId: string | null; importedAutomatically: boolean; removedAt: string | null; evidence: string[];
};
type Exclusion = { id: string; companyNorm: string; domainLabel: string; reason: string };

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIMEZONES = [
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Dubai", label: "UAE (GST)" },
];
const SEGMENTS = [
  { value: "brokerage", label: "Real estate brokerages" },
  { value: "clinic", label: "Private clinics" },
];
const COUNTRY_LABELS: Record<string, string> = { IN: "India", AE: "UAE" };
const EMAIL_KIND_LABELS: Record<string, string> = {
  "published-personal": "Personal address on site",
  "published-role": "Role inbox (info@, sales@)",
  guessed: "Guessed and verified",
};
const STATUS_TONE: Record<string, string> = {
  discovering: "bg-sky-50 text-sky-700",
  queued: "bg-amber-50 text-amber-700",
  running: "bg-amber-50 text-amber-700",
  done: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-red-700",
};

const timeFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
const formatTime = (value: string | null) => (value ? `${timeFormat.format(new Date(value))} UTC` : "-");

const inputClass = "w-full rounded-md border border-[rgba(0,0,0,0.12)] bg-white px-2 py-1.5 text-xs text-[#0F1117]";
const buttonClass = "inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-50";
const primary = `${buttonClass} bg-[#8B1E2D] text-white`;
const secondary = `${buttonClass} bg-[#F2F3F5] text-[#0F1117]`;

async function call<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  try {
    const response = await fetch(url, { credentials: "include", cache: "no-store", ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
    const data = (await response.json().catch(() => null)) as (T & { error?: string; details?: string[] }) | null;
    const error = response.ok ? undefined : [data?.error, ...(data?.details ?? [])].filter(Boolean).join(" ") || `Request failed (${response.status}).`;
    return { ok: response.ok, status: response.status, data, error };
  } catch {
    return { ok: false, status: 0, data: null, error: "Network error." };
  }
}

export function cadenceText(s: Pick<Schedule, "cadence" | "dayOfWeek" | "dayOfMonth" | "hourLocal" | "timezone">): string {
  const hour = `${String(s.hourLocal).padStart(2, "0")}:00`;
  const zone = TIMEZONES.find((t) => t.value === s.timezone)?.label ?? s.timezone;
  if (s.cadence === "daily") return `Every day at ${hour} ${zone}`;
  if (s.cadence === "weekly") return `Every ${DAYS[s.dayOfWeek ?? 1]} at ${hour} ${zone}`;
  return `Monthly on day ${s.dayOfMonth ?? 1} at ${hour} ${zone}`;
}

function Meter(props: { label: string; used: number; limit: number; testId: string }) {
  const pct = props.limit > 0 ? Math.min(100, Math.round((props.used / props.limit) * 100)) : 100;
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-semibold text-[#0F1117]">{props.label}</span>
        <span data-testid={props.testId} className="text-[#5F6B73]">{props.used} of {props.limit}</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-[#F2F3F5]" role="progressbar" aria-label={props.label} aria-valuenow={props.used} aria-valuemin={0} aria-valuemax={props.limit}>
        <div className={`h-1.5 rounded-full ${pct >= 100 ? "bg-red-600" : "bg-[#8B1E2D]"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

type Draft = { name: string; segment: string; countries: string[]; cities: string; perRun: number; cadence: Schedule["cadence"]; dayOfWeek: number; dayOfMonth: number; hourLocal: number; timezone: string; enabled: boolean };
const emptyDraft: Draft = { name: "", segment: "brokerage", countries: ["AE"], cities: "", perRun: 25, cadence: "weekly", dayOfWeek: 1, dayOfMonth: 1, hourLocal: 9, timezone: "Asia/Dubai", enabled: true };

function ScheduleForm(props: { onSaved: () => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const save = async () => {
    setSaving(true);
    setMessage(null);
    const result = await call("/api/lead-sourcing/schedules", {
      method: "POST",
      body: JSON.stringify({
        name: draft.name, segment: draft.segment, countries: draft.countries,
        cities: draft.cities.split(",").map((c) => c.trim()).filter(Boolean), perRun: draft.perRun, cadence: draft.cadence,
        dayOfWeek: draft.cadence === "weekly" ? draft.dayOfWeek : null, dayOfMonth: draft.cadence === "monthly" ? draft.dayOfMonth : null,
        hourLocal: draft.hourLocal, timezone: draft.timezone, enabled: draft.enabled,
      }),
    });
    setSaving(false);
    if (result.ok) props.onSaved();
    else setMessage(result.error ?? "Could not save the schedule.");
  };

  return (
    <div className="grid grid-cols-1 gap-3 border-t border-[rgba(0,0,0,0.06)] p-4 sm:grid-cols-2" data-testid="schedule-form">
      <label className="text-xs text-[#5F6B73]">Name
        <input className={inputClass} value={draft.name} maxLength={80} onChange={(e) => set("name", e.target.value)} placeholder="Dubai brokerages" />
      </label>
      <label className="text-xs text-[#5F6B73]">Segment
        <select className={inputClass} value={draft.segment} onChange={(e) => set("segment", e.target.value)}>
          {SEGMENTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </label>
      <fieldset className="text-xs text-[#5F6B73]">
        <legend>Countries</legend>
        <div className="mt-1 flex gap-4">
          {Object.entries(COUNTRY_LABELS).map(([code, label]) => (
            <label key={code} className="flex items-center gap-1 text-[#0F1117]">
              <input type="checkbox" checked={draft.countries.includes(code)}
                onChange={(e) => set("countries", e.target.checked ? [...draft.countries, code] : draft.countries.filter((c) => c !== code))} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="text-xs text-[#5F6B73]">Cities (comma separated, optional)
        <input className={inputClass} value={draft.cities} onChange={(e) => set("cities", e.target.value)} placeholder="Dubai, Abu Dhabi" />
      </label>
      <label className="text-xs text-[#5F6B73]">Companies per run (5 to 50)
        <input className={inputClass} type="number" min={5} max={50} value={draft.perRun} onChange={(e) => set("perRun", Number(e.target.value))} />
      </label>
      <label className="text-xs text-[#5F6B73]">How often
        <select className={inputClass} value={draft.cadence} onChange={(e) => set("cadence", e.target.value as Draft["cadence"])}>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </label>
      {draft.cadence === "weekly" ? (
        <label className="text-xs text-[#5F6B73]">Day
          <select className={inputClass} value={draft.dayOfWeek} onChange={(e) => set("dayOfWeek", Number(e.target.value))}>
            {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
          </select>
        </label>
      ) : null}
      {draft.cadence === "monthly" ? (
        <label className="text-xs text-[#5F6B73]">Day of month (1 to 28)
          <input className={inputClass} type="number" min={1} max={28} value={draft.dayOfMonth} onChange={(e) => set("dayOfMonth", Number(e.target.value))} />
        </label>
      ) : null}
      <label className="text-xs text-[#5F6B73]">Hour
        <select className={inputClass} value={draft.hourLocal} onChange={(e) => set("hourLocal", Number(e.target.value))}>
          {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
        </select>
      </label>
      <label className="text-xs text-[#5F6B73]">Time zone
        <select className={inputClass} value={draft.timezone} onChange={(e) => set("timezone", e.target.value)}>
          {TIMEZONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-2 text-xs text-[#0F1117]">
        <input type="checkbox" checked={draft.enabled} onChange={(e) => set("enabled", e.target.checked)} /> Turned on
      </label>
      <p className="text-[11px] leading-relaxed text-[#5F6B73] sm:col-span-2">
        Each run finds companies with their own websites, reads their public pages (respecting robots.txt) and adds the contacts it finds as open leads owned by you. Nobody is contacted. Companies on your exclusion list and existing leads are skipped.
      </p>
      {message ? <p className="text-xs text-red-700 sm:col-span-2">{message}</p> : null}
      <div className="flex gap-2 sm:col-span-2">
        <button type="button" className={primary} disabled={saving} onClick={() => void save()}>Save schedule</button>
        <button type="button" className={secondary} onClick={props.onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function RunDetail(props: { runId: string; canWrite: boolean; onClose: () => void; onChanged: () => void }) {
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [exclude, setExclude] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    void call<{ candidates: Candidate[] }>(`/api/lead-sourcing/runs/${props.runId}`).then((r) => {
      if (active) setCandidates(r.data?.candidates ?? []);
    });
    return () => { active = false; };
  }, [props.runId, refresh]);

  const remove = async (candidate: Candidate) => {
    setMessage(null);
    const r = await call<{ removed: boolean; excluded: number }>(`/api/lead-sourcing/runs/${props.runId}/candidates/${candidate.id}/remove`, {
      method: "POST",
      body: JSON.stringify({ exclude }),
    });
    if (!r.ok) setMessage(r.error ?? "Could not remove the lead.");
    else setMessage(`Removed ${candidate.company}${r.data?.excluded ? " and added it to the exclusion list" : ""}.`);
    setRefresh((n) => n + 1);
    props.onChanged();
  };

  return (
    <div className="border-t border-[rgba(0,0,0,0.06)] bg-[#FBFBFC] p-4" data-testid="run-detail">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h3 className="text-sm font-semibold text-[#0F1117]">Leads from this run</h3>
        {props.canWrite ? (
          <label className="flex items-center gap-1 text-xs text-[#5F6B73]">
            <input type="checkbox" checked={exclude} onChange={(e) => setExclude(e.target.checked)} /> When removing, also exclude the company from future runs
          </label>
        ) : null}
        <button type="button" className={`${secondary} ml-auto`} onClick={props.onClose}>Close</button>
      </div>
      {message ? <p className="mb-2 text-xs text-[#0F1117]">{message}</p> : null}
      {candidates === null ? <p className="text-xs text-[#5F6B73]">Loading...</p> : candidates.length === 0 ? (
        <p className="text-xs text-[#5F6B73]">This run found no contacts.</p>
      ) : (
        <ul className="space-y-2">
          {candidates.map((c) => (
            <li key={c.id} className="rounded-lg border border-[rgba(0,0,0,0.06)] bg-white p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-[#0F1117]">{c.company}</span>
                {c.domain ? <a className="text-[11px] text-[#8B1E2D] underline" href={`https://${c.domain}`} target="_blank" rel="noreferrer noopener">{c.domain}</a> : null}
                <span className="rounded-full bg-[#F2F3F5] px-2 py-0.5 text-[10px] font-semibold text-[#5F6B73]">{EMAIL_KIND_LABELS[c.emailKind] ?? c.emailKind}</span>
                {c.removedAt ? <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">Removed</span>
                  : c.status === "imported" ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{c.importedAutomatically ? "Imported automatically" : "Imported"}</span>
                  : <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">{c.status === "rejected" ? "Not imported" : "Waiting for review"}</span>}
                {props.canWrite && c.status === "imported" && !c.removedAt ? (
                  <button type="button" className={`${secondary} ml-auto`} onClick={() => void remove(c)} aria-label={`Remove ${c.company}`}>
                    <Trash2 size={12} aria-hidden /> Remove
                  </button>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-[#0F1117]">{c.contactName}{c.role ? `, ${c.role}` : ""} &middot; {c.email}</p>
              {c.evidence.length ? <p className="mt-1 text-[11px] text-[#5F6B73]">Found on: {c.evidence.slice(0, 3).join(" · ")}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function LeadSourcingSection() {
  const { session } = useAuth();
  const role = session.user?.role;
  const senior = role ? canReadAllLeads(role) : false;
  const canWrite = Boolean(role && senior && canUseCapability(role, "crm.create"));
  const demo = isDemoModeEnabled();

  const [schedules, setSchedules] = useState<Schedule[] | null>(null);
  const [runs, setRuns] = useState<RunSummary[] | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [exclusions, setExclusions] = useState<Exclusion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [openRun, setOpenRun] = useState<string | null>(null);
  const [newExclusions, setNewExclusions] = useState("");
  const [refresh, setRefresh] = useState(0);
  const reload = useCallback(() => setRefresh((n) => n + 1), []);

  useEffect(() => {
    if (demo || !senior) return;
    let active = true;
    void Promise.all([
      call<{ schedules: Schedule[] }>("/api/lead-sourcing/schedules"),
      call<{ runs: RunSummary[]; usage: Usage }>("/api/lead-sourcing/runs"),
      call<{ exclusions: Exclusion[] }>("/api/lead-sourcing/exclusions"),
    ]).then(([s, r, x]) => {
      if (!active) return;
      const failed = [s, r, x].find((res) => !res.ok);
      setError(failed ? failed.error ?? "Could not load lead sourcing." : null);
      setSchedules(s.data?.schedules ?? []);
      setRuns(r.data?.runs ?? []);
      setUsage(r.data?.usage ?? null);
      setExclusions(x.data?.exclusions ?? []);
    });
    return () => { active = false; };
  }, [demo, senior, refresh]);

  const patchSchedule = async (s: Schedule, body: Record<string, unknown>) => {
    const r = await call(`/api/lead-sourcing/schedules/${s.id}`, { method: "PATCH", body: JSON.stringify(body) });
    setNotice(r.ok ? null : r.error ?? "Could not update the schedule.");
    reload();
  };
  const runNow = async (s: Schedule) => {
    const r = await call<{ started: boolean; reason?: string; target?: number }>(`/api/lead-sourcing/schedules/${s.id}/run`, { method: "POST" });
    setNotice(r.data?.started ? `Started: looking for up to ${r.data.target} companies. It appears under Runs and updates within a few minutes.` : r.data?.reason ?? r.error ?? "Could not start a run.");
    reload();
  };
  const deleteSchedule = async (s: Schedule) => {
    if (!window.confirm(`Delete the schedule "${s.name}"? Leads it already imported stay in the CRM.`)) return;
    const r = await call(`/api/lead-sourcing/schedules/${s.id}`, { method: "DELETE" });
    setNotice(r.ok ? `Deleted "${s.name}".` : r.error ?? "Could not delete the schedule.");
    reload();
  };
  const addExclusions = async () => {
    const entries = newExclusions.split(/[\n,]/).map((v) => v.trim()).filter(Boolean);
    if (!entries.length) return;
    const domains = entries.filter((e) => /\.[a-z]{2,}$/i.test(e) && !/\s/.test(e));
    const companies = entries.filter((e) => !domains.includes(e));
    const r = await call<{ added: number }>("/api/lead-sourcing/exclusions", { method: "POST", body: JSON.stringify({ companies, domains, reason: "manual" }) });
    setNotice(r.ok ? `Added ${r.data?.added ?? 0} to the exclusion list.` : r.error ?? "Could not add.");
    if (r.ok) setNewExclusions("");
    reload();
  };
  const removeExclusion = async (x: Exclusion) => {
    const r = await call(`/api/lead-sourcing/exclusions?id=${x.id}`, { method: "DELETE" });
    setNotice(r.ok ? null : r.error ?? "Could not remove.");
    reload();
  };

  const scheduleName = new Map((schedules ?? []).map((s) => [s.id, s.name]));

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Lead sourcing"
        subtitle="Find new companies on a schedule and add their published contacts as leads. Nobody is contacted from here."
      />
      {demo ? <Card className="p-4"><p className="text-xs text-[#5F6B73]">Lead sourcing is not part of the demo workspace.</p></Card> : !senior ? (
        <Card className="p-4"><p className="text-xs text-[#5F6B73]">Lead sourcing is available to admins, executives and managers.</p></Card>
      ) : (
        <>
          {error ? <Card className="p-4"><p className="text-xs text-red-700">{error}</p></Card> : null}
          {notice ? <p role="status" className="rounded-lg bg-[#F2F3F5] px-3 py-2 text-xs text-[#0F1117]">{notice}</p> : null}

          <Card className="p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#5F6B73]">This month</h2>
            {usage ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Meter label="Web searches" used={usage.searches} limit={usage.searchLimit} testId="usage-searches" />
                <Meter label="Companies researched" used={usage.companies} limit={usage.companyLimit} testId="usage-companies" />
              </div>
            ) : <p className="text-xs text-[#5F6B73]">Loading...</p>}
          </Card>

          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-[rgba(0,0,0,0.06)] bg-[#F8F9FA] px-4 py-3">
              <CalendarClock size={15} className="text-[#8B1E2D]" />
              <h2 className="text-sm font-semibold text-[#0F1117]">Schedules</h2>
              {canWrite && !creating ? <button type="button" className={`${primary} ml-auto`} onClick={() => setCreating(true)}>New schedule</button> : null}
            </div>
            {creating ? <ScheduleForm onCancel={() => setCreating(false)} onSaved={() => { setCreating(false); setNotice("Schedule saved."); reload(); }} /> : null}
            {schedules === null ? <p className="px-4 py-4 text-xs text-[#5F6B73]">Loading...</p> : schedules.length === 0 ? (
              <p className="px-4 py-6 text-xs text-[#5F6B73]">No schedules yet. A schedule decides what to look for and how often.</p>
            ) : (
              <ul>
                {schedules.map((s) => (
                  <li key={s.id} className="border-b border-[rgba(0,0,0,0.04)] px-4 py-3 last:border-b-0" data-testid="schedule-row">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-[#0F1117]">{s.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.enabled ? "bg-emerald-50 text-emerald-700" : "bg-[#F2F3F5] text-[#5F6B73]"}`}>{s.enabled ? "On" : "Off"}</span>
                      {canWrite ? (
                        <div className="ml-auto flex gap-2">
                          <button type="button" className={secondary} onClick={() => void runNow(s)}><Play size={12} aria-hidden /> Run now</button>
                          <button type="button" className={secondary} onClick={() => void patchSchedule(s, { enabled: !s.enabled })}>{s.enabled ? "Turn off" : "Turn on"}</button>
                          <button type="button" className={secondary} onClick={() => void deleteSchedule(s)} aria-label={`Delete ${s.name}`}><Trash2 size={12} aria-hidden /></button>
                        </div>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-[#5F6B73]">
                      {SEGMENTS.find((x) => x.value === s.segment)?.label ?? s.segment} in {s.cities.length ? `${s.cities.join(", ")}, ` : ""}{s.countries.map((c) => COUNTRY_LABELS[c] ?? c).join(" and ")} &middot; {s.perRun} companies per run &middot; {cadenceText(s)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#5F6B73]">Next run {s.enabled ? formatTime(s.nextRunAt) : "-"} &middot; last run {formatTime(s.lastRunAt)}</p>
                    {s.lastSkipReason ? <p className="mt-0.5 text-[11px] text-amber-700">Last run skipped: {s.lastSkipReason}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center gap-2 border-b border-[rgba(0,0,0,0.06)] bg-[#F8F9FA] px-4 py-3">
              <Radar size={15} className="text-[#8B1E2D]" />
              <h2 className="text-sm font-semibold text-[#0F1117]">Runs</h2>
            </div>
            {runs === null ? <p className="px-4 py-4 text-xs text-[#5F6B73]">Loading...</p> : runs.length === 0 ? (
              <p className="px-4 py-6 text-xs text-[#5F6B73]">No runs yet.</p>
            ) : (
              <ul>
                {runs.map((r) => (
                  <li key={r.id} className="border-b border-[rgba(0,0,0,0.04)] last:border-b-0" data-testid="run-row">
                    <button type="button" className="flex w-full flex-wrap items-center gap-2 px-4 py-3 text-left" onClick={() => setOpenRun(openRun === r.id ? null : r.id)} aria-expanded={openRun === r.id}>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_TONE[r.status] ?? "bg-[#F2F3F5] text-[#5F6B73]"}`}>{r.status}</span>
                      <span className="text-xs font-medium text-[#0F1117]">{r.seedSource === "discovery" ? (r.scheduleId ? scheduleName.get(r.scheduleId) ?? "Schedule" : "Schedule") : "Agent run"}</span>
                      <span className="text-[11px] text-[#5F6B73]">
                        {r.seedCount} companies &middot; {r.searchCount} searches &middot; {String(r.stats["Leads imported automatically"] ?? r.stats.Candidates ?? 0)} {r.stats["Leads imported automatically"] !== undefined ? "leads imported" : "contacts found"}
                      </span>
                      <span className="ml-auto text-[11px] text-[#5F6B73]">{formatTime(r.createdAt)}</span>
                      {r.error ? <span className="w-full text-[11px] text-red-700">{r.error}</span> : null}
                    </button>
                    {openRun === r.id ? <RunDetail runId={r.id} canWrite={canWrite} onClose={() => setOpenRun(null)} onChanged={reload} /> : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center gap-2 border-b border-[rgba(0,0,0,0.06)] bg-[#F8F9FA] px-4 py-3">
              <ShieldOff size={15} className="text-[#8B1E2D]" />
              <h2 className="text-sm font-semibold text-[#0F1117]">Never research these companies</h2>
            </div>
            {canWrite ? (
              <div className="flex flex-col gap-2 border-b border-[rgba(0,0,0,0.04)] p-4 sm:flex-row">
                <textarea className={inputClass} rows={2} value={newExclusions} onChange={(e) => setNewExclusions(e.target.value)}
                  aria-label="Companies or domains to exclude" placeholder="Company names or domains, one per line or comma separated" />
                <button type="button" className={primary} onClick={() => void addExclusions()}>Add</button>
              </div>
            ) : null}
            {exclusions === null ? <p className="px-4 py-4 text-xs text-[#5F6B73]">Loading...</p> : exclusions.length === 0 ? (
              <p className="px-4 py-6 text-xs text-[#5F6B73]">The list is empty.</p>
            ) : (
              <ul className="max-h-72 overflow-y-auto">
                {exclusions.map((x) => (
                  <li key={x.id} className="flex items-center gap-2 border-b border-[rgba(0,0,0,0.04)] px-4 py-2 text-xs last:border-b-0">
                    <span className="text-[#0F1117]">{x.companyNorm || x.domainLabel}</span>
                    {x.companyNorm && x.domainLabel ? <span className="text-[#5F6B73]">({x.domainLabel})</span> : null}
                    <span className="rounded-full bg-[#F2F3F5] px-2 py-0.5 text-[10px] text-[#5F6B73]">{x.reason.replace("_", " ")}</span>
                    {canWrite ? <button type="button" className="ml-auto text-[11px] text-[#8B1E2D] underline" onClick={() => void removeExclusion(x)}>Remove</button> : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

export default LeadSourcingSection;
