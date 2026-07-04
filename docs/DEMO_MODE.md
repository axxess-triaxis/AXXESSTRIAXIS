# Demo Mode

Demo Mode is the AXXESS investor-preview layer. It runs on the same application shell and repository contracts as production, but swaps in a seeded North East Health Mission tenant.

## Enablement

- Settings: `Settings -> Demo`
- Environment: `NEXT_PUBLIC_AXXESS_DEMO_MODE=true`
- Demo login: `investor.preview@axxess.demo` with password `preview`

## Seeded Environment

The preview tenant includes:

- 186 projects across 12 programs
- 224 institutional documents
- 128 Knowledge Hub articles
- 1,120 document activity records
- 64 stakeholders
- 42 approvals
- 680 audit logs
- 36 users

## Normal Mode

When Demo Mode is off, new tenants do not receive seeded demo data. If Supabase is connected, the application uses production repositories. If Supabase is not connected, the shell presents a clean tenant and empty-state guidance.

## Reset

The Settings demo panel includes a one-click reset. Reset restores the original seeded tenant, removes local preview modifications, and reloads the active view.
