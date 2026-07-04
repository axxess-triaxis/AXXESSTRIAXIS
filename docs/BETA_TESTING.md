# Beta Testing

AXXESS Product Release 0.6 is prepared for controlled enterprise beta testing.

## Scope

- Email/password Supabase Auth
- Tenant-scoped repositories
- Real CRUD workflows for projects, tasks, and meetings
- Notifications, invitations, and audit-log foundations
- Mixpanel-ready analytics with mock fallback
- Beta feedback collection
- Internal beta readiness and product analytics admin pages
- Beta onboarding checklist

## Preparing a Beta Tenant

1. Apply all Supabase migrations through `202607030003_sprint8_beta_feedback.sql`.
2. Seed or provision at least one Organization Admin and one Guest user.
3. Confirm `NEXT_PUBLIC_AXXESS_AUTH_SHELL=true` in deployed beta environments.
4. Configure `NEXT_PUBLIC_MIXPANEL_TOKEN` only after a privacy review.
5. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
6. Visit `/admin/beta-readiness` as an admin before inviting pilot users.

## Feedback Flow

Beta users can use the persistent `Send Feedback` button in the app shell. Feedback is stored in Supabase when the `beta_feedback` table is available. An external feedback form can be configured with `NEXT_PUBLIC_BETA_FEEDBACK_FORM_URL`.

## Pilot Readiness Checks

- Auth routes redirect unauthenticated users.
- Admin routes deny non-admin roles.
- Feedback insert/read policies respect tenant scope.
- Analytics events use metadata only.
- No secrets are committed.
