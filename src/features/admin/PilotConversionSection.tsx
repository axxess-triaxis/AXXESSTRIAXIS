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
import { staggerDelay } from "../../lib/ui/staggerDelay";
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

const HEATMAP_WEEKS = 12;
const heatmapDayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// A-96 (2026-08-04): a real GitHub-style activity heatmap computed from whatever `events` actually
// contains -- state.events is already either live pilot_readiness_events rows or the seeded demo
// fallback (see loadPilotEvents above), so this needs no separate demoMode branch: it is honest for
// both, and a real tenant's own event density renders correctly the moment real events exist.
function buildPilotEventHeatmap(events: PilotReadinessEvent[]) {
  const countsByDate = new Map<string, number>();
  for (const event of events) {
    const day = event.createdAt.slice(0, 10);
    countsByDate.set(day, (countsByDate.get(day) ?? 0) + 1);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const totalDays = HEATMAP_WEEKS * 7;
  const start = new Date(today);
  start.setDate(start.getDate() - (totalDays - 1) - today.getDay());

  const weeks: Array<Array<{ date: string; count: number }>> = [];
  const cursor = new Date(start);
  for (let week = 0; week < HEATMAP_WEEKS; week += 1) {
    const days: Array<{ date: string; count: number }> = [];
    for (let day = 0; day < 7; day += 1) {
      const iso = cursor.toISOString().slice(0, 10);
      days.push({ date: iso, count: countsByDate.get(iso) ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(days);
  }

  const maxCount = Math.max(1, ...Array.from(countsByDate.values()));
  return { weeks, maxCount, totalEvents: events.length };
}

function heatmapCellClass(count: number, maxCount: number) {
  if (count === 0) return "bg-[#F2F3F5]";
  const intensity = count / maxCount;
  if (intensity > 0.75) return "bg-[#8B1E2D]";
  if (intensity > 0.5) return "bg-[#8B1E2D]/70";
  if (intensity > 0.25) return "bg-[#8B1E2D]/45";
  return "bg-[#8B1E2D]/25";
}

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
  const heatmap = useMemo(() => buildPilotEventHeatmap(state.events), [state.events]);

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

      {state.source === "Demo" && (
        <DemoDataNotice label="Pilot Conversion uses live pilot readiness events when Supabase is configured, and falls back to seeded investor-preview events for demos." />
      )}

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

      <SectionCard title="Pilot activity heatmap" description={`Readiness event density over the last ${HEATMAP_WEEKS} weeks -- darker cells mean more setup and conversion activity that day.`}>
        <div className="flex items-start gap-3 overflow-x-auto pb-1">
          <div className="flex flex-col justify-between gap-[3px] pt-4 text-[9px] text-[#5F6B73]">
            {heatmapDayLabels.map((label, index) => (
              <span key={label} className={index % 2 === 0 ? "" : "opacity-0"} style={{ height: 11 }}>{label}</span>
            ))}
          </div>
          <div className="flex gap-[3px]">
            {heatmap.weeks.map((week, weekIndex) => (
              <div key={week[0].date} className="axxess-stagger-item flex flex-col gap-[3px]" style={staggerDelay(weekIndex, 25)}>
                {week.map((cell) => (
                  <div
                    key={cell.date}
                    title={`${cell.date}: ${cell.count} event${cell.count === 1 ? "" : "s"}`}
                    className={`h-[11px] w-[11px] rounded-[2px] ${heatmapCellClass(cell.count, heatmap.maxCount)}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-[10px] text-[#5F6B73]">
          <span>Less</span>
          <span className="h-[11px] w-[11px] rounded-[2px] bg-[#F2F3F5]" />
          <span className="h-[11px] w-[11px] rounded-[2px] bg-[#8B1E2D]/25" />
          <span className="h-[11px] w-[11px] rounded-[2px] bg-[#8B1E2D]/45" />
          <span className="h-[11px] w-[11px] rounded-[2px] bg-[#8B1E2D]/70" />
          <span className="h-[11px] w-[11px] rounded-[2px] bg-[#8B1E2D]" />
          <span>More</span>
          <span className="ml-auto font-mono">{heatmap.totalEvents} total events</span>
        </div>
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
