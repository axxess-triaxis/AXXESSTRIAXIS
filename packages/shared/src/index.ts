export const axxessSectors = [
  "Government",
  "Healthcare",
  "NGO / non-profit",
  "MSME",
  "Startup",
  "Enterprise",
  "Consulting / advisory",
] as const;

export type AxxessSector = (typeof axxessSectors)[number];

export const axxessBetaRoles = [
  "Super Admin",
  "Organization Admin",
  "Executive",
  "Manager",
  "Employee",
  "Consultant",
  "Guest",
] as const;

export type AxxessBetaRole = (typeof axxessBetaRoles)[number];

export const sprint13AnalyticsEvents = [
  "app_opened",
  "sign_up_started",
  "sign_up_completed",
  "login_completed",
  "mfa_enrolled",
  "organization_created",
  "workspace_created",
  "invitation_sent",
  "document_uploaded",
  "rag_query_submitted",
  "rag_answer_generated",
  "prompt_submitted",
  "prompt_approved",
  "prompt_rejected",
  "task_created",
  "approval_requested",
  "report_exported",
  "beta_feedback_clicked",
  "account_deletion_started",
] as const;

export type Sprint13AnalyticsEvent = (typeof sprint13AnalyticsEvents)[number];

export const requiredOnboardingNotices = [
  "Terms of Service",
  "Privacy Policy",
  "AI Usage Notice",
  "Beta Disclaimer",
] as const;

export type RequiredOnboardingNotice = (typeof requiredOnboardingNotices)[number];

export const authCapabilityConfig = {
  twoFactorAuthEnabled: true,
  oauthEnabled: true,
  oauthProviders: ["google", "microsoft", "apple"] as const,
} as const;

export type OauthProvider = (typeof authCapabilityConfig.oauthProviders)[number];

export type ProductivityPlugin = {
  name: string;
  category: string;
  icon: string;
  // A-96 (2026-08-04): keyed to brandIcons.ts / LikenessIcon.tsx so investor-demo tiles can render
  // a real or likeness brand mark instead of the raw two-letter `icon` fallback above.
  brandId: string;
};

export const defaultProductivityPlugins: ProductivityPlugin[] = [
  { name: "Slack", category: "Communication", icon: "SL", brandId: "slack" },
  { name: "Microsoft Teams", category: "Communication", icon: "MT", brandId: "teams" },
  { name: "Google Workspace", category: "Productivity", icon: "GW", brandId: "google_drive" },
  { name: "Notion", category: "Knowledge", icon: "NO", brandId: "notion" },
  { name: "Jira", category: "Project Management", icon: "JR", brandId: "jira" },
  { name: "Asana", category: "Project Management", icon: "AS", brandId: "asana" },
  { name: "Trello", category: "Project Management", icon: "TR", brandId: "trello" },
  { name: "Zoom", category: "Meetings", icon: "ZM", brandId: "zoom" },
  { name: "DocuSign", category: "Approvals", icon: "DS", brandId: "docusign" },
  { name: "Dropbox", category: "Storage", icon: "DB", brandId: "dropbox" },
  // A-96 (2026-08-04): investor-demo catalogue expansion -- founder-requested integrations across
  // automation, accounting, financial data, trade finance, marketplaces, social listening, meeting
  // transcription, customer support, and AI video/agent categories. Catalogue entries only (same
  // treatment as every plugin above): a real or likeness brand mark and category placement, not a
  // live OAuth connector -- see docs/readiness for connector-readiness status per provider.
  { name: "Zapier", category: "Automation", icon: "ZP", brandId: "zapier" },
  { name: "QuickBooks", category: "Accounting", icon: "QB", brandId: "quickbooks" },
  { name: "Zoho Finance", category: "Accounting", icon: "ZF", brandId: "zoho_finance" },
  { name: "BUSY Accounting", category: "Accounting", icon: "BU", brandId: "busy_accounting" },
  { name: "ERPNext", category: "Accounting", icon: "EN", brandId: "erpnext" },
  { name: "MX Technologies", category: "Financial Data", icon: "MX", brandId: "mx_technologies" },
  { name: "Finicity", category: "Financial Data", icon: "FN", brandId: "finicity" },
  { name: "Akoya", category: "Financial Data", icon: "AK", brandId: "akoya" },
  { name: "Probe42", category: "Financial Data", icon: "P4", brandId: "probe42" },
  { name: "KredX", category: "Trade Finance", icon: "KX", brandId: "kredx" },
  { name: "Credlix", category: "Trade Finance", icon: "CX", brandId: "credlix" },
  { name: "Billmart", category: "Trade Finance", icon: "BM", brandId: "billmart" },
  { name: "M1xchange", category: "Trade Finance", icon: "M1", brandId: "m1xchange" },
  { name: "Amazon Seller", category: "Marketplaces", icon: "AZ", brandId: "amazon_seller" },
  { name: "Flipkart", category: "Marketplaces", icon: "FK", brandId: "flipkart" },
  { name: "Talkwalker", category: "Social Listening", icon: "TW", brandId: "talkwalker" },
  { name: "Otter.ai", category: "Meeting Transcription", icon: "OT", brandId: "otter" },
  { name: "Fireflies.ai", category: "Meeting Transcription", icon: "FF", brandId: "fireflies" },
  { name: "AWS Transcribe", category: "Meeting Transcription", icon: "AT", brandId: "transcribe" },
  { name: "Ada", category: "Customer Support", icon: "AD", brandId: "ada" },
  { name: "Intercom", category: "Customer Support", icon: "IC", brandId: "intercom" },
  { name: "HeyGen", category: "AI Video", icon: "HG", brandId: "heygen" },
  { name: "InVideo", category: "AI Video", icon: "IV", brandId: "invideo" },
  { name: "Runway", category: "AI Video", icon: "RW", brandId: "runway" },
  { name: "Synthesia", category: "AI Video", icon: "SY", brandId: "synthesia" },
  { name: "Creatify", category: "AI Video", icon: "CR", brandId: "creatify" },
  { name: "AKOOL", category: "AI Video", icon: "AO", brandId: "akool" },
  { name: "Haptic", category: "AI Agents", icon: "HP", brandId: "haptic" },
  { name: "Agentic.ai", category: "AI Agents", icon: "AG", brandId: "agentic_ai" },
  { name: "Hunar.ai", category: "AI Agents", icon: "HU", brandId: "hunar_ai" },
];
