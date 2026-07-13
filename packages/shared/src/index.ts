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
};

export const defaultProductivityPlugins: ProductivityPlugin[] = [
  { name: "Slack", category: "Communication", icon: "SL" },
  { name: "Microsoft Teams", category: "Communication", icon: "MT" },
  { name: "Google Workspace", category: "Productivity", icon: "GW" },
  { name: "Notion", category: "Knowledge", icon: "NO" },
  { name: "Jira", category: "Project Management", icon: "JR" },
  { name: "Asana", category: "Project Management", icon: "AS" },
  { name: "Trello", category: "Project Management", icon: "TR" },
  { name: "Zoom", category: "Meetings", icon: "ZM" },
  { name: "DocuSign", category: "Approvals", icon: "DS" },
  { name: "Dropbox", category: "Storage", icon: "DB" },
];
