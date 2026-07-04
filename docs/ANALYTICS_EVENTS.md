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

- Account/session: `user_login`, `user_logout`, `beta_session_started`, `beta_session_ended`
- Navigation: `dashboard_viewed`, `module_opened`, `sidebar_navigation_clicked`
- Projects: `project_created`, `project_updated`, `project_viewed`
- Tasks: `task_created`, `task_updated`, `task_assigned`, `task_status_changed`
- Meetings: `meeting_created`, `meeting_updated`, `meeting_viewed`, `decision_recorded`, `action_item_created`
- Notifications: `notification_viewed`, `notification_marked_read`
- User administration: `user_invited`, `role_changed`, `user_admin_viewed`
- Feedback: `feedback_opened`, `feedback_submitted`, `beta_feedback_link_clicked`
- System: `error_boundary_triggered`, `form_validation_failed`, `empty_state_viewed`
- Onboarding: `onboarding_step_completed`

## Mixpanel Configuration

Set:

```bash
NEXT_PUBLIC_MIXPANEL_TOKEN=
NEXT_PUBLIC_ANALYTICS_DISABLED=false
```

Leave the token empty to use mock analytics.
