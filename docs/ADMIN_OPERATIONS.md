# Admin Operations

This document captures the initial admin operating model for enterprise pilots.

## Admin Roles

- Super Admin: platform-wide administration.
- Organization Admin: tenant administration.
- Department Admin: department and workspace administration.
- Auditor: read-only evidence and audit review.

## Pilot Setup Checklist

1. Create organization.
2. Assign data residency region.
3. Configure organization security tier.
4. Create departments.
5. Create workspaces.
6. Invite users.
7. Assign enterprise roles.
8. Configure retention policy.
9. Configure compliance policies.
10. Enable demo mode only for investor or sales demo tenants.

## Sensitive Actions

Require audit logging for:

- Login and logout.
- MFA challenge.
- Role changes.
- Permission changes.
- Document upload/view/download.
- AI answer generation.
- AI answer approval.
- Privacy request creation and completion.
- Workflow approvals.
- Security policy changes.

## Admin Gaps

- Admin UI for departments and workspaces.
- Admin UI for privacy requests.
- Admin UI for compliance controls.
- Admin UI for prompt approval.
- Audit export workflow.
