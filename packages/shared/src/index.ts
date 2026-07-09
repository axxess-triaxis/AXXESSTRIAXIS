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
