# Integrations Doneness Matrix (2026-07-29)

Source: direct scan of Vercel production env vars (`vercel env ls production`, names only, no
secret values read) and Supabase's public `/auth/v1/settings` endpoint (read-only, anon key,
no side effects), cross-referenced against this session's actual live-test results.

**100% criteria, as defined by the founder:** a tenant can use the integration in a real workflow,
**and** the founder has actually tested it live and certified it works. Code being complete,
credentials being set, or an authorize-request being well-formed are all necessary but **not
sufficient** for 100% -- nothing below is marked 100% unless there is a direct founder statement
of a completed, successful live test.

## Sign-In Methods (Supabase Auth)

| Method | Doneness | Evidence |
|---|---|---|
| Email/password | 100% | Long-established, real accounts exist and sign in daily this session (`[FOUNDER_EMAIL_MASKED]` and others) |
| **Phone/SMS OTP (Twilio)** | **100%** | Founder: **"Twilio - OTP works."** Supabase settings confirm `phone: true`, `sms_provider: "twilio"`. |
| **Google sign-in** | **100%** | Three sequential defects (redirect_uri_mismatch, Vercel Deployment Protection wall, Supabase credential-mapping error) all found and fixed same day. Founder confirmed a full Google sign-in now completes end to end. See A-26/A-73 |
| Microsoft sign-in | 0% | Confirmed disabled: `azure: false` in Supabase settings, no `MICROSOFT_CLIENT_ID`/`SECRET` set anywhere |
| Sign in with Zoom (Supabase's built-in social provider) | Closed | Supabase settings show `zoom: true` -- but this is a *login-identity* provider, unrelated to the Zoom *connector* below. **2026-08-06 founder-stated:** enabled by accident, from a separate open browser tab while working on something else -- not an intended feature. **2026-08-06, closed per explicit founder instruction.** Origin is explained and the founder has directed this item closed; whether the live toggle itself has since been switched off was not independently re-verified from this repository (no Supabase dashboard access here) -- closure reflects the tracking item being resolved by founder decision, not a fresh repo-side confirmation of the toggle's current state |

## Tenant-Owned Meeting/Scheduling/Storage Connectors (built this session, Sprint SI-1)

| Connector | Doneness | Evidence |
|---|---|---|
| Zoom | 70% (redirect-URI blocker confirmed resolved; new scope blocker found) | **2026-08-07 live retest:** the authorize URL now shows the corrected `client_id` (`EqhNb7X8TyCvaSlZFtebg`), confirming the 2026-08-06 lockfile/deploy fix genuinely reached production and the earlier "Invalid redirect" cause is resolved. New blocker: Zoom rejected with "You cannot authorize General app 779 BETA... Invalid scope. Edit on web portal." -- this app likely needs its Scopes tab configured (classic `meeting:write`/`meeting:read` or Zoom's newer granular format, unconfirmed which from this environment). Full diagnosis in `src/services/integrations/connectorContract.ts` next to the `zoom` contract. |
| Google Calendar (+ Meet) | **90%** (live-confirmed for the founder's allowlisted account; Testing-mode 100-user cap still limits arbitrary pilot customers) | **2026-08-07 (A-75, closed for this instance):** founder screenshot shows a real `Google_calendar connected.` toast on `landing.triaxisventures.com/integrations` -- per `oauth/callback/route.ts`, only reachable after a genuine token exchange and DB write. Not 100%: a pilot customer outside the OAuth Client's Test users allowlist would still hit `Error 403: access_denied` until Google verification is completed (not started, not urgent per founder's own framing) |
| Google Drive | **90%** (same basis as Calendar) | **2026-08-07 (A-75, closed for this instance):** founder screenshot shows a real `Google_drive connected.` toast, same session as Calendar above. Same Testing-mode cap caveat applies |
| Gmail (connector, distinct from Gmail email/password sign-in) | **100%** (backend confirmed real end to end; UI feedback bug found, fixed, deployed, and confirmed via the founder's own live click-through) | **2026-08-06 (A-97, closed):** founder reported "Connect Gmail" looked like an endless sign-in loop. Direct production DB query (3 tables) confirmed the OAuth exchange, token vault write, and `integration_connections` upsert all genuinely succeed -- this was never a backend failure. Root cause: the UI never read the callback's `?status=connected` redirect or showed any connected-state indicator, so a real success looked identical to nothing happening. Fixed: new `/api/connectors/status` route, a real toast + persistent "Connected" badge in `IntegrationsSection.tsx`, and a truthful (was: unconditional) redirect status in the callback route. Code + 23/23 targeted tests + typecheck + lint + build all verified -- see `A97_GMAIL_OAUTH_CONNECTED_STATE_CLOSEOUT_2026_08_06.md`. **Verified:** founder's own live authenticated click-through on `landing.triaxisventures.com/integrations`, screenshot showing the green "Connected 6/8/2026" badge, "Reconnect Gmail" relabel, and "Gmail connected." toast all rendering together. Founder: "Ok done, close the issue." |
| Microsoft Teams | 0% | No credentials at all -- `MICROSOFT_CLIENT_ID`/`SECRET` unset. Code-complete, never tested |

## A-77 Connector Batch (added 2026-07-30, per founder-scoped YC RFS alignment work)

Not present in this matrix's earlier revisions -- these 7 connectors did not exist in the codebase
before 2026-07-30. Added here 2026-08-07 to stop this matrix silently omitting them.

| Connector | Doneness | Evidence |
|---|---|---|
| Google Sheets | **100%** | Live-tested 2026-08-02 and reconfirmed independently 2026-08-07 -- real `Google_sheets connected.` toast, real token exchange and DB write per `oauth/callback/route.ts` |
| Google Docs | **100%** | Live-tested and confirmed 2026-08-07 -- real `Google_docs connected.` toast. Previously only founder-stated ("works the same way" as Sheets, 2026-08-02) and not independently screenshotted; now independently confirmed |
| Google Slides | **100%** | Live-tested and confirmed 2026-08-07 -- real `Google_slides connected.` toast. Same upgrade from founder-stated to independently confirmed as Docs |
| WhatsApp Business | 65% (credentials set, login now completes, blocked one field short) | `META_APP_ID`/`META_APP_SECRET` confirmed set in production. **2026-08-07 live test (post-rename):** progressed past Meta's login screen (further than the 2026-08-02 attempt) and failed at the final redirect with Facebook's `URL Blocked: ... redirect URI is not whitelisted ... add all your app domains as Valid OAuth Redirect URIs.` This is the Facebook Login product's "Valid OAuth Redirect URIs" field specifically -- distinct from the earlier "App Domains" field found 2026-08-02. **Exact fix:** add `https://landing.triaxisventures.com/api/connectors/oauth/callback?provider=whatsapp_business` to that field in the Meta App Dashboard (app `2054328055214154`) and confirm Client/Web OAuth Login are on. Meta Business Suite Business Verification was "In review" as of 2026-08-02, status since not checked |
| Linear | 0% (credentials) | Code-complete (`connectorContract.ts`), zero production credentials -- `LINEAR_CLIENT_ID`/`_SECRET` never set |
| GitHub | 0% (credentials) | Code-complete, zero production credentials -- `GITHUB_CLIENT_ID`/`_SECRET` never set |
| X (Twitter) | 0% (credentials) | Code-complete (PKCE-required contract), zero production credentials -- `X_CLIENT_ID`/`_SECRET` never set |

## Productivity/CRM/Storage Connectors (pre-existing, `connectorContract.ts`)

All of these have real, tested-in-principle OAuth code from before this session, but **zero
credentials are currently set in production** for any of them -- confirmed via `vercel env ls`:

| Connector | Doneness | Evidence |
|---|---|---|
| Microsoft Outlook (email connector) | 0% (credentials) | No `MICROSOFT_CLIENT_ID`/`SECRET` set |
| Slack | 0% (credentials) | No `SLACK_CLIENT_ID`/`SECRET` set |
| Calendly | 0% (credentials) | No `CALENDLY_CLIENT_ID`/`SECRET` set |
| Airtable | 0% (credentials) | No `AIRTABLE_CLIENT_ID`/`SECRET` set |
| HubSpot | 0% (credentials) | No `HUBSPOT_CLIENT_ID`/`SECRET` set |
| Notion | 0% (credentials) | No `NOTION_CLIENT_ID`/`SECRET` set |

## Email Delivery

| System | Doneness | Evidence |
|---|---|---|
| Resend (app-level transactional email: invites, feedback) | Unconfirmed live | `RESEND_API_KEY` set in production; code path is real (not a stub), but no founder confirmation of a live successful send found in this session's record. Prior program history (A-08) noted delivery gaps in earlier sprints -- status since then not re-confirmed here |
| Elastic Mail (Supabase Auth SMTP: password reset, confirmation emails) | **Confirmed broken, Issue: Open** | Founder configured it, then tested "Forgot password" live -- failed immediately with "Unable to start password recovery." Root cause unconfirmed (see A-74); error-swallowing in our own code fixed same day so the next attempt is diagnosable via Vercel logs |

## Analytics/Telemetry

| System | Doneness | Evidence |
|---|---|---|
| PostHog | Unconfirmed live | `NEXT_PUBLIC_POSTHOG_TOKEN`/`_HOST`/`_KEY` all set in production. No founder confirmation of live event delivery found in this session's record |
| Mixpanel | Unconfirmed live | `NEXT_PUBLIC_MIXPANEL_TOKEN` set. Same caveat -- credential present, live delivery not confirmed this session |

## AI Provider

| System | Doneness | Evidence |
|---|---|---|
| OpenRouter | Unconfirmed live | `OPENROUTER_API_KEY` set in production. AI routing code exists and is unit-tested, but no founder confirmation of a real, live AI answer generated via this specific key found in this session's record |

## Enterprise "Bring Your Own Infra" Connectors (self-service, per-tenant credential form)

Architecturally ready (a real encrypted-credential-storage table, `enterprise_connector_credentials`,
and a settings-form save path exist), but **zero organizations have ever submitted credentials for
any of these** -- this is a different mechanism entirely from the OAuth connectors above (a manual
credential-entry form, not an OAuth redirect flow):

| System | Doneness |
|---|---|
| Auth0 (enterprise SSO) | 0% (built, never used) |
| ClickHouse | 0% (built, never used) |
| MSSQL | 0% (built, never used) |
| Snowflake | 0% (built, never used) |
| S3 | 0% (built, never used) |
| Paddle | 0% (built, never used) |
| Stripe | 0% (built, never used) |

## Not Found In This Codebase At All

- **Otter.ai / Fireflies.ai** -- no code, no catalogue entry, nothing. Would be net-new work if wanted.
- **Google Docs, Google Slides** -- not found anywhere (Google Sheets exists as a catalogue-only entry, see above; Docs/Slides do not).
- **Microsoft Office (Word/Excel/PowerPoint) broadly** -- not found anywhere.
- **Iceberg (data warehouse)** -- not found anywhere. Note: ClickHouse/Snowflake/MSSQL already exist as built-but-unused "bring your own infra" connectors (above); Iceberg is not one of them.

**Founder's business-model note on the Microsoft/Google document suite specifically:** these are
meant as "customer pays independently, we just allow integration" -- i.e., the tenant brings their
own Microsoft 365/Google Workspace subscription, and AXXESS TRIaxis only needs to facilitate the
connection, not license or pay for the underlying product itself. Worth keeping in mind if any of
Docs/Slides/Sheets/Office is scoped as future work -- it's a connect-only surface, not something
requiring AXXESS to hold its own Microsoft/Google enterprise agreement.

## Catalogue-Only, No Connect Flow Built Yet

From the wider plugin catalogue (`pluginRegistry.ts`), infrastructure-only entries with no real
OAuth contract or UI surface: Google Sheets, WhatsApp Business, Jira, Trello, Asana, Linear,
GitHub, Salesforce, Zoho CRM, DocuSign, Razorpay.

## Explicitly Out of Scope for This Matrix (Owner/Infra-Level, Not Product-Level)

**Wix (hosting, DNS)** -- founder's own note: this is owner-level infrastructure (domain
registrar/DNS), not a tenant-facing product integration. Not scored here.

## Summary

**Six** integrations meet the strict 100% bar today: **phone/SMS OTP sign-in via Twilio**,
**Google sign-in** (resolved same day, after three sequential defects were found and fixed),
**the Gmail connector** (2026-08-06, A-97 -- backend was always real; a UI feedback gap made it
look broken, fixed and founder-confirmed live), and **Google Sheets, Docs, and Slides**
(2026-08-07 -- all three independently live-tested with real `connected` toasts on production).
**Google Calendar and Drive** are close behind at 90% -- live-confirmed for the founder's own
allowlisted account (2026-08-07, A-75), but not counted at the full 100% bar since Google's
Testing-mode 100-user cap still blocks an arbitrary pilot customer outside that allowlist; closing
that gap requires completing Google's app-verification process, not further engineering work here.
**2026-08-06, permanently reconfirmed:** founder screenshots show the full live round trip on
production -- Google's own account chooser for `vnliomnfabaicvvvfwia.supabase.co`, then a
completed sign-in landing on `https://landing.triaxisventures.com/dashboard` with the real
Executive Dashboard fully loaded and authenticated (Super Admin, Triaxis Ventures). This is the
complete flow, not just the authorize-request stage -- **Google sign-in should be treated as
closed and not re-questioned in future sweeps** absent a new, specific, dated failure report.
Everything else is somewhere between "not configured at all" and "credentials complete, live test
in progress or actively failing" -- none of the rest has both a completed real-workflow use and
founder certification yet, including **Zoom** and **Google Calendar/Drive**, both of which reach a
real provider sign-in screen and both of which then fail at the same class of defect: the redirect
URL the app sends is correctly formed by this repo's code but rejected or mismatched on the
provider's own side (Zoom: "Invalid redirect" (4,700); Google: `redirect_uri_mismatch` then
Testing-mode `access_denied`). Both are one dashboard-side registration fix away from working, not
a code gap -- see the Zoom and Google Calendar/Drive rows above for the exact fix each needs.

**2026-08-06 correction:** a same-day founder-stated closure claiming Zoom met the 100% bar was
recorded here and then reopened the same day by a live screenshot showing the redirect-rejection
failure above. Left in this summary as a reminder that a founder-stated claim, however sincerely
given, can still be superseded by the next live test -- both should be trusted, but the more recent
direct evidence wins when they conflict.

**2026-08-06, later same day:** founder-stated Zoom is now resolved ("Zoom issue solved"), evidenced
by a screenshot of Zoom's own signed-in account page rather than the AXXESS-side connected-callback
landing page specifically. **Reopened again within the hour** -- a fresh screenshot of an actual
"Connect Zoom" click reproduced the identical failure. Root cause now confirmed and it changes the
whole picture: this was never really about Zoom Marketplace registration -- the live production
deployment is stale (last successful build predates the corrected `ZOOM_CLIENT_ID`, and every deploy
since has failed on the unrelated `@capacitor/app` lockfile bug), so the corrected credential
literally cannot reach production yet. See the Zoom row above and
`src/services/integrations/connectorContract.ts` for the full chain. Google Calendar/Drive remain
unresolved and untouched by this update.
