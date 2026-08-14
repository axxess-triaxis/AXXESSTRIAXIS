# Agentic MCP Live Validation Checklist (2026-08-14)

Use this only after MCP2 is deployed.

| Step | Expected Result | Pass/Fail | Evidence / Screenshot | Notes | Severity If Failed |
|---|---|---|---|---|---|
| Confirm production deployment includes MCP2 commit | Production build is current |  |  |  | High |
| Confirm `agent_connections` and `agent_action_grants` tables exist in production Supabase | Tables visible and RLS enabled |  |  |  | High |
| Log in as tenant admin | Admin session works |  |  |  | High |
| Create an Agent Connection | Raw key shown once only |  |  |  | High |
| Confirm raw key is not visible after refresh | Only prefix/status/capabilities remain |  |  |  | High |
| Enable one MCP2 auto capability, e.g. `list_tasks` | Capability persists on connection |  |  |  | High |
| Call `initialize` | Returns protocol version and server info |  |  |  | High |
| Call `tools/list` | Shows only enabled capabilities |  |  |  | High |
| Call disabled tool | Safe MCP denial, no execution |  |  |  | Critical |
| Call malformed tool arguments | JSON-RPC invalid params error, no approval created |  |  |  | High |
| Call `list_tasks` | Returns only this tenant's tasks |  |  |  | Critical |
| Call `list_documents` | Returns metadata only, no file bytes |  |  |  | High |
| Call `get_dashboard_snapshot` | Returns tenant-scoped counts |  |  |  | Medium |
| Enable `update_task_status` | Capability persists |  |  |  | High |
| Call `update_task_status` without grant | Approval request created, task not changed yet |  |  |  | Critical |
| Reject critical approval | Request closes rejected, action does not execute |  |  |  | Critical |
| Call `update_task_status` again, approve without Always Allow | Executes exactly once |  |  |  | Critical |
| Call critical tool again without Always Allow | Requires approval again |  |  |  | High |
| Approve with Always Allow | Grant created |  |  |  | High |
| Call same critical tool again | Executes without new approval |  |  |  | High |
| Revoke grant | Future call goes back to pending approval |  |  |  | High |
| Revoke key | Future calls return invalid/revoked key |  |  |  | Critical |
| Review audit logs | Success, failure, pending, approval, rejection, and grant events visible |  |  |  | Critical |

## Sample Curl Shapes

Replace `<host>` and `<key>`.

```bash
curl -X POST https://<host>/api/agents/mcp \
  -H "Authorization: Bearer <key>" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize"}'
```

```bash
curl -X POST https://<host>/api/agents/mcp \
  -H "Authorization: Bearer <key>" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
```

```bash
curl -X POST https://<host>/api/agents/mcp \
  -H "Authorization: Bearer <key>" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list_tasks","arguments":{"limit":10}}}'
```

