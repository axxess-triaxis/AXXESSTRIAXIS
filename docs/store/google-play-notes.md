# Google Play Review Notes

## App

AXXESS by Triaxis is an enterprise SaaS platform for governance-native AI workflows, institutional knowledge, approvals, project delivery, stakeholder coordination, audit logs and mobile command-center access.

## Reviewer Access

- Reviewer email: `reviewer.mobile@axxess.demo`
- Reviewer role: Organization Admin
- Demo tenant: North East Health Mission
- Login route: `/auth/login`

The reviewer account is provisioned for store review and beta testing. It shows a controlled preview tenant with realistic institutional data and does not expose live customer data.

## Suggested Review Flow

1. Sign in using the reviewer account.
2. Review Executive Dashboard, Projects, Knowledge Hub, AI Workspace and Approvals.
3. Open AI Review Inbox and verify that AI outputs require human review before consequential records are created.
4. Open Workflow Records to inspect created approval requests, stakeholder notes and project updates.
5. Open Admin > Mobile Release to review Android/iOS build posture, screenshot manifest, release health and staged rollout state.

## Platform Notes

The Android release workflow generates a signed Play-ready AAB when repository secrets are configured. Google Play upload remains opt-in through release environment flags.
