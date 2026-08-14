"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { InlineToast } from "../../components/forms/InlineToast";
import { Card } from "../../components/ui/Card";
import { BrandIcon } from "../../components/ui/BrandIcon";
import { brandIcons } from "../../components/ui/brandIcons";
import { likenessIcons } from "../../components/ui/LikenessIcon";
import { EmptyState } from "../../components/feedback/EmptyState";
import { isDemoModeEnabled } from "../../demo/demoMode";
import { applicationServices } from "../../providers/serviceProvider";
import { previewSelectedEmailImport, type ConnectorProviderId, type EmailImportPreview } from "../../services/integrations/connectorContract";
import type { MicrosoftGraphMailboxMessageSummary } from "../../services/integrations/microsoftGraphMailbox";
import type { NotionPageSummary } from "../../services/integrations/notionPages";
import { getIntegrationHealth, getInfrastructureOnlyIntegrations, getPilotIntegrations } from "../../services/integrations/pluginRegistry";
import { useFacebookLoginStatus, facebookLoginStatusCopy } from "../../hooks/useFacebookLoginStatus";
import { WhatsAppPhoneNumberField } from "./WhatsAppPhoneNumberField";
import { allAgentCapabilities, mcp2AgentCapabilities, type AgentCapability } from "../../security/agentScope";
import { agentPolicyTemplates } from "../../services/agents/agentPolicyTemplates";
import { Layers } from "lucide-react";

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

// MC-4 (2026-08-02): manual "Sync now" for the two pull-based social connectors (no webhook
// subscription for Page/Instagram content exists yet -- see metaBusinessIngestion.ts/
// threadsIngestion.ts's own deferred-scope comments). Calls the real sync route and reports the
// real counts returned, never a fabricated "synced" message.
const SYNC_ROUTES: Record<string, string> = {
  meta_business: "/api/connectors/meta-business/sync",
  threads: "/api/connectors/threads/sync",
};

function SyncNowButton({ providerId }: { providerId: string }) {
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  async function handleSync() {
    setSyncing(true);
    setStatus(null);
    try {
      const response = await fetch(SYNC_ROUTES[providerId], { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: "{}" });
      const payload = await response.json().catch(() => ({})) as { error?: string; synced?: number; postsSynced?: number; campaignsSynced?: number };
      if (!response.ok) {
        setStatus({ tone: "error", message: payload.error ?? "Sync failed." });
        return;
      }
      const summary = providerId === "threads"
        ? `Synced ${payload.synced ?? 0} post(s).`
        : `Synced ${payload.postsSynced ?? 0} post(s) and ${payload.campaignsSynced ?? 0} campaign(s).`;
      setStatus({ tone: "success", message: summary });
    } catch {
      setStatus({ tone: "error", message: "Unable to reach the server. Try again." });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={handleSync}
        disabled={syncing}
        className="rounded-lg border border-[rgba(139,30,45,0.22)] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#8B1E2D] hover:bg-[#8B1E2D]/5 disabled:opacity-60"
      >
        {syncing ? "Syncing..." : "Sync now"}
      </button>
      {status && <div className="mt-1.5"><InlineToast tone={status.tone} message={status.message} /></div>}
    </div>
  );
}

function ConnectedBadge({ connectedAt }: { connectedAt: string | null | undefined }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
      <span className="h-2 w-2 rounded-full bg-emerald-500" />
      Connected{connectedAt ? ` ${new Date(connectedAt).toLocaleDateString()}` : ""}
    </span>
  );
}

export const IntegrationsSection = () => {
  const integrations = applicationServices.institutionalRepository.getIntegrations();
  const connectedCount = integrations.filter((integration) => integration.status === "connected").length;
  const disconnectedCount = integrations.length - connectedCount;
  // A-109 (2026-08-09): moved from Settings > Integrations (now removed) -- gates the WhatsApp
  // phone-number-ID field, same admin-role check that tab used.
  const { session } = useAuth();
  const canConnect = Boolean(session.user && ["Super Admin", "Organization Admin"].includes(session.user.role));
  const facebookLoginStatus = useFacebookLoginStatus();

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
  const [connectedProviders, setConnectedProviders] = useState<Partial<Record<ConnectorProviderId, string | null>>>({});

  // A-97 (2026-08-06): the OAuth callback redirects back here with ?provider=&status=, but nothing
  // previously read it -- a real, successful "Connect Gmail" looked identical to doing nothing, so
  // the founder kept re-clicking it. Surface the outcome once, then clean the URL so a page refresh
  // doesn't replay a stale toast.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const provider = params.get("provider");
    const status = params.get("status");
    const reason = params.get("reason");
    if (!provider || !status) return;
    const label = provider.split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
    if (status === "connected") {
      setToast({ tone: "success", message: `${label} connected.` });
    } else if (status === "not_configured") {
      setToast({ tone: "error", message: `${label} OAuth completed, but the server is not configured to store the connection. Contact an administrator.` });
    } else if (status === "error") {
      setToast({ tone: "error", message: `${label} connection failed${reason ? `: ${reason}` : "."}` });
    }
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/connectors/status?provider=gmail&provider=microsoft&provider=notion", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { connections: [] }))
      .then((result: { connections?: { providerId: ConnectorProviderId; connectedAt: string | null }[] }) => {
        if (cancelled) return;
        const next: Partial<Record<ConnectorProviderId, string | null>> = {};
        for (const connection of result.connections ?? []) next[connection.providerId] = connection.connectedAt;
        setConnectedProviders(next);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [toast]);
  // SA-2b (2026-07-29): this used to fall back to the illustrative NEMH sample messages
  // unconditionally whenever a real tenant hadn't loaded a real inbox yet -- a real tenant who
  // just connected a real Gmail/Microsoft account saw fake seeded content indistinguishable from
  // their own real mailbox, with no "example" labeling. Same failure class as A-28/
  // DEMO_DATA_LEAKAGE_AUDIT.md, via an empty-state fallback rather than an unconditional render.
  // Now gated behind isDemoModeEnabled(), matching this file's own stated intent for the rest of
  // its illustrative content.
  const mailboxMessages = liveMailboxMessages.length
    ? liveMailboxMessages
    : isDemoModeEnabled()
      ? selectedMailboxMessages
      : [];

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

    {/* Reordered (2026-08-13, applies to both landing.triaxisventures.com and
        investor.triaxisventures.com -- this is a real information-architecture improvement, not
        demo-only content): the catalogue leads the page now, since it's the highest-density,
        most immediately legible view of integration status. The pilot connect-flow cards below it
        are secondary, hands-on workflows for the few connectors with a real OAuth flow in this
        release -- not what a first-time visitor to this page needs to see first. */}
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
      {integrations.map((int) => {
        // A-96 (2026-08-04): real simple-icons mark where one safely exists; an original,
        // brand-evocative-but-not-copied "likeness" icon (see LikenessIcon.tsx's registry) for
        // providers with no safe simple-icons mark; the plain two-letter fallback otherwise.
        const brandIcon = brandIcons[int.brandId];
        const LikenessIcon = likenessIcons[int.brandId];
        const likenessIcon = LikenessIcon ? <LikenessIcon size={22} /> : undefined;
        return (
        <Card key={int.name} className="p-4 transition-shadow hover:shadow-md">
          <div className="mb-3 flex items-start justify-between">
            <div className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl text-xs font-bold text-white ${brandIcon || likenessIcon ? "bg-white ring-1 ring-[rgba(15,17,23,0.08)]" : int.status === "connected" ? "bg-[#2C4A7C]" : int.status === "pending" ? "bg-[#C9A227]" : "bg-[#5F6B73]"}`}>
              {brandIcon ? <BrandIcon icon={brandIcon} size={22} /> : likenessIcon ?? int.icon}
            </div>
            <span className={`mt-1 h-2 w-2 rounded-full ${int.status === "connected" ? "bg-emerald-500" : int.status === "pending" ? "bg-amber-500" : "bg-gray-300"}`} />
          </div>
          <div className="mb-0.5 text-sm font-semibold text-[#0F1117]">{int.name}</div>
          <div className="text-[11px] text-[#5F6B73]">{int.category}</div>
          <div className="mt-2 font-mono text-[10px] text-[#5F6B73]">
            {int.status === "connected" ? `Synced ${int.lastSync}` : int.status === "pending" ? "Setup required" : "Disconnected"}
          </div>
        </Card>
        );
      })}
    </div>

    <Card className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#0F1117]">Email Connector Pilot</h3>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#5F6B73]">Start OAuth for Gmail or Microsoft, then import only a selected email into the workspace. AXXESS previews tasks, decisions and stakeholders before any records are created.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {"gmail" in connectedProviders ? <ConnectedBadge connectedAt={connectedProviders.gmail} /> : null}
            <a href="/api/connectors/oauth/start?provider=gmail" className="rounded-lg border border-[rgba(139,30,45,0.22)] bg-white px-3 py-2 text-xs font-semibold text-[#8B1E2D] hover:bg-[#8B1E2D]/5">{"gmail" in connectedProviders ? "Reconnect Gmail" : "Connect Gmail"}</a>
            {"microsoft" in connectedProviders ? <ConnectedBadge connectedAt={connectedProviders.microsoft} /> : null}
            <a href="/api/connectors/oauth/start?provider=microsoft" className="rounded-lg border border-[rgba(139,30,45,0.22)] bg-white px-3 py-2 text-xs font-semibold text-[#8B1E2D] hover:bg-[#8B1E2D]/5">{"microsoft" in connectedProviders ? "Reconnect Microsoft" : "Connect Microsoft"}</a>
            <button type="button" onClick={() => void loadMicrosoftMailbox()} disabled={loadingMailbox} className="rounded-lg bg-[#8B1E2D] px-3 py-2 text-xs font-semibold text-white hover:bg-[#7a1a27] disabled:opacity-60">Load Microsoft inbox</button>
          </div>
        </div>
        <div className="grid w-full gap-2 lg:max-w-md">
          <div className="rounded-lg border border-[rgba(15,17,23,0.08)] bg-[#F8F9FA] p-2">
            <div className="mb-2 text-[10px] font-semibold uppercase text-[#5F6B73]">
              {liveMailboxMessages.length
                ? "Live Microsoft mailbox messages"
                : isDemoModeEnabled()
                  ? "Selected mailbox messages (illustrative)"
                  : "Selected mailbox messages"}
            </div>
            {mailboxMessages.length === 0 && (
              <p className="px-1 py-2 text-[11px] leading-relaxed text-[#5F6B73]">
                Connect Gmail or Microsoft above, then load your inbox to see real messages here.
              </p>
            )}
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
            {"notion" in connectedProviders ? <ConnectedBadge connectedAt={connectedProviders.notion} /> : null}
            <a href="/api/connectors/oauth/start?provider=notion" className="rounded-lg border border-[rgba(139,30,45,0.22)] bg-white px-3 py-2 text-xs font-semibold text-[#8B1E2D] hover:bg-[#8B1E2D]/5">{"notion" in connectedProviders ? "Reconnect Notion" : "Connect Notion"}</a>
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

    <AgentConnectionsPanel />

    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#0F1117]">Pilot integrations</h3>
          <p className="mt-1 text-xs text-[#5F6B73]">Connectors with a real, working connect flow in this release. OAuth scopes, role gates, webhook readiness, and audit events shown below.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {pilotIntegrations.map((plugin) => {
          const brandIcon = brandIcons[plugin.id];
          return (
            <div key={plugin.id} className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-[#F8F9FA] p-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white">
                  {brandIcon ? <BrandIcon icon={brandIcon} size={16} /> : <Layers size={14} className="text-[#5F6B73]" />}
                </div>
                <div className="text-sm font-semibold text-[#0F1117]">{plugin.name}</div>
              </div>
              {/* A-109 (2026-08-09): migrated from Settings > Integrations (now removed) rather than
                  deleted -- these three pieces weren't duplicated anywhere on this page before. */}
              {(plugin.id === "whatsapp_business" || plugin.id === "meta_business") && facebookLoginStatusCopy[facebookLoginStatus] && (
                <p className="mt-2 rounded-lg bg-[rgba(15,17,23,0.04)] px-2.5 py-2 text-[11px] leading-relaxed text-[#5F6B73]">
                  {facebookLoginStatusCopy[facebookLoginStatus]}
                </p>
              )}
              {plugin.id === "calendly" && (
                <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-800">
                  Calendly&apos;s API requires a Standard plan or higher on the account you connect -- it isn&apos;t available on Calendly&apos;s free tier. This is a cost on your own Calendly subscription, not an AXXESS charge.
                </p>
              )}
              {plugin.id === "whatsapp_business" && canConnect && (
                <div className="mt-2"><WhatsAppPhoneNumberField /></div>
              )}
              {(plugin.id === "meta_business" || plugin.id === "threads") && <SyncNowButton providerId={plugin.id} />}
            </div>
          );
        })}
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
        {infrastructureOnlyIntegrations.map((plugin) => {
          const brandIcon = brandIcons[plugin.id];
          return (
            <span key={plugin.id} className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(0,0,0,0.08)] bg-[#F8F9FA] px-3 py-1 text-[11px] font-medium text-[#5F6B73]">
              {brandIcon && <BrandIcon icon={brandIcon} size={12} />}
              {plugin.name}
            </span>
          );
        })}
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
          const brandIcon = brandIcons[provider.providerId];
          return (
            <div key={provider.providerId} className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-[#F8F9FA] p-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white">
                  {brandIcon ? <BrandIcon icon={brandIcon} size={16} /> : <Layers size={14} className="text-[#5F6B73]" />}
                </div>
                <div className="text-sm font-semibold text-[#0F1117]">{provider.displayName}</div>
              </div>
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

const agentProviderOptions: Array<{ id: "openai" | "anthropic" | "microsoft_copilot"; label: string }> = [
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
  { id: "microsoft_copilot", label: "Microsoft Copilot" },
];

type AgentConnectionSummary = {
  id: string;
  provider: "openai" | "anthropic" | "microsoft_copilot";
  label: string;
  apiKeyPrefix: string;
  capabilities: AgentCapability[];
  status: "active" | "revoked";
  issuedByUserId?: string;
  issuedByRole?: string;
  lastUsedAt?: string;
  createdAt: string;
  revokedAt?: string;
  agentProfileId?: string;
};

// MCP3-2 (2026-08-14): a named, reusable agent persona a connection can be issued from -- see
// src/services/agents/agentProfileRepository.ts (server-only; this is a local mirror of its
// AgentProfileSummary shape, same convention already used for AgentConnectionSummary above).
type AgentProfileSummary = {
  id: string;
  provider: "openai" | "anthropic" | "microsoft_copilot";
  displayName: string;
  purpose?: string;
  instructions?: string;
  riskTier: "low" | "standard" | "elevated" | "high";
  defaultCapabilities: AgentCapability[];
  policyTemplate?: string;
  status: "active" | "revoked";
  createdAt: string;
};

const riskTierOptions: Array<{ id: "low" | "standard" | "elevated" | "high"; label: string }> = [
  { id: "low", label: "Low" },
  { id: "standard", label: "Standard" },
  { id: "elevated", label: "Elevated" },
  { id: "high", label: "High" },
];

// Agentic Infrastructure Phase 1 (2026-07-30): lets a tenant admin issue an AXXESS API key for an
// external AI agent platform to connect to the real MCP server at /api/agents/mcp
// (src/app/api/agents/mcp/route.ts). Not an OAuth redirect like the connectors above -- AXXESS is
// the one issuing a credential here, so this mirrors EnterpriseConnectorCredentialsPanel's
// generate/list/revoke shape rather than the OAuth "Connect" buttons elsewhere on this page.
type AgentActionGrant = {
  id: string;
  agentConnectionId: string;
  toolName: string;
  grantedAt: string;
};

type AgentActivityEvent = {
  id: string;
  provider: string;
  toolName: string;
  status: "success" | "failure" | "pending" | "denied";
  errorMessage?: string;
  agentConnectionId?: string;
  createdAt: string;
};

type AgentActivitySummary = {
  callsByProvider: Record<string, number>;
  callsByTool: Record<string, number>;
  failures: number;
  denials: number;
  pendingApprovals: number;
  approvalCount: number;
  activeGrants: number;
  grantCount: number;
};

const criticalAgentCapabilities = new Set<AgentCapability>([
  "create_meeting",
  "create_project",
  "create_stakeholder",
  "query_external_model",
  "update_task_status",
  "add_stakeholder_note",
  "search_audit_logs",
]);

function capabilityLabel(capability: string) {
  return capability.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function formatDateTime(value: string | undefined) {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

function AgentConnectionsPanel() {
  const { session } = useAuth();
  const [connections, setConnections] = useState<AgentConnectionSummary[]>([]);
  const [provider, setProvider] = useState<"openai" | "anthropic" | "microsoft_copilot">("openai");
  const [label, setLabel] = useState("");
  // MCP3-2: reusable agent personas a connection can be issued from, plus the compact create form.
  const [profiles, setProfiles] = useState<AgentProfileSummary[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [newProfile, setNewProfile] = useState({ displayName: "", purpose: "", provider: "openai" as typeof provider, riskTier: "standard" as AgentProfileSummary["riskTier"], policyTemplateId: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [issuedKey, setIssuedKey] = useState<{ provider: string; rawApiKey: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(null);
  const [expandedConnectionId, setExpandedConnectionId] = useState<string | null>(null);
  const [grantsByConnection, setGrantsByConnection] = useState<Record<string, AgentActionGrant[]>>({});
  const [activity, setActivity] = useState<AgentActivityEvent[]>([]);
  const [activitySummary, setActivitySummary] = useState<AgentActivitySummary | null>(null);
  const canManage = Boolean(session.user && ["Super Admin", "Organization Admin"].includes(session.user.role));

  async function loadAgentActivity() {
    try {
      const response = await fetch("/api/agents/activity", { credentials: "include", cache: "no-store" });
      const result = await response.json().catch(() => ({} as { activity?: AgentActivityEvent[]; summary?: AgentActivitySummary }));
      if (!response.ok) return;
      setActivity(result.activity ?? []);
      setActivitySummary(result.summary ?? null);
    } catch {
      setActivity([]);
      setActivitySummary(null);
    }
  }

  // Agentic Infrastructure Phase 2 (2026-07-30): surfaces "Always Allow" grants (created from
  // Approvals & Governance when a critical tool call is approved with that option) so they're
  // never invisible/unmanageable -- an admin can see exactly what a connection can now do without
  // a fresh approval, and revoke it.
  async function toggleGrants(connectionId: string) {
    if (expandedConnectionId === connectionId) {
      setExpandedConnectionId(null);
      return;
    }
    setExpandedConnectionId(connectionId);
    if (grantsByConnection[connectionId]) return;
    try {
      const response = await fetch(`/api/agents/connections/${connectionId}/grants`, { credentials: "include", cache: "no-store" });
      const result = await response.json().catch(() => ({} as { grants?: AgentActionGrant[] }));
      setGrantsByConnection((current) => ({ ...current, [connectionId]: result.grants ?? [] }));
    } catch {
      setGrantsByConnection((current) => ({ ...current, [connectionId]: [] }));
    }
  }

  async function revokeToolGrant(connectionId: string, grantId: string) {
    try {
      const response = await fetch(`/api/agents/connections/${connectionId}/grants?grantId=${grantId}`, { method: "DELETE", credentials: "include" });
      if (!response.ok) throw new Error("Revoking this grant failed.");
      setGrantsByConnection((current) => ({ ...current, [connectionId]: (current[connectionId] ?? []).filter((grant) => grant.id !== grantId) }));
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Revoking this grant failed." });
    }
  }

  async function toggleCapability(connection: AgentConnectionSummary, capability: AgentCapability) {
    const nextCapabilities = connection.capabilities.includes(capability)
      ? connection.capabilities.filter((item) => item !== capability)
      : [...connection.capabilities, capability];
    setSaving(true);
    setToast(null);
    try {
      const response = await fetch("/api/agents/connections", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: connection.id, capabilities: nextCapabilities }),
      });
      const result = await response.json().catch(() => ({} as { connection?: AgentConnectionSummary; error?: string }));
      if (!response.ok || !result.connection) throw new Error(result.error ?? "Updating agent capabilities failed.");
      setConnections((current) => current.map((item) => (item.id === connection.id ? result.connection as AgentConnectionSummary : item)));
      setToast({ tone: "success", message: `${capabilityLabel(capability)} ${nextCapabilities.includes(capability) ? "enabled" : "disabled"} for ${connection.label}.` });
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Updating agent capabilities failed." });
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!canManage) return;
    let isMounted = true;
    fetch("/api/agents/connections", { credentials: "include", cache: "no-store" })
      .then((response) => response.json())
      .then((result: { connections?: AgentConnectionSummary[] }) => {
        if (isMounted) setConnections(result.connections ?? []);
      })
      .catch(() => undefined);
    fetch("/api/agents/profiles", { credentials: "include", cache: "no-store" })
      .then((response) => response.json())
      .then((result: { profiles?: AgentProfileSummary[] }) => {
        if (isMounted) setProfiles(result.profiles ?? []);
      })
      .catch(() => undefined);
    void loadAgentActivity();
    return () => {
      isMounted = false;
    };
  }, [canManage]);

  async function createProfile() {
    if (!newProfile.displayName.trim()) {
      setToast({ tone: "error", message: "Enter a display name before creating a profile." });
      return;
    }
    setSavingProfile(true);
    setToast(null);
    try {
      const response = await fetch("/api/agents/profiles", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: newProfile.provider,
          displayName: newProfile.displayName.trim(),
          purpose: newProfile.purpose.trim() || undefined,
          riskTier: newProfile.riskTier,
          policyTemplateId: newProfile.policyTemplateId || undefined,
        }),
      });
      const result = await response.json().catch(() => ({} as { profile?: AgentProfileSummary; error?: string }));
      if (!response.ok || !result.profile) throw new Error(result.error ?? "Creating this agent profile failed.");
      setProfiles((current) => [result.profile as AgentProfileSummary, ...current]);
      setNewProfile({ displayName: "", purpose: "", provider: "openai", riskTier: "standard", policyTemplateId: "" });
      setShowProfileForm(false);
      setToast({ tone: "success", message: `Profile "${result.profile.displayName}" created.` });
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Creating this agent profile failed." });
    } finally {
      setSavingProfile(false);
    }
  }

  async function generateKey() {
    setSaving(true);
    setToast(null);
    try {
      const response = await fetch("/api/agents/connections", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, label: label.trim() || undefined, agentProfileId: selectedProfileId || undefined }),
      });
      const result = await response.json().catch(() => ({} as { connection?: AgentConnectionSummary; rawApiKey?: string; error?: string }));
      if (!response.ok || !result.connection || !result.rawApiKey) {
        throw new Error(result.error ?? "Generating an agent API key failed.");
      }
      setConnections((current) => [result.connection as AgentConnectionSummary, ...current]);
      setIssuedKey({ provider, rawApiKey: result.rawApiKey });
      setLabel("");
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Generating an agent API key failed." });
    } finally {
      setSaving(false);
    }
  }

  async function revoke(connection: AgentConnectionSummary) {
    setSaving(true);
    setToast(null);
    try {
      const response = await fetch(`/api/agents/connections?id=${connection.id}`, { method: "DELETE", credentials: "include" });
      if (!response.ok) throw new Error("Revoking the agent connection failed.");
      setConnections((current) => current.map((item) => (item.id === connection.id ? { ...item, status: "revoked" } : item)));
      setToast({ tone: "success", message: `${connection.label} revoked.` });
      void loadAgentActivity();
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Revoking the agent connection failed." });
    } finally {
      setSaving(false);
    }
  }

  if (!canManage) return null;

  return (
    <Card className="p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[#0F1117]">Agent Connections</h3>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#5F6B73]">
          Issue an API key so a connected OpenAI, Anthropic, or Microsoft Copilot agent can call this workspace&apos;s real MCP server directly. Raw keys are shown once only. MCP2 tools are opt-in per connection. Critical tools require Approvals &amp; Governance unless an Always-Allow grant exists. Copilot remains approved at the policy layer, but its dedicated adapter is still pending.
        </p>
      </div>
      {activitySummary && (
        <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-5">
          {[
            ["Recent calls", activity.length],
            ["Failures", activitySummary.failures],
            ["Denials", activitySummary.denials],
            ["Pending approvals", activitySummary.pendingApprovals],
            ["Active grants", activitySummary.activeGrants],
          ].map(([metric, value]) => (
            <div key={metric} className="rounded-lg bg-[#F8F9FA] p-3">
              <div className="text-[10px] font-semibold uppercase text-[#5F6B73]">{metric}</div>
              <div className="mt-1 font-mono text-lg font-semibold text-[#0F1117]">{value}</div>
            </div>
          ))}
        </div>
      )}
      {toast && <div className="mb-3"><InlineToast tone={toast.tone} message={toast.message} /></div>}
      {issuedKey && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-semibold text-emerald-800">New {agentProviderOptions.find((option) => option.id === issuedKey.provider)?.label} key -- copy it now, it will not be shown again:</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded bg-white px-2 py-1.5 text-[11px] text-[#0F1117]">{issuedKey.rawApiKey}</code>
            <button
              type="button"
              onClick={() => { void navigator.clipboard?.writeText(issuedKey.rawApiKey); setToast({ tone: "success", message: "Key copied to clipboard." }); }}
              className="rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
            >
              Copy
            </button>
            <button type="button" onClick={() => setIssuedKey(null)} className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-[#5F6B73] hover:bg-white">Dismiss</button>
          </div>
        </div>
      )}
      <div className="mb-4 rounded-lg border border-[rgba(0,0,0,0.08)] p-3">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-[#0F1117]">Agent Profiles</h4>
            <p className="mt-0.5 text-[11px] text-[#5F6B73]">A reusable persona (purpose, risk tier, default capabilities) a connection can be issued from, instead of picking every capability by hand.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowProfileForm((current) => !current)}
            className="rounded-lg border border-[rgba(0,0,0,0.12)] px-2.5 py-1 text-[11px] font-semibold text-[#0F1117] hover:bg-[#F2F3F5]"
          >
            {showProfileForm ? "Cancel" : "New profile"}
          </button>
        </div>
        {showProfileForm && (
          <div className="mb-3 grid gap-2 rounded-lg bg-[#F8F9FA] p-3 md:grid-cols-2">
            <input
              aria-label="Profile display name"
              type="text"
              placeholder="Display name"
              value={newProfile.displayName}
              onChange={(event) => setNewProfile((current) => ({ ...current, displayName: event.target.value }))}
              className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-xs outline-none"
            />
            <select
              aria-label="Profile provider"
              value={newProfile.provider}
              onChange={(event) => setNewProfile((current) => ({ ...current, provider: event.target.value as typeof provider }))}
              className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-xs outline-none"
            >
              {agentProviderOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
            <input
              aria-label="Profile purpose"
              type="text"
              placeholder="Purpose (optional)"
              value={newProfile.purpose}
              onChange={(event) => setNewProfile((current) => ({ ...current, purpose: event.target.value }))}
              className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-xs outline-none md:col-span-2"
            />
            <select
              aria-label="Profile risk tier"
              value={newProfile.riskTier}
              onChange={(event) => setNewProfile((current) => ({ ...current, riskTier: event.target.value as AgentProfileSummary["riskTier"] }))}
              className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-xs outline-none"
            >
              {riskTierOptions.map((option) => <option key={option.id} value={option.id}>{option.label} risk</option>)}
            </select>
            <select
              aria-label="Policy template"
              value={newProfile.policyTemplateId}
              onChange={(event) => setNewProfile((current) => ({ ...current, policyTemplateId: event.target.value }))}
              className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-xs outline-none"
            >
              <option value="">Custom (set capabilities after creating)</option>
              {agentPolicyTemplates.map((template) => <option key={template.id} value={template.id}>{template.label}</option>)}
            </select>
            {newProfile.policyTemplateId && (
              <p className="text-[11px] text-[#5F6B73] md:col-span-2">{agentPolicyTemplates.find((template) => template.id === newProfile.policyTemplateId)?.description}</p>
            )}
            <button
              type="button"
              onClick={() => void createProfile()}
              disabled={savingProfile}
              className="rounded-lg bg-[#8B1E2D] px-3 py-2 text-xs font-semibold text-white hover:bg-[#7a1a27] disabled:opacity-60 md:col-span-2"
            >
              Create profile
            </button>
          </div>
        )}
        {profiles.length > 0 ? (
          <div className="grid gap-1.5">
            {profiles.map((profile) => (
              <div key={profile.id} className="flex items-center justify-between rounded-lg bg-[#F8F9FA] px-2.5 py-1.5 text-[11px]">
                <span className="font-semibold text-[#0F1117]">{profile.displayName}</span>
                <span className="text-[#5F6B73]">{agentProviderOptions.find((option) => option.id === profile.provider)?.label} - {profile.riskTier} risk - {profile.defaultCapabilities.length} tool{profile.defaultCapabilities.length === 1 ? "" : "s"}</span>
              </div>
            ))}
          </div>
        ) : !showProfileForm && (
          <p className="text-[11px] text-[#5F6B73]">No agent profiles yet.</p>
        )}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs">
          <span className="mb-1 block font-semibold text-[#0F1117]">Provider</span>
          <select
            value={provider}
            onChange={(event) => setProvider(event.target.value as typeof provider)}
            className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-xs outline-none"
          >
            {agentProviderOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>
        <input
          aria-label="Connection label"
          type="text"
          placeholder="Label (optional)"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-xs outline-none"
        />
        <label className="text-xs">
          <span className="mb-1 block font-semibold text-[#0F1117]">Profile (optional)</span>
          <select
            value={selectedProfileId}
            onChange={(event) => setSelectedProfileId(event.target.value)}
            className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-xs outline-none"
          >
            <option value="">None (default capabilities)</option>
            {profiles.filter((profile) => profile.status === "active").map((profile) => <option key={profile.id} value={profile.id}>{profile.displayName}</option>)}
          </select>
        </label>
        <button
          type="button"
          onClick={() => void generateKey()}
          disabled={saving}
          className="rounded-lg bg-[#8B1E2D] px-3 py-2 text-xs font-semibold text-white hover:bg-[#7a1a27] disabled:opacity-60"
        >
          Generate key
        </button>
        <button
          type="button"
          onClick={() => void loadAgentActivity()}
          className="rounded-lg border border-[rgba(0,0,0,0.12)] px-3 py-2 text-xs font-semibold text-[#0F1117] hover:bg-[#F2F3F5]"
        >
          Refresh activity
        </button>
      </div>
      {connections.length > 0 && (
        <div className="mt-4 grid gap-2">
          {connections.map((connection) => {
            const brandIcon = brandIcons[connection.provider];
            return (
            <div key={connection.id} className="rounded-lg border border-[rgba(0,0,0,0.06)] bg-[#F8F9FA] px-3 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white">
                    {brandIcon ? <BrandIcon icon={brandIcon} size={14} /> : <Layers size={12} className="text-[#5F6B73]" />}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#0F1117]">{connection.label} <span className="font-normal text-[#5F6B73]">({agentProviderOptions.find((option) => option.id === connection.provider)?.label})</span></div>
                    <div className="mt-0.5 font-mono text-[11px] text-[#5F6B73]">Key {connection.apiKeyPrefix}&hellip; - issued {formatDateTime(connection.createdAt)} - last used {formatDateTime(connection.lastUsedAt)}</div>
                    <div className="mt-0.5 text-[11px] text-[#5F6B73]">Issued by {connection.issuedByRole ?? "admin"}{connection.issuedByUserId ? ` (${connection.issuedByUserId.slice(0, 8)}...)` : ""}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${connection.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{connection.status}</span>
                  {connection.status === "active" && (
                    <button
                      type="button"
                      onClick={() => void toggleGrants(connection.id)}
                      className="rounded-lg border border-[rgba(0,0,0,0.12)] px-2.5 py-1 text-[11px] font-semibold text-[#0F1117] hover:bg-[#F2F3F5]"
                    >
                      {expandedConnectionId === connection.id ? "Hide controls" : "Controls"}
                    </button>
                  )}
                  {connection.status === "active" && (
                    <button
                      type="button"
                      onClick={() => void revoke(connection)}
                      disabled={saving}
                      className="rounded-lg border border-[rgba(0,0,0,0.12)] px-2.5 py-1 text-[11px] font-semibold text-[#0F1117] hover:bg-[#F2F3F5] disabled:opacity-60"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
              {expandedConnectionId === connection.id && (
                <div className="mt-2 grid gap-3 rounded-lg bg-white p-3">
                  <div>
                    <div className="mb-2 text-[10px] font-semibold uppercase text-[#5F6B73]">Enabled tools</div>
                    <div className="grid gap-1.5 md:grid-cols-2">
                      {allAgentCapabilities.map((capability) => {
                        const enabled = connection.capabilities.includes(capability);
                        const critical = criticalAgentCapabilities.has(capability);
                        const mcp2 = mcp2AgentCapabilities.includes(capability);
                        return (
                          <label key={capability} className={`flex items-center justify-between rounded-lg border px-2.5 py-2 text-[11px] ${enabled ? "border-emerald-100 bg-emerald-50" : "border-[rgba(0,0,0,0.08)] bg-white"}`}>
                            <span>
                              <span className="block font-mono font-semibold text-[#0F1117]">{capability}</span>
                              <span className="text-[#5F6B73]">{critical ? "Critical approval" : "Auto"}{mcp2 ? " - MCP2 opt-in" : ""}</span>
                            </span>
                            <input
                              type="checkbox"
                              checked={enabled}
                              disabled={saving || connection.status !== "active"}
                              onChange={() => void toggleCapability(connection, capability)}
                              aria-label={`${enabled ? "Disable" : "Enable"} ${capabilityLabel(capability)}`}
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 text-[10px] font-semibold uppercase text-[#5F6B73]">Always-Allow grants</div>
                    {(grantsByConnection[connection.id] ?? []).length === 0 ? (
                      <p className="text-[11px] text-[#5F6B73]">No tools are always-allowed for this connection yet. Approve a critical tool call with &quot;always allow&quot; in Approvals &amp; Governance to add one here.</p>
                    ) : (
                      <ul className="grid gap-1.5">
                        {(grantsByConnection[connection.id] ?? []).map((grant) => (
                          <li key={grant.id} className="flex items-center justify-between rounded-lg bg-[#F8F9FA] px-2.5 py-2 text-[11px]">
                            <span><span className="font-mono text-[#0F1117]">{grant.toolName}</span> <span className="text-[#5F6B73]">granted {formatDateTime(grant.grantedAt)}</span></span>
                            <button type="button" onClick={() => void revokeToolGrant(connection.id, grant.id)} className="font-semibold text-[#8B1E2D] hover:underline">Revoke grant</button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}
      <div className="mt-4 rounded-lg bg-[#F8F9FA] p-3">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase text-[#5F6B73]">Agent Activity</div>
            <p className="mt-0.5 text-[11px] text-[#5F6B73]">Recent MCP calls, failures, denials and pending approvals from tenant audit logs.</p>
          </div>
        </div>
        {activity.length === 0 ? (
          <p className="text-[11px] text-[#5F6B73]">No agent activity recorded yet. Generate a key and run the live validation checklist.</p>
        ) : (
          <div className="grid gap-1.5">
            {activity.slice(0, 8).map((event) => (
              <div key={event.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-2 text-[11px]">
                <span><span className="font-mono font-semibold text-[#0F1117]">{event.toolName}</span> <span className="text-[#5F6B73]">via {event.provider}</span></span>
                <span className={`rounded-full px-2 py-0.5 font-semibold ${event.status === "success" ? "bg-emerald-50 text-emerald-700" : event.status === "pending" ? "bg-amber-50 text-amber-700" : event.status === "denied" ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"}`}>{event.status}</span>
                <span className="font-mono text-[#5F6B73]">{formatDateTime(event.createdAt)}</span>
                {event.errorMessage && <span className="basis-full text-[10px] text-[#5F6B73]">{event.errorMessage}</span>}
              </div>
            ))}
          </div>
        )}
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
