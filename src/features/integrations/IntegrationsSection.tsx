"use client";

import { useState } from "react";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { InlineToast } from "../../components/forms/InlineToast";
import { Card } from "../../components/ui/Card";
import { applicationServices } from "../../providers/serviceProvider";
import { getIntegrationHealth, getProductivityPluginRegistry } from "../../services/integrations/pluginRegistry";

const integrations = applicationServices.institutionalRepository.getIntegrations();
const pluginRegistry = getProductivityPluginRegistry();
const pluginHealth = getIntegrationHealth();

const connectedCount = integrations.filter((integration) => integration.status === "connected").length;
const disconnectedCount = integrations.length - connectedCount;

export const IntegrationsSection = () => {
  const [emailForm, setEmailForm] = useState({
    providerId: "gmail",
    from: "",
    subject: "",
    sourceLink: "",
    bodyText: "",
  });
  const [preview, setPreview] = useState<{ summary: string; tasks: string[]; decisions: string[]; stakeholders: string[]; tags: string[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(null);

  async function importEmail(confirm: boolean) {
    setSaving(true);
    setToast(null);
    try {
      const response = await fetch("/api/connectors/email/import", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...emailForm, confirm }),
      });
      const result = await response.json().catch(() => ({} as { error?: string; preview?: typeof preview; tasks?: unknown[] }));
      if (!response.ok) throw new Error(result.error ?? "Email import failed.");
      if (!confirm) {
        setPreview(result.preview ?? null);
        setToast({ tone: "info", message: "Review extracted tasks, decisions and stakeholders before creating records." });
      } else {
        setToast({ tone: "success", message: `Email imported with ${(result.tasks ?? []).length} confirmed task record(s).` });
        setPreview(null);
      }
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Email import failed." });
    } finally {
      setSaving(false);
    }
  }

  return (
  <div className="space-y-5">
    <SectionHeader title="Integrations" subtitle={`${pluginHealth.total} plugin adapters - ${pluginHealth.webhookReady} webhook-ready - ${connectedCount} connected - ${disconnectedCount} disconnected - provider-gated for production credentials`} />

    <Card className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#0F1117]">Email Connector Pilot</h3>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#5F6B73]">Start OAuth for Gmail or Microsoft, then import only a selected email into the workspace. AXXESS previews tasks, decisions and stakeholders before any records are created.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href="/api/connectors/oauth/start?provider=gmail" className="rounded-lg border border-[rgba(139,30,45,0.22)] bg-white px-3 py-2 text-xs font-semibold text-[#8B1E2D] hover:bg-[#8B1E2D]/5">Connect Gmail</a>
            <a href="/api/connectors/oauth/start?provider=microsoft" className="rounded-lg border border-[rgba(139,30,45,0.22)] bg-white px-3 py-2 text-xs font-semibold text-[#8B1E2D] hover:bg-[#8B1E2D]/5">Connect Microsoft</a>
          </div>
        </div>
        <div className="grid w-full gap-2 lg:max-w-md">
          <div className="grid grid-cols-2 gap-2">
            <select value={emailForm.providerId} onChange={(event) => setEmailForm({ ...emailForm, providerId: event.target.value })} className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-xs outline-none">
              <option value="gmail">Gmail</option>
              <option value="microsoft">Microsoft</option>
            </select>
            <input value={emailForm.from} onChange={(event) => setEmailForm({ ...emailForm, from: event.target.value })} placeholder="Sender" className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-xs outline-none" />
          </div>
          <input value={emailForm.subject} onChange={(event) => setEmailForm({ ...emailForm, subject: event.target.value })} placeholder="Subject" className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-xs outline-none" />
          <input value={emailForm.sourceLink} onChange={(event) => setEmailForm({ ...emailForm, sourceLink: event.target.value })} placeholder="Source link" className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-xs outline-none" />
          <textarea value={emailForm.bodyText} onChange={(event) => setEmailForm({ ...emailForm, bodyText: event.target.value })} placeholder="Paste selected email text" rows={4} className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-xs outline-none" />
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void importEmail(false)} disabled={saving} className="rounded-lg border border-[rgba(0,0,0,0.12)] px-3 py-2 text-xs font-semibold text-[#0F1117] hover:bg-[#F2F3F5] disabled:opacity-60">Preview extraction</button>
            <button onClick={() => void importEmail(true)} disabled={saving || !preview} className="rounded-lg bg-[#8B1E2D] px-3 py-2 text-xs font-semibold text-white hover:bg-[#7a1a27] disabled:opacity-60">Confirm import</button>
          </div>
        </div>
      </div>
      {toast && <div className="mt-4"><InlineToast tone={toast.tone} message={toast.message} /></div>}
      {preview && (
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {[
            ["Summary", [preview.summary]],
            ["Tasks", preview.tasks],
            ["Decisions", preview.decisions],
            ["Stakeholders", preview.stakeholders],
          ].map(([label, values]) => (
            <div key={label as string} className="rounded-lg bg-[#F8F9FA] p-3">
              <div className="mb-2 text-[10px] font-semibold uppercase text-[#5F6B73]">{label as string}</div>
              {(values as string[]).slice(0, 3).map((value) => <p key={value} className="mb-1 text-[11px] leading-relaxed text-[#0F1117]">{value}</p>)}
              {(values as string[]).length === 0 && <p className="text-[11px] text-[#5F6B73]">No candidate detected</p>}
            </div>
          ))}
        </div>
      )}
    </Card>

    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {[
        ["Adapters", pluginHealth.total],
        ["Configured", pluginHealth.configured],
        ["Demo Ready", pluginHealth.demoConnected],
        ["Webhooks", pluginHealth.webhookReady],
      ].map(([label, value]) => (
        <Card key={label} className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[#5F6B73]">{label}</div>
          <div className="mt-2 font-mono text-2xl font-semibold text-[#0F1117]">{value}</div>
        </Card>
      ))}
    </div>

    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {integrations.map((int) => (
        <Card key={int.name} className="p-4 transition-shadow hover:shadow-md">
          <div className="mb-3 flex items-start justify-between">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold text-white ${int.status === "connected" ? "bg-[#2C4A7C]" : int.status === "pending" ? "bg-[#C9A227]" : "bg-[#5F6B73]"}`}>
              {int.icon}
            </div>
            <span className={`mt-1 h-2 w-2 rounded-full ${int.status === "connected" ? "bg-emerald-500" : int.status === "pending" ? "bg-amber-500" : "bg-gray-300"}`} />
          </div>
          <div className="mb-0.5 text-sm font-semibold text-[#0F1117]">{int.name}</div>
          <div className="text-[11px] text-[#5F6B73]">{int.category}</div>
          <div className="mt-2 font-mono text-[10px] text-[#5F6B73]">
            {int.status === "connected" ? `Synced ${int.lastSync}` : int.status === "pending" ? "Setup required" : "Disconnected"}
          </div>
        </Card>
      ))}
    </div>

    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#0F1117]">Productivity Plugin Registry</h3>
          <p className="mt-1 text-xs text-[#5F6B73]">OAuth scopes, role gates, webhook readiness, and audit events for enterprise integrations.</p>
        </div>
        <span className="rounded-full bg-[#8B1E2D]/8 px-2.5 py-1 text-[11px] font-semibold text-[#8B1E2D]">Sprint 14</span>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {pluginRegistry.map((plugin) => (
          <div key={plugin.id} className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-[#F8F9FA] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[#0F1117]">{plugin.name}</div>
                <div className="mt-0.5 font-mono text-[11px] uppercase text-[#5F6B73]">{plugin.category}</div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${plugin.configured ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                {plugin.configured ? "configured" : "gated"}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[#5F6B73]">{plugin.useCases.join(" - ")}</p>
          </div>
        ))}
      </div>
    </Card>
  </div>
  );
};

export default IntegrationsSection;
