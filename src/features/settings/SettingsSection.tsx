import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { ConfirmDialog } from "../../components/forms/ConfirmDialog";
import { SelectField, TextField } from "../../components/forms/FormField";
import { InlineToast } from "../../components/forms/InlineToast";
import { EmptyState } from "../../components/feedback/EmptyState";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { Avatar } from "../../components/ui/Avatar";
import { Card } from "../../components/ui/Card";
import { demoDatasetSummary } from "../../demo/demoDataset";
import { isDemoModeEnabled, isDemoModeForcedByEnv, resetDemoEnvironment, setDemoModeEnabled } from "../../demo/demoMode";
import type { Invitation, RoleName, User } from "../../domain";
import { applicationServices } from "../../providers/serviceProvider";
import { tenantScopeFromUser } from "../../repositories/supabaseEnterpriseRepositories";
import { markPostDemoSatisfactionPromptPending } from "../../hooks/usePostDemoSatisfactionPrompt";
import { getAiRouterStatusSnapshot } from "../../services/ai/router/aiRouter";
import { useAnalytics } from "../../services/analytics";
import { getPilotIntegrations } from "../../services/integrations/pluginRegistry";
import { languageCoverage } from "../../services/nlp/modelRegistry";
import { Building2, Calendar, Check, CheckCircle2, Database, MessageSquare, RotateCcw, Save, Send, Settings, ShieldCheck, Sparkles, UserPlus, X, XCircle } from "lucide-react";

export const SettingsSection = () => {
  const [tab, setTab] = useState("security");
  const tabs = ["Profile", "Organization", "Security", "Integrations", "Users", "Permissions", "AI Configuration", "Demo"];

  return (
    <div>
      <SectionHeader title="Settings" subtitle="Organization configuration and security" />
      <div className="flex gap-1 mb-6 border-b border-[rgba(0,0,0,0.08)]">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t.toLowerCase())}
            className={`text-sm px-4 py-2 font-medium border-b-2 transition-colors -mb-px ${tab === t.toLowerCase() ? "border-[#8B1E2D] text-[#8B1E2D]" : "border-transparent text-[#5F6B73] hover:text-[#0F1117]"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "security" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-[#0F1117] mb-4">Security Status</h3>
            <div className="space-y-3">
              {[
                { label: "Multi-Factor Authentication", status: true, detail: "TOTP + Hardware Key" },
                { label: "Single Sign-On (SAML 2.0)", status: true, detail: "Azure AD configured" },
                { label: "Audit Logging", status: true, detail: "All actions · 7-year retention" },
                { label: "End-to-End Encryption", status: true, detail: "AES-256 at rest + TLS 1.3 in transit" },
                { label: "IP Allowlisting", status: false, detail: "Not configured" },
                { label: "Session Timeout", status: true, detail: "8 hours inactivity" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-[rgba(0,0,0,0.04)] last:border-0">
                  {item.status ? <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" /> : <XCircle size={15} className="text-red-400 flex-shrink-0" />}
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-[#0F1117]">{item.label}</div>
                    <div className="text-[11px] text-[#5F6B73]">{item.detail}</div>
                  </div>
                  <button className="text-[11px] text-[#8B1E2D] hover:underline">Configure</button>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-[#0F1117] mb-4">Role-Based Permissions</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[rgba(0,0,0,0.06)]">
                    <th className="text-left text-[11px] font-semibold text-[#5F6B73] pb-2">Role</th>
                    {["View", "Edit", "Approve", "Admin"].map((h) => <th key={h} className="text-center text-[11px] font-semibold text-[#5F6B73] pb-2">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { role: "Executive", perms: [true, false, true, false] },
                    { role: "Program Manager", perms: [true, true, true, false] },
                    { role: "Analyst", perms: [true, true, false, false] },
                    { role: "Stakeholder (External)", perms: [true, false, false, false] },
                    { role: "System Administrator", perms: [true, true, true, true] },
                  ].map((row, i) => (
                    <tr key={i} className="border-b border-[rgba(0,0,0,0.04)] last:border-0">
                      <td className="py-2.5 font-medium text-[#0F1117]">{row.role}</td>
                      {row.perms.map((p, j) => (
                        <td key={j} className="py-2.5 text-center">
                          {p ? <Check size={13} className="text-emerald-500 mx-auto" /> : <X size={13} className="text-gray-300 mx-auto" />}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === "integrations" && <IntegrationsQuickConnectPanel />}

      {tab === "users" && <UserAdministration />}

      {tab === "demo" && <DemoModePanel />}

      {tab === "profile" && <ProfilePanel />}

      {tab === "organization" && <OrganizationPanel />}

      {tab === "permissions" && <PermissionsPanel />}

      {tab === "ai configuration" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-[#0F1117] mb-4">AI Engine Configuration</h3>
            <div className="space-y-4">
              {[
                { label: "Human-in-the-Loop for all write actions", enabled: true },
                { label: "Multilingual response support", enabled: true },
                { label: "Document auto-summarization on upload", enabled: true },
                { label: "Proactive risk alerting", enabled: true },
                { label: "Predictive milestone forecasting (Beta)", enabled: false },
              ].map((setting, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-[#0F1117]">{setting.label}</span>
                  <button className={`relative w-10 h-5.5 rounded-full transition-colors ${setting.enabled ? "bg-[#8B1E2D]" : "bg-[#D1D5DB]"}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${setting.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
                  </button>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-[#0F1117] mb-4">AI Usage Statistics</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Queries This Month", value: "2,847" },
                { label: "Documents Analyzed", value: "1,231" },
                { label: "Summaries Generated", value: "643" },
                { label: "Actions Approved", value: "187" },
              ].map((s, i) => (
                <div key={i} className="bg-[#F8F9FA] rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-[#8B1E2D] font-mono">{s.value}</div>
                  <div className="text-[11px] text-[#5F6B73] mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </Card>
          <AiRoutingProvidersPanel />
          <LanguageCoveragePanel />
        </div>
      )}

    </div>
  );
};

function AiRoutingProvidersPanel() {
  const status = getAiRouterStatusSnapshot();

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#0F1117]">AI Routing & Providers</h3>
        <span className="rounded-full bg-[#8B1E2D]/8 px-2 py-0.5 text-[10px] font-semibold text-[#8B1E2D]">{status.mode}</span>
      </div>
      <div className="space-y-2">
        {status.providers.map((provider) => (
          <div key={provider.name} className="flex items-center justify-between rounded-lg bg-[#F8F9FA] p-3 text-xs">
            <div>
              <div className="font-semibold text-[#0F1117]">{provider.displayName}</div>
              <div className="mt-0.5 font-mono text-[10px] uppercase text-[#5F6B73]">{provider.mode} - {provider.costTier} cost - {provider.latencyTier} latency</div>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${provider.configured ? "bg-emerald-50 text-emerald-700" : "bg-[#F2F3F5] text-[#5F6B73]"}`}>
              {provider.status}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-[#5F6B73]">Server-side keys are never shown here. Missing providers stay adapter-ready and fall back to local deterministic mode.</p>
    </Card>
  );
}

const quickConnectIcons: Record<string, typeof MessageSquare> = {
  slack: MessageSquare,
  calendly: Calendar,
};

function IntegrationsQuickConnectPanel() {
  const { session } = useAuth();
  // Per PRE_DEMO_ACTIONABLES.md A13/A14/A15: Settings surfaces only the 2 connectors this
  // release actually ships a working connect flow for, not the full integrations catalogue
  // (that full catalogue lives at /integrations, split into pilot vs. infrastructure-only).
  const quickConnectPlugins = getPilotIntegrations().filter((plugin) => plugin.id === "slack" || plugin.id === "calendly");
  const canConnect = Boolean(session.user && ["Super Admin", "Organization Admin"].includes(session.user.role));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {quickConnectPlugins.map((plugin) => {
        const Icon = quickConnectIcons[plugin.id] ?? MessageSquare;
        return (
          <Card key={plugin.id} className="p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B1E2D]/8 text-[#8B1E2D]">
                <Icon size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#0F1117]">{plugin.name}</h3>
                <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${plugin.configured ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {plugin.configured ? "configured" : "provider-gated for production credentials"}
                </span>
              </div>
            </div>
            <p className="mb-3 text-xs leading-relaxed text-[#5F6B73]">{plugin.useCases.join(" - ")}</p>
            {plugin.id === "calendly" && (
              <p className="mb-3 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-800">
                Calendly&apos;s API requires a Standard plan or higher on the account you connect -- it isn&apos;t available on Calendly&apos;s free tier. This is a cost on your own Calendly subscription, not an AXXESS charge.
              </p>
            )}
            {canConnect ? (
              <a
                href={`/api/connectors/oauth/start?provider=${plugin.id}`}
                className="inline-flex items-center gap-2 rounded-lg border border-[rgba(139,30,45,0.22)] bg-white px-3 py-2 text-xs font-semibold text-[#8B1E2D] hover:bg-[#8B1E2D]/5"
              >
                Connect {plugin.name}
              </a>
            ) : (
              <InlineToast tone="info" message="Only Organization Admins can connect this workspace's integrations." />
            )}
          </Card>
        );
      })}
    </div>
  );
}

function LanguageCoveragePanel() {
  return (
    <Card className="p-5">
      <h3 className="mb-4 text-sm font-semibold text-[#0F1117]">Language & NLP Coverage</h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {languageCoverage.map((coverage) => (
          <div key={coverage.language} className="rounded-lg bg-[#F8F9FA] p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#0F1117]">{coverage.language}</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-[#5F6B73]">{coverage.status}</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-[#5F6B73]">{coverage.note}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

const departmentOptions = [
  "Mission Secretariat",
  "Clinical Operations",
  "District Coordination",
  "Finance & Grants",
  "Procurement",
  "Monitoring & Evaluation",
  "Knowledge & Analytics",
  "Administration",
];

function ProfilePanel() {
  const { session, updateProfile } = useAuth();
  const user = session.user;
  const [toast, setToast] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(null);
  const [form, setForm] = useState({
    displayName: user?.displayName ?? "",
    email: user?.email ?? "",
    avatarInitials: user?.avatarInitials ?? "",
    department: user?.department ?? "Mission Secretariat",
    title: user?.title ?? "",
    timezone: user?.timezone ?? "Asia/Kolkata",
  });

  useEffect(() => {
    if (!user) return;
    setForm({
      displayName: user.displayName ?? "",
      email: user.email ?? "",
      avatarInitials: user.avatarInitials ?? "",
      department: user.department ?? "Mission Secretariat",
      title: user.title ?? "",
      timezone: user.timezone ?? "Asia/Kolkata",
    });
  }, [user]);

  if (!user) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <EmptyState icon={<Settings size={32} />} message="Sign in to manage your profile." />
      </Card>
    );
  }

  const saveProfile = async () => {
    try {
      await updateProfile(form);
      setToast({ tone: "success", message: "Profile updated." });
    } catch {
      setToast({ tone: "error", message: "Profile could not be updated." });
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        {toast && <InlineToast tone={toast.tone} message={toast.message} />}
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Settings size={15} className="text-[#8B1E2D]" />
            <h3 className="text-sm font-semibold text-[#0F1117]">User Profile</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <TextField label="Display Name" value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} />
            <TextField label="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            <TextField label="Title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            <TextField label="Avatar Initials" value={form.avatarInitials} onChange={(event) => setForm({ ...form, avatarInitials: event.target.value })} />
            <SelectField label="Department" value={form.department} options={departmentOptions.map((department) => ({ value: department, label: department }))} onChange={(event) => setForm({ ...form, department: event.target.value })} />
            <SelectField label="Timezone" value={form.timezone} options={[{ value: "Asia/Kolkata", label: "Asia/Kolkata" }, { value: "UTC", label: "UTC" }]} onChange={(event) => setForm({ ...form, timezone: event.target.value })} />
          </div>
          <button onClick={() => void saveProfile()} className="mt-4 flex items-center gap-2 rounded-lg bg-[#8B1E2D] px-3 py-2 text-xs font-semibold text-white hover:bg-[#7a1a27]">
            <Save size={13} /> Save Profile
          </button>
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-3">
          <Avatar initials={user.avatarInitials ?? "AR"} color="bg-[#8B1E2D]" />
          <div>
            <h3 className="text-sm font-semibold text-[#0F1117]">{user.displayName}</h3>
            <p className="text-[11px] text-[#5F6B73]">{user.email}</p>
          </div>
        </div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between rounded-lg bg-[#F8F9FA] p-3"><span className="text-[#5F6B73]">Role</span><span className="font-semibold text-[#0F1117]">{user.role}</span></div>
          <div className="flex items-center justify-between rounded-lg bg-[#F8F9FA] p-3"><span className="text-[#5F6B73]">Department</span><span className="font-semibold text-[#0F1117]">{user.department ?? form.department}</span></div>
          <div className="flex items-center justify-between rounded-lg bg-[#F8F9FA] p-3"><span className="text-[#5F6B73]">Session</span><span className="font-semibold text-[#0F1117]">{session.source === "mock-rbac" ? "Investor Preview" : "Supabase Auth"}</span></div>
        </div>
      </Card>
    </div>
  );
}

function OrganizationPanel() {
  const { session } = useAuth();
  const mode = isDemoModeEnabled() ? "Investor Preview" : "Production";
  const metrics = [
    { label: "Organization", value: demoDatasetSummary.organizationName },
    { label: "Mode", value: mode },
    { label: "Projects", value: demoDatasetSummary.projects.toLocaleString() },
    { label: "Documents", value: demoDatasetSummary.documents.toLocaleString() },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Building2 size={15} className="text-[#8B1E2D]" />
          <h3 className="text-sm font-semibold text-[#0F1117]">Organization Profile</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-lg bg-[#F8F9FA] p-3">
              <div className="text-[10px] font-semibold uppercase text-[#5F6B73]">{metric.label}</div>
              <div className="mt-1 text-sm font-semibold text-[#0F1117]">{metric.value}</div>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-5">
        <h3 className="mb-4 text-sm font-semibold text-[#0F1117]">Tenant Boundary</h3>
        <div className="space-y-3 text-xs">
          <div className="rounded-lg bg-[#F8F9FA] p-3"><span className="block text-[10px] uppercase text-[#5F6B73]">Organization ID</span><span className="font-mono text-[#0F1117]">{session.user?.organizationId}</span></div>
          <div className="rounded-lg bg-[#F8F9FA] p-3"><span className="block text-[10px] uppercase text-[#5F6B73]">Data Boundary</span><span className="font-semibold text-[#0F1117]">Tenant-scoped repositories with RLS-ready metadata</span></div>
        </div>
      </Card>
    </div>
  );
}

function PermissionsPanel() {
  const matrix = [
    { role: "Super Admin", access: "All organizations, governance, users, audit" },
    { role: "Organization Admin", access: "Tenant administration, users, documents, approvals" },
    { role: "Executive", access: "Executive dashboards, analytics, approvals, knowledge" },
    { role: "Manager", access: "Programs, tasks, meetings, knowledge, project governance" },
    { role: "Employee", access: "Assigned work, documents, meetings, knowledge" },
    { role: "Guest", access: "Read-only approved knowledge and documents" },
  ];

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-[rgba(0,0,0,0.06)] bg-[#F8F9FA] px-4 py-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={15} className="text-[#8B1E2D]" />
          <h3 className="text-sm font-semibold text-[#0F1117]">Permission Matrix</h3>
        </div>
      </div>
      {matrix.map((item) => (
        <div key={item.role} className="grid grid-cols-1 gap-2 border-b border-[rgba(0,0,0,0.04)] px-4 py-3 text-xs md:grid-cols-[180px_1fr]">
          <span className="font-semibold text-[#0F1117]">{item.role}</span>
          <span className="text-[#5F6B73]">{item.access}</span>
        </div>
      ))}
    </Card>
  );
}

function DemoModePanel() {
  const [enabled, setEnabled] = useState(() => isDemoModeEnabled());
  const [toast, setToast] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(null);
  const forcedByEnv = isDemoModeForcedByEnv();

  const switchDemoMode = (nextEnabled: boolean) => {
    if (forcedByEnv) {
      setToast({ tone: "info", message: "Demo Mode is enabled by environment configuration." });
      return;
    }

    setDemoModeEnabled(nextEnabled);
    setEnabled(nextEnabled);
    setToast({
      tone: "success",
      message: nextEnabled ? "Investor preview will open with the seeded institution." : "Normal mode will open as a clean tenant.",
    });
    // A10: capture a satisfaction signal at the natural end of a live demo session -- turning
    // Investor Preview off. The prompt itself can't render here since we're about to hard-navigate
    // away; mark intent and let App.tsx trigger it once /dashboard has actually mounted.
    if (!nextEnabled) markPostDemoSatisfactionPromptPending();
    window.setTimeout(() => window.location.assign("/dashboard"), 250);
  };

  const resetDemo = () => {
    resetDemoEnvironment();
    setToast({ tone: "success", message: "Investor preview has been restored." });
    window.setTimeout(() => window.location.reload(), 250);
  };

  const metrics = [
    { label: "Projects", value: demoDatasetSummary.projects.toLocaleString() },
    { label: "Programs", value: demoDatasetSummary.programs.toLocaleString() },
    { label: "Documents", value: demoDatasetSummary.documents.toLocaleString() },
    { label: "Articles", value: demoDatasetSummary.knowledgeArticles.toLocaleString() },
    { label: "Activities", value: demoDatasetSummary.activities.toLocaleString() },
    { label: "Audit Logs", value: demoDatasetSummary.auditLogs.toLocaleString() },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        {toast && <InlineToast tone={toast.tone} message={toast.message} />}

        <Card className="p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Sparkles size={15} className="text-[#8B1E2D]" />
                <h3 className="text-sm font-semibold text-[#0F1117]">Investor Preview</h3>
              </div>
              <p className="max-w-2xl text-xs leading-relaxed text-[#5F6B73]">
                {demoDatasetSummary.organizationName} loads as a coherent institutional workspace with populated governance, portfolio, knowledge, activity, and audit records.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              disabled={forcedByEnv}
              onClick={() => switchDemoMode(!enabled)}
              className={`relative h-7 w-14 rounded-full transition-colors ${enabled ? "bg-[#8B1E2D]" : "bg-[#D1D5DB]"} disabled:cursor-not-allowed disabled:opacity-70`}
            >
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-7" : "translate-x-1"}`} />
            </button>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-white p-4">
              <div className="font-mono text-lg font-bold text-[#8B1E2D]">{metric.value}</div>
              <div className="mt-1 text-[11px] font-medium text-[#5F6B73]">{metric.label}</div>
            </div>
          ))}
        </div>

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <RotateCcw size={15} className="text-[#8B1E2D]" />
            <h3 className="text-sm font-semibold text-[#0F1117]">Reset Preview Data</h3>
          </div>
          <p className="mb-4 text-xs leading-relaxed text-[#5F6B73]">
            Restore the seeded institution to its original state after rehearsals, sales demos, or investor meetings.
          </p>
          <button
            type="button"
            onClick={resetDemo}
            disabled={!enabled}
            className="flex items-center gap-2 rounded-lg border border-[rgba(139,30,45,0.22)] bg-white px-3 py-2 text-xs font-semibold text-[#8B1E2D] hover:bg-[#8B1E2D]/5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw size={13} /> Reset investor preview
          </button>
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Database size={15} className="text-[#8B1E2D]" />
          <h3 className="text-sm font-semibold text-[#0F1117]">Mode Status</h3>
        </div>
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between rounded-lg bg-[#F8F9FA] p-3">
            <span className="text-[#5F6B73]">Current mode</span>
            <span className="font-semibold text-[#0F1117]">{enabled ? "Investor Preview" : "Normal"}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-[#F8F9FA] p-3">
            <span className="text-[#5F6B73]">Configuration</span>
            <span className="font-semibold text-[#0F1117]">{forcedByEnv ? "Environment" : "Settings"}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-[#F8F9FA] p-3">
            <span className="text-[#5F6B73]">Tenant</span>
            <span className="font-semibold text-[#0F1117]">{enabled ? "Seeded" : "Clean"}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

const roleOptions: RoleName[] = ["Super Admin", "Organization Admin", "Executive", "Manager", "Employee", "Guest"];

function UserAdministration() {
  const { session } = useAuth();
  const analytics = useAnalytics();
  const user = session.user;
  const scope = useMemo(() => user ? tenantScopeFromUser(user) : undefined, [user]);
  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<RoleName>("Employee");
  const [saving, setSaving] = useState(false);
  const [confirmUser, setConfirmUser] = useState<User | null>(null);
  const [toast, setToast] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(null);

  const canManageUsers = Boolean(user && ["Super Admin", "Organization Admin"].includes(user.role));

  const loadUsers = useCallback(async () => {
    if (!scope) return;
    try {
      const [userRows, invitationRows] = await Promise.all([
        applicationServices.usersRepository.listByOrganization(scope),
        applicationServices.invitationsRepository.listPending(scope),
      ]);
      setUsers(userRows);
      setInvitations(invitationRows);
      setSelectedUser((current) => current ? userRows.find((row) => row.id === current.id) ?? current : userRows[0] ?? null);
    } catch {
      setToast({ tone: "error", message: "Unable to load user administration data." });
    }
  }, [scope]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (!user) return;
    analytics.trackEvent("user_admin_viewed", { panel: "settings_users" }, {
      organization_id: user.organizationId,
      user_id: user.id,
      user_role: user.role,
      module_name: "settings",
      route: "/settings",
    });
  }, [analytics, user]);

  const inviteUser = async () => {
    if (!scope || !inviteEmail.trim()) {
      if (user) {
        analytics.trackEvent("form_validation_failed", { form_name: "invite_user", field: "email" }, {
          organization_id: user.organizationId,
          user_id: user.id,
          user_role: user.role,
          module_name: "settings",
          route: "/settings",
        });
      }
      setToast({ tone: "error", message: "Email is required for invitations." });
      return;
    }
    setSaving(true);
    setToast(null);
    try {
      await applicationServices.invitationsRepository.create(scope, {
        organizationId: scope.organizationId,
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        invitedByUserId: scope.userId,
        tokenHash: "client-issued-invitation",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
      });
      analytics.trackEvent("user_invited", { invited_role: inviteRole }, {
        organization_id: scope.organizationId,
        user_id: scope.userId,
        user_role: scope.role,
        module_name: "settings",
        route: "/settings",
      });
      setInviteEmail("");
      setToast({ tone: "success", message: "Invitation created." });
      await loadUsers();
    } catch {
      const response = await fetch("/api/invitations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim().toLowerCase(), role: inviteRole }),
      }).catch(() => undefined);
      if (response?.ok) {
        analytics.trackEvent("user_invited", { invited_role: inviteRole, invite_path: "api" }, {
          organization_id: scope.organizationId,
          user_id: scope.userId,
          user_role: scope.role,
          module_name: "settings",
          route: "/settings",
        });
        setInviteEmail("");
        setToast({ tone: "success", message: "Invitation created." });
        await loadUsers();
      } else {
        setToast({ tone: "error", message: "Invitation could not be created." });
      }
    } finally {
      setSaving(false);
    }
  };

  const updateUser = async (target: User, input: Partial<User>) => {
    if (!scope || !canManageUsers) return;
    setSaving(true);
    setToast(null);
    try {
      const updated = await applicationServices.usersRepository.update(scope, target.id, input);
      if (input.role && input.role !== target.role) {
        analytics.trackEvent("role_changed", {
          target_user_id: target.id,
          previous_role: target.role,
          next_role: input.role,
        }, {
          organization_id: scope.organizationId,
          user_id: scope.userId,
          user_role: scope.role,
          module_name: "settings",
          route: "/settings",
        });
      }
      setUsers((current) => current.map((row) => row.id === updated.id ? updated : row));
      setSelectedUser(updated);
      setToast({ tone: "success", message: "User updated." });
    } catch {
      setToast({ tone: "error", message: "User update failed. Check role permissions." });
    } finally {
      setSaving(false);
      setConfirmUser(null);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        {toast && <InlineToast tone={toast.tone} message={toast.message} />}
        <Card className="p-4">
          <div className="mb-4 flex items-center gap-2">
            <UserPlus size={15} className="text-[#8B1E2D]" />
            <h3 className="text-sm font-semibold text-[#0F1117]">Invite User</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_auto]">
            <TextField label="Email" type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} disabled={!canManageUsers || saving} />
            <SelectField label="Role" value={inviteRole} options={roleOptions.map((role) => ({ value: role, label: role }))} onChange={(event) => setInviteRole(event.target.value as RoleName)} disabled={!canManageUsers || saving} />
            <button
              onClick={() => void inviteUser()}
              disabled={!canManageUsers || saving}
              className="mt-5 flex h-9 items-center justify-center gap-2 rounded-lg bg-[#8B1E2D] px-4 text-xs font-semibold text-white hover:bg-[#7a1a27] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send size={13} /> Invite
            </button>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-[rgba(0,0,0,0.06)] bg-[#F8F9FA] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#5F6B73]">
            Users
          </div>
          {users.map((member) => (
            <div key={member.id} className="flex items-center gap-3 border-b border-[rgba(0,0,0,0.04)] px-4 py-3 hover:bg-[#F8F9FA]">
              <Avatar initials={member.avatarInitials} />
              <button onClick={() => setSelectedUser(member)} className="min-w-0 flex-1 text-left">
                <div className="truncate text-xs font-semibold text-[#0F1117]">{member.displayName}</div>
                <div className="truncate text-[11px] text-[#5F6B73]">{member.email}</div>
              </button>
              <select
                value={member.role}
                disabled={!canManageUsers || saving}
                onChange={(event) => void updateUser(member, { role: event.target.value as RoleName })}
                className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-2 py-1 text-[11px] text-[#0F1117] disabled:bg-[#F2F3F5]"
              >
                {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
              <button
                onClick={() => setConfirmUser(member)}
                disabled={!canManageUsers || saving || member.id === user?.id}
                className="rounded-lg border border-[rgba(0,0,0,0.1)] px-2 py-1 text-[11px] font-semibold text-[#5F6B73] hover:bg-[#F2F3F5] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {member.status === "suspended" ? "Enable" : "Disable"}
              </button>
            </div>
          ))}
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-[rgba(0,0,0,0.06)] bg-[#F8F9FA] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#5F6B73]">
            Pending Invitations
          </div>
          {invitations.map((invitation) => (
            <div key={invitation.id} className="flex items-center justify-between border-b border-[rgba(0,0,0,0.04)] px-4 py-3">
              <div>
                <div className="text-xs font-semibold text-[#0F1117]">{invitation.email}</div>
                <div className="text-[11px] text-[#5F6B73]">{invitation.role} · expires {invitation.expiresAt.slice(0, 10)}</div>
              </div>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">{invitation.status}</span>
            </div>
          ))}
          {invitations.length === 0 && <div className="px-4 py-6 text-center text-xs text-[#5F6B73]">No pending invitations</div>}
        </Card>
      </div>

      <Card className="p-4">
        {selectedUser ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar initials={selectedUser.avatarInitials} color="bg-[#8B1E2D]" />
              <div>
                <h3 className="text-sm font-semibold text-[#0F1117]">{selectedUser.displayName}</h3>
                <p className="text-[11px] text-[#5F6B73]">{selectedUser.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-[#F8F9FA] p-3"><span className="block text-[10px] uppercase text-[#5F6B73]">Role</span><span className="font-semibold text-[#0F1117]">{selectedUser.role}</span></div>
              <div className="rounded-lg bg-[#F8F9FA] p-3"><span className="block text-[10px] uppercase text-[#5F6B73]">Status</span><span className="font-semibold text-[#0F1117]">{selectedUser.status}</span></div>
              <div className="rounded-lg bg-[#F8F9FA] p-3"><span className="block text-[10px] uppercase text-[#5F6B73]">Created</span><span className="font-mono text-[#0F1117]">{selectedUser.createdAt.slice(0, 10)}</span></div>
              <div className="rounded-lg bg-[#F8F9FA] p-3"><span className="block text-[10px] uppercase text-[#5F6B73]">Updated</span><span className="font-mono text-[#0F1117]">{selectedUser.updatedAt.slice(0, 10)}</span></div>
            </div>
            {!canManageUsers && <InlineToast tone="info" message="Your role can view users but cannot modify access." />}
          </div>
        ) : (
          <EmptyState icon={<Settings size={32} />} message="Select a user to view profile details" />
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(confirmUser)}
        title={confirmUser?.status === "suspended" ? "Re-enable user" : "Disable user"}
        message={confirmUser ? `${confirmUser.displayName} will ${confirmUser.status === "suspended" ? "regain" : "lose"} workspace access.` : ""}
        confirmLabel={confirmUser?.status === "suspended" ? "Re-enable" : "Disable"}
        disabled={saving}
        onCancel={() => setConfirmUser(null)}
        onConfirm={() => confirmUser && void updateUser(confirmUser, { status: confirmUser.status === "suspended" ? "active" : "suspended" })}
      />
    </div>
  );
}

export default SettingsSection;
