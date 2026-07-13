"use client";

import { Activity, CheckCircle2, ClipboardCheck, TrendingUp, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import {
  ActivityFeed,
  DataStateBadge,
  DemoDataNotice,
  EmptyState,
  MetricCard,
  ModuleHeader,
  PageShell,
  SectionCard,
  StatusBadge,
  TenantScopeBadge,
  WorkflowStepCard,
} from "../../components/enterprise";
import {
  computePilotHealth,
  createDemoPilotReadinessEvents,
  pilotReadinessSteps,
  type PilotReadinessEvent,
} from "../../services/pilot/pilotHealth";
import { useAnalytics } from "../../services/analytics";

type PilotConversionState = {
  events: PilotReadinessEvent[];
  loading: boolean;
  source: "Live" | "Demo" | "Provider-gated";
};

export function PilotConversionSection() {
  const { session } = useAuth();
  const analytics = useAnalytics();
  const user = session.user;
  const [state, setState] = useState<PilotConversionState>({ events: [], loading: true, source: "Provider-gated" });

  const loadPilotEvents = useCallback(async () => {
    setState((current) => ({ ...current, loading: true }));
    const response = await fetch("/api/pilot-readiness-events?pageSize=100", { credentials: "include", cache: "no-store" }).catch(() => undefined);
    if (response?.ok) {
      const events = await response.json() as PilotReadinessEvent[];
      setState({
        events: events.length ? events : createDemoPilotReadinessEvents(user?.organizationId),
        loading: false,
        source: events.length ? "Live" : "Demo",
      });
      return;
    }

    setState({ events: createDemoPilotReadinessEvents(user?.organizationId), loading: false, source: "Demo" });
  }, [user?.organizationId]);

  useEffect(() => {
    void loadPilotEvents();
  }, [loadPilotEvents]);

  useEffect(() => {
    if (!user) return;
    analytics.trackEvent("admin_surface_viewed", { admin_surface: "pilot_conversion" }, {
      organization_id: user.organizationId,
      user_id: user.id,
      user_role: user.role,
      module_name: "pilot-conversion",
      route: "/admin/pilot-conversion",
    });
  }, [analytics, user]);

  const health = useMemo(() => computePilotHealth(state.events), [state.events]);
  const latestEvents = [...state.events].sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 8);

  if (!user) return null;

  return (
    <PageShell>
      <ModuleHeader
        eyebrow="Pilot operations"
        title="Pilot Conversion"
        description="Track whether a clean tenant has moved from setup into a credible, sponsor-ready institutional pilot."
        badges={[
          <TenantScopeBadge key="tenant" label="Tenant-scoped pilot events" />,
          <DataStateBadge key="state" state={state.loading ? "Provider-gated" : state.source} />,
          <StatusBadge key="health" status={health.status} />,
        ]}
        actions={
          <a href="/admin/audit-logs" className="rounded-lg bg-[#8B1E2D] px-3 py-2 text-xs font-semibold text-white">Review audit trail</a>
        }
      />

      <DemoDataNotice label="Pilot Conversion uses live pilot readiness events when Supabase is configured, and falls back to seeded investor-preview events for demos." />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Pilot health" value={`${health.score}%`} detail={health.status} state={state.source} icon={TrendingUp} />
        <MetricCard label="Completed steps" value={`${health.completedSteps}/${health.totalSteps}`} detail={`${health.completionPercent}% workflow completion`} state={state.source} icon={CheckCircle2} />
        <MetricCard label="Readiness events" value={state.events.length} detail="tenant-scoped records" state={state.source} icon={Activity} />
        <MetricCard label="Sponsor review" value={health.score >= 85 ? "Ready" : "Pending"} detail="conversion checkpoint" state={state.source} icon={Users} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <SectionCard title="Conversion checklist" description="Weighted signals used to calculate pilot health.">
          <div className="grid gap-3 md:grid-cols-2">
            {pilotReadinessSteps.map((step, index) => (
              <WorkflowStepCard
                key={step.id}
                index={index + 1}
                title={step.label}
                description={`${step.weight} health points - ${health.completedStepIds.includes(step.id) ? "completed" : "awaiting evidence"}`}
                status={health.completedStepIds.includes(step.id) ? "Complete" : "Pending"}
              />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Recommended next actions" description="What the account owner should do before conversion review.">
          <div className="space-y-3">
            {health.recommendations.map((item, index) => (
              <div key={item} className="rounded-lg border border-[rgba(15,17,23,0.08)] bg-white p-3">
                <p className="text-xs font-semibold text-[#0F1117]">{index + 1}. {item}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Pilot event timeline" description="Latest captured setup and conversion signals.">
        {latestEvents.length ? (
          <ActivityFeed
            items={latestEvents.map((event) => ({
              title: pilotReadinessSteps.find((step) => step.id === event.stepId)?.label ?? event.stepId,
              description: `${event.eventType} via ${event.source}`,
              time: event.createdAt.slice(5, 16).replace("T", " "),
              tone: event.eventType === "pilot_interest_captured" ? "brand" : "success",
            }))}
          />
        ) : (
          <EmptyState title="No pilot events yet" message="Complete onboarding steps to build the tenant conversion timeline." />
        )}
      </SectionCard>

      <SectionCard title="Sprint 18 conversion controls" description="Operational controls now available for pilot review.">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            "Signed server-side audit exports",
            "Invitation delivery webhook capture",
            "Mobile visual screenshot workflow",
          ].map((control) => (
            <div key={control} className="rounded-lg border border-[rgba(15,17,23,0.08)] bg-white p-4">
              <ClipboardCheck className="text-[#8B1E2D]" size={18} />
              <p className="mt-3 text-sm font-semibold text-[#0F1117]">{control}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </PageShell>
  );
}

export default PilotConversionSection;
