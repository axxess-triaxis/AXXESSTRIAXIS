export type ProductivityPlugin = {
  id: string;
  name: string;
  category: "email" | "calendar" | "storage" | "messaging" | "project-management" | "crm" | "database" | "document" | "finance" | "social";
  useCases: string[];
  requiredScopes: string[];
  configured: boolean;
  // Whether this connector has a real, product-facing connect flow in this release (a working
  // OAuth/connector implementation a customer can actually use), vs. existing only as a Supabase
  // wrapper / infrastructure-level entry with no UI surface yet. Per the beta report's own
  // guidance ("2-3 integrations tied to pilot workflows, not a generic catalogue") and
  // PRE_DEMO_ACTIONABLES.md A15 -- do not present the full catalogue below as if every entry were
  // equally available.
  pilotEnabled: boolean;
  webhookSupport: boolean;
  requiredRoles: string[];
  auditEvents: string[];
};

const envMap: Record<string, string> = {
  gmail: "GOOGLE_CLIENT_ID",
  google_calendar: "GOOGLE_CLIENT_ID",
  zoom: "ZOOM_CLIENT_ID",
  google_drive: "GOOGLE_CLIENT_ID",
  outlook: "MICROSOFT_CLIENT_ID",
  teams: "MICROSOFT_CLIENT_ID",
  slack: "SLACK_CLIENT_ID",
  calendly: "CALENDLY_CLIENT_ID",
  whatsapp_business: "META_APP_ID",
  notion: "NOTION_CLIENT_ID",
  jira: "JIRA_CLIENT_ID",
  trello: "TRELLO_API_KEY",
  asana: "ASANA_CLIENT_ID",
  linear: "LINEAR_CLIENT_ID",
  github: "GITHUB_CLIENT_ID",
  hubspot: "HUBSPOT_CLIENT_ID",
  salesforce: "SALESFORCE_CLIENT_ID",
  zoho_crm: "ZOHO_CLIENT_ID",
  airtable: "AIRTABLE_CLIENT_ID",
  google_sheets: "GOOGLE_CLIENT_ID",
  google_docs: "GOOGLE_CLIENT_ID",
  google_slides: "GOOGLE_CLIENT_ID",
  x_twitter: "X_CLIENT_ID",
  docusign: "DOCUSIGN_INTEGRATION_KEY",
  razorpay: "RAZORPAY_KEY_ID",
};

const basePlugins: Omit<ProductivityPlugin, "configured">[] = [
  { id: "gmail", name: "Gmail", category: "email", useCases: ["stakeholder follow-up", "approval reminders"], requiredScopes: ["gmail.send", "gmail.readonly"], pilotEnabled: true, webhookSupport: true, requiredRoles: ["Organization Admin"], auditEvents: ["plugin.gmail.connected", "email.followup.sent"] },
  // Sprint SI-1 (2026-07-29): google_calendar, teams, and google_drive flipped from
  // infrastructure-only to pilot-enabled, and zoom added as a brand-new entry, per the founder's
  // request that every tenant be able to link their own Google Calendar/Meet, Google Drive, Zoom,
  // and Microsoft Teams -- see connectorContract.ts for the real OAuth contracts backing these.
  { id: "google_calendar", name: "Google Calendar", category: "calendar", useCases: ["review meetings", "field visits", "pilot kickoff calls (Google Meet)"], requiredScopes: ["calendar.events", "calendar.readonly"], pilotEnabled: true, webhookSupport: true, requiredRoles: ["Manager"], auditEvents: ["calendar.event.created"] },
  { id: "zoom", name: "Zoom", category: "calendar", useCases: ["pilot kickoff calls", "review meetings"], requiredScopes: ["meeting:write", "meeting:read"], pilotEnabled: true, webhookSupport: true, requiredRoles: ["Manager"], auditEvents: ["zoom.meeting.created"] },
  { id: "google_drive", name: "Google Drive", category: "storage", useCases: ["document import", "evidence sync"], requiredScopes: ["drive.readonly"], pilotEnabled: true, webhookSupport: true, requiredRoles: ["Organization Admin"], auditEvents: ["drive.document.imported"] },
  { id: "outlook", name: "Microsoft Outlook", category: "email", useCases: ["executive email", "meeting follow-up"], requiredScopes: ["Mail.Send"], pilotEnabled: true, webhookSupport: true, requiredRoles: ["Organization Admin"], auditEvents: ["outlook.message.sent"] },
  { id: "teams", name: "Microsoft Teams", category: "messaging", useCases: ["team notifications", "governance alerts", "pilot kickoff calls"], requiredScopes: ["OnlineMeetings.ReadWrite", "Calendars.ReadWrite"], pilotEnabled: true, webhookSupport: true, requiredRoles: ["Organization Admin"], auditEvents: ["teams.alert.sent", "teams.meeting.created"] },
  { id: "slack", name: "Slack", category: "messaging", useCases: ["ops alerts", "task notifications"], requiredScopes: ["chat:write", "channels:read"], pilotEnabled: true, webhookSupport: true, requiredRoles: ["Organization Admin"], auditEvents: ["slack.notification.sent"] },
  { id: "calendly", name: "Calendly", category: "calendar", useCases: ["review meeting scheduling", "stakeholder booking links"], requiredScopes: [], pilotEnabled: true, webhookSupport: true, requiredRoles: ["Manager"], auditEvents: ["calendly.event.created"] },
  // Connector batch (2026-07-30): founder-scoped immediate integration. linear/github/
  // google_sheets/whatsapp_business flipped to pilot-enabled; google_docs/google_slides/x_twitter
  // added new -- see connectorContract.ts for the real OAuth contracts backing these. WhatsApp
  // Business's contract note applies here too: OAuth credentials alone are not sufficient for a
  // working connection without Meta App Review + a provisioned WhatsApp Business Account.
  { id: "whatsapp_business", name: "WhatsApp Business", category: "messaging", useCases: ["field reminders", "stakeholder updates"], requiredScopes: ["whatsapp_business_management", "whatsapp_business_messaging"], pilotEnabled: true, webhookSupport: true, requiredRoles: ["Organization Admin"], auditEvents: ["whatsapp.message.queued"] },
  { id: "notion", name: "Notion", category: "document", useCases: ["knowledge import", "meeting notes"], requiredScopes: ["read_content"], pilotEnabled: true, webhookSupport: false, requiredRoles: ["Manager"], auditEvents: ["notion.page.imported"] },
  { id: "jira", name: "Jira", category: "project-management", useCases: ["issue sync", "delivery governance"], requiredScopes: ["read:jira-work", "write:jira-work"], pilotEnabled: false, webhookSupport: true, requiredRoles: ["Manager"], auditEvents: ["jira.issue.synced"] },
  { id: "trello", name: "Trello", category: "project-management", useCases: ["card import", "task migration"], requiredScopes: ["read", "write"], pilotEnabled: false, webhookSupport: true, requiredRoles: ["Manager"], auditEvents: ["trello.card.imported"] },
  { id: "asana", name: "Asana", category: "project-management", useCases: ["task sync", "portfolio migration"], requiredScopes: ["default"], pilotEnabled: false, webhookSupport: true, requiredRoles: ["Manager"], auditEvents: ["asana.task.synced"] },
  { id: "linear", name: "Linear", category: "project-management", useCases: ["engineering issue sync"], requiredScopes: ["read", "write"], pilotEnabled: true, webhookSupport: true, requiredRoles: ["Manager"], auditEvents: ["linear.issue.synced"] },
  { id: "github", name: "GitHub", category: "project-management", useCases: ["release tracking", "issue sync"], requiredScopes: ["repo", "read:org"], pilotEnabled: true, webhookSupport: true, requiredRoles: ["Organization Admin"], auditEvents: ["github.issue.synced"] },
  { id: "hubspot", name: "HubSpot", category: "crm", useCases: ["stakeholder CRM", "deal notes"], requiredScopes: ["crm.objects.contacts.read"], pilotEnabled: true, webhookSupport: true, requiredRoles: ["Executive"], auditEvents: ["hubspot.contact.synced"] },
  { id: "salesforce", name: "Salesforce", category: "crm", useCases: ["enterprise stakeholder sync"], requiredScopes: ["api"], pilotEnabled: false, webhookSupport: true, requiredRoles: ["Executive"], auditEvents: ["salesforce.record.synced"] },
  { id: "zoho_crm", name: "Zoho CRM", category: "crm", useCases: ["SME CRM sync"], requiredScopes: ["ZohoCRM.modules.ALL"], pilotEnabled: false, webhookSupport: true, requiredRoles: ["Executive"], auditEvents: ["zoho.record.synced"] },
  { id: "airtable", name: "Airtable", category: "database", useCases: ["pilot data import"], requiredScopes: ["data.records:read"], pilotEnabled: true, webhookSupport: false, requiredRoles: ["Manager"], auditEvents: ["airtable.records.imported"] },
  { id: "google_sheets", name: "Google Sheets", category: "database", useCases: ["district sheet import", "budget tracker"], requiredScopes: ["spreadsheets"], pilotEnabled: true, webhookSupport: false, requiredRoles: ["Manager"], auditEvents: ["sheets.range.imported"] },
  { id: "google_docs", name: "Google Docs", category: "document", useCases: ["policy document import", "briefing notes"], requiredScopes: ["documents"], pilotEnabled: true, webhookSupport: false, requiredRoles: ["Manager"], auditEvents: ["docs.document.imported"] },
  { id: "google_slides", name: "Google Slides", category: "document", useCases: ["stakeholder deck import", "board presentation sync"], requiredScopes: ["presentations"], pilotEnabled: true, webhookSupport: false, requiredRoles: ["Manager"], auditEvents: ["slides.deck.imported"] },
  { id: "x_twitter", name: "X (Twitter)", category: "social", useCases: ["public advisory posting", "stakeholder outreach"], requiredScopes: ["tweet.read", "tweet.write", "users.read"], pilotEnabled: true, webhookSupport: false, requiredRoles: ["Organization Admin"], auditEvents: ["x_twitter.post.published"] },
  { id: "docusign", name: "DocuSign", category: "document", useCases: ["approval packets", "contract signatures"], requiredScopes: ["signature"], pilotEnabled: false, webhookSupport: true, requiredRoles: ["Organization Admin"], auditEvents: ["docusign.envelope.sent"] },
  { id: "razorpay", name: "Razorpay", category: "finance", useCases: ["payment reconciliation", "grant disbursement hooks"], requiredScopes: ["payments:read"], pilotEnabled: false, webhookSupport: true, requiredRoles: ["Organization Admin"], auditEvents: ["razorpay.payment.reconciled"] },
];

export function getProductivityPluginRegistry(env: NodeJS.ProcessEnv = process.env): ProductivityPlugin[] {
  return basePlugins.map((plugin) => ({ ...plugin, configured: Boolean(env[envMap[plugin.id]]) }));
}

export function getIntegrationHealth(env: NodeJS.ProcessEnv = process.env) {
  const plugins = getProductivityPluginRegistry(env);
  return {
    total: plugins.length,
    configured: plugins.filter((plugin) => plugin.configured).length,
    pilotEnabled: plugins.filter((plugin) => plugin.pilotEnabled).length,
    webhookReady: plugins.filter((plugin) => plugin.webhookSupport).length,
  };
}

export function getPilotIntegrations(env: NodeJS.ProcessEnv = process.env): ProductivityPlugin[] {
  return getProductivityPluginRegistry(env).filter((plugin) => plugin.pilotEnabled);
}

export function getInfrastructureOnlyIntegrations(env: NodeJS.ProcessEnv = process.env): ProductivityPlugin[] {
  return getProductivityPluginRegistry(env).filter((plugin) => !plugin.pilotEnabled);
}

