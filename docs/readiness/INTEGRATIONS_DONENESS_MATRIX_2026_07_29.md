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
| Email/password | 100% | Long-established, real accounts exist and sign in daily this session (`sudipta1213@gmail.com` and others) |
| **Phone/SMS OTP (Twilio)** | **100%** | Founder: **"Twilio - OTP works."** Supabase settings confirm `phone: true`, `sms_provider: "twilio"`. |
| **Google sign-in** | **100%** | Three sequential defects (redirect_uri_mismatch, Vercel Deployment Protection wall, Supabase credential-mapping error) all found and fixed same day. Founder confirmed a full Google sign-in now completes end to end. See A-26/A-73 |
| Microsoft sign-in | 0% | Confirmed disabled: `azure: false` in Supabase settings, no `MICROSOFT_CLIENT_ID`/`SECRET` set anywhere |
| Sign in with Zoom (Supabase's built-in social provider) | Unclear | Supabase settings show `zoom: true` -- but this is a *login-identity* provider, unrelated to the Zoom *connector* below. Never discussed as an intended feature; worth confirming whether this was deliberately enabled or should be turned off |

## Tenant-Owned Meeting/Scheduling/Storage Connectors (built this session, Sprint SI-1)

| Connector | Doneness | Evidence |
|---|---|---|
| Zoom | 60% | `ZOOM_CLIENT_ID`/`SECRET` set; founder live-tested "Connect Zoom" and the resulting Zoom sign-in URL confirms our authorize-request is correctly formed (right client_id, redirect_uri, state, scopes) -- Zoom accepted it. **Full round trip (sign-in + consent + landing back connected) not yet confirmed by the founder** |
| Google Calendar (+ Meet) | 30% | Credentials complete (`GOOGLE_CLIENT_ID`/`SECRET`/`AXXESS_TOKEN_VAULT_KEY` all set). `redirect_uri_mismatch` fix identified. **New blocker found same day, not yet fixed:** even once redirect URI is corrected, Google's own consent screen returns `Error 403: access_denied` -- the OAuth Client is in "Testing" publishing status with no Test users added. See A-75 |
| Google Drive | 30% | Same as Google Calendar -- same credentials, same two sequential blockers (`redirect_uri_mismatch`, then Google's Testing-mode access_denied), same fixes pending |
| Gmail (connector, distinct from Gmail email/password sign-in) | Unconfirmed | Pre-existing from before this session ("already real" per earlier program history), not re-tested live in this session. Given the same exact-match redirect URI requirement just discovered for Calendar/Drive, its own `?provider=gmail` redirect URI may or may not already be registered -- not verified either way this session |
| Microsoft Teams | 0% | No credentials at all -- `MICROSOFT_CLIENT_ID`/`SECRET` unset. Code-complete, never tested |

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

**Two** integrations meet the strict 100% bar today: **phone/SMS OTP sign-in via Twilio**, and
**Google sign-in** (resolved same day, after three sequential defects were found and fixed).
Everything else is somewhere between "not configured at all" and "credentials complete, live test
in progress or actively failing" -- none of the rest has both a completed real-workflow use and
founder certification yet, including Zoom and Google Calendar/Drive, which made real progress this
session but are not yet fully working end to end.
