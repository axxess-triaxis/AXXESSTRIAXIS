# Agentic Risk Register

Date: 2026-07-30  
Related: A-78, A-79

| Risk | Severity | Why it matters | Current control | Remaining action |
|---|---|---|---|---|
| API key leakage | High | A leaked key can call tenant tools | raw key shown once, hash stored, revoke supported | live revoke test |
| Overbroad tool access | High | "Full access" could become unsafe | explicit capabilities, no raw DB access | add per-tenant capability toggles |
| Missing audit rows | High | enterprise trust depends on evidence | every MCP tools/call logged in Phase 1 | live audit verification |
| Stale grants / always-allow risk | High | old approvals may allow future actions | grants table introduced in dirty tree | expiry/review UI needed |
| Cross-tenant access | Critical | unacceptable enterprise breach | org filters and RLS expectations | live two-tenant MCP test |
| Copilot adapter uncertainty | Medium | Copilot is approved but not MCP-native | Copilot labeled Phase 2 | build/test Copilot Studio adapter |
| Notion external write risk | Medium | sensitive insight may leave tenant boundary | A-79 requires disabled/honest state until configured | Notion write confirmation and audit |
| Docs/Sheets/Slides export risk | Medium | data may leave AXXESS | second-step confirmation required | export permissions and audit |
| Auto-action without consent | High | agents could create work unexpectedly | A-79 requires two-step confirmation | implement and test |
| Placeholder routing | Medium | user loses trust if action dead-ends | pending states required | live UX walkthrough |
| Sensitive prompt leakage | High | AI output may include document contents | do not log full bodies | redaction policy for analytics/audit |
| Provider credential drift | Medium | connector appears live but fails | credential matrix | scheduled env verification |

## Rule

No agentic feature is closed until code verification, live walkthrough, remediation, founder sign-off, and closeout documentation are complete.

