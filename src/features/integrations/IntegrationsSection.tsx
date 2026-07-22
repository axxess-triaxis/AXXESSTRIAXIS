"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { InlineToast } from "../../components/forms/InlineToast";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/feedback/EmptyState";
import { isDemoModeEnabled } from "../../demo/demoMode";
import { applicationServices } from "../../providers/serviceProvider";
import { previewSelectedEmailImport, type ConnectorProviderId, type EmailImportPreview } from "../../services/integrations/connectorContract";
import type { MicrosoftGraphMailboxMessageSummary } from "../../services/integrations/microsoftGraphMailbox";
import type { NotionPageSummary } from "../../services/integrations/notionPages";
import { getIntegrationHealth, getInfrastructureOnlyIntegrations, getPilotIntegrations } from "../../services/integrations/pluginRegistry";

// Illustrative connector gallery for the investor-demo experience only -- real connector status
// comes from getIntegrationHealth()/getProductivityPluginRegistry() below, which are live. Gated
// behind isDemoModeEnabled(). See DEMO_DATA_LEAKAGE_AUDIT.md.
//
// pilotIntegrations/infrastructureOnlyIntegrations/pluginHealth are computed from env vars, which
// are stable for a process's lifetime, so a module-level constant is fine for them. `integrations`
// is different -- it depends on isDemoModeEnabled(), which can change within a single client
// session (SPA navigation, no full reload). A module-level call here would evaluate exactly once
// at import time and could freeze the demo fixture gallery in memory even after switching to a
// real, non-demo tenant -- the same bug class documented in DEMO_DATA_LEAKAGE_AUDIT.md's Round 4
// for AIWorkspaceSection.tsx's aiMessages. Computed inside the component instead, see below.
const pilotIntegrations = getPilotIntegrations();
const infrastructureOnlyIntegrations = getInfrastructureOnlyIntegrations();
const pluginHealth = getIntegrationHealth();

type SelectedMailboxMessage = {
  id: string;
  providerId: ConnectorProviderId;
  from: string;
  subject: string;
  sourceLink: string;
  receivedAt: string;
  bodyText: string;
};

const selectedMailboxMessages = [
  {
    id: "msg-dibrugarh-referral-review",
    providerId: "gmail",
    from: "district.programme.manager@nemh.example",
    subject: "Dibrugarh referral SLA review and ambulance escalation",
    sourceLink: "https://mail.google.com/mail/u/0/#inbox/msg-dibrugarh-referral-review",
    receivedAt: "2026-07-15T08:10:00.000Z",
    bodyText: "Please confirm the referral SLA variance for Dibrugarh District Hospital. Action required: assign ambulance turnaround review to the district transport coordinator by Friday. Decision required: whether to escalate the biomedical oxygen dependency risk to the Mission Secretariat. Stakeholders: District Programme Manager, Hospital Superintendent, Transport Coordinator.",
  },
  {
    id: "msg-kamrup-procurement-variance",
    providerId: "microsoft",
    from: "finance.controller@nemh.example",
    subject: "Kamrup procurement variance note for approval packet",
    sourceLink: "https://outlook.office.com/mail/inbox/id/msg-kamrup-procurement-variance",
    receivedAt: "2026-07-15T10:40:00.000Z",
    bodyText: "Budget variance for Kamrup public health procurement requires review before the next approval committee. Action required: prepare vendor clarification note and attach delivery receipts. Decision required: approve conditional release after finance verification. Stakeholders: Finance Controller, Procurement Lead, Vendor Onboarding Cell.",
  },
  {
    id: "msg-barpeta-csr-oxygen",
    providerId: "gmail",
    from: "csr.partnerships@nemh.example",
    subject: "CSR oxygen resilience proposal follow-up",
    sourceLink: "https://mail.google.com/mail/u/0/#inbox/msg-barpeta-csr-oxygen",
    receivedAt: "2026-07-15T12:20:00.000Z",
    bodyText: "CSR partner requested a consolidated implementation plan for Barpeta oxygen resilience. Action required: create follow-up task for district facility assessment and prepare a short stakeholder brief. Decision required: whether the proposal should enter governance review this week. Stakeholders: CSR Lead, District Biomedical Engineer, Mission Secretariat.",
  },
] satisfies SelectedMailboxMessage[];

export const IntegrationsSection = () => {
  const integrations = applicationServices.institutionalRepository.getIntegrations();
  const connectedCount = integrations.filter((integration) => integration.status === "connected").length;
  const disconnectedCount = integrations.length - connectedCount;

  const [emailForm, setEmailForm] = useState({
    providerId: "gmail",
    from: "",
    subject: "",
    sourceLink: "",
    bodyText: "",
  });
  const [preview, setPreview] = useState<EmailImportPreview | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingMailbox, setLoadingMailbox] = useState(false);
  const [liveMailboxMessages, setLiveMailboxMessages] = useState<SelectedMailboxMessage[]>([]);
  const [toast, setToast] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(null);
  const [notionPages, setNotionPages] = useState<NotionPageSummary[]>([]);
  const [loadingNotion, setLoadingNotion] = useState(false);
  const [notionPreview, setNotionPreview] = useState<{ pageId: string; title: string; bodyPreview: string } | null>(null);
  const [importingNotion, setImportingNotion] = useState(false);
  const [notionToast, setNotionToast] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(null);
  const mailboxMessages = liveMailboxMessages.length ? liveMailboxMessages : selectedMailboxMessages;

  function selectMailboxMessage(message: SelectedMailboxMessage) {
    setEmailForm({
      providerId: message.providerId,
      from: message.from,
      subject: message.subject,
      sourceLink: message.sourceLink,
      bodyText: message.bodyText,
    });
    setPreview(null);
    setToast({ tone: "info", message: "Selected mailbox message loaded. Preview extraction before creating tenant records." });
  }

  async function loadMicrosoftMailbox() {
    setLoadingMailbox(true);
    setToast(null);
    try {
      const response = await fetch("/api/connectors/microsoft/messages/list?limit=8", {
        credentials: "include",
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({})) as { providerGated?: boolean; message?: string; messages?: MicrosoftGraphMailboxMessageSummary[] };
      if (!response.ok) {
        console.error("Microsoft mailbox listing failed.", response.status, result.message);
        if (response.status === 401) throw new Error("Sign in to list Microsoft mailbox messages.");
        if (response.status === 403) throw new Error("Your role does not have permission to list Microsoft mailbox messages.");
        throw new Error("Microsoft mailbox listing failed.");
      }
      const messages = (result.messages ?? []).map((message) => ({
        id: message.messageId ?? message.sourceLink ?? message.subject,
        providerId: "microsoft" as ConnectorProviderId,
        from: message.from,
        subject: message.subject,
        sourceLink: message.sourceLink ?? "https://outlook.office.com/mail/",
        receivedAt: message.receivedAt ?? new Date().toISOString(),
        bodyText: message.bodyText || message.bodyPreview,
      }));
      if (!messages.length) {
        setToast({ tone: "info", message: result.message ?? "Microsoft mailbox listing is provider-gated until OAuth and token vault credentials are connected." });
        return;
      }
      setLiveMailboxMessages(messages);
      setToast({ tone: "success", message: `Loaded ${messages.length} Microsoft mailbox message(s) for selected-message import.` });
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Microsoft mailbox listing failed." });
    } finally {
      setLoadingMailbox(false);
    }
  }

  async function importEmail(confirm: boolean) {
    setSaving(true);
    setToast(null);
    try {
      const localPreview = buildLocalEmailPreview(emailForm);
      const response = await fetch("/api/connectors/email/import", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...emailForm, confirm }),
      });
      const result = await response.json().catch(() => ({} as { error?: string; preview?: typeof preview; tasks?: unknown[] }));
      if (!response.ok) {
        console.error("Email import failed.", response.status, result.error);
        if (response.status === 401) throw new Error("Sign in to import email.");
        if (response.status === 403) throw new Error("Your role does not have permission to import email.");
        throw new Error("Email import failed.");
      }
      if (!confirm) {
        setPreview(result.preview ?? localPreview);
        setToast({ tone: "info", message: "Review extracted tasks, decisions and stakeholders before creating records." });
      } else {
        setToast({ tone: "success", message: `Email imported with ${(result.tasks ?? []).length} confirmed task record(s).` });
        setPreview(null);
      }
    } catch (error) {
      if (!confirm) {
        const localPreview = buildLocalEmailPreview(emailForm);
        setPreview(localPreview);
        setToast({ tone: "info", message: "Review extracted tasks, decisions and stakeholders before creating records." });
        return;
      }
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Email import failed." });
    } finally {
      setSaving(false);
    }
  }

  async function loadNotionPages() {
    setLoadingNotion(true);
    setNotionToast(null);
    try {
      const response = await fetch("/api/connectors/notion/pages/list?limit=10", {
        credentials: "include",
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({})) as { providerGated?: boolean; message?: string; pages?: NotionPageSummary[] };
      if (!response.ok) {
        console.error("Notion page listing failed.", response.status, result.message);
        if (response.status === 401) throw new Error("Sign in to list Notion pages.");
        if (response.status === 403) throw new Error("Your role does not have permission to list Notion pages.");
        throw new Error("Notion page listing failed.");
      }
      const pages = result.pages ?? [];
      setNotionPages(pages);
      if (!pages.length) {
        setNotionToast({ tone: "info", message: result.message ?? "Notion page listing is provider-gated until OAuth and token vault credentials are connected." });
        return;
      }
      setNotionToast({ tone: "success", message: `Loaded ${pages.length} Notion page(s).` });
    } catch (error) {
      setNotionToast({ tone: "error", message: error instanceof Error ? error.message : "Notion page listing failed." });
    } finally {
      setLoadingNotion(false);
    }
  }

  async function previewNotionImport(page: NotionPageSummary) {
    setImportingNotion(true);
    setNotionToast(null);
    try {
      const response = await fetch("/api/connectors/notion/pages/import", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: page.pageId, title: page.title, confirm: false }),
      });
      const result = await response.json().catch(() => ({} as { error?: string; preview?: { title: string; bodyPreview: string } }));
      if (!response.ok) {
        console.error("Notion page preview failed.", response.status, result.error);
        if (response.status === 401) throw new Error("Sign in to preview this Notion page.");
        if (response.status === 403) throw new Error("Your role does not have permission to preview Notion pages.");
        throw new Error("Notion page preview failed.");
      }
      setNotionPreview({ pageId: page.pageId, title: page.title, bodyPreview: result.preview?.bodyPreview ?? "" });
      setNotionToast({ tone: "info", message: "Review the extracted content before importing it as a tenant document." });
    } catch (error) {
      setNotionToast({ tone: "error", message: error instanceof Error ? error.message : "Notion page preview failed." });
    } finally {
      setImportingNotion(false);
    }
  }

  async function confirmNotionImport() {
    if (!notionPreview) return;
    setImportingNotion(true);
    setNotionToast(null);
    try {
      const response = await fetch("/api/connectors/notion/pages/import", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: notionPreview.pageId, title: notionPreview.title, confirm: true }),
      });
      const result = await response.json().catch(() => ({} as { error?: string }));
      if (!response.ok) {
        console.error("Notion page import failed.", response.status, result.error);
        if (response.status === 401) throw new Error("Sign in to import this Notion page.");
        if (response.status === 403) throw new Error("Your role does not have permission to import Notion pages.");
        throw new Error("Notion page import failed.");
      }
      setNotionToast({ tone: "success", message: `"${notionPreview.title}" imported as a tenant document.` });
      setNotionPreview(null);
    } catch (error) {
      setNotionToast({ tone: "error", message: error instanceof Error ? error.message : "Notion page import failed." });
    } finally {
      setImportingNotion(false);
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
            <button type="button" onClick={() => void loadMicrosoftMailbox()} disabled={loadingMailbox} className="rounded-lg bg-[#8B1E2D] px-3 py-2 text-xs font-semibold text-white hover:bg-[#7a1a27] disabled:opacity-60">Load Microsoft inbox</button>
          </div>
        </div>
        <div className="grid w-full gap-2 lg:max-w-md">
          <div className="rounded-lg border border-[rgba(15,17,23,0.08)] bg-[#F8F9FA] p-2">
            <div className="mb-2 text-[10px] font-semibold uppercase text-[#5F6B73]">{liveMailboxMessages.length ? "Live Microsoft mailbox messages" : "Selected mailbox messages"}</div>
            <div className="grid gap-2">
              {mailboxMessages.map((message) => (
                <button
                  key={message.id}
                  onClick={() => selectMailboxMessage(message)}
                  className="rounded-lg bg-white px-3 py-2 text-left text-xs hover:bg-[#F2F3F5]"
                >
                  <span className="block font-semibold text-[#0F1117]">{message.subject}</span>
                  <span className="mt-0.5 block text-[11px] text-[#5F6B73]">{message.from}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select aria-label="Email provider" value={emailForm.providerId} onChange={(event) => setEmailForm({ ...emailForm, providerId: event.target.value })} className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-xs outline-none">
              <option value="gmail">Gmail</option>
              <option value="microsoft">Microsoft</option>
            </select>
            <input aria-label="Sender" value={emailForm.from} onChange={(event) => setEmailForm({ ...emailForm, from: event.target.value })} placeholder="Sender" className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-xs outline-none" />
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

    <Card className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#0F1117]">Notion Knowledge Import</h3>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#5F6B73]">Connect Notion, list pages from the connected workspace, then preview and import a page&apos;s text content as a governed tenant document available to the Knowledge Hub and AI Workspace.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href="/api/connectors/oauth/start?provider=notion" className="rounded-lg border border-[rgba(139,30,45,0.22)] bg-white px-3 py-2 text-xs font-semibold text-[#8B1E2D] hover:bg-[#8B1E2D]/5">Connect Notion</a>
            <button type="button" onClick={() => void loadNotionPages()} disabled={loadingNotion} className="rounded-lg bg-[#8B1E2D] px-3 py-2 text-xs font-semibold text-white hover:bg-[#7a1a27] disabled:opacity-60">List Notion pages</button>
          </div>
        </div>
        <div className="grid w-full gap-2 lg:max-w-md">
          <div className="rounded-lg border border-[rgba(15,17,23,0.08)] bg-[#F8F9FA] p-2">
            <div className="mb-2 text-[10px] font-semibold uppercase text-[#5F6B73]">Notion pages</div>
            <div className="grid gap-2">
              {notionPages.length === 0 && <p className="px-3 py-2 text-[11px] text-[#5F6B73]">No pages loaded yet.</p>}
              {notionPages.map((page) => (
                <button
                  key={page.pageId}
                  onClick={() => void previewNotionImport(page)}
                  disabled={importingNotion}
                  className="rounded-lg bg-white px-3 py-2 text-left text-xs hover:bg-[#F2F3F5] disabled:opacity-60"
                >
                  <span className="block font-semibold text-[#0F1117]">{page.title}</span>
                  <span className="mt-0.5 block text-[11px] text-[#5F6B73]">{page.url}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      {notionToast && <div className="mt-4"><InlineToast tone={notionToast.tone} message={notionToast.message} /></div>}
      {notionPreview && (
        <div className="mt-4 rounded-lg bg-[#F8F9FA] p-3">
          <div className="mb-2 text-[10px] font-semibold uppercase text-[#5F6B73]">Preview -- {notionPreview.title}</div>
          <p className="mb-3 whitespace-pre-line text-[11px] leading-relaxed text-[#0F1117]">{notionPreview.bodyPreview || "No text content extracted."}</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setNotionPreview(null)} className="rounded-lg border border-[rgba(0,0,0,0.12)] px-3 py-2 text-xs font-semibold text-[#0F1117] hover:bg-[#F2F3F5]">Cancel</button>
            <button onClick={() => void confirmNotionImport()} disabled={importingNotion} className="rounded-lg bg-[#8B1E2D] px-3 py-2 text-xs font-semibold text-white hover:bg-[#7a1a27] disabled:opacity-60">Confirm import</button>
          </div>
        </div>
      )}
    </Card>

    <EnterpriseConnectorCredentialsPanel />

    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {[
        ["Adapters catalogued", pluginHealth.total],
        ["Configured", pluginHealth.configured],
        ["Pilot-enabled", pluginHealth.pilotEnabled],
        ["Webhook-capable", pluginHealth.webhookReady],
      ].map(([label, value]) => (
        <Card key={label} className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[#5F6B73]">{label}</div>
          <div className="mt-2 font-mono text-2xl font-semibold text-[#0F1117]">{value}</div>
        </Card>
      ))}
    </div>

    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {!isDemoModeEnabled() && integrations.length === 0 && (
        <EmptyState message="No demo connector gallery in this view. See connector status and OAuth setup below." />
      )}
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
          <h3 className="text-sm font-semibold text-[#0F1117]">Pilot integrations</h3>
          <p className="mt-1 text-xs text-[#5F6B73]">Connectors with a real, working connect flow in this release. OAuth scopes, role gates, webhook readiness, and audit events shown below.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {pilotIntegrations.map((plugin) => (
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

    <Card className="p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[#0F1117]">Also available at the infrastructure level</h3>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#5F6B73]">
          These {infrastructureOnlyIntegrations.length} connectors are enabled at the database level (Supabase wrappers) but have no product-facing connect flow yet -- listed here for reference, not as something you can connect to today.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {infrastructureOnlyIntegrations.map((plugin) => (
          <span key={plugin.id} className="rounded-full border border-[rgba(0,0,0,0.08)] bg-[#F8F9FA] px-3 py-1 text-[11px] font-medium text-[#5F6B73]">
            {plugin.name}
          </span>
        ))}
      </div>
    </Card>
  </div>
  );
};

type EnterpriseConnectorProviderInfo = {
  providerId: string;
  displayName: string;
  category: string;
  purpose: string;
  credentialFields: Array<{ key: string; label: string; secret: boolean }>;
};

type EnterpriseConnectorConnection = {
  provider_id: string;
  status: string;
  updated_at: string;
};

function EnterpriseConnectorCredentialsPanel() {
  const { session } = useAuth();
  const [providers, setProviders] = useState<EnterpriseConnectorProviderInfo[]>([]);
  const [connections, setConnections] = useState<EnterpriseConnectorConnection[]>([]);
  const [openProviderId, setOpenProviderId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(null);
  const canConfigure = Boolean(session.user && ["Super Admin", "Organization Admin"].includes(session.user.role));

  useEffect(() => {
    let isMounted = true;
    fetch("/api/connectors/enterprise/credentials", { credentials: "include", cache: "no-store" })
      .then((response) => response.json())
      .then((result: { providers?: EnterpriseConnectorProviderInfo[]; connections?: EnterpriseConnectorConnection[] }) => {
        if (!isMounted) return;
        setProviders(result.providers ?? []);
        setConnections(result.connections ?? []);
      })
      .catch(() => undefined);
    return () => {
      isMounted = false;
    };
  }, []);

  function statusFor(providerId: string) {
    return connections.find((connection) => connection.provider_id === providerId)?.status;
  }

  function openProvider(providerId: string) {
    setOpenProviderId(providerId === openProviderId ? null : providerId);
    setForm({});
    setToast(null);
  }

  async function saveCredentials(provider: EnterpriseConnectorProviderInfo) {
    setSaving(true);
    setToast(null);
    try {
      const response = await fetch("/api/connectors/enterprise/credentials", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId: provider.providerId, credentials: form }),
      });
      const result = await response.json().catch(() => ({} as { error?: string; message?: string }));
      // Never surface the raw backend error/message here -- this panel handles provider secrets,
      // so a leaked backend string is a higher-severity risk than elsewhere (Sprint 3).
      if (!response.ok) {
        console.error("Saving connector credentials failed.", response.status, result.error ?? result.message);
        if (response.status === 401) throw new Error("Sign in to configure connector credentials.");
        if (response.status === 403) throw new Error("Your role does not have permission to configure connector credentials.");
        throw new Error("Saving credentials failed.");
      }
      setToast({ tone: "success", message: `${provider.displayName} credentials stored (encrypted at rest).` });
      setConnections((current) => [
        ...current.filter((connection) => connection.provider_id !== provider.providerId),
        { provider_id: provider.providerId, status: "configured", updated_at: new Date().toISOString() },
      ]);
      setOpenProviderId(null);
      setForm({});
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Saving credentials failed." });
    } finally {
      setSaving(false);
    }
  }

  async function revokeCredentials(provider: EnterpriseConnectorProviderInfo) {
    setSaving(true);
    setToast(null);
    try {
      const response = await fetch(`/api/connectors/enterprise/credentials?providerId=${provider.providerId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Revoking credentials failed.");
      setConnections((current) => current.map((connection) => (connection.provider_id === provider.providerId ? { ...connection, status: "revoked" } : connection)));
      setToast({ tone: "success", message: `${provider.displayName} credentials revoked.` });
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Revoking credentials failed." });
    } finally {
      setSaving(false);
    }
  }

  if (providers.length === 0) return null;

  return (
    <Card className="p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[#0F1117]">Enterprise Data &amp; Billing Connections</h3>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#5F6B73]">
          Store encrypted credentials for enterprise data-warehouse, storage, billing and SSO connectors backed by their Postgres wrapper. Credentials are sealed with AES-256-GCM and never exposed to client-side code once saved. Live connectivity verification against the external service is not implemented in this pass -- saving confirms the credential was stored correctly, not that the external service accepted it.
        </p>
      </div>
      {toast && <div className="mb-3"><InlineToast tone={toast.tone} message={toast.message} /></div>}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {providers.map((provider) => {
          const status = statusFor(provider.providerId);
          const isOpen = openProviderId === provider.providerId;
          return (
            <div key={provider.providerId} className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-[#F8F9FA] p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[#0F1117]">{provider.displayName}</div>
                  <div className="mt-0.5 font-mono text-[11px] uppercase text-[#5F6B73]">{provider.category}</div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${status === "configured" ? "bg-emerald-50 text-emerald-700" : status === "revoked" ? "bg-gray-100 text-gray-600" : "bg-amber-50 text-amber-700"}`}>
                  {status === "configured" ? "configured" : status === "revoked" ? "revoked" : "not configured"}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[#5F6B73]">{provider.purpose}</p>
              {canConfigure ? (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => openProvider(provider.providerId)}
                    className="rounded-lg border border-[rgba(139,30,45,0.22)] bg-white px-3 py-2 text-xs font-semibold text-[#8B1E2D] hover:bg-[#8B1E2D]/5"
                  >
                    {isOpen ? "Cancel" : status === "configured" ? "Update credentials" : "Configure"}
                  </button>
                  {status === "configured" && (
                    <button
                      type="button"
                      onClick={() => void revokeCredentials(provider)}
                      disabled={saving}
                      className="ml-2 rounded-lg border border-[rgba(0,0,0,0.12)] px-3 py-2 text-xs font-semibold text-[#0F1117] hover:bg-[#F2F3F5] disabled:opacity-60"
                    >
                      Revoke
                    </button>
                  )}
                  {isOpen && (
                    <div className="mt-3 grid gap-2">
                      {provider.credentialFields.map((field) => (
                        <input
                          key={field.key}
                          aria-label={field.label}
                          type={field.secret ? "password" : "text"}
                          placeholder={field.label}
                          value={form[field.key] ?? ""}
                          onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
                          className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-xs outline-none"
                        />
                      ))}
                      <button
                        type="button"
                        onClick={() => void saveCredentials(provider)}
                        disabled={saving}
                        className="rounded-lg bg-[#8B1E2D] px-3 py-2 text-xs font-semibold text-white hover:bg-[#7a1a27] disabled:opacity-60"
                      >
                        Save credentials
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-[11px] text-[#5F6B73]">Only Organization Admins can configure this connector.</p>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function isConnectorProviderId(value: string): value is ConnectorProviderId {
  return value === "gmail" || value === "microsoft";
}

function buildLocalEmailPreview(emailForm: { providerId: string; from: string; subject: string; sourceLink: string; bodyText: string }) {
  return previewSelectedEmailImport({
    providerId: isConnectorProviderId(emailForm.providerId) ? emailForm.providerId : "gmail",
    from: emailForm.from || "Selected mailbox sender",
    subject: emailForm.subject || "Selected institutional message",
    sourceLink: emailForm.sourceLink || undefined,
    bodyText: emailForm.bodyText,
  });
}

export default IntegrationsSection;
