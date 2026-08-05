# Connector Credential Readiness Matrix

Date: 2026-07-30  
Purpose: distinguish code-integrated connectors from production-live connectors.

## Status Definitions

- **Code-integrated:** connector contract exists and uses the shared OAuth/token-vault path.
- **Credentials present:** required production env vars/scopes appear configured.
- **Live connect tested:** a real tenant completed connect/disconnect.
- **Blocked:** external app, env var, provider review, or HITL test still needed.

## Matrix

| Provider | Code-integrated | Credentials present | Live connect tested | Current blocker | Next HITL action |
|---|---:|---:|---:|---|---|
| Gmail | Yes | Google pair reported present | No | live connect/disconnect not confirmed | Test connect, import/select, disconnect, audit |
| Google Calendar / Meet | Yes | Google pair reported present | No | redirect URI/scopes/live consent need confirmation | Test connect and calendar access |
| Google Drive | Yes | Google pair reported present | No | redirect URI/scopes/live consent need confirmation | Test connect and file picker/access |
| Google Sheets | Yes | Reuses Google pair | No | redirect URI/scopes likely need registration | Add redirect URI, test connect |
| Google Docs | Yes | Reuses Google pair | No | redirect URI/scopes likely need registration | Add redirect URI, test connect |
| Google Slides | Yes | Reuses Google pair | No | redirect URI/scopes likely need registration | Add redirect URI, test connect |
| Zoom | Yes | `ZOOM_CLIENT_ID` and `ZOOM_CLIENT_SECRET` reported set | No | live connect/disconnect not confirmed | Test Zoom OAuth, revoke, audit |
| Microsoft Outlook Email | Yes | Unknown/not confirmed | No | Microsoft app/secret not confirmed | Set/check Entra credentials |
| Microsoft Teams | Yes | Not present per latest known status | No | `MICROSOFT_CLIENT_ID`/`SECRET` absent | Register/update Entra app |
| Slack | Yes | Unknown/not confirmed | No | provider credential not confirmed | Set/check Slack credentials and test |
| Calendly | Yes | Unknown/not confirmed | No | provider credential not confirmed | Set/check Calendly credentials and test |
| Airtable | Yes | Unknown/not confirmed | No | provider credential not confirmed | Set/check Airtable credentials and test |
| HubSpot | Yes | Unknown/not confirmed | No | provider credential not confirmed | Set/check HubSpot credentials and test |
| Notion | Yes | Unknown/not confirmed | No | provider credential not confirmed | Set/check Notion credentials and test |
| Linear | Yes | No | No | Linear OAuth app/env vars absent | Register app, set env vars |
| GitHub | Yes | No | No | GitHub OAuth app/env vars absent | Register app, set env vars |
| WhatsApp Business | Yes | No | No | Meta app, WABA, App Review, env vars absent | Start Meta setup |
| X / Twitter | Yes | No | No | X developer app/env vars absent | Register app, set env vars |
| OpenAI agent | AXXESS inbound MCP ready after deploy | AXXESS key generated after deploy | No | A-78 rollout pending | Generate key and test MCP |
| Anthropic / Claude agent | AXXESS inbound MCP ready after deploy | AXXESS key generated after deploy | No | A-78 rollout pending | Generate key and test MCP |
| Microsoft Copilot agent | label/key path only | AXXESS key generated after deploy | No | Copilot adapter Phase 2 | Build Copilot adapter later |

## Safe External Claim

AXXESS has a broad connector framework with multiple code-integrated providers, but live production connection status must be claimed provider-by-provider after credential and connect/disconnect testing.

