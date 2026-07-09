import type { SafeAnalyticsProperties } from "../analytics/types";
import { sanitizeAnalyticsProperties } from "../analytics/sanitize";

export type PostHogDashboard = "executive" | "developer" | "security";

export type PostHogEventName =
  | "onboarding_started"
  | "onboarding_completed"
  | "feature_adopted"
  | "dashboard_widget_loaded"
  | "ai_query_submitted"
  | "ai_answer_reviewed"
  | "document_retrieved"
  | "api_latency_recorded"
  | "route_performance_recorded"
  | "security_event_recorded"
  | "retention_checkpoint_reached"
  | "crash_reported";

export type PostHogEventDefinition = {
  name: PostHogEventName;
  dashboards: PostHogDashboard[];
  description: string;
};

export const postHogEventDefinitions: PostHogEventDefinition[] = [
  {
    name: "onboarding_started",
    dashboards: ["executive"],
    description: "Measures tenant activation funnel entry.",
  },
  {
    name: "onboarding_completed",
    dashboards: ["executive"],
    description: "Measures tenant activation funnel completion.",
  },
  {
    name: "feature_adopted",
    dashboards: ["executive"],
    description: "Tracks institutional feature adoption without capturing content.",
  },
  {
    name: "dashboard_widget_loaded",
    dashboards: ["executive", "developer"],
    description: "Measures dashboard freshness and rendering coverage.",
  },
  {
    name: "ai_query_submitted",
    dashboards: ["executive", "security"],
    description: "Tracks governed AI usage volume and tenant context.",
  },
  {
    name: "ai_answer_reviewed",
    dashboards: ["executive", "security"],
    description: "Tracks human review outcomes for high-impact AI outputs.",
  },
  {
    name: "document_retrieved",
    dashboards: ["security"],
    description: "Tracks permission-aware RAG source retrieval.",
  },
  {
    name: "api_latency_recorded",
    dashboards: ["developer"],
    description: "Measures backend timing against the 200ms target.",
  },
  {
    name: "route_performance_recorded",
    dashboards: ["developer"],
    description: "Measures route-level web performance.",
  },
  {
    name: "security_event_recorded",
    dashboards: ["security"],
    description: "Tracks auth, role, permission, and document access events.",
  },
  {
    name: "retention_checkpoint_reached",
    dashboards: ["executive"],
    description: "Measures cohort retention milestones.",
  },
  {
    name: "crash_reported",
    dashboards: ["developer", "security"],
    description: "Tracks crash volume without sensitive payloads.",
  },
];

export function getPostHogEventsForDashboard(dashboard: PostHogDashboard): PostHogEventDefinition[] {
  return postHogEventDefinitions.filter((eventDefinition) => eventDefinition.dashboards.includes(dashboard));
}

export function sanitizePostHogProperties(properties: Record<string, unknown>): SafeAnalyticsProperties {
  return sanitizeAnalyticsProperties(properties) ?? {};
}
