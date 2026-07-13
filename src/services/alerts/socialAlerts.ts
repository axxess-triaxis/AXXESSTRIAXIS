export type SocialAlertProvider = "x" | "facebook" | "rss" | "manual" | "demo";

export type SocialAlert = {
  id: string;
  provider: SocialAlertProvider;
  account: string;
  topic: string;
  title: string;
  urgency: "low" | "medium" | "high";
  sentiment: "positive" | "neutral" | "negative";
  actionTargets: Array<"task" | "crm_note" | "stakeholder_brief" | "risk_item">;
  receivedAt: string;
};

export type AlertRule = {
  id: string;
  keyword: string;
  account?: string;
  topic: string;
  urgency: SocialAlert["urgency"];
};

export function socialAlertsEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env.AXXESS_SOCIAL_ALERTS_ENABLED === "true";
}

export function getSocialAlertProviderStatus(env: NodeJS.ProcessEnv = process.env) {
  return [
    { provider: "x" as const, configured: Boolean(env.X_BEARER_TOKEN && env.X_API_KEY && env.X_API_SECRET), mode: "provider-gated" },
    { provider: "facebook" as const, configured: Boolean(env.META_APP_ID && env.META_APP_SECRET && env.META_PAGE_ACCESS_TOKEN), mode: "provider-gated" },
    { provider: "rss" as const, configured: true, mode: "fallback" },
    { provider: "manual" as const, configured: true, mode: "fallback" },
    { provider: "demo" as const, configured: true, mode: "demo" },
  ];
}

export function getDemoSocialAlerts(): SocialAlert[] {
  return [
    { id: "alert-health-budget", provider: "demo", account: "State Health Directorate", topic: "healthcare funding", title: "State budget note references district oxygen resilience grants", urgency: "high", sentiment: "neutral", actionTargets: ["risk_item", "stakeholder_brief"], receivedAt: "2026-07-10T08:30:00.000Z" },
    { id: "alert-msme-policy", provider: "demo", account: "MSME Policy Cell", topic: "public procurement", title: "New MSME procurement preference may affect biomedical vendor scoring", urgency: "medium", sentiment: "neutral", actionTargets: ["task", "crm_note"], receivedAt: "2026-07-10T07:45:00.000Z" },
    { id: "alert-funding", provider: "demo", account: "Regional Innovation Fund", topic: "grant opportunity", title: "Grant window opened for hospital analytics and cold-chain monitoring", urgency: "medium", sentiment: "positive", actionTargets: ["stakeholder_brief"], receivedAt: "2026-07-09T16:15:00.000Z" },
    { id: "alert-weather", provider: "demo", account: "Disaster Management Authority", topic: "field operations", title: "Flood advisory may affect Barpeta and Dhubri outreach visits", urgency: "high", sentiment: "negative", actionTargets: ["task", "risk_item"], receivedAt: "2026-07-09T12:05:00.000Z" },
  ];
}

