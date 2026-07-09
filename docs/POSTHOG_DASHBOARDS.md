# PostHog Dashboards

Create the following dashboards in PostHog.

## 1. Activation Funnel

Events: `app_opened`, `sign_up_started`, `sign_up_completed`, `organization_created`, `workspace_created`.

## 2. Onboarding Completion

Events: `onboarding_step_completed`, `organization_created`, `workspace_created`.

## 3. Security Adoption

Events: `mfa_enrolled`, `security_event_recorded`, `login_completed`.

## 4. RAG Usage

Events: `rag_query_submitted`, `rag_answer_generated`, `document_retrieved`.

## 5. Prompt Approval Workflow

Events: `prompt_submitted`, `prompt_approved`, `prompt_rejected`, `ai_answer_reviewed`.

## 6. Admin Activity

Events: `invitation_sent`, `role_changed`, `security_event_recorded`.

## 7. Tenant Health

Events: `dashboard_widget_loaded`, `api_latency_recorded`, `retention_checkpoint_reached`.

## 8. Beta Feedback

Events: `beta_feedback_clicked`, `feedback_submitted`.

## 9. Mobile App Health

Events: `app_opened`, `crash_reported`, `route_performance_recorded`.

## 10. Conversion to Paid Pilot

Events: `onboarding_completed`, `feature_adopted`, `report_exported`.
