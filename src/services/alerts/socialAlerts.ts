export type SocialAlertProvider = "x" | "facebook" | "instagram" | "linkedin" | "threads" | "rss" | "manual" | "demo";

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
    // Instagram and Threads ride the same Meta Business credentials as Facebook (Meta's Graph API
    // is shared across these three surfaces) -- LinkedIn has no wired credential path anywhere in
    // this codebase yet, so it stays honestly unconfigured until a real connector is built.
    { provider: "instagram" as const, configured: Boolean(env.META_APP_ID && env.META_APP_SECRET && env.META_PAGE_ACCESS_TOKEN), mode: "provider-gated" },
    { provider: "linkedin" as const, configured: Boolean(env.LINKEDIN_CLIENT_ID && env.LINKEDIN_CLIENT_SECRET && env.LINKEDIN_ACCESS_TOKEN), mode: "provider-gated" },
    { provider: "threads" as const, configured: Boolean(env.META_APP_ID && env.META_APP_SECRET && env.THREADS_ACCESS_TOKEN), mode: "provider-gated" },
    { provider: "rss" as const, configured: true, mode: "fallback" },
    { provider: "manual" as const, configured: true, mode: "fallback" },
    { provider: "demo" as const, configured: true, mode: "demo" },
  ];
}

const demoAlertAccounts = [
  "State Health Directorate", "MSME Policy Cell", "Regional Innovation Fund", "Disaster Management Authority",
  "District Hospital Network", "UNICEF Field Office", "Treasury & Planning Department", "Emergency Management Cell",
  "North East Nursing Council", "Rural Clinics Association", "Ministry of Health and Family Welfare",
  "National Health Mission", "Press Trust of India (Health Desk)", "Assam State Disaster Management Authority",
];

const demoAlertTemplates: Array<{ topic: string; title: string; urgency: SocialAlert["urgency"]; sentiment: SocialAlert["sentiment"]; actionTargets: SocialAlert["actionTargets"] }> = [
  { topic: "healthcare funding", title: "State budget note references district oxygen resilience grants", urgency: "high", sentiment: "neutral", actionTargets: ["risk_item", "stakeholder_brief"] },
  { topic: "public procurement", title: "New MSME procurement preference may affect biomedical vendor scoring", urgency: "medium", sentiment: "neutral", actionTargets: ["task", "crm_note"] },
  { topic: "grant opportunity", title: "Grant window opened for hospital analytics and cold-chain monitoring", urgency: "medium", sentiment: "positive", actionTargets: ["stakeholder_brief"] },
  { topic: "field operations", title: "Flood advisory may affect district outreach visits", urgency: "high", sentiment: "negative", actionTargets: ["task", "risk_item"] },
  { topic: "immunization coverage", title: "District immunization coverage report flags a cold-chain gap", urgency: "high", sentiment: "negative", actionTargets: ["risk_item", "task"] },
  { topic: "maternal health", title: "Maternal referral turnaround improves after corridor pilot", urgency: "low", sentiment: "positive", actionTargets: ["stakeholder_brief"] },
  { topic: "vendor risk", title: "Biomedical equipment vendor flagged for delayed delivery", urgency: "medium", sentiment: "negative", actionTargets: ["task", "crm_note"] },
  { topic: "compliance", title: "Central audit circular updates procurement documentation requirements", urgency: "medium", sentiment: "neutral", actionTargets: ["task"] },
  { topic: "csr partnership", title: "CSR partner expresses interest in expanding rural diagnostics funding", urgency: "low", sentiment: "positive", actionTargets: ["stakeholder_brief", "crm_note"] },
  { topic: "workforce", title: "Community health worker enablement pilot reports strong early uptake", urgency: "low", sentiment: "positive", actionTargets: ["stakeholder_brief"] },
  { topic: "disease surveillance", title: "Fever cluster reported near a district border, monitoring escalated", urgency: "high", sentiment: "negative", actionTargets: ["risk_item", "task"] },
  { topic: "digital health", title: "Telehealth command center pilot cited in national digital health review", urgency: "low", sentiment: "positive", actionTargets: ["stakeholder_brief"] },
];

// A-96 (2026-08-04): each seeded alert is tagged with a real originating platform (Facebook, X,
// Instagram, LinkedIn, Threads) or "rss" -- reused here as the Miscellaneous bucket for circulars,
// Substack, and Medium posts, matching the founder's "not separate dashboards, one Miscellaneous
// style" direction -- instead of the flat "demo" provider every seeded alert previously carried.
const demoSocialProviderCycle: SocialAlertProvider[] = ["facebook", "x", "instagram", "linkedin", "threads", "rss"];

const demoMiscSources = [
  "PIB Press Release", "Ministry Circular Desk", "Health Policy Substack", "Public Health on Medium",
  "State Gazette Notification", "Sector Newsletter Digest",
];

// Deterministic, seeded generation so the investor demo always shows the same coherent stream
// across sessions (no randomness), while still reaching enterprise scale (~160 items).
export function getDemoSocialAlerts(): SocialAlert[] {
  const base = new Date("2026-07-10T08:30:00.000Z").getTime();
  return Array.from({ length: 160 }, (_, index) => {
    const template = demoAlertTemplates[index % demoAlertTemplates.length];
    const provider = demoSocialProviderCycle[index % demoSocialProviderCycle.length];
    const account = provider === "rss" ? demoMiscSources[index % demoMiscSources.length] : demoAlertAccounts[index % demoAlertAccounts.length];
    return {
      id: `alert-demo-${String(index + 1).padStart(3, "0")}`,
      provider,
      account,
      topic: template.topic,
      title: template.title,
      urgency: template.urgency,
      sentiment: template.sentiment,
      actionTargets: template.actionTargets,
      receivedAt: new Date(base - index * 6 * 60 * 60 * 1000).toISOString(),
    };
  });
}

