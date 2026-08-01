# Plugin Runtime

AXXESS uses a reusable plugin runtime contract instead of one-off connector code.

Each plugin records:

- Tenant ownership.
- OAuth or provider scope requirements.
- Sync mode.
- Webhook posture.
- Secret scope.
- Retry policy.
- Approval requirement for writes.
- Revocation readiness.
- Audit event names.

## Core Files

- `src/services/plugins/pluginRuntime.ts`
- `src/app/api/plugins/runtime/route.ts`
- `supabase/migrations/202607140002_sprint20_21_live_ai_platform.sql`

## Runtime Rules

- Plugins belong to an organization.
- Provider credentials are configuration-gated.
- Missing provider credentials do not break the UI.
- External writes, exports, and messages require human approval when policy requires it.
- Plugin actions are evaluated before execution and recorded in audit metadata.
- Sync runs should record retry count, error message, source reference, and created records.

## Initial Plugin Families

- Email: Gmail, Outlook.
- Calendar: Google Calendar.
- Storage: Google Drive.
- Messaging: Slack, Teams, WhatsApp Business.
- Project management: Jira, Trello, Asana, Linear, GitHub.
- CRM: HubSpot, Salesforce, Zoho CRM.
- Data/document/finance: Airtable, Google Sheets, DocuSign, Razorpay.

## Next Implementation Layer

Sprint 22 should complete provider callback token exchange, encrypted token references, provider-specific sync workers, and webhook verification.

## Sprint 4 Correction (2026-07-24)

The line above is stale. Provider callback token exchange and encrypted token references are already implemented, not pending: `src/services/integrations/oauthProvider.ts` (`exchangeOAuthCode`, `createOAuthState`/`verifyOAuthState` with timing-safe signature comparison, optional PKCE), `src/services/integrations/tokenVault.ts` (AES-256-GCM sealed token storage), and both `src/app/api/connectors/oauth/start/route.ts` and `.../oauth/callback/route.ts` are real, tested (`oauthProvider.test.ts`, `src/app/api/connectors/oauth/start/route.test.ts`) implementations -- not stubs. Every OAuth start and connect attempt writes a real audit log (`connector.<provider>.oauth.started`/`.connected`).

**What is genuinely still missing, confirmed this sprint**: the required environment variables (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `AXXESS_OAUTH_STATE_SECRET`, `AXXESS_TOKEN_VAULT_KEY`, `AXXESS_TOKEN_VAULT_KEY_ID`) are not set in the production Vercel project (`npx vercel env ls` shows none of them). Without them, `getOAuthProviderConfiguration()` correctly reports `configured: false` and `/api/connectors/oauth/start` returns a truthful `{status: "provider_gated", missing: [...]}` response rather than a fake authorization redirect -- confirmed by direct code read, not assumed. Provider-specific sync workers and webhook verification remain genuinely unimplemented, as originally stated. See `docs/readiness/SPRINT_4_INTEGRATIONS_ANALYTICS_OPERATIONAL_EVIDENCE_CLOSEOUT_2026_07_24.md` for the full Gmail/Microsoft readiness determination (A-21).

**Why `plugin_connection_started` was not wired to the "Connect Gmail"/"Connect Microsoft" links this sprint**: those are plain anchor tags (`<a href="/api/connectors/oauth/start?provider=...">`) that navigate away immediately -- there is no client-side moment to safely fire and flush a browser analytics event before the page unloads. The server-side `connector.<provider>.oauth.started` audit log (written by the route itself, on every attempt, configured or not) already captures this with stronger guarantees (tenant-scoped, always recorded, not dependent on the browser tab surviving long enough to flush) than a client `trackEvent` call would. Converting these into `onClick`-intercepted navigations purely to add a duplicate client analytics event was judged out of scope for a validation sprint that explicitly excludes broad integration rework.
