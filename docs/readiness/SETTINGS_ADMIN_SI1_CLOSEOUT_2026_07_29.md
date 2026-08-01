# Settings & Admin -- Sprint SI-1 Closeout (2026-07-29)

Date: 2026-07-29
Branch: `canonical/sprint-1-35-unified-gitlab`
Governance source: `CLAUDE.md`'s evidence-chain discipline.
Related: `ACTIONABLES_READINESS_MATRIX.md` (A-70, new), `QA3_READINESS_KANBAN.md` (Sprint SI-1
section), `SETTINGS_ADMIN_SA1_CLOSEOUT_2026_07_28.md`, `SETTINGS_ADMIN_SA2_CLOSEOUT_2026_07_28.md`.

## Origin

The founder pasted a generic Calendly inline-embed HTML snippet (placeholder URL and placeholder
name/email -- not real content) with no attached instruction. Clarifying questions established:
(1) this should become a real, in-product booking feature, in Settings, for signed-in tenants, and
(2) on follow-up, the actual requirement is broader than Calendly -- **every pilot tenant should be
able to link their own Google Calendar/Meet, Gmail, Zoom, and Microsoft Teams**, not a single
Triaxis-owned Calendly link. The founder also confirmed "the repo already has Calendly wrap on
Supabase," i.e. follow the same pattern Calendly already uses.

## Sprint Objective

Extend AXXESS TRIaxis's existing per-tenant OAuth connector framework so Google Calendar (with
Meet), Google Drive, Zoom, and Microsoft Teams become real, tenant-owned, product-facing
connectors -- reusing the same architecture Gmail/Outlook/Slack/Calendly/Airtable/HubSpot/Notion
already use, not building a parallel system.

## Audit: What Already Existed

Read `src/services/integrations/connectorContract.ts`, `oauthProvider.ts`, `pluginRegistry.ts`,
and `/api/connectors/oauth/{start,callback}` before writing any code. Findings:

- **Real, working, per-tenant OAuth connectors already existed** for Gmail, Microsoft Outlook
  (email only), Slack, Calendly, Airtable, HubSpot, and Notion -- a genuinely session-authenticated,
  PKCE-capable, tamper-evident-state, encrypted-token-vault, audit-logged pipeline
  (`connectorContract.ts` + `oauthProvider.ts` + the two `/api/connectors/oauth/*` routes).
- **Google Calendar**: only a catalogue placeholder in `pluginRegistry.ts` (`pilotEnabled: false`)
  -- no entry at all in `connectorContract.ts`'s `ConnectorProviderId` union, so attempting to
  connect it would have hit "Unsupported connector provider."
- **Microsoft Teams**: same shape as Google Calendar -- catalogued, not pilot-enabled, no real
  contract. Only "microsoft" (Outlook email scopes) existed as a Microsoft connector.
- **Zoom**: did not exist anywhere in the codebase, not even as a catalogue placeholder.
- **Google Drive**: same shape as Google Calendar -- catalogued (`pilotEnabled: false`), no real
  contract, added as a 4th connector mid-sprint once the founder confirmed they already have a
  Google Drive OAuth client ready to configure.
- **Database schema**: `oauth_token_vault`, `integration_connections`, and
  `oauth_connection_states` all store `provider_id` as free text with no CHECK/enum constraint --
  confirmed no migration would be needed to add new provider ids.

## What Was Built

Extended the existing engine with 4 new real connector contracts, following the exact pattern
already used for Slack/Calendly/Airtable/HubSpot/Notion (per the sprint's own non-negotiable
against building parallel architecture):

1. **`google_calendar`** -- reuses Gmail's Google OAuth authorization/token endpoints and
   `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (one Google Cloud OAuth app already covers multiple
   scopes/products, matching `pluginRegistry.ts`'s pre-existing envMap, which already mapped
   `google_calendar` to `GOOGLE_CLIENT_ID` even before this sprint). Scopes:
   `calendar.events` + `calendar.readonly`. Google Meet links require no separate scope -- they
   attach automatically via `conferenceData` when creating a Calendar event through the API.
2. **`teams`** -- reuses the existing "microsoft" contract's OAuth endpoints and
   `MICROSOFT_CLIENT_ID`/`MICROSOFT_CLIENT_SECRET`, with its own distinct scopes
   (`OnlineMeetings.ReadWrite`, `Calendars.ReadWrite`) so a tenant can connect Teams independently
   of Outlook email.
3. **`zoom`** -- a genuinely new provider, its own OAuth endpoints
   (`zoom.us/oauth/authorize`, `zoom.us/oauth/token`), and new `ZOOM_CLIENT_ID`/
   `ZOOM_CLIENT_SECRET` env vars. **Not independently verified against live Zoom API docs** --
   the exact scope strings (`meeting:write`, `meeting:read`) are flagged directly in code as
   needing confirmation against Zoom's current App Marketplace scope list for the specific app
   type registered, before this goes live.
4. **`google_drive`** -- reuses Gmail/Calendar's Google OAuth app/client credentials. Scope:
   `drive.readonly`.

`pluginRegistry.ts`: flipped `google_calendar`, `teams`, and `google_drive` from
`pilotEnabled: false` to `true`, and added `zoom` as a new catalogue entry -- all 4 now surface
automatically in the existing Settings quick-connect grid (`IntegrationsQuickConnectPanel`) and the
`/integrations` catalogue page, both of which render generically off `getPilotIntegrations()`.
Added `Video` and `HardDrive` (lucide-react) as connect-card icons for Zoom/Teams and Google Drive
respectively; reused the existing `Calendar` icon for Google Calendar.

`/api/connectors/oauth/callback/route.ts`: added the 4 new provider ids to its
`supportedProviderIds` allowlist. No other route code changed -- the start route, state
signing/verification, PKCE, token exchange, and vault sealing are all fully generic and required
no modification.

## What Was Not Built

- No database migration (confirmed unnecessary -- see above).
- No new UI surface -- the existing generic quick-connect grid was reused as-is, matching how
  Calendly/Airtable/HubSpot/Notion were added previously, per this sprint's implicit continuation
  of "don't redesign the UI" from the SA-1/SA-2 sprints.
- No actual OAuth app registration in any provider's console -- that is explicitly a founder
  action (see Remaining Risks).
- No changes to Gmail/Outlook (already real, untouched).

## Files Changed

- `src/services/integrations/connectorContract.ts` -- 4 new provider contracts, extended
  `oauthClientIdEnvVar`, extended the Google-specific OAuth param condition.
- `src/services/integrations/oauthProvider.ts` -- extended `oauthClientEnvVars`.
- `src/services/integrations/pluginRegistry.ts` -- `google_calendar`/`teams` flipped to
  pilot-enabled, `zoom` added, `envMap` extended.
- `src/app/api/connectors/oauth/callback/route.ts` -- `supportedProviderIds` extended.
- `src/features/settings/SettingsSection.tsx` -- `quickConnectIcons` extended, `Video` icon
  imported.
- `src/services/integrations/connectorContract.test.ts`,
  `src/services/integrations/oauthProvider.test.ts`,
  `src/services/integrations/pluginRegistry.test.ts` -- extended with new-provider coverage and
  updated exact-list/count assertions.
- `docs/readiness/SETTINGS_ADMIN_SI1_CLOSEOUT_2026_07_29.md` (this file, new).
- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` -- A-70 added.
- `docs/readiness/QA3_READINESS_KANBAN.md` -- Sprint SI-1 section added.

## Tests Added

12 new tests: 3 in `connectorContract.test.ts` (contract shape + OAuth URL building for all 4),
4 in `oauthProvider.test.ts` (missing-env-var reporting, configured-once-credentials-present for
all 4, Zoom token exchange), plus the pre-existing `pluginRegistry.test.ts` assertions updated (not
counted as new) to the new exact pilot-integration list and count.

## Production Credential Check (2026-07-29, same day)

Checked real production state directly, not assumed:

- `vercel env ls production` (variable **names only** -- no secret values were read or displayed)
  against `triaxis-www-frontend-import`. Findings: **`GOOGLE_CLIENT_ID` is set** (added the same
  day this sprint ran), but **`GOOGLE_CLIENT_SECRET` is not** -- Google-based connectors (Gmail,
  Calendar, Drive) remain unconfigured despite the client id being present, since
  `getOAuthProviderConfiguration()` requires both. `MICROSOFT_CLIENT_ID`/`SECRET`,
  `SLACK_CLIENT_ID`/`SECRET`, `CALENDLY_CLIENT_ID`/`SECRET`, `AIRTABLE_CLIENT_ID`/`SECRET`,
  `HUBSPOT_CLIENT_ID`/`SECRET`, `NOTION_CLIENT_ID`/`SECRET`, and `ZOOM_CLIENT_ID`/`SECRET` are
  **all absent** -- every one of the 11 pilot-enabled connectors (the 7 pre-existing plus this
  sprint's 4) is unconfigured in production today.
- **More fundamental finding: `AXXESS_TOKEN_VAULT_KEY` is not set in production at all.** Every
  connector's OAuth callback calls `sealTokenBundle()` (`tokenVault.ts`), which throws without this
  key. This means no connector -- old or new, regardless of client credential status -- can
  currently complete an OAuth connection in production. This was not previously tracked as a
  blocker anywhere in the readiness matrix; added to A-21 and A-70 this sprint.
- **Live-checked sign-in OAuth the same session** (a related but distinct system from the
  connectors above -- sign-in uses Supabase Auth's own provider config, not these connector env
  vars): `GET https://landing.triaxisventures.com/api/auth/oauth/start?provider=google` returns a
  real `authorizeUrl` (Google sign-in is live). The same call with `provider=microsoft` returns
  `{"error":"microsoft OAuth is not enabled for this deployment."}`. Both match A-26's existing,
  unchanged finding. `NEXT_PUBLIC_AUTH_PHONE_ENABLED` (A-68, phone sign-in) is also absent from
  production env vars -- not re-tested by calling the endpoint itself, since that would send a
  real SMS.
- `.vercel/project.json` was linked to `triaxis-www-frontend-import` for this check and restored
  to the repo's default link (`axxesstriaxis`) immediately after, per this session's established
  practice.

## Verification Results

- `pnpm run typecheck` -- clean.
- `pnpm run lint` (`eslint . --max-warnings=0`) -- clean, zero warnings.
- Focused run (`connectorContract.test.ts`, `oauthProvider.test.ts`, `pluginRegistry.test.ts`,
  `tokenVault.test.ts`, `oauth/start/route.test.ts`): **5 test files, 24 tests, all passing.**
- Focused run (`src/features/settings/`): **5 test files, 23 tests, all passing** (no regression
  from the icon-map change).
- Focused run (`src/features/integrations/`, `src/app/api/connectors/`): **3 test files, 9 tests,
  all passing.**
- Full verification suite (`test`, `build`): run immediately after this closeout was written;
  exact pass/fail counts recorded in the commit's final report.

## A-70 Status

New actionable, added this sprint: `Blocked (code + test shipped 2026-07-29, needs OAuth apps
registered in Google Cloud Console, Zoom App Marketplace, and Microsoft Entra)`, 70% confidence
(code). Not `Yes` -- confirmed via direct production env var check (above) that no tenant can
actually connect any of these 4 providers today: `GOOGLE_CLIENT_SECRET` is missing (Google-based
connectors), `MICROSOFT_CLIENT_ID`/`SECRET` and `ZOOM_CLIENT_ID`/`SECRET` are entirely absent, and
`AXXESS_TOKEN_VAULT_KEY` is missing too, which would block every connector regardless.

## Remaining Risks

- **Zoom's scope strings are unverified against live docs** -- flagged directly in code
  (`connectorContract.ts`) as needing confirmation before production use.
- **`AXXESS_TOKEN_VAULT_KEY` is not set in production** -- blocks all 11 pilot-enabled connectors,
  not just this sprint's 4. This is arguably the highest-priority single fix, since it blocks
  everything else regardless of provider-console progress.
- **Founder action required, cannot be done from this environment**: set `GOOGLE_CLIENT_SECRET`
  (client id already set); register a new Zoom App Marketplace OAuth app and set
  `ZOOM_CLIENT_ID`/`ZOOM_CLIENT_SECRET`; register/extend a Microsoft Entra app and set
  `MICROSOFT_CLIENT_ID`/`MICROSOFT_CLIENT_SECRET`; set `AXXESS_TOKEN_VAULT_KEY` (a random secret
  of at least 32 characters, per `tokenVault.ts`'s `minimumVaultKeyLength` check -- not a
  provider-issued credential, can be generated directly).
- **No live end-to-end connect has been performed** -- this sprint is code + unit tests only, per
  the same discipline as every other OAuth-gated actionable in this program (A-21, A-26, A-68).
- **Gmail is already a real connector** (pre-existing, not part of this sprint) -- the founder's
  "Gmail" mention in the original request is already satisfied by existing infrastructure, not new
  work.

## Exact HITL Actions Required

1. **Set `AXXESS_TOKEN_VAULT_KEY` in production first** -- a random secret string of at least 32
   characters (e.g. `openssl rand -base64 32`), not tied to any external provider. Nothing below
   can work end to end without this regardless of provider progress.
2. Set `GOOGLE_CLIENT_SECRET` in production (the matching `GOOGLE_CLIENT_ID` is already set) to
   unblock Gmail/Calendar/Drive.
3. Register a new Zoom App Marketplace OAuth app; confirm the exact scope strings required by the
   registered app type match what's in `connectorContract.ts`, adjusting if Zoom's current docs
   differ from `meeting:write`/`meeting:read`; set `ZOOM_CLIENT_ID`/`ZOOM_CLIENT_SECRET`.
4. Register/extend a Microsoft Entra app registration to include `OnlineMeetings.ReadWrite` and
   `Calendars.ReadWrite`; set `MICROSOFT_CLIENT_ID`/`MICROSOFT_CLIENT_SECRET`.
5. Once configured, perform one real connect-and-disconnect cycle per provider as a pilot tenant
   to confirm the full OAuth round trip, before telling any actual pilot customer to try it.

## Exact File / Commit / PR / Deployment State

Branch: `canonical/sprint-1-35-unified-gitlab`. Commit and push follow immediately after this
closeout. Deployment to production follows per the founder's standing EOD/2x-daily deploy-cadence
instruction, pending explicit permission in this conversation -- though per the Remaining Risks
above, deploying this code has no live effect for any tenant until the founder's provider-console
actions are complete.
