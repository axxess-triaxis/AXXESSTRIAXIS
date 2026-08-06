import { extractKeywords, summarizeText } from "../nlp/localNlp";

export type ConnectorProviderId = "gmail" | "microsoft" | "slack" | "calendly" | "airtable" | "hubspot" | "notion" | "google_calendar" | "zoom" | "teams" | "google_drive" | "linear" | "github" | "google_sheets" | "whatsapp_business" | "google_docs" | "google_slides" | "x_twitter" | "threads" | "meta_business";
export type ConnectorStatus = "provider_gated" | "configured" | "connected" | "paused" | "error" | "revoked";

export type ConnectorContract = {
  providerId: ConnectorProviderId;
  displayName: string;
  category: "email" | "messaging" | "calendar" | "database" | "crm" | "document" | "storage" | "project-management" | "social";
  authType: "oauth2";
  authorizationUrl: string;
  tokenUrl: string;
  requiredScopes: string[];
  webhookSupported: boolean;
  tenantOwned: true;
  auditEvents: string[];
  // Airtable's OAuth requires a PKCE code_challenge/code_verifier pair -- see buildConnectorOAuthUrl
  // and oauthProvider.ts's exchangeOAuthCode, which both branch on this flag.
  requiresPkce?: boolean;
  // Notion's token endpoint requires the client credentials as an HTTP Basic Auth header and a
  // JSON (not form-urlencoded) request body, unlike every other provider here -- see
  // oauthProvider.ts's exchangeOAuthCode.
  tokenRequestStyle?: "form" | "json-basic-auth";
};

export type SelectedEmailImport = {
  providerId: ConnectorProviderId;
  messageId?: string;
  sourceLink?: string;
  from: string;
  subject: string;
  receivedAt?: string;
  bodyText: string;
};

export type EmailImportPreview = {
  summary: string;
  tasks: string[];
  decisions: string[];
  stakeholders: string[];
  tags: string[];
};

const connectorContracts: Record<ConnectorProviderId, ConnectorContract> = {
  gmail: {
    providerId: "gmail",
    displayName: "Gmail",
    category: "email",
    authType: "oauth2",
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    requiredScopes: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.metadata",
    ],
    webhookSupported: true,
    tenantOwned: true,
    auditEvents: ["connector.gmail.oauth.started", "connector.gmail.email.previewed", "connector.gmail.email.imported"],
  },
  microsoft: {
    providerId: "microsoft",
    displayName: "Microsoft Outlook",
    category: "email",
    authType: "oauth2",
    authorizationUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    requiredScopes: ["offline_access", "User.Read", "Mail.Read"],
    webhookSupported: true,
    tenantOwned: true,
    auditEvents: ["connector.microsoft.oauth.started", "connector.microsoft.email.previewed", "connector.microsoft.email.imported"],
  },
  slack: {
    providerId: "slack",
    displayName: "Slack",
    category: "messaging",
    authType: "oauth2",
    authorizationUrl: "https://slack.com/oauth/v2/authorize",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    requiredScopes: ["chat:write", "channels:read"],
    webhookSupported: true,
    tenantOwned: true,
    auditEvents: ["connector.slack.oauth.started", "connector.slack.oauth.connected", "connector.slack.notification.sent"],
  },
  calendly: {
    providerId: "calendly",
    displayName: "Calendly",
    category: "calendar",
    authType: "oauth2",
    authorizationUrl: "https://auth.calendly.com/oauth/authorize",
    tokenUrl: "https://auth.calendly.com/oauth/token",
    // Calendly's OAuth grants access to the connected user's whole scheduling account rather
    // than discrete scopes -- there is no scope parameter to request. Kept as an empty array
    // (not omitted) so every consumer of requiredScopes (audit logging, the Settings UI) stays
    // correct without a special case.
    requiredScopes: [],
    webhookSupported: true,
    tenantOwned: true,
    auditEvents: ["connector.calendly.oauth.started", "connector.calendly.oauth.connected", "connector.calendly.event.created"],
  },
  airtable: {
    providerId: "airtable",
    displayName: "Airtable",
    category: "database",
    authType: "oauth2",
    authorizationUrl: "https://airtable.com/oauth2/v1/authorize",
    tokenUrl: "https://airtable.com/oauth2/v1/token",
    requiredScopes: ["data.records:read", "schema.bases:read"],
    webhookSupported: false,
    tenantOwned: true,
    requiresPkce: true,
    auditEvents: ["connector.airtable.oauth.started", "connector.airtable.oauth.connected", "connector.airtable.records.imported"],
  },
  hubspot: {
    providerId: "hubspot",
    displayName: "HubSpot",
    category: "crm",
    authType: "oauth2",
    authorizationUrl: "https://app.hubspot.com/oauth/authorize",
    tokenUrl: "https://api.hubapi.com/oauth/v1/token",
    requiredScopes: ["crm.objects.contacts.read"],
    webhookSupported: true,
    tenantOwned: true,
    auditEvents: ["connector.hubspot.oauth.started", "connector.hubspot.oauth.connected", "connector.hubspot.contact.synced"],
  },
  notion: {
    providerId: "notion",
    displayName: "Notion",
    category: "document",
    authType: "oauth2",
    authorizationUrl: "https://api.notion.com/v1/oauth/authorize",
    tokenUrl: "https://api.notion.com/v1/oauth/token",
    // Notion's OAuth grants access to the specific pages/databases the user selects during
    // consent rather than discrete scopes -- same shape as Calendly's empty requiredScopes.
    requiredScopes: [],
    webhookSupported: false,
    tenantOwned: true,
    tokenRequestStyle: "json-basic-auth",
    auditEvents: ["connector.notion.oauth.started", "connector.notion.oauth.connected", "connector.notion.page.imported"],
  },
  // Tenant-owned meeting/scheduling connectors, per the founder's request that each tenant link
  // their own Google Calendar/Meet, Zoom, and Microsoft Teams rather than a single Triaxis-owned
  // Calendly link. Reuses the same generic OAuth engine as every provider above -- no route or
  // schema change was needed (oauth_token_vault/integration_connections store provider_id as
  // free text, not an enum).
  google_calendar: {
    providerId: "google_calendar",
    displayName: "Google Calendar",
    category: "calendar",
    authType: "oauth2",
    // Same Google OAuth endpoints and client credentials as gmail -- one Google Cloud OAuth app
    // covers multiple scopes/products, matching pluginRegistry.ts's existing envMap (both map to
    // GOOGLE_CLIENT_ID already).
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    // calendar.events covers creating/editing events (Google Meet links are attached automatically
    // via conferenceData when creating an event -- there is no separate Meet-only OAuth scope).
    requiredScopes: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.readonly",
    ],
    webhookSupported: true,
    tenantOwned: true,
    auditEvents: ["connector.google_calendar.oauth.started", "connector.google_calendar.oauth.connected", "connector.google_calendar.event.created"],
  },
  zoom: {
    providerId: "zoom",
    displayName: "Zoom",
    category: "calendar",
    authType: "oauth2",
    authorizationUrl: "https://zoom.us/oauth/authorize",
    tokenUrl: "https://zoom.us/oauth/token",
    // NOTE: Zoom's exact granular scope strings have changed across API versions -- confirm these
    // against the Zoom App Marketplace's current scope list for the specific app type registered
    // (Server-to-Server OAuth vs. General OAuth) before this goes live. Not independently verified
    // against live Zoom docs in this change.
    // 2026-08-06: partially checked against Zoom's live developer docs
    // (developers.zoom.us/docs/integrations/oauth-scopes/) -- Zoom confirms "existing apps will
    // continue to use the previously available macro scopes, now called classic scopes," meaning
    // the broad "meeting:write"/"meeting:read" strings below remain valid for apps already
    // registered on classic scopes.
    // 2026-08-06 (same day, later): a founder-stated claim that this workflow was already fully
    // checked end-to-end was recorded here, then CONTRADICTED within the same session by a live
    // screenshot: the actual OAuth flow reaches Zoom's login, the user signs in successfully, and
    // Zoom then rejects with "Invalid redirect: https://landing.triaxisventures.com/api/connectors/
    // oauth/callback?provider=zoom (4,700)". This is not a scope-format issue (that specific
    // concern, checked separately, still stands per the paragraph above) -- it is Zoom refusing the
    // redirect_uri itself. Root-caused from this repo's side: buildConnectorOAuthUrl() (below in
    // this file) constructs redirect_uri as `${NEXT_PUBLIC_APP_URL}/api/connectors/oauth/callback?
    // provider=zoom`, and NEXT_PUBLIC_APP_URL is confirmed via `vercel env pull --environment=
    // production` to be exactly `https://landing.triaxisventures.com` -- i.e. the app is sending
    // precisely the URL the screenshot shows Zoom rejecting. This code has not changed since it was
    // built, so the most likely cause is that this exact URL (including the `?provider=zoom` query
    // string) is not registered as an allowed OAuth Redirect URL on the Zoom App Marketplace app
    // itself -- a Zoom-dashboard-side registration gap, not independently confirmed since this
    // repository has no Zoom Marketplace access. **Exact HITL action needed:** Zoom App Marketplace
    // -> Develop -> the app with client ID `EqhNb7X8TyCvaSlZFtebg` (founder-stated 2026-08-06 as the
    // correct client ID for this integration -- note this differs from `pwdEZP8NTEy_JUvBYAoTBg`,
    // the client_id that appeared in the live browser URL bar during the earlier reproduction of
    // this bug; not reconciled from this repository, since ZOOM_CLIENT_ID's actual production value
    // cannot be read from here -- HITL should confirm which app the production credential points at
    // before editing redirect URLs) -> App Credentials/OAuth -> Redirect URL for OAuth -> add
    // exactly `https://landing.triaxisventures.com/api/connectors/oauth/callback?provider=zoom`
    // (protocol, host, path, and query string all exact) -> Save, then retest "Connect Zoom" end to
    // end. Status downgraded back to open pending that fix.
    // 2026-08-06, later same day -- founder-stated resolved, then REOPENED within the hour by a
    // fresh screenshot of the actual "Connect Zoom" click from Settings > Integrations: identical
    // failure, identical client_id (`pwdEZP8NTEy_JUvBYAoTBg`, not `EqhNb7X8TyCvaSlZFtebg`).
    // **Root cause now confirmed, and it is not a Zoom Marketplace registration problem at all:**
    // `npx vercel inspect landing.triaxisventures.com` shows the live deployment
    // (`dpl_8pVFjyM7TQc6qwR34ToDPwdp5SVU`) was built 2026-08-05 11:58 IST -- the same "last
    // successful deploy" already identified in `docs/AUTOMATION_OVERVIEW.md`'s lockfile-bug note.
    // Vercel bakes non-`NEXT_PUBLIC_` env vars into the deployment at build time; updating
    // `ZOOM_CLIENT_ID` in the dashboard does not change what an already-built deployment sends until
    // a new deployment succeeds. Every deployment attempt since 2026-08-05 has failed on the
    // `@capacitor/app` lockfile mismatch. So the live site is still running the old client_id
    // regardless of what Vercel's env var currently holds -- **this will not be fixable by editing
    // Zoom Marketplace redirect URLs until the lockfile bug is fixed and a fresh deploy succeeds.**
    // Tracked together with the lockfile fix (background task `task_7f4d6851`), not as a separate
    // item. Status: reopened.
    requiredScopes: ["meeting:write", "meeting:read"],
    webhookSupported: true,
    tenantOwned: true,
    auditEvents: ["connector.zoom.oauth.started", "connector.zoom.oauth.connected", "connector.zoom.meeting.created"],
  },
  teams: {
    providerId: "teams",
    displayName: "Microsoft Teams",
    category: "messaging",
    authType: "oauth2",
    // Same Microsoft Entra OAuth endpoints and client credentials as the "microsoft" (Outlook)
    // contract -- one Entra app registration can request multiple Graph scopes, matching
    // pluginRegistry.ts's existing envMap (both map to MICROSOFT_CLIENT_ID already). Requesting
    // Teams-meeting scopes here, distinct from "microsoft"'s Mail.Read, since a tenant may connect
    // one without the other.
    authorizationUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    requiredScopes: ["offline_access", "OnlineMeetings.ReadWrite", "Calendars.ReadWrite"],
    webhookSupported: true,
    tenantOwned: true,
    auditEvents: ["connector.teams.oauth.started", "connector.teams.oauth.connected", "connector.teams.meeting.created"],
  },
  google_drive: {
    providerId: "google_drive",
    displayName: "Google Drive",
    category: "storage",
    authType: "oauth2",
    // Same Google OAuth app/client credentials as gmail and google_calendar.
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    requiredScopes: ["https://www.googleapis.com/auth/drive.readonly"],
    webhookSupported: true,
    tenantOwned: true,
    auditEvents: ["connector.google_drive.oauth.started", "connector.google_drive.oauth.connected", "connector.google_drive.document.imported"],
  },
  // Connector batch (2026-07-30): founder-scoped immediate integration of Linear, GitHub, Google
  // Sheets/Docs/Slides, WhatsApp Business, and X. All reuse this same generic, provider-agnostic
  // OAuth engine -- no route or schema change needed, same as the Sprint SI-1 batch above.
  linear: {
    providerId: "linear",
    displayName: "Linear",
    category: "project-management",
    authType: "oauth2",
    authorizationUrl: "https://linear.app/oauth/authorize",
    tokenUrl: "https://api.linear.app/oauth/token",
    requiredScopes: ["read", "write"],
    webhookSupported: true,
    tenantOwned: true,
    auditEvents: ["connector.linear.oauth.started", "connector.linear.oauth.connected", "connector.linear.issue.synced"],
  },
  github: {
    providerId: "github",
    displayName: "GitHub",
    category: "project-management",
    authType: "oauth2",
    authorizationUrl: "https://github.com/login/oauth/authorize",
    // GitHub's token endpoint returns application/x-www-form-urlencoded by default -- it only
    // returns JSON when the request sends `Accept: application/json`, which exchangeOAuthCode now
    // sends on every "form"-style request (harmless for every other provider here, all of which
    // already return JSON regardless).
    tokenUrl: "https://github.com/login/oauth/access_token",
    requiredScopes: ["repo", "read:org"],
    webhookSupported: true,
    tenantOwned: true,
    auditEvents: ["connector.github.oauth.started", "connector.github.oauth.connected", "connector.github.issue.synced"],
  },
  google_sheets: {
    providerId: "google_sheets",
    displayName: "Google Sheets",
    category: "database",
    authType: "oauth2",
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    // Full read-write (not .readonly): founder wants editability -- writing back into a connected
    // sheet (e.g. budget tracker updates), not just importing.
    requiredScopes: ["https://www.googleapis.com/auth/spreadsheets"],
    webhookSupported: false,
    tenantOwned: true,
    auditEvents: ["connector.google_sheets.oauth.started", "connector.google_sheets.oauth.connected", "connector.google_sheets.range.imported"],
  },
  google_docs: {
    providerId: "google_docs",
    displayName: "Google Docs",
    category: "document",
    authType: "oauth2",
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    // Full read-write (not .readonly): founder wants editability, not just import.
    requiredScopes: ["https://www.googleapis.com/auth/documents"],
    webhookSupported: false,
    tenantOwned: true,
    auditEvents: ["connector.google_docs.oauth.started", "connector.google_docs.oauth.connected", "connector.google_docs.document.imported"],
  },
  google_slides: {
    providerId: "google_slides",
    displayName: "Google Slides",
    category: "document",
    authType: "oauth2",
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    // Full read-write (not .readonly): founder wants editability, not just import.
    requiredScopes: ["https://www.googleapis.com/auth/presentations"],
    webhookSupported: false,
    tenantOwned: true,
    auditEvents: ["connector.google_slides.oauth.started", "connector.google_slides.oauth.connected", "connector.google_slides.deck.imported"],
  },
  // NOTE: WhatsApp Business is wired into the same generic OAuth engine for consistency, but a
  // real, working connection needs substantially more than this app registering OAuth credentials
  // -- Meta requires App Review approval for the whatsapp_business_management/
  // whatsapp_business_messaging permissions before any tenant beyond Meta-approved Test Users can
  // connect, plus a verified Meta Business Manager and a provisioned WhatsApp Business Account
  // (WABA) with its own phone number. This contract alone does not make WhatsApp Business usable
  // in production -- flagged the same way Zoom's unverified scope strings were flagged in Sprint
  // SI-1, not overclaimed as complete.
  whatsapp_business: {
    providerId: "whatsapp_business",
    displayName: "WhatsApp Business",
    category: "messaging",
    authType: "oauth2",
    authorizationUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    requiredScopes: ["whatsapp_business_management", "whatsapp_business_messaging"],
    webhookSupported: true,
    tenantOwned: true,
    auditEvents: ["connector.whatsapp_business.oauth.started", "connector.whatsapp_business.oauth.connected", "connector.whatsapp_business.message.queued"],
  },
  x_twitter: {
    providerId: "x_twitter",
    displayName: "X (Twitter)",
    category: "social",
    authType: "oauth2",
    // X mandates PKCE for OAuth 2.0 user-context authorization -- same requiresPkce branch as
    // Airtable, no special-casing needed in oauthProvider.ts.
    authorizationUrl: "https://x.com/i/oauth2/authorize",
    tokenUrl: "https://api.x.com/2/oauth2/token",
    requiredScopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
    webhookSupported: false,
    tenantOwned: true,
    requiresPkce: true,
    auditEvents: ["connector.x_twitter.oauth.started", "connector.x_twitter.oauth.connected", "connector.x_twitter.post.published"],
  },
  // Threads uses its own, distinct Meta Developer app credentials (THREADS_APP_ID/SECRET) --
  // separate from the Meta App backing whatsapp_business/meta_business below, confirmed via the
  // founder's own Threads app-ID panel screenshot. Authorize domain (threads.net) and token domain
  // (graph.threads.net) differ, same pattern already proven working by whatsapp_business's
  // www.facebook.com/graph.facebook.com split -- no engine change needed. NOTE: exact scope strings
  // not independently verified against live Threads API docs -- same honesty flag as Zoom's scopes
  // above; confirm before this goes live for a real tenant.
  threads: {
    providerId: "threads",
    displayName: "Threads",
    category: "social",
    authType: "oauth2",
    authorizationUrl: "https://threads.net/oauth/authorize",
    tokenUrl: "https://graph.threads.net/oauth/access_token",
    requiredScopes: ["threads_basic", "threads_content_publish", "threads_manage_replies", "threads_read_replies", "threads_manage_insights"],
    webhookSupported: false,
    tenantOwned: true,
    auditEvents: ["connector.threads.oauth.started", "connector.threads.oauth.connected", "connector.threads.content.synced"],
  },
  // Meta Business Suite: business assets, Pages/Instagram content publishing, Ads Manager
  // campaigns/promotions, and community engagement -- founder-confirmed standing requirement,
  // distinct from whatsapp_business's narrower messaging-only scope. Reuses the SAME Meta App
  // (META_APP_ID/SECRET) as whatsapp_business, per this file's existing oauthClientIdEnvVar
  // comment anticipating exactly this connector. Most of these scopes (pages_manage_posts,
  // ads_management, instagram_content_publish) require Meta App Review approval before any tenant
  // beyond Meta-approved Test Users can use them, and a verified Meta Business Manager -- same
  // "contract alone does not make this usable in production" caveat as whatsapp_business above.
  // webhookSupported is true because Meta does support Page/Instagram webhooks technically, but no
  // receiver is built for this provider yet -- do not infer live webhook delivery from this flag.
  meta_business: {
    providerId: "meta_business",
    displayName: "Meta Business Suite",
    category: "social",
    authType: "oauth2",
    authorizationUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    requiredScopes: ["business_management", "pages_show_list", "pages_read_engagement", "pages_manage_posts", "pages_manage_engagement", "instagram_basic", "instagram_content_publish", "instagram_manage_comments", "ads_management", "ads_read"],
    webhookSupported: true,
    tenantOwned: true,
    auditEvents: ["connector.meta_business.oauth.started", "connector.meta_business.oauth.connected", "connector.meta_business.content.synced", "connector.meta_business.campaign.synced"],
  },
};

function sentenceCandidates(text: string, match: RegExp) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 12 && match.test(sentence))
    .slice(0, 5);
}

function stakeholderCandidates(input: SelectedEmailImport) {
  const fromName = input.from.split("<")[0]?.trim().replace(/^"|"$/g, "");
  const capitalized = input.bodyText.match(/\b(?:Dr|Sri|Smt|Prof|Mr|Ms)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}/g) ?? [];
  return [...new Set([fromName, ...capitalized].filter((item): item is string => Boolean(item && item.length > 2)))].slice(0, 6);
}

export function getConnectorContract(providerId: string): ConnectorContract | undefined {
  return connectorContracts[providerId as ConnectorProviderId];
}

const oauthClientIdEnvVar: Record<ConnectorProviderId, string> = {
  gmail: "GOOGLE_CLIENT_ID",
  microsoft: "MICROSOFT_CLIENT_ID",
  slack: "SLACK_CLIENT_ID",
  calendly: "CALENDLY_CLIENT_ID",
  airtable: "AIRTABLE_CLIENT_ID",
  hubspot: "HUBSPOT_CLIENT_ID",
  notion: "NOTION_CLIENT_ID",
  google_calendar: "GOOGLE_CLIENT_ID",
  zoom: "ZOOM_CLIENT_ID",
  teams: "MICROSOFT_CLIENT_ID",
  google_drive: "GOOGLE_CLIENT_ID",
  linear: "LINEAR_CLIENT_ID",
  github: "GITHUB_CLIENT_ID",
  google_sheets: "GOOGLE_CLIENT_ID",
  google_docs: "GOOGLE_CLIENT_ID",
  google_slides: "GOOGLE_CLIENT_ID",
  // Shared Meta App credentials (client ID) -- one Meta App backs WhatsApp Business today and the
  // full Meta Business Suite (Pages/Instagram/Ads/community engagement) planned next, same pattern
  // as GOOGLE_CLIENT_ID being shared across every Google-based connector above. Deliberately not
  // WHATSAPP_BUSINESS_CLIENT_ID -- founder-directed naming, matching what socialAlerts.ts already
  // expects for the same Meta App.
  whatsapp_business: "META_APP_ID",
  x_twitter: "X_CLIENT_ID",
  // Threads has its own, distinct Meta Developer app -- not the same META_APP_ID as
  // whatsapp_business/meta_business. See the threads contract comment above.
  threads: "THREADS_APP_ID",
  meta_business: "META_APP_ID",
};

export function buildConnectorOAuthUrl(
  providerId: ConnectorProviderId,
  state: string,
  env: NodeJS.ProcessEnv = process.env,
  pkce?: { codeChallenge: string },
) {
  const contract = connectorContracts[providerId];
  const clientId = env[oauthClientIdEnvVar[providerId]];
  const appUrl = env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!clientId || !appUrl) return undefined;
  if (contract.requiresPkce && !pkce?.codeChallenge) return undefined;

  const url = new URL(contract.authorizationUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", `${appUrl}/api/connectors/oauth/callback?provider=${providerId}`);
  url.searchParams.set("response_type", "code");
  if (contract.requiredScopes.length > 0) {
    url.searchParams.set("scope", contract.requiredScopes.join(" "));
  }
  url.searchParams.set("state", state);
  if (contract.requiresPkce && pkce) {
    url.searchParams.set("code_challenge", pkce.codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
  }
  // Offline access + forced consent are Google-specific OAuth extensions; sending them to
  // other providers' authorization endpoints isn't meaningful and could be rejected.
  if (providerId === "gmail" || providerId === "google_calendar" || providerId === "google_drive" || providerId === "google_sheets" || providerId === "google_docs" || providerId === "google_slides") {
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
  }
  return url.toString();
}

export function previewSelectedEmailImport(input: SelectedEmailImport): EmailImportPreview {
  const normalized = `${input.subject}. ${input.bodyText}`.replace(/\s+/g, " ").trim();
  return {
    summary: summarizeText(normalized, 2),
    tasks: sentenceCandidates(normalized, /\b(please|submit|prepare|send|complete|follow up|review|schedule|share|confirm)\b/i),
    decisions: sentenceCandidates(normalized, /\b(approved|decided|confirmed|rejected|deferred|agreed|resolved)\b/i),
    stakeholders: stakeholderCandidates(input),
    tags: extractKeywords(normalized, 6),
  };
}
