"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "../../components/ui/Card";
import { SETUP_LABELS } from "./agentSetupLabels";

// Agents card (customer-fireable stack, PR 5, 2026-11-20). An organization's admins turn the voice
// agent (Callismatic) and the messaging agent (Omnidamus) on or off and write their own call purpose
// and opening SMS. The card lists what each agent still needs. Numbers, senders and registrations
// are linked by Triaxis: for Triaxis's own Super Admin the card also shows an operator form for any
// organization. The server enforces all of this; the card only reflects it.

type Settings = {
  callismaticEnabled: boolean; omnidamusEnabled: boolean; callPurpose: string | null; smsOpeningText: string | null;
  callerIdE164: string | null; whatsappPhoneNumberId: string | null; whatsappNumberE164: string | null; whatsappTemplate: string | null;
  smsOriginationIdentity: string | null; smsNumberE164: string | null;
  dltIndiaRegistered: boolean; tdraUaeRegistered: boolean; counselSignedOff: boolean; updatedAt: string | null;
};
type SettingsResponse = { organizationId: string; settings: Settings; readiness: { call: string[]; whatsapp: string[]; sms: string[] }; operator: boolean };

const input = "mt-1 block w-full rounded-md border border-[rgba(0,0,0,0.12)] bg-white px-2 py-1 text-xs text-[#0F1117]";
const ERRORS: Record<string, string> = {
  number_claimed: "Another organization already uses this number.",
  invalid_value: "This value is not valid.",
  operator_only_field: "Only Triaxis can change this.",
};

async function send(url: string, body: Record<string, unknown>): Promise<{ data?: SettingsResponse; error?: string }> {
  const response = await fetch(url, {
    method: "PATCH", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  }).catch(() => null);
  const data = (await response?.json().catch(() => null)) as (SettingsResponse & { error?: string; field?: string }) | null;
  if (response?.ok && data) return { data };
  const reason = data?.error ? ERRORS[data.error] ?? data.error : "Could not save.";
  return { error: data?.field ? `${data.field}: ${reason}` : reason };
}

function Readiness(props: { label: string; reasons: string[] }) {
  return (
    <li className="text-xs">
      <span className="font-medium text-[#0F1117]">{props.label}: </span>
      {props.reasons.length === 0
        ? <span className="text-[#1F6F43]">ready (the contactability gate still decides each contact)</span>
        : <span className="text-[#5F6B73]">{props.reasons.map((r) => SETUP_LABELS[r] ?? r).join("; ")}</span>}
    </li>
  );
}

function OrganizationForm(props: { url: string; data: SettingsResponse; onSaved: (d: SettingsResponse) => void }) {
  const { settings } = props.data;
  const [callPurpose, setCallPurpose] = useState(settings.callPurpose ?? "");
  const [smsOpeningText, setSmsOpeningText] = useState(settings.smsOpeningText ?? "");
  const [message, setMessage] = useState<string | null>(null);

  const save = async (body: Record<string, unknown>) => {
    setMessage(null);
    const result = await send(props.url, body);
    if (result.data) { props.onSaved(result.data); setMessage("Saved."); } else setMessage(result.error ?? "Could not save.");
  };

  return (
    <div data-testid="agents-organization-form" className="space-y-3">
      <div className="flex flex-wrap gap-4 text-xs">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={settings.callismaticEnabled} onChange={(e) => void save({ callismaticEnabled: e.target.checked })} />
          Voice agent (Call with agent)
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={settings.omnidamusEnabled} onChange={(e) => void save({ omnidamusEnabled: e.target.checked })} />
          Messaging agent (Message with agent)
        </label>
      </div>
      <label className="block text-[11px] text-[#5F6B73]">Call purpose (what the voice agent says it is calling about)
        <textarea aria-label="Call purpose" className={input} maxLength={500} rows={2} value={callPurpose} onChange={(e) => setCallPurpose(e.target.value)} />
      </label>
      <label className="block text-[11px] text-[#5F6B73]">Opening SMS (in India it must match your DLT template)
        <textarea aria-label="Opening SMS" className={input} maxLength={320} rows={2} value={smsOpeningText} onChange={(e) => setSmsOpeningText(e.target.value)} />
      </label>
      <button type="button" onClick={() => void save({ callPurpose, smsOpeningText })} className="rounded-md bg-[#0F1117] px-3 py-1 text-xs font-semibold text-white">Save wording</button>
      {message ? <p className="text-xs text-[#5F6B73]">{message}</p> : null}
    </div>
  );
}

const OPERATOR_TEXT: Array<{ field: keyof Settings; label: string }> = [
  { field: "callerIdE164", label: "Caller ID (E.164)" },
  { field: "whatsappNumberE164", label: "WhatsApp number (E.164)" },
  { field: "whatsappPhoneNumberId", label: "WhatsApp phone number ID (End User Messaging)" },
  { field: "whatsappTemplate", label: "Approved WhatsApp template" },
  { field: "smsNumberE164", label: "SMS number (E.164)" },
  { field: "smsOriginationIdentity", label: "SMS origination identity" },
];
const OPERATOR_FLAGS: Array<{ field: keyof Settings; label: string }> = [
  { field: "dltIndiaRegistered", label: "India DLT registration seen" },
  { field: "tdraUaeRegistered", label: "UAE TDRA registration seen" },
  { field: "counselSignedOff", label: "Counsel sign-off seen" },
];

function OperatorPanel() {
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/stack/organizations", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null)).then((d: { organizations?: Array<{ id: string; name: string }> } | null) => setOrganizations(d?.organizations ?? []))
      .catch(() => setOrganizations([]));
  }, []);

  useEffect(() => {
    if (!organizationId) { setData(null); return; }
    void fetch(`/api/stack/agent-settings/${organizationId}`, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null)).then((d: SettingsResponse | null) => {
        setData(d);
        setDraft(Object.fromEntries(OPERATOR_TEXT.map(({ field }) => [field, String(d?.settings[field] ?? "")])));
      }).catch(() => setData(null));
  }, [organizationId]);

  const save = async (body: Record<string, unknown>) => {
    setMessage(null);
    const result = await send(`/api/stack/agent-settings/${organizationId}`, body);
    if (result.data) { setData(result.data); setMessage("Saved."); } else setMessage(result.error ?? "Could not save.");
  };

  return (
    <div data-testid="agents-operator-panel" className="mt-4 border-t border-[rgba(0,0,0,0.08)] pt-3">
      <p className="text-xs font-semibold text-[#0F1117]">Triaxis: link numbers and record registrations</p>
      <p className="text-[11px] text-[#5F6B73]">Record a registration only after seeing its proof. Link a number only after it is connected in Triaxis&apos;s AWS account.</p>
      <label className="mt-2 block text-[11px] text-[#5F6B73]">Organization
        <select aria-label="Organization" className={input} value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}>
          <option value="">Choose an organization</option>
          {organizations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </label>
      {data ? (
        <div className="mt-2 space-y-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {OPERATOR_TEXT.map(({ field, label }) => (
              <label key={field} className="text-[11px] text-[#5F6B73]">{label}
                <input aria-label={label} className={input} value={draft[field] ?? ""} onChange={(e) => setDraft((d) => ({ ...d, [field]: e.target.value }))} />
              </label>
            ))}
          </div>
          <button type="button" onClick={() => void save(draft)} className="rounded-md bg-[#0F1117] px-3 py-1 text-xs font-semibold text-white">Save numbers</button>
          <div className="flex flex-wrap gap-4 text-xs">
            {OPERATOR_FLAGS.map(({ field, label }) => (
              <label key={field} className="flex items-center gap-2">
                <input type="checkbox" aria-label={label} checked={Boolean(data.settings[field])} onChange={(e) => void save({ [field]: e.target.checked })} />
                {label}
              </label>
            ))}
          </div>
          <ul className="space-y-1">
            <Readiness label="Call with agent" reasons={data.readiness.call} />
            <Readiness label="WhatsApp" reasons={data.readiness.whatsapp} />
            <Readiness label="SMS" reasons={data.readiness.sms} />
          </ul>
        </div>
      ) : null}
      {message ? <p className="mt-2 text-xs text-[#5F6B73]">{message}</p> : null}
    </div>
  );
}

export function AgentsCard() {
  const [data, setData] = useState<SettingsResponse | null | "forbidden">(null);

  const load = useCallback(() => {
    void fetch("/api/stack/agent-settings", { credentials: "include", cache: "no-store" })
      .then(async (r) => (r.status === 403 || r.status === 401 ? "forbidden" : r.ok ? ((await r.json()) as SettingsResponse) : null))
      .then(setData).catch(() => setData(null));
  }, []);
  useEffect(load, [load]);

  if (data === "forbidden") return null;

  return (
    <div data-testid="agents-card"><Card className="p-4">
      <h2 className="text-sm font-semibold text-[#0F1117]">Agents</h2>
      <p className="mb-3 text-xs text-[#5F6B73]">
        Your voice agent calls leads and your messaging agent opens WhatsApp or SMS conversations, from your own
        numbers. Triaxis links those numbers and records your DLT (India) or TDRA (UAE) registration after seeing it.
      </p>
      {data === null ? <p className="text-xs text-[#5F6B73]">Loading...</p> : (
        <>
          <ul className="mb-3 space-y-1">
            <Readiness label="Call with agent" reasons={data.readiness.call} />
            <Readiness label="WhatsApp" reasons={data.readiness.whatsapp} />
            <Readiness label="SMS" reasons={data.readiness.sms} />
            <li className="text-xs text-[#5F6B73]">
              Registrations recorded: India DLT {data.settings.dltIndiaRegistered ? "yes" : "no"} · UAE TDRA {data.settings.tdraUaeRegistered ? "yes" : "no"} · counsel sign-off {data.settings.counselSignedOff ? "yes" : "no"}
            </li>
          </ul>
          <OrganizationForm key={data.settings.updatedAt ?? "new"} url="/api/stack/agent-settings" data={data} onSaved={setData} />
          {data.operator ? <OperatorPanel /> : null}
        </>
      )}
    </Card></div>
  );
}
