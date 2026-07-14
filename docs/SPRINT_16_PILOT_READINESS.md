# Sprint 16 Pilot Readiness

Sprint 16 prepares AXXESS for real pilot conversations without redesigning the product. The work keeps the existing Next.js, Supabase, demo fallback, RBAC, RAG, analytics, and enterprise UI architecture intact while adding the missing operational surfaces a pilot sponsor expects to see.

## Goals

- Make the first live tenant setup path clearer.
- Give Organization Admins a dedicated place to review users, roles, departments, invitations, and audit coverage.
- Give governance stakeholders a dedicated audit-log review surface.
- Expand onboarding from a short beta checklist into a realistic first-10-minutes pilot workflow.
- Add tenant-scoped persistence for pilot readiness analytics.
- Preserve investor preview behavior and live tenant isolation.

## Product Changes

### Organization Admin

The Organization Admin surface is available at `/admin/organization` for `Super Admin` and `Organization Admin` roles.

It summarizes:

- Pilot users
- Admin-ready users
- Departments
- Pending invitations
- Recent audit events
- Pilot launch controls
- Pilot conversion next actions

The page reads through the existing repository/service provider layer and shows provider-safe state labels. It does not bypass tenant scope.

### Audit Logs

The Audit Logs surface is available at `/admin/audit-logs` for `Super Admin` and `Organization Admin` roles.

It provides:

- Tenant audit event counts
- Filtered category views
- Security and AI/RAG event summaries
- Review-trail activity feed
- Browser CSV export for current filtered results

The export is intentionally client-side for this sprint. Production-grade signed exports should move behind a server route with audit write-back.

### Pilot Onboarding

The onboarding checklist now covers:

- Confirm organization
- Invite pilot team
- Assign roles
- Create first project
- Upload first document
- Ask first AI/RAG question
- Create first task
- Request first approval
- View audit trail
- Send feedback or request support

Completion emits analytics events through the existing sanitized analytics provider contract.

## Database

Migration:

`supabase/migrations/202607110001_sprint16_pilot_readiness_admin_hardening.sql`

Adds:

- `pilot_readiness_events`
- RLS policies for organization member select and insert
- Admin/leadership update policy
- Audit-log indexes for resource and action filtering
- Pilot readiness indexes for organization, step, and user review

The table is tenant scoped by `organization_id` and does not use open `using (true)` policies.

## Security

- New routes are role-protected.
- RBAC limits the admin and audit surfaces to `Super Admin` and `Organization Admin`.
- Migration policies use organization membership helpers.
- No secrets, service-role keys, or raw document content are stored in the pilot readiness table.

## Verification

Sprint 16 adds tests for:

- Route metadata for `/admin/organization` and `/admin/audit-logs`
- RBAC restrictions for admin/audit surfaces
- Pilot onboarding copy and workflow coverage
- RLS expectations for the new migration

Expected local verification:

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```

## Remaining Risks

- Pilot readiness completion currently tracks analytics locally through the provider abstraction; server persistence should be added in Sprint 17.
- Audit CSV export is useful for review but should become a signed server-side export before regulated production use.
- Admin and audit tables still need compact mobile alternatives for small screens.
