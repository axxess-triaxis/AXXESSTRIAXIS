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
import { getRuntimeMode, isDemoModeEnabled, isDemoModeForcedByEnv, resetDemoEnvironment, setDemoModeEnabled } from "../../demo/demoMode";
import type { Invitation, RoleName, User } from "../../domain";
import { applicationServices } from "../../providers/serviceProvider";
import { tenantScopeFromUser } from "../../repositories/supabaseEnterpriseRepositories";
import { markPostDemoSatisfactionPromptPending } from "../../hooks/usePostDemoSatisfactionPrompt";
import { useAnalytics } from "../../services/analytics";
import { getProductivityPluginRegistry } from "../../services/integrations/pluginRegistry";
import { isAgenticGateEnabled, setAgenticGateEnabled } from "../../services/agentic/agenticGateToggle";
import { BrandIcon } from "../../components/ui/BrandIcon";
import { brandIcons } from "../../components/ui/brandIcons";
import { Building2, Calendar, Check, CheckCircle2, CheckSquare, Cloud, Database, FileSignature, FileSpreadsheet, FileText, Github, HardDrive, IndianRupee, Kanban, Layers, ListTodo, MessageCircle, MessageSquare, Presentation, RotateCcw, Save, Send, Settings, ShieldCheck, Sparkles, UserPlus, Video, X, XCircle } from "lucide-react";

// SA-3 (2026-07-29): "AI Configuration" removed entirely -- founder's own words, "I don't think
// this tab is user relevant anymore with OpenRouter coming in" (routing is now a single unified
// gateway, not something a per-tenant settings screen needs to expose). "Demo" is gated out of the
// live beta's own tab list, per the same founder ask A-32 already tracked ("we do not need 'demo'
// screen with placeholder data in live beta") -- but kept reachable on deployments where demo mode
// is the deployment's own forced configuration (e.g. investor.triaxisventures.com), since that's
// where "Reset Preview Data" is operationally needed before demo/sales sessions.
export const validTabs = ["profile", "organization", "security", "integrations", "users", "permissions", ...(isDemoModeForcedByEnv() ? ["demo"] : [])];

export function initialTabFromLocation(): string {
  if (typeof window === "undefined") return "security";
  const requested = new URLSearchParams(window.location.search).get("tab")?.toLowerCase();
  return requested && validTabs.includes(requested) ? requested : "security";
}

export const SettingsSection = () => {
  const [tab, setTab] = useState(initialTabFromLocation);
  const tabs = ["Profile", "Organization", "Security", "Integrations", "Users", "Permissions", ...(isDemoModeForcedByEnv() ? ["Demo"] : [])];

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
                { label: "Multi-Factor Authentication", status: true, detail: "TOTP + Hardware Key", configureDisabledReason: "Pending production security configuration" },
                { label: "Single Sign-On (SAML 2.0)", status: true, detail: "Azure AD configured", configureDisabledReason: "Managed by tenant policy" },
                { label: "Audit Logging", status: true, detail: "All actions · 7-year retention", configureDisabledReason: "Managed by tenant policy" },
                { label: "End-to-End Encryption", status: true, detail: "AES-256 at rest + TLS 1.3 in transit", configureDisabledReason: "Managed by tenant policy" },
                { label: "IP Allowlisting", status: false, detail: "Not configured", configureDisabledReason: "Requires organization admin setup" },
                { label: "Session Timeout", status: true, detail: "8 hours inactivity", configureDisabledReason: "Pending production security configuration" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-[rgba(0,0,0,0.04)] last:border-0">
                  {item.status ? <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" /> : <XCircle size={15} className="text-red-400 flex-shrink-0" />}
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-[#0F1117]">{item.label}</div>
                    <div className="text-[11px] text-[#5F6B73]">{item.detail}</div>
                  </div>
                  {/* SA-1 (2026-07-28): every "Configure" button here was a plain <button> with
                      no onClick at all -- a real dead end, not a placeholder-styled one. None of
                      these 6 items has a real configuration screen yet. Disabled with an honest,
                      specific reason instead of leaving an active-looking control that does
                      nothing when clicked. */}
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    title={item.configureDisabledReason}
                    className="cursor-not-allowed text-[11px] text-[#9AA1A6]"
                  >
                    {item.configureDisabledReason}
                  </button>
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
      {tab === "profile" && <AgenticGateTogglePanel />}

      {tab === "organization" && <OrganizationPanel />}

      {tab === "permissions" && <PermissionsPanel />}

    </div>
  );
};

// Fallback for the providers simple-icons has no accurate mark for (brand-owner takedown
// history -- see brandIcons.ts) or that aren't in the icon library at all. Real brandIcons.ts
// entries take priority over this map wherever both exist.
const quickConnectIcons: Record<string, typeof MessageSquare> = {
  slack: MessageSquare,
  calendly: Calendar,
  airtable: Database,
  hubspot: Building2,
  notion: FileText,
  google_calendar: Calendar,
  zoom: Video,
  teams: Video,
  outlook: FileText,
  google_drive: HardDrive,
  linear: Layers,
  github: Github,
  google_sheets: FileSpreadsheet,
  google_docs: FileText,
  google_slides: Presentation,
  whatsapp_business: MessageCircle,
  jira: Kanban,
  trello: ListTodo,
  asana: CheckSquare,
  salesforce: Cloud,
  docusign: FileSignature,
  razorpay: IndianRupee,
};

// pluginRegistry.ts's catalogue ids are display-only and don't all match connectorContract.ts's
// real OAuth provider ids -- "outlook" is the one live mismatch (the OAuth contract calls it
// "microsoft", since one Entra app registration backs both Outlook mail and Teams). Sending the
// catalogue id straight through as ?provider= 404/400'd on connect. Everything else already
// matches 1:1, so this only needs to remap the one known exception, not build a full alias table.
const CONNECTOR_OAUTH_PROVIDER_ID: Record<string, string> = { outlook: "microsoft" };

function IntegrationsQuickConnectPanel() {
  const { session } = useAuth();
  // 2026-07-30: previously showed only pilot-enabled connectors, excluding Gmail/Outlook entirely
  // (they had no card anywhere on this tab) -- founder flagged the tab as "looking patchy" with
  // integrations missing. Now shows the full catalogue so nothing is silently absent; each tile's
  // badge honestly reflects its real state (configured / gated on credentials / not yet built) so
  // a "coming soon" tile is never presented as connectable.
  const quickConnectPlugins = getProductivityPluginRegistry();
  const canConnect = Boolean(session.user && ["Super Admin", "Organization Admin"].includes(session.user.role));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {quickConnectPlugins.map((plugin) => {
        const brandIcon = brandIcons[plugin.id];
        const FallbackIcon = quickConnectIcons[plugin.id] ?? MessageSquare;
        const badge = plugin.configured
          ? { tone: "bg-emerald-50 text-emerald-700", label: "configured" }
          : plugin.pilotEnabled
            ? { tone: "bg-amber-50 text-amber-700", label: "provider-gated for production credentials" }
            : { tone: "bg-gray-100 text-gray-600", label: "catalogued -- not yet available" };
        return (
          <Card key={plugin.id} className="p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B1E2D]/8 text-[#8B1E2D]">
                {brandIcon ? <BrandIcon icon={brandIcon} size={20} /> : <FallbackIcon size={18} />}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#0F1117]">{plugin.name}</h3>
                <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.tone}`}>
                  {badge.label}
                </span>
              </div>
            </div>
            <p className="mb-3 text-xs leading-relaxed text-[#5F6B73]">{plugin.useCases.join(" - ")}</p>
            {plugin.id === "calendly" && (
              <p className="mb-3 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-800">
                Calendly&apos;s API requires a Standard plan or higher on the account you connect -- it isn&apos;t available on Calendly&apos;s free tier. This is a cost on your own Calendly subscription, not an AXXESS charge.
              </p>
            )}
            {plugin.id === "whatsapp_business" && (
              <p className="mb-3 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-800">
                Requires a Meta Business Manager account with a verified, provisioned WhatsApp Business Account (WABA) and Meta App Review approval -- connecting here alone does not complete WhatsApp Business setup.
              </p>
            )}
            {!plugin.pilotEnabled ? (
              <p className="text-[11px] text-[#5F6B73]">No connect flow ships yet for {plugin.name} -- tracked for a future release, not available to connect today.</p>
            ) : canConnect ? (
              <a
                href={`/api/connectors/oauth/start?provider=${CONNECTOR_OAUTH_PROVIDER_ID[plugin.id] ?? plugin.id}`}
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
  const analytics = useAnalytics();
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
      analytics.trackEvent("profile_updated", { department: form.department }, {
        organization_id: user.organizationId,
        user_id: user.id,
        user_role: user.role,
        module_name: "settings",
        route: "/settings",
      });
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
  const user = session.user;
  const runtimeMode = getRuntimeMode(Boolean(user));
  const demoActive = runtimeMode === "demo";
  const mode = demoActive ? "Investor Preview" : "Production";
  const scope = useMemo(() => user ? tenantScopeFromUser(user) : undefined, [user]);
  const [liveOrg, setLiveOrg] = useState<{ name: string; projects: number; documents: number } | null>(null);
  const [loading, setLoading] = useState(!demoActive);

  // TP-01 fix: this panel used to render demoDatasetSummary unconditionally, so a real tenant's
  // own Settings page showed the seeded investor-demo institution ("North East Health Mission")
  // instead of its own organization -- a real cross-tenant-looking data leak, root-caused
  // 2026-07-28. Demo/Investor Preview mode still shows the seeded dataset (correct, unchanged);
  // live tenants now query their own organization record and real project/document counts.
  useEffect(() => {
    if (demoActive || !scope || !user?.organizationId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      applicationServices.organizationsRepository.getById(scope, user.organizationId),
      applicationServices.projectsRepository.list(scope, { pageSize: 100 }),
      applicationServices.documentsRepository.list(scope, { pageSize: 100 }),
    ])
      .then(([organization, projects, documents]) => {
        if (cancelled) return;
        setLiveOrg({ name: organization?.name ?? "", projects: projects.length, documents: documents.length });
      })
      .catch(() => {
        if (!cancelled) setLiveOrg(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [demoActive, scope, user?.organizationId]);

  const metrics = demoActive
    ? [
        { label: "Organization", value: demoDatasetSummary.organizationName },
        { label: "Mode", value: mode },
        { label: "Projects", value: demoDatasetSummary.projects.toLocaleString() },
        { label: "Documents", value: demoDatasetSummary.documents.toLocaleString() },
      ]
    : [
        { label: "Organization", value: loading ? "Loading..." : liveOrg?.name || "Not set up yet" },
        { label: "Mode", value: mode },
        { label: "Projects", value: loading ? "..." : (liveOrg?.projects ?? 0).toLocaleString() },
        { label: "Documents", value: loading ? "..." : (liveOrg?.documents ?? 0).toLocaleString() },
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

// SA-2 (2026-07-28) / A-30: this matrix used to render every role's full capability description to
// any viewer regardless of their own role. Founder's own words: "We do not want permission schema
// for other user categories visible to any user" / "Need not be visible except one's own role."
// Super Admin and Organization Admin (the roles that actually manage permissions) still see the
// full reference matrix, clearly labeled as such; every other role sees only their own row.
const permissionMatrix: { role: RoleName; access: string }[] = [
  { role: "Super Admin", access: "All organizations, governance, users, audit" },
  { role: "Organization Admin", access: "Tenant administration, users, documents, approvals" },
  { role: "Executive", access: "Executive dashboards, analytics, approvals, knowledge" },
  { role: "Manager", access: "Programs, tasks, meetings, knowledge, project governance" },
  { role: "Employee", access: "Assigned work, documents, meetings, knowledge" },
  { role: "Guest", access: "Read-only approved knowledge and documents" },
];

function PermissionsPanel() {
  const { session } = useAuth();
  const user = session.user;
  const canManagePermissions = Boolean(user && ["Super Admin", "Organization Admin"].includes(user.role));
  const ownRow = permissionMatrix.find((item) => item.role === user?.role);
  const visibleMatrix = canManagePermissions ? permissionMatrix : ownRow ? [ownRow] : [];

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-[rgba(0,0,0,0.06)] bg-[#F8F9FA] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-[#8B1E2D]" />
            <h3 className="text-sm font-semibold text-[#0F1117]">{canManagePermissions ? "Permission Matrix (Reference)" : "Your Permissions"}</h3>
          </div>
          {user && <span className="text-[11px] text-[#5F6B73]">Signed in as <span className="font-semibold text-[#0F1117]">{user.role}</span></span>}
        </div>
      </div>
      {visibleMatrix.map((item) => (
        <div key={item.role} className="grid grid-cols-1 gap-2 border-b border-[rgba(0,0,0,0.04)] px-4 py-3 text-xs md:grid-cols-[180px_1fr]">
          <span className="font-semibold text-[#0F1117]">{item.role}</span>
          <span className="text-[#5F6B73]">{item.access}</span>
        </div>
      ))}
      {!canManagePermissions && (
        <div className="px-4 py-3 text-[11px] leading-relaxed text-[#5F6B73]">
          You do not have permission to manage roles. The full permission schema is visible to Organization Admins and Super Admins only.
        </div>
      )}
    </Card>
  );
}

// A-79: lets a HITL who finds the actionables gate's heuristic signals too noisy turn the whole
// auto-trigger mechanism off, per the founder's own addendum ("logic gate may fail/misfire
// repeatedly ... should have On/Off option"). The manual "Create actionable from answer" fallback
// in AI Workspace/Review Inbox is unaffected either way. Mirrors DemoModePanel's toggle pattern.
function AgenticGateTogglePanel() {
  const [enabled, setEnabled] = useState(() => isAgenticGateEnabled());

  const toggle = (nextEnabled: boolean) => {
    setAgenticGateEnabled(nextEnabled);
    setEnabled(nextEnabled);
  };

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#0F1117]">Agentic action prompts</h3>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#5F6B73]">
            Automatically ask &quot;What do you want me to do with this?&quot; after AI Workspace answers and reviews that look actionable. Turning this off does not disable the manual &quot;Create actionable from answer&quot; button.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => toggle(!enabled)}
          className={`relative h-7 w-14 flex-shrink-0 rounded-full transition-colors ${enabled ? "bg-[#8B1E2D]" : "bg-[#D1D5DB]"}`}
        >
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-7" : "translate-x-1"}`} />
        </button>
      </div>
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
      // A-08/A-65 fix (2026-07-27): this used to write directly to the invitations repository's
      // create method, which persists the invitation but never sends the actual invite email --
      // that only happens in POST /api/invitations's sendInvitationEmail() call. Going through the
      // route is what actually delivers the email, and lets us tell the admin the truth about
      // whether it sent.
      const response = await fetch("/api/invitations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim().toLowerCase(), role: inviteRole }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string; emailDelivery?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Invitation could not be created.");
      }

      analytics.trackEvent("user_invited", { invited_role: inviteRole, email_delivery: payload.emailDelivery }, {
        organization_id: scope.organizationId,
        user_id: scope.userId,
        user_role: scope.role,
        module_name: "settings",
        route: "/settings",
      });
      setInviteEmail("");
      setToast({
        tone: payload.emailDelivery === "sent" ? "success" : "info",
        message: payload.emailDelivery === "sent"
          ? "Invitation created and emailed."
          : payload.emailDelivery === "not-configured"
            ? "Invitation created, but email delivery is not configured yet -- share the invite link manually."
            : "Invitation created, but the email could not be sent.",
      });
      await loadUsers();
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Invitation could not be created." });
    } finally {
      setSaving(false);
    }
  };

  // Admin panel wiring pass (2026-07-25): the "Invitation Administration" panel at /admin/invitations
  // was a dead placeholder -- redirected to /settings instead of duplicating this real invite UI, and
  // this is the one real gap it had: no way to revoke a pending invitation once sent.
  const revokeInvitation = async (invitation: Invitation) => {
    if (!scope || !canManageUsers) return;
    setSaving(true);
    setToast(null);
    try {
      await applicationServices.invitationsRepository.update(scope, invitation.id, { status: "revoked" });
      setInvitations((current) => current.filter((row) => row.id !== invitation.id));
      setToast({ tone: "success", message: "Invitation revoked." });
    } catch {
      const response = await fetch(`/api/repositories/invitations?id=${invitation.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "revoked" }),
      }).catch(() => undefined);
      if (response?.ok) {
        setInvitations((current) => current.filter((row) => row.id !== invitation.id));
        setToast({ tone: "success", message: "Invitation revoked." });
      } else {
        setToast({ tone: "error", message: "Invitation could not be revoked." });
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
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">{invitation.status}</span>
                <button
                  onClick={() => void revokeInvitation(invitation)}
                  disabled={!canManageUsers || saving}
                  className="rounded-lg border border-[rgba(0,0,0,0.1)] px-2 py-1 text-[11px] font-semibold text-[#5F6B73] hover:bg-[#F2F3F5] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Revoke
                </button>
              </div>
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
