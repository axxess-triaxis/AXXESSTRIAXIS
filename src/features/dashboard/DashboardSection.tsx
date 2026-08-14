import { Download, FolderKanban, PlayCircle, Plus, RefreshCw, Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "../../auth/AuthProvider";
import { isDemoModeEnabled, isDemoModeSsrSafe } from "../../demo/demoMode";
import { useDemoModeEnabled } from "../../demo/useDemoModeEnabled";
import {
  ActivityFeed,
  DataStateBadge,
  DemoDataNotice,
  ModuleHeader,
  PageShell,
  SectionCard,
  TenantScopeBadge,
} from "../../components/enterprise";
import { EnterpriseWorkflowJourney } from "../../components/enterprise/EnterpriseWorkflowJourney";
import { TenantHealthCommandCenter } from "../../components/enterprise/TenantHealthCommandCenter";
import { WorkflowTimelinePanel } from "../../components/enterprise/WorkflowTimelinePanel";
import { EmptyState } from "../../components/feedback/EmptyState";
import { Avatar } from "../../components/ui/Avatar";
import { Card } from "../../components/ui/Card";
import { RiskBadge } from "../../components/ui/RiskBadge";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useEnterpriseGoldenPath } from "../../hooks/useEnterpriseGoldenPath";
import { useGoldenPathDisplayMode } from "../../hooks/useGoldenPathDisplayMode";
import { useGuidedDemo } from "../../hooks/useGuidedDemo";
import { invalidateLiveWorkspaceMetricsCache } from "../../hooks/liveWorkspaceMetricsCache";
import { demoRecentActivity } from "../../lib/demo/demoActivity";
import { demoInstitution } from "../../lib/demo/seedData";
import { BetaOnboardingChecklist } from "../onboarding/BetaOnboardingChecklist";
import { DashboardTier } from "./DashboardTier";
import { DashboardSnapshotBar } from "./DashboardSnapshotBar";
import { SampleDataBanner } from "./SampleDataBanner";
import { UrgentAttentionBarStack } from "./UrgentAttentionBarStack";
import { useDashboardSnapshot } from "./useDashboardSnapshot";
import { useDashboardSnapshotPeriods } from "../../hooks/useDashboardSnapshotPeriods";
import {
  demoAiRecommendations,
  demoObjectives,
  dashboardScopeForUser,
  type DashboardStrategicObjective,
  getDashboardFallbackProjects,
  getDashboardProjects,
  getDashboardStrategicObjectives,
  performanceData,
  workloadData,
} from "./data";

type DashboardProject = Awaited<ReturnType<typeof getDashboardProjects>>[number];

// A minimal, genuinely working search over data already loaded on this page (projects, priority
// actions) -- deliberately not a new search index or backend. Executive Dashboard Sprint ED-1
// replaces the decorative CommandSearchPlaceholder with this on the Dashboard specifically, without
// changing CommandSearchPlaceholder itself (kept as a general-purpose primitive for other callers).
function DashboardCommandSearch({
  projects,
  actions,
}: {
  projects: Pick<DashboardProject, "id" | "name">[];
  actions: { stepId: string; label: string; route: string }[];
}) {
  const [query, setQuery] = useState("");
  const trimmed = query.trim().toLowerCase();
  const matchingActions = trimmed ? actions.filter((action) => action.label.toLowerCase().includes(trimmed)).slice(0, 5) : [];
  const matchingProjects = trimmed ? projects.filter((project) => project.name.toLowerCase().includes(trimmed)).slice(0, 5) : [];
  const hasResults = matchingActions.length > 0 || matchingProjects.length > 0;

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-lg border border-[rgba(15,17,23,0.1)] bg-white px-3 py-2 text-xs text-[#5F6B73]">
        <Search size={14} className="text-[#8B1E2D]" aria-hidden="true" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search projects and priority actions"
          aria-label="Search projects and priority actions"
          className="flex-1 border-none bg-transparent text-xs text-[#0F1117] outline-none placeholder:text-[#5F6B73]"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} className="text-[10px] font-semibold text-[#5F6B73] hover:text-[#0F1117]">
            Clear
          </button>
        )}
      </div>
      {trimmed.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-[rgba(15,17,23,0.08)] bg-white p-2 shadow-lg">
          {!hasResults && <p className="px-2 py-1 text-xs text-[#5F6B73]">No matches for &ldquo;{query}&rdquo;.</p>}
          {matchingActions.length > 0 && (
            <div className="mb-1">
              <p className="px-2 text-[10px] font-semibold uppercase tracking-wide text-[#5F6B73]">Priority actions</p>
              {matchingActions.map((action) => (
                <a key={action.stepId} href={action.route} className="block rounded px-2 py-1 text-xs text-[#0F1117] hover:bg-[#F2F3F5]">
                  {action.label}
                </a>
              ))}
            </div>
          )}
          {matchingProjects.length > 0 && (
            <div>
              <p className="px-2 text-[10px] font-semibold uppercase tracking-wide text-[#5F6B73]">Projects</p>
              {matchingProjects.map((project) => (
                <a key={project.id} href="/projects" className="block rounded px-2 py-1 text-xs text-[#0F1117] hover:bg-[#F2F3F5]">
                  {project.name}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Illustrative demo-only categories -- must only ever render in demo mode. See DEMO_DATA_LEAKAGE_AUDIT.md.
const demoHeatmap = [
  { label: "Referral", level: 3 },
  { label: "Budget", level: 2 },
  { label: "Oxygen", level: 3 },
  { label: "Audit", level: 2 },
  { label: "Vendor", level: 1 },
  { label: "Stockout", level: 3 },
  { label: "Outreach", level: 2 },
  { label: "Data", level: 2 },
  { label: "Staffing", level: 1 },
];

// Executive Dashboard Sprint ED-3: real Risk Heatmap MVP for live tenants -- aggregates each
// project's own risk level (already real, rendered elsewhere via RiskBadge) into a count-by-band
// view, deliberately generic (not the demo set's health/NGO-specific categories like "Oxygen" or
// "Referral"), since a live tenant's projects have no inherent relationship to those labels.
export function aggregateProjectRisk(projects: Pick<DashboardProject, "risk">[]) {
  let high = 0;
  let medium = 0;
  let low = 0;
  for (const project of projects) {
    if (project.risk === "urgent" || project.risk === "high") high += 1;
    else if (project.risk === "medium") medium += 1;
    else low += 1;
  }
  return [
    { label: "High risk projects", level: 3 as const, count: high },
    { label: "Medium risk projects", level: 2 as const, count: medium },
    { label: "Low risk projects", level: 1 as const, count: low },
  ];
}

type DashboardRecommendation = {
  id: string;
  title: string;
  type: "Governance recommendation" | "Operational recommendation";
  route: string;
};

// Executive Dashboard Sprint ED-3: AI Recommendations MVP for live tenants -- derived entirely
// from real evidence already loaded on this page (pending AI reviews, at-risk projects), not an
// autonomous-AI-generated insight. Labeled "Governance recommendation"/"Operational recommendation"
// rather than claiming AI authorship it doesn't have, per the roadmap's Option B guidance.
export function deriveDashboardRecommendations(pendingAiReviewCount: number, projects: DashboardProject[]): DashboardRecommendation[] {
  const recommendations: DashboardRecommendation[] = [];
  if (pendingAiReviewCount > 0) {
    recommendations.push({
      id: "pending-ai-reviews",
      title: `${pendingAiReviewCount} AI output${pendingAiReviewCount === 1 ? "" : "s"} awaiting your review`,
      type: "Governance recommendation",
      route: "/ai-workspace/review-inbox",
    });
  }
  const atRiskProjects = projects.filter((project) => project.risk === "high" || project.risk === "urgent");
  for (const project of atRiskProjects.slice(0, 3)) {
    recommendations.push({
      id: `at-risk-${project.id}`,
      title: `${project.name} is flagged ${project.risk} risk -- review recommended`,
      type: "Operational recommendation",
      route: "/projects",
    });
  }
  return recommendations;
}

export function DashboardSection() {
  const { session } = useAuth();
  const tenantScope = useMemo(() => session.user ? dashboardScopeForUser(session.user) : undefined, [session.user]);
  // A-106 fix (2026-08-09): isDemoModeSsrSafe(), not isDemoModeEnabled(), for this initial-state seed --
  // see the identical reasoning in AuthProvider.tsx's getInitialClientSession(). The useEffect below
  // (which calls getDashboardProjects(), itself demo-mode-aware) corrects this to the real,
  // localStorage-aware value immediately after mount.
  const [projects, setProjects] = useState<DashboardProject[]>(() => (isDemoModeSsrSafe() ? getDashboardFallbackProjects() : []));
  const [objectives, setObjectives] = useState<DashboardStrategicObjective[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);
  // Executive Dashboard Redesign addendum (2026-08-01): the "Enterprise golden path" panel used to
  // render unconditionally, permanently occupying dashboard space even in its already-collapsed
  // on-demand summary form. Founder feedback on the live ED-R1 deploy: it's redundant with "Start
  // guided setup" and should not feature on the dashboard by default -- 100% optional, revealed
  // only by that button, not shown until then.
  const [goldenPathVisible, setGoldenPathVisible] = useState(false);
  const guidedDemo = useGuidedDemo("dashboard");
  // Executive Dashboard Redesign Sprint ED-R1 (extracted to useDashboardSnapshot.ts, A-96
  // 2026-08-04, so Analytics can share this exact scored-tile stack): the Priority x Criticality
  // scored tile set, built purely from live hooks -- see
  // docs/readiness/EXECUTIVE_DASHBOARD_REDESIGN_PLAN_2026_08_01.md for the full scoring rationale.
  const { snapshot: dashboardSnapshot, liveMetrics, pendingAiReviewCount, auditLogCount, workflowTimeline, overdueTaskCount, overdueMeetingCount } = useDashboardSnapshot(tenantScope, refreshToken, projects);
  // A-106 fix (2026-08-09): useDemoModeEnabled(), not isDemoModeEnabled(), directly in the render body --
  // this value branches entire JSX subtrees below (e.g. the Recent Institutional Activity panel), so a
  // server/client divergence here was the confirmed root cause of the reported hydration error. See
  // docs/readiness/A105_A106_A107_ROOT_CAUSE_ANALYSIS_2026_08_09.md. Moved above its original
  // declaration point (previously just before the JSX return) so it can also gate
  // useDashboardSnapshotPeriods below -- see that hook's own demoMode comment.
  const demoMode = useDemoModeEnabled();
  // A-110 (2026-08-09): Daily/Weekly/Monthly/Year-on-Year snapshots, Insights, Actionables -- a new,
  // parallel layer to the tile-scoring stack above (see DashboardSnapshotBar.tsx's own header
  // comment). Shares refreshToken with the rest of this page's hooks, so the "Refresh" button below
  // refreshes this section for free.
  const snapshotPeriods = useDashboardSnapshotPeriods(tenantScope, refreshToken, demoMode);
  // Executive Dashboard Sprint ED-2: a real, literal count of pending AI review items (from the
  // same GET /api/ai/reviews the AI Review Inbox itself uses), replacing the pendingApprovals/10
  // heuristic previously used by both the Golden Path step and the Tenant Health Command Center tile.
  const enterpriseJourney = useEnterpriseGoldenPath(tenantScope, session.user, refreshToken, pendingAiReviewCount);
  const goldenPathDisplayMode = useGoldenPathDisplayMode();

  // Real refresh: drops this tenant's cached metrics entry so the next fetch is fresh, then bumps
  // refreshToken so every hook above (which all key off it) re-runs. workflowTimeline.loading is
  // reused as the visible "is refreshing" signal rather than adding a second, redundant loading state.
  function handleRefresh() {
    if (tenantScope) invalidateLiveWorkspaceMetricsCache(tenantScope);
    setRefreshToken((token) => token + 1);
  }

  // Real, minimal export: a client-side JSON snapshot of what is already on this page -- no new
  // backend/export service. Deliberately scoped this way for Executive Dashboard Sprint ED-1 (no
  // net-new dashboard intelligence); a richer export format is a later-sprint decision.
  function handleExportBriefing() {
    const payload = {
      exportedAt: new Date().toISOString(),
      organizationId: tenantScope?.organizationId ?? null,
      onboardingCompletionPercent: enterpriseJourney.completionPercent,
      liveMetrics,
      priorityActions: enterpriseJourney.actionQueue.map((action) => ({ label: action.label, route: action.route })),
      projects: projects.map((project) => ({
        name: project.name,
        status: project.status,
        progress: project.progress,
        risk: project.risk,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `axxess-executive-briefing-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    if (!tenantScope) return;

    let isMounted = true;
    getDashboardProjects(tenantScope)
      .then((projectRows) => {
        if (!isMounted) return;
        setProjects(projectRows);
      })
      .catch(() => {
        if (!isMounted) return;
        // A live-call failure must never surface fabricated demo projects to a real tenant (see
        // DEMO_DATA_LEAKAGE_AUDIT.md) -- getDashboardFallbackProjects() is demo data (186 seeded
        // records), so it must stay behind the same isDemoModeEnabled() gate as the initial state
        // above, not fall back unconditionally.
        setProjects(isDemoModeEnabled() ? getDashboardFallbackProjects() : []);
      });

    return () => {
      isMounted = false;
    };
  }, [tenantScope]);

  // Executive Dashboard Sprint ED-3: Strategic Objectives, derived from real programs -- a genuine
  // fetch failure must leave a real tenant with an honest empty list, never demo content.
  useEffect(() => {
    if (!tenantScope) return;

    let isMounted = true;
    getDashboardStrategicObjectives(tenantScope)
      .then((objectiveRows) => {
        if (!isMounted) return;
        setObjectives(objectiveRows);
      })
      .catch(() => {
        if (isMounted) setObjectives([]);
      });

    return () => {
      isMounted = false;
    };
  }, [tenantScope, refreshToken]);

  return (
    <PageShell>
      <ModuleHeader
        title="Executive Dashboard"
        eyebrow={demoMode ? demoInstitution.organizationName : "Your Organization"}
        description="Portfolio command center for executive risk, approvals, RAG readiness, budget variance, stakeholder follow-ups, and guided investor walkthroughs."
        badges={[
          <TenantScopeBadge key="tenant" />,
          <DataStateBadge key="live" state={demoMode ? "Demo" : "Live"} />,
          <DataStateBadge key="provider" state="Provider-gated" />,
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                guidedDemo.startDemo();
                setGoldenPathVisible(true);
              }}
              className="flex items-center gap-1.5 rounded-lg bg-[#0F1117] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1D2430]"
              title="An in-app product walkthrough of AXXESS -- not the separate investor demo at investor.triaxisventures.com"
            >
              <PlayCircle size={13} /> Start guided setup
            </button>
            <button onClick={handleRefresh} className="text-xs text-[#5F6B73] flex items-center gap-1.5 hover:text-[#0F1117] transition-colors">
              <RefreshCw size={12} className={workflowTimeline.loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button onClick={handleExportBriefing} className="text-xs bg-[#8B1E2D] text-white px-3 py-2 rounded-lg flex items-center gap-1.5 hover:bg-[#7a1a27] transition-colors">
              <Download size={12} /> Export Briefing
            </button>
          </div>
        }
      />

      <DashboardSnapshotBar
        periods={snapshotPeriods}
        actionQueue={enterpriseJourney.actionQueue}
        pendingAiReviewCount={pendingAiReviewCount}
        overdueTaskCount={overdueTaskCount}
        overdueMeetingCount={overdueMeetingCount}
      />

      {demoMode && (
        <DemoDataNotice label="The dashboard is preloaded to look like a 6-12 month institutional operating environment while live repositories remain tenant-isolated." />
      )}
      <DashboardCommandSearch projects={projects} actions={enterpriseJourney.actionQueue} />

      {session.user && (
        <SampleDataBanner canRemove={["Super Admin", "Organization Admin", "Executive", "Manager"].includes(session.user.role)} />
      )}

      {session.user && (
        <BetaOnboardingChecklist
          user={session.user}
          projectCount={projects.length}
          documentCount={liveMetrics.ragReadyDocuments}
          taskCount={liveMetrics.openTasks}
          approvalCount={liveMetrics.pendingApprovals}
        />
      )}

      {goldenPathVisible && (
        <div className="space-y-1.5">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setGoldenPathVisible(false)}
              className="text-[11px] font-semibold text-[#5F6B73] hover:text-[#8B1E2D]"
            >
              Hide guided setup path
            </button>
          </div>
          <EnterpriseWorkflowJourney
            snapshot={enterpriseJourney}
            displayMode={goldenPathDisplayMode.mode}
            onDisplayModeChange={goldenPathDisplayMode.setMode}
          />
        </div>
      )}
      <TenantHealthCommandCenter snapshot={enterpriseJourney} metrics={liveMetrics} pendingAiReviewsCount={pendingAiReviewCount} auditLogCount={auditLogCount} demoMode={demoMode} />

      {/* Executive Dashboard Redesign Sprint ED-R1: replaces the former demo-only KPI grid, the
          AI Router/Live Ops/External Signals card row, and the demo-only governance-alerts row
          with the new score-driven 3-tier layout. Each real signal those cards showed
          (RAG-ready documents, open tasks, social-alert provider status) now lives inside the
          Tier 1/2 scored tiles below with an honest live/partial/not-connected state, and the
          Urgent Attention bars surface only the highest-scoring items (score >= 16) across all
          three tiers at the very top of the screen -- see
          docs/readiness/EXECUTIVE_DASHBOARD_REDESIGN_PLAN_2026_08_01.md. */}
      <UrgentAttentionBarStack tiles={dashboardSnapshot} />
      <DashboardTier tier={1} tiles={dashboardSnapshot} />
      <DashboardTier tier={2} tiles={dashboardSnapshot} />
      <DashboardTier tier={3} tiles={dashboardSnapshot} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_420px]">
        <SectionCard
          title="Recent institutional activity"
          description={demoMode ? "Seeded activity mirrors a live operating environment and ties AI, approvals, documents, and stakeholder follow-ups together." : "Activity ties AI, approvals, documents, and stakeholder follow-ups together as your organization uses AXXESS."}
        >
          {demoMode ? (
            <ActivityFeed items={demoRecentActivity} />
          ) : workflowTimeline.timeline.length > 0 ? (
            // Executive Dashboard Sprint ED-2: reuses the same real workflow_timeline_events data
            // already fetched for the Workflow Timeline panel below -- no new fetch, no fabricated
            // activity. Previously this branch was always an empty state for real tenants even when
            // real timeline events existed.
            <ActivityFeed
              items={workflowTimeline.timeline.map((event) => ({
                title: event.title,
                description: event.description,
                time: new Date(event.createdAt).toLocaleString(),
              }))}
            />
          ) : (
            <EmptyState message="No recent activity yet. Activity will appear here as your team works in AXXESS." />
          )}
        </SectionCard>
        <WorkflowTimelinePanel events={workflowTimeline.timeline} compact />
      </div>

      <SectionCard title="Priority actions" description="Workflow-aware next steps from the tenant golden path.">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {enterpriseJourney.actionQueue.map((action) => (
            <a key={action.stepId} href={action.route} className="flex items-center justify-between rounded-lg border border-[rgba(15,17,23,0.08)] px-3 py-2 text-xs font-semibold text-[#0F1117] hover:bg-[#F8F9FA]">
              {action.label}
              <span className="text-[#8B1E2D]">Open</span>
            </a>
          ))}
          <a
            href="mailto:founders@triaxis.ventures?subject=AXXESS%20pilot%20request"
            className="flex items-center justify-between rounded-lg border border-[rgba(15,17,23,0.08)] px-3 py-2 text-xs font-semibold text-[#0F1117] hover:bg-[#F8F9FA]"
            title="Opens your email client -- there is no in-app pilot-request inbox yet"
          >
            Request pilot conversation
            <span className="text-[#8B1E2D]">Email</span>
          </a>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#0F1117] text-sm">Strategic Objectives</h3>
            {demoMode && <span className="text-xs text-[#5F6B73]">4 of 4 actively governed</span>}
          </div>
          {demoMode ? (
            <div className="space-y-4">
              {demoObjectives.map((objective) => (
                <div key={objective.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-[#0F1117]">{objective.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[#5F6B73]">{objective.progress}% / {objective.target}%</span>
                      <span className={`text-[10px] font-semibold ${objective.progress >= objective.target * 0.9 ? "text-emerald-600" : objective.progress >= objective.target * 0.7 ? "text-amber-600" : "text-red-600"}`}>
                        {objective.progress >= objective.target * 0.9 ? "On Track" : objective.progress >= objective.target * 0.7 ? "At Risk" : "Behind"}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-[#F2F3F5] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(objective.progress / objective.target) * 100}%`,
                        backgroundColor: objective.progress >= objective.target * 0.9 ? "#1A6B4A" : objective.progress >= objective.target * 0.7 ? "#C9A227" : "#8B1E2D",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : objectives.length > 0 ? (
            // Executive Dashboard Sprint ED-3: each card is a real program, "progress" is the real
            // average progress of that program's own linked projects -- not a fabricated target.
            <div className="space-y-4">
              {objectives.map((objective) => (
                <div key={objective.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-[#0F1117]">{objective.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[#5F6B73]">{objective.averageProgress}% avg -- {objective.projectCount} project{objective.projectCount === 1 ? "" : "s"}</span>
                      <StatusBadge status={objective.status} />
                    </div>
                  </div>
                  <div className="h-2 bg-[#F2F3F5] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[#8B1E2D] transition-all" style={{ width: `${objective.averageProgress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No strategic objectives configured yet. Create a program to see it tracked here." />
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-[#8B1E2D]/10 rounded-md flex items-center justify-center">
              <Sparkles size={13} className="text-[#8B1E2D]" />
            </div>
            <h3 className="font-semibold text-[#0F1117] text-sm">AI Recommendations</h3>
          </div>
          {demoMode ? (
            <div className="space-y-3">
              {demoAiRecommendations.map((recommendation, index) => (
                <a key={index} href="/ai-workspace/review-inbox" className="flex w-full items-start gap-2.5 p-2.5 rounded-lg bg-[#F2F3F5] hover:bg-[#EAEBEE] transition-colors text-left">
                  <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${recommendation.urgency === "urgent" ? "bg-red-500" : recommendation.urgency === "high" ? "bg-amber-500" : "bg-blue-500"}`} />
                  <span>
                    <span className="block text-xs text-[#0F1117] font-medium leading-snug">{recommendation.title}</span>
                    <span className="text-[10px] text-[#5F6B73] font-mono">{recommendation.type}</span>
                  </span>
                </a>
              ))}
            </div>
          ) : (() => {
            const recommendations = deriveDashboardRecommendations(pendingAiReviewCount, projects);
            return recommendations.length > 0 ? (
              // Executive Dashboard Sprint ED-3: real recommendations derived from real evidence
              // already on this page (pending AI reviews, at-risk projects) -- not an autonomous-AI
              // claim, and each one navigates to a real destination instead of a dead button.
              <div className="space-y-3">
                {recommendations.map((recommendation) => (
                  <a key={recommendation.id} href={recommendation.route} className="flex w-full items-start gap-2.5 p-2.5 rounded-lg bg-[#F2F3F5] hover:bg-[#EAEBEE] transition-colors text-left">
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 bg-amber-500" />
                    <span>
                      <span className="block text-xs text-[#0F1117] font-medium leading-snug">{recommendation.title}</span>
                      <span className="text-[10px] text-[#5F6B73] font-mono">{recommendation.type}</span>
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <EmptyState message="No recommendations yet. Recommendations appear after AI reviews, approvals, or at-risk projects exist." />
            );
          })()}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#0F1117] text-sm">Project Health Monitor</h3>
            <a href="/projects" className="text-xs text-[#8B1E2D] font-medium hover:underline">View All {projects.length}</a>
          </div>
          <div className="space-y-2.5">
            {projects.length === 0 && (
              <EmptyState
                icon={<FolderKanban size={28} />}
                title="No projects yet"
                message="Create your first project to see it tracked here alongside risk and progress."
                action={
                  <a
                    href="/projects"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#8B1E2D] px-3 py-1.5 text-xs text-white hover:bg-[#7a1a27]"
                  >
                    <Plus size={12} /> Create your first project
                  </a>
                }
              />
            )}
            {projects.slice(0, 5).map((project) => (
              // No per-project detail route exists yet (Projects & Programs selects a project via
              // in-page state, not a URL) -- navigating to /projects is the honest option rather than
              // a fabricated deep link. See EXECUTIVE_DASHBOARD_REMEDIATION_ROADMAP_2026_07_25.md.
              <a key={project.id} href="/projects" className="flex w-full items-center gap-3 p-2.5 rounded-lg hover:bg-[#F2F3F5] transition-colors text-left">
                <Avatar initials={project.owner} />
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-[#0F1117] truncate">{project.name}</span>
                    <RiskBadge level={project.risk} />
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="flex-1 h-1.5 bg-[#F2F3F5] rounded-full overflow-hidden">
                      <span className="block h-full rounded-full bg-[#8B1E2D]" style={{ width: `${project.progress}%` }} />
                    </span>
                    <span className="text-[11px] font-mono text-[#5F6B73] w-8 text-right">{project.progress}%</span>
                  </span>
                </span>
                <StatusBadge status={project.status} />
              </a>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-[#0F1117] text-sm mb-4">Risk Heatmap</h3>
          {demoMode ? (
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {demoHeatmap.map((risk) => (
                <div
                  key={risk.label}
                  className="rounded-lg p-2 text-center"
                  style={{
                    backgroundColor: risk.level === 3 ? "#FEF2F2" : risk.level === 2 ? "#FFFBEB" : "#F0FDF4",
                    border: `1px solid ${risk.level === 3 ? "#FECACA" : risk.level === 2 ? "#FDE68A" : "#BBF7D0"}`,
                  }}
                >
                  <div className={`text-[10px] font-semibold ${risk.level === 3 ? "text-red-700" : risk.level === 2 ? "text-amber-700" : "text-emerald-700"}`}>{risk.label}</div>
                  <div className={`text-[10px] font-mono ${risk.level === 3 ? "text-red-500" : risk.level === 2 ? "text-amber-500" : "text-emerald-500"}`}>{risk.level === 3 ? "HIGH" : risk.level === 2 ? "MED" : "LOW"}</div>
                </div>
              ))}
            </div>
          ) : projects.length > 0 ? (
            // Real aggregation of this tenant's own project risk levels -- no fabricated categories.
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {aggregateProjectRisk(projects).map((risk) => (
                <div
                  key={risk.label}
                  className="rounded-lg p-2 text-center"
                  style={{
                    backgroundColor: risk.level === 3 ? "#FEF2F2" : risk.level === 2 ? "#FFFBEB" : "#F0FDF4",
                    border: `1px solid ${risk.level === 3 ? "#FECACA" : risk.level === 2 ? "#FDE68A" : "#BBF7D0"}`,
                  }}
                >
                  <div className={`text-[10px] font-semibold ${risk.level === 3 ? "text-red-700" : risk.level === 2 ? "text-amber-700" : "text-emerald-700"}`}>{risk.label}</div>
                  <div className={`text-sm font-mono font-semibold ${risk.level === 3 ? "text-red-500" : risk.level === 2 ? "text-amber-500" : "text-emerald-500"}`}>{risk.count}</div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No projects yet. Risk levels will appear here once projects exist." />
          )}
          <div className="flex items-center justify-between text-[10px] text-[#5F6B73]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-200 inline-block" />Low</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-200 inline-block" />Medium</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-200 inline-block" />High</span>
          </div>
        </Card>
      </div>

      {demoMode && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <h3 className="font-semibold text-[#0F1117] text-sm mb-4">Team Workload Capacity</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={workloadData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F2F3F5" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#5F6B73", fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#5F6B73" }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }} formatter={(value) => [`${value}%`, "Utilization"]} />
                <Bar dataKey="value" fill="#8B1E2D" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-[#0F1117] text-sm mb-4">Deliverable Completion Trend</h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F2F3F5" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5F6B73" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#5F6B73" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)" }} />
                <Area type="monotone" dataKey="planned" stroke="#C9A227" strokeWidth={2} fill="#C9A22720" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="completed" stroke="#8B1E2D" strokeWidth={2} fill="#8B1E2D15" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
    </PageShell>
  );
}
