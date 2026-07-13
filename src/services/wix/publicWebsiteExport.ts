export type PublicWebsiteExport = Record<string, unknown>;

export const approvedWebsiteContent: Record<string, PublicWebsiteExport> = {
  "axxess-site-content": {
    product: "AXXESS by Triaxis Ventures",
    positioning: "AI-native institutional operating system for enterprise, government, healthcare, NGO, and consulting teams.",
    publicPages: ["overview", "security", "ai-capabilities", "integrations", "roadmap"],
  },
  "product-metrics": {
    release: "0.9.0-beta",
    sprint: 14,
    demoDocuments: 2200,
    demoProjects: 186,
    providerGatedIntegrations: 20,
  },
  roadmap: {
    current: "Sprint 14 AI-native platform layer",
    next: ["production provider keys", "staging RLS validation", "mobile store beta", "live social alert ingestion"],
  },
  integrations: {
    categories: ["email", "calendar", "storage", "messaging", "project-management", "crm", "document", "finance"],
    providerGated: true,
  },
  "ai-capabilities": {
    implemented: ["AI router fallback", "RAG contracts", "NLP registry", "human review flags"],
    providerGated: ["OpenAI", "Anthropic", "Gemini", "xAI", "Falcon", "Jais"],
  },
  "security-compliance": {
    posture: "tenant-aware, RLS-ready, audit-aware, human-in-the-loop",
    neverExport: ["secrets", "tenant data", "audit logs", "private RAG documents", "service-role keys"],
  },
};

const blockedKeys = ["secret", "token", "key", "password", "auditLog", "tenantData", "serviceRole"];

export function sanitizePublicWebsiteContent(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizePublicWebsiteContent);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !blockedKeys.some((blocked) => key.toLowerCase().includes(blocked.toLowerCase())))
        .map(([key, nested]) => [key, sanitizePublicWebsiteContent(nested)]),
    );
  }
  return value;
}

