# Live Dashboard Data

Sprint 14 adds live dashboard provider hooks that read through tenant-aware repositories with demo-safe fallbacks.

## Hooks

- `useLiveWorkspaceMetrics`
- `useLiveNotifications`
- `useLiveApprovals`
- `useLiveRagHealth`
- `useLiveIntegrationHealth`

## Contract

Dashboards should render immediately with realistic fallback data, then hydrate from repositories where Supabase is available. Investor preview must not display backend errors, loading dead ends, or empty analytical panels.

## Next Work

- Add server-side streaming metrics for large tenants.
- Add dashboard widget-level cache tags.
- Add Supabase Realtime subscriptions for notifications and approvals.
