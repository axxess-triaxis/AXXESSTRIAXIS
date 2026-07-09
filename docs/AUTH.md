# Authentication

AXXESS uses a Supabase Auth-ready facade with a local investor preview path.

## Supported Flows

- Email/password login through `/api/auth/login`
- Logout through `/api/auth/logout`
- Session validation through `/api/auth/session`
- Protected routes through route metadata and middleware helpers
- Investor preview login through Demo Mode
- Local profile creation and editing for display name, email, initials, department, title, and timezone

## Investor Preview

```text
Email: investor.preview@axxess.demo
Password: preview
```

Logging in with this account enables Demo Mode and loads the North East Health Mission tenant.

## User Profile

Profile updates are stored locally by organization and user. This keeps Sprint 11 profile editing usable without requiring a new Supabase user-profile migration. Production user records still flow through the repository layer and can be promoted to persisted profile tables in Sprint 12.

## RBAC

Supported roles:

- Super Admin
- Organization Admin
- Executive
- Manager
- Employee
- Consultant
- Guest

Routes and feature controls read the authenticated `UserContext`. Organization boundaries are enforced through tenant-scoped repositories and RLS-ready metadata.

## Security Notes

- Client login responses do not expose Supabase access or refresh tokens.
- Server-only service-role keys must remain outside `NEXT_PUBLIC_*` variables.
- Demo login is isolated to the seeded preview tenant.
- Production deployments should move session validation fully to httpOnly cookie-backed server checks.

## Sprint 13 Auth Readiness

Sprint 13 adds route surfaces for:

- `/auth/sign-up`
- `/auth/login`
- `/auth/forgot-password`
- `/auth/reset-password`
- `/auth/mfa/enroll`
- `/auth/mfa/challenge`
- `/auth/security`
- `/settings/security`
- `/settings/account/delete`
- `/settings/privacy`

Email/password sign-up and password recovery call Supabase Auth when public Supabase settings are configured. MFA, OAuth, and passkeys remain provider-gated until the Supabase project enables the required factors/providers.
