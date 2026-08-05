# Live Integration Test Checklist

Date: 2026-07-30  
Purpose: verify production integrations without overclaiming.

## Test Rules

- Use a real tenant.
- Never paste secrets into docs.
- Record only key prefixes/connection IDs where needed.
- Verify connect, use, disconnect/revoke, and audit.
- Mark untested as untested, not failed.

## Google Sign-in

| Step | Expected | Result | Notes |
|---|---|---|---|
| Open `https://landing.triaxisventures.com/auth` | Google sign-in visible | | |
| Click Continue with Google | redirects to Google/Supabase consent | | |
| Complete consent | returns to AXXESS signed in | | |
| Check session/user | correct tenant/user | | |
| Sign out | session ends | | |

## Gmail / Google Calendar / Google Drive

| Step | Expected | Result | Notes |
|---|---|---|---|
| Open Settings > Integrations | Google connectors visible | | |
| Connect Gmail | OAuth consent opens | | |
| Return after consent | connection appears active | | |
| Connect Calendar | OAuth consent or reuse works | | |
| Connect Drive | OAuth consent or reuse works | | |
| Perform one safe read/list action | tenant-owned data only | | |
| Disconnect/revoke | connection removed/revoked | | |
| Check audit logs | connect/disconnect recorded | | |

## Zoom

| Step | Expected | Result | Notes |
|---|---|---|---|
| Open Settings > Integrations | Zoom visible | | |
| Click Connect Zoom | Zoom consent opens | | |
| Complete consent | returns to AXXESS | | |
| Confirm connection active | Zoom listed as connected | | |
| Perform safe meeting/list action if available | no raw errors | | |
| Disconnect/revoke | revoked | | |
| Check audit logs | connect/disconnect recorded | | |

## Token Vault

| Step | Expected | Result | Notes |
|---|---|---|---|
| Complete one connector OAuth | token sealed successfully | | |
| Refresh page | connection persists | | |
| Revoke | token unusable | | |
| Attempt stale action | safe failure | | |

## Agentic MCP

| Step | Expected | Result | Notes |
|---|---|---|---|
| Generate agent key | shown once only | | |
| Run `tools/list` | returns tools | | |
| Run `create_task` | task or pending approval created | | |
| Check Tasks/Approvals | correct tenant only | | |
| Check Audit Logs | agent call logged | | |
| Revoke key | key stops working | | |

