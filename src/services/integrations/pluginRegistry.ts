export type ProductivityPlugin = {
  id: string;
  name: string;
  category: "email" | "calendar" | "storage" | "messaging" | "project-management" | "crm" | "database" | "document" | "finance";
  useCases: string[];
  requiredScopes: string[];
  configured: boolean;
  demoConnector: boolean;
  webhookSupport: boolean;
  requiredRoles: string[];
  auditEvents: string[];
};

const envMap: Record<string, string> = {
  gmail: "GOOGLE_CLIENT_ID",
  google_calendar: "GOOGLE_CLIENT_ID",
  google_drive: "GOOGLE_CLIENT_ID",
  outlook: "MICROSOFT_CLIENT_ID",
  teams: "MICROSOFT_CLIENT_ID",
  slack: "SLACK_CLIENT_ID",
  whatsapp_business: "WHATSAPP_BUSINESS_TOKEN",
  notion: "NOTION_CLIENT_ID",
  jira: "JIRA_CLIENT_ID",
  trello: "TRELLO_API_KEY",
  asana: "ASANA_CLIENT_ID",
  linear: "LINEAR_CLIENT_ID",
  github: "GITHUB_APP_ID",
  hubspot: "HUBSPOT_CLIENT_ID",
  salesforce: "SALESFORCE_CLIENT_ID",
  zoho_crm: "ZOHO_CLIENT_ID",
  airtable: "AIRTABLE_CLIENT_ID",
  google_sheets: "GOOGLE_CLIENT_ID",
  docusign: "DOCUSIGN_INTEGRATION_KEY",
  razorpay: "RAZORPAY_KEY_ID",
};

const basePlugins: Omit<ProductivityPlugin, "configured">[] = [
  { id: "gmail", name: "Gmail", category: "email", useCases: ["stakeholder follow-up", "approval reminders"], requiredScopes: ["gmail.send", "gmail.readonly"], demoConnector: true, webhookSupport: true, requiredRoles: ["Organization Admin"], auditEvents: ["plugin.gmail.connected", "email.followup.sent"] },
  { id: "google_calendar", name: "Google Calendar", category: "calendar", useCases: ["review meetings", "field visits"], requiredScopes: ["calendar.events"], demoConnector: true, webhookSupport: true, requiredRoles: ["Manager"], auditEvents: ["calendar.event.created"] },
  { id: "google_drive", name: "Google Drive", category: "storage", useCases: ["document import", "evidence sync"], requiredScopes: ["drive.readonly"], demoConnector: true, webhookSupport: true, requiredRoles: ["Organization Admin"], auditEvents: ["drive.document.imported"] },
  { id: "outlook", name: "Microsoft Outlook", category: "email", useCases: ["executive email", "meeting follow-up"], requiredScopes: ["Mail.Send"], demoConnector: true, webhookSupport: true, requiredRoles: ["Organization Admin"], auditEvents: ["outlook.message.sent"] },
  { id: "teams", name: "Microsoft Teams", category: "messaging", useCases: ["team notifications", "governance alerts"], requiredScopes: ["ChannelMessage.Send"], demoConnector: true, webhookSupport: true, requiredRoles: ["Organization Admin"], auditEvents: ["teams.alert.sent"] },
  { id: "slack", name: "Slack", category: "messaging", useCases: ["ops alerts", "task notifications"], requiredScopes: ["chat:write", "channels:read"], demoConnector: true, webhookSupport: true, requiredRoles: ["Organization Admin"], auditEvents: ["slack.notification.sent"] },
  { id: "whatsapp_business", name: "WhatsApp Business", category: "messaging", useCases: ["field reminders", "stakeholder updates"], requiredScopes: ["messages"], demoConnector: true, webhookSupport: true, requiredRoles: ["Organization Admin"], auditEvents: ["whatsapp.message.queued"] },
  { id: "notion", name: "Notion", category: "document", useCases: ["knowledge import", "meeting notes"], requiredScopes: ["read_content"], demoConnector: true, webhookSupport: false, requiredRoles: ["Manager"], auditEvents: ["notion.page.imported"] },
  { id: "jira", name: "Jira", category: "project-management", useCases: ["issue sync", "delivery governance"], requiredScopes: ["read:jira-work", "write:jira-work"], demoConnector: true, webhookSupport: true, requiredRoles: ["Manager"], auditEvents: ["jira.issue.synced"] },
  { id: "trello", name: "Trello", category: "project-management", useCases: ["card import", "task migration"], requiredScopes: ["read", "write"], demoConnector: true, webhookSupport: true, requiredRoles: ["Manager"], auditEvents: ["trello.card.imported"] },
  { id: "asana", name: "Asana", category: "project-management", useCases: ["task sync", "portfolio migration"], requiredScopes: ["default"], demoConnector: true, webhookSupport: true, requiredRoles: ["Manager"], auditEvents: ["asana.task.synced"] },
  { id: "linear", name: "Linear", category: "project-management", useCases: ["engineering issue sync"], requiredScopes: ["read", "write"], demoConnector: true, webhookSupport: true, requiredRoles: ["Manager"], auditEvents: ["linear.issue.synced"] },
  { id: "github", name: "GitHub", category: "project-management", useCases: ["release tracking", "issue sync"], requiredScopes: ["repo:read", "issues:write"], demoConnector: true, webhookSupport: true, requiredRoles: ["Organization Admin"], auditEvents: ["github.issue.synced"] },
  { id: "hubspot", name: "HubSpot", category: "crm", useCases: ["stakeholder CRM", "deal notes"], requiredScopes: ["crm.objects.contacts.read"], demoConnector: true, webhookSupport: true, requiredRoles: ["Executive"], auditEvents: ["hubspot.contact.synced"] },
  { id: "salesforce", name: "Salesforce", category: "crm", useCases: ["enterprise stakeholder sync"], requiredScopes: ["api"], demoConnector: true, webhookSupport: true, requiredRoles: ["Executive"], auditEvents: ["salesforce.record.synced"] },
  { id: "zoho_crm", name: "Zoho CRM", category: "crm", useCases: ["SME CRM sync"], requiredScopes: ["ZohoCRM.modules.ALL"], demoConnector: true, webhookSupport: true, requiredRoles: ["Executive"], auditEvents: ["zoho.record.synced"] },
  { id: "airtable", name: "Airtable", category: "database", useCases: ["pilot data import"], requiredScopes: ["data.records:read"], demoConnector: true, webhookSupport: true, requiredRoles: ["Manager"], auditEvents: ["airtable.records.imported"] },
  { id: "google_sheets", name: "Google Sheets", category: "database", useCases: ["district sheet import", "budget tracker"], requiredScopes: ["spreadsheets.readonly"], demoConnector: true, webhookSupport: false, requiredRoles: ["Manager"], auditEvents: ["sheets.range.imported"] },
  { id: "docusign", name: "DocuSign", category: "document", useCases: ["approval packets", "contract signatures"], requiredScopes: ["signature"], demoConnector: true, webhookSupport: true, requiredRoles: ["Organization Admin"], auditEvents: ["docusign.envelope.sent"] },
  { id: "razorpay", name: "Razorpay", category: "finance", useCases: ["payment reconciliation", "grant disbursement hooks"], requiredScopes: ["payments:read"], demoConnector: true, webhookSupport: true, requiredRoles: ["Organization Admin"], auditEvents: ["razorpay.payment.reconciled"] },
];

export function getProductivityPluginRegistry(env: NodeJS.ProcessEnv = process.env): ProductivityPlugin[] {
  return basePlugins.map((plugin) => ({ ...plugin, configured: Boolean(env[envMap[plugin.id]]) }));
}

export function getIntegrationHealth(env: NodeJS.ProcessEnv = process.env) {
  const plugins = getProductivityPluginRegistry(env);
  return {
    total: plugins.length,
    configured: plugins.filter((plugin) => plugin.configured).length,
    demoConnected: plugins.filter((plugin) => plugin.demoConnector).length,
    webhookReady: plugins.filter((plugin) => plugin.webhookSupport).length,
  };
}

