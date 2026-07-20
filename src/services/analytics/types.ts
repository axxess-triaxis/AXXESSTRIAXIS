import type { RoleName } from "../../domain";

export type AnalyticsEventName =
  | "user_login"
  | "user_logout"
  | "beta_session_started"
  | "beta_session_ended"
  | "dashboard_viewed"
  | "module_opened"
  | "sidebar_navigation_clicked"
  | "project_created"
  | "project_updated"
  | "project_viewed"
  | "task_created"
  | "task_updated"
  | "task_assigned"
  | "task_status_changed"
  | "meeting_created"
  | "meeting_updated"
  | "meeting_viewed"
  | "decision_recorded"
  | "action_item_created"
  | "notification_viewed"
  | "notification_marked_read"
  | "user_invited"
  | "role_changed"
  | "user_admin_viewed"
  | "feedback_opened"
  | "feedback_submitted"
  | "beta_feedback_link_clicked"
  | "error_boundary_triggered"
  | "form_validation_failed"
  | "empty_state_viewed"
  | "onboarding_step_completed"
  | "app_opened"
  | "sign_up_started"
  | "sign_up_completed"
  | "login_completed"
  | "mfa_enrolled"
  | "organization_created"
  | "workspace_created"
  | "invitation_sent"
  | "document_uploaded"
  | "rag_query_submitted"
  | "rag_answer_generated"
  | "prompt_submitted"
  | "prompt_approved"
  | "prompt_rejected"
  | "approval_requested"
  | "report_exported"
  | "account_deletion_started"
  | "feature_adopted"
  | "dashboard_widget_loaded"
  | "ai_query_submitted"
  | "ai_answer_reviewed"
  | "document_retrieved"
  | "api_latency_recorded"
  | "route_performance_recorded"
  | "security_event_recorded"
  | "retention_checkpoint_reached"
  | "crash_reported"
  | "ai_request_routed"
  | "ai_provider_selected"
  | "rag_ingestion_started"
  | "rag_ingestion_completed"
  | "integration_event_recorded"
  | "alert_ingested"
  | "plugin_connection_started"
  | "workflow_action_completed"
  | "admin_surface_viewed"
  | "audit_log_viewed"
  | "audit_export_requested"
  | "pilot_onboarding_step_completed"
  | "pilot_interest_captured"
  | "micro_survey_shown"
  | "micro_survey_responded"
  | "first_value_milestone_reached";

export type AnalyticsEventSource = "client" | "server" | "test";
export type SafeAnalyticsPrimitive = string | number | boolean | null;
export type SafeAnalyticsProperties = Record<string, SafeAnalyticsPrimitive | SafeAnalyticsPrimitive[]>;

export type AnalyticsContext = {
  organization_id?: string;
  user_id?: string;
  user_role?: RoleName;
  module_name?: string;
  route?: string;
  event_source?: AnalyticsEventSource;
};

export type AnalyticsEventPayload = AnalyticsContext & {
  timestamp: string;
  environment: string;
  app_version: string;
  release_version: string;
  properties?: SafeAnalyticsProperties;
};

export type AnalyticsUserProperties = {
  user_role?: RoleName;
  organization_id?: string;
  organization_type?: string;
  organization_size?: string;
  plan_type?: string;
  beta_user?: boolean;
  signup_source?: string;
  country?: string;
  state?: string;
};

export interface AnalyticsProvider {
  readonly name: string;
  readonly enabled: boolean;
  trackEvent(eventName: AnalyticsEventName, payload: AnalyticsEventPayload): void;
  identifyUser(userId: string, properties?: AnalyticsUserProperties): void;
  setUserProperties(properties: AnalyticsUserProperties): void;
  resetAnalytics(): void;
}

export type AnalyticsRuntime = {
  enabled: boolean;
  providerName: string;
  releaseVersion: string;
  appVersion: string;
};
