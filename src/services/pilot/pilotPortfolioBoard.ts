import type { KanbanColumnData } from "../../features/kanban/types";
import type { PilotHealthStatus } from "./pilotHealth";
import type { PilotTenantSnapshot } from "./pilotPortfolio";

// Sprint 1 pilot portfolio (2026-08-15): columns are exactly PilotHealthStatus's four values, in
// their existing severity order -- deliberately not inventing a parallel Kanban-specific status
// enum, per the plan's explicit instruction to reuse pilotHealth.ts as-is.
const COLUMN_ORDER: PilotHealthStatus[] = ["Needs setup", "At risk", "On track", "Pilot-ready"];

const COLUMN_DESCRIPTIONS: Record<PilotHealthStatus, string> = {
  "Needs setup": "Onboarding barely started -- little to no golden-path activity yet.",
  "At risk": "Some progress, but stalled or falling behind on the golden path.",
  "On track": "Steady onboarding progress, actively working through the golden path.",
  "Pilot-ready": "Golden path substantially complete -- ready for a sponsor conversion review.",
};

function relativeTime(value: string) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function buildPilotPortfolioColumns(tenants: PilotTenantSnapshot[]): KanbanColumnData[] {
  return COLUMN_ORDER.map((status) => {
    const columnTenants = tenants.filter((tenant) => tenant.onboarding.status === status);
    return {
      id: status,
      title: status,
      description: COLUMN_DESCRIPTIONS[status],
      cards: columnTenants.map((tenant) => ({
        id: tenant.organizationId,
        title: tenant.organizationName,
        subtitle: tenant.lastActivityAt ? relativeTime(tenant.lastActivityAt) : "No activity recorded yet",
        metrics: [
          { label: "Pilot users", value: String(tenant.pilotUserCount) },
          { label: "Onboarding", value: `${tenant.onboarding.completedSteps}/${tenant.onboarding.totalSteps}` },
          { label: "Workflows", value: `${tenant.workflowStepsComplete}/${tenant.workflowStepsTotal}` },
        ],
      })),
    };
  });
}
