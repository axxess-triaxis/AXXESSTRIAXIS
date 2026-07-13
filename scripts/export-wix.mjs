import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const outputDir = resolve(process.cwd(), "public", "website");

const approvedWebsiteContent = {
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

function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !blockedKeys.some((blocked) => key.toLowerCase().includes(blocked.toLowerCase())))
        .map(([key, nested]) => [key, sanitize(nested)]),
    );
  }
  return value;
}

await mkdir(outputDir, { recursive: true });
for (const [name, content] of Object.entries(approvedWebsiteContent)) {
  await writeFile(resolve(outputDir, `${name}.json`), `${JSON.stringify(sanitize(content), null, 2)}\n`, "utf8");
}

console.log(`Exported ${Object.keys(approvedWebsiteContent).length} Wix-safe public JSON files.`);

