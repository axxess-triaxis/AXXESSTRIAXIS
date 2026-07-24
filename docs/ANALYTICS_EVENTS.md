# Analytics Events

AXXESS uses a provider interface with `MockAnalyticsProvider` as the default and `MixpanelAnalyticsProvider` when `NEXT_PUBLIC_MIXPANEL_TOKEN` is present.

## Event Envelope

Every event is prepared with:

- `organization_id`
- `user_id`
- `user_role`
- `module_name`
- `route`
- `timestamp`
- `environment`
- `app_version`
- `release_version`
- `event_source`

## Events

- Account/session: `user_login`, `user_logout`, `beta_session_started`, `beta_session_ended`, `app_opened`
- Navigation: `dashboard_viewed`, `module_opened`, `sidebar_navigation_clicked`
- Projects: `project_created`, `project_updated`, `project_viewed`
- Tasks: `task_created`, `task_updated`, `task_assigned`, `task_status_changed`
- Meetings: `meeting_created`, `meeting_updated`, `meeting_viewed`, `decision_recorded`, `action_item_created`
- Notifications: `notification_viewed`, `notification_marked_read`
- User administration: `user_invited`, `role_changed`, `user_admin_viewed`, `profile_updated`
- Feedback: `feedback_opened`, `feedback_submitted`, `beta_feedback_link_clicked`
- System: `error_boundary_triggered`, `form_validation_failed`, `empty_state_viewed`
- Onboarding: `onboarding_step_completed`, `sign_up_started`, `sign_up_completed`, `organization_created`
- Documents and RAG: `document_uploaded`, `rag_ingestion_completed`, `rag_query_submitted`, `rag_answer_generated`, `ai_answer_reviewed`, `workflow_completion_celebrated`

## Sprint 4 Dispatch-Proof Audit (2026-07-24)

`src/services/analytics/types.ts` declares 66 event names in `AnalyticsEventName`, but a declared type name is not evidence of instrumentation -- it only tells the type system the name is valid, not that any real code path fires it. A dedicated audit (`src/services/analytics/eventTaxonomy.test.ts`) reads the actual application source (not the type file) to prove each of the 18 golden-path categories this program's Sprint 4 prompt requires is dispatched from a real component, not just declared:

`app_opened`, `sign_up_started`, `sign_up_completed`, `user_login` (login and investor-preview entry), `user_logout`, `organization_created`, `profile_updated`, `document_uploaded`, `rag_ingestion_completed`, `rag_query_submitted`, `rag_answer_generated`, `ai_answer_reviewed`, `workflow_completion_celebrated`, `dashboard_viewed`, `user_invited`, `feedback_submitted`, `error_boundary_triggered`.

Before this sprint, `app_opened`, `sign_up_started`, `document_uploaded`, `rag_answer_generated`, `rag_ingestion_completed`, and `rag_ingestion_started` were declared in `types.ts` but dispatched from nowhere; `profile_updated` did not exist as an event at all. All but `rag_ingestion_started` (superseded by firing `rag_ingestion_completed` once, synchronously, since document ingestion in this codebase is a single-request operation with no separate "started" phase worth tracking) are now wired to their real code paths. `plugin_connection_started` (the "integration connect attempted" category) remains declared but undispatched -- see `docs/PLUGIN_RUNTIME.md`'s Sprint 4 update for why this was deliberately not wired this sprint.

## Mixpanel Configuration

Set:

```bash
NEXT_PUBLIC_MIXPANEL_TOKEN=
NEXT_PUBLIC_ANALYTICS_DISABLED=false
```

Leave the token empty to use mock analytics.
