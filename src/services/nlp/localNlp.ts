export type SupportedLanguage = "english" | "assamese" | "bengali" | "hindi" | "mixed" | "unknown";

export type EntityExtraction = {
  people: string[];
  organizations: string[];
  locations: string[];
  dates: string[];
  money: string[];
};

export type DocumentClassification =
  | "policy"
  | "hospital-sop"
  | "public-health-report"
  | "budget"
  | "procurement"
  | "meeting-minutes"
  | "grant"
  | "compliance"
  | "stakeholder-brief"
  | "risk-register"
  | "implementation-plan"
  | "audit"
  | "monitoring-evaluation"
  | "csr"
  | "dashboard"
  | "vendor-onboarding"
  | "general";

const stopWords = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "into",
  "will",
  "are",
  "was",
  "were",
  "has",
  "have",
  "health",
  "mission",
  "north",
  "east",
  "document",
  "report",
  "review",
]);

const classificationRules: Array<{ classification: DocumentClassification; terms: string[] }> = [
  { classification: "policy", terms: ["policy", "directive", "governance", "mission order"] },
  { classification: "hospital-sop", terms: ["sop", "standard operating procedure", "triage", "ward", "infection control"] },
  { classification: "public-health-report", terms: ["surveillance", "public health", "outbreak", "immunization", "maternal"] },
  { classification: "budget", terms: ["budget", "variance", "finance", "grant utilization"] },
  { classification: "procurement", terms: ["procurement", "tender", "vendor scoring", "award recommendation"] },
  { classification: "meeting-minutes", terms: ["minutes", "meeting", "action owner", "decision"] },
  { classification: "grant", terms: ["grant proposal", "funding", "donor", "proposal"] },
  { classification: "compliance", terms: ["compliance", "checklist", "control", "statutory"] },
  { classification: "stakeholder-brief", terms: ["stakeholder", "brief", "secretariat", "community partner"] },
  { classification: "risk-register", terms: ["risk register", "severity", "mitigation", "residual"] },
  { classification: "implementation-plan", terms: ["implementation", "rollout", "milestone", "training"] },
  { classification: "audit", terms: ["audit", "observation", "management response", "closure"] },
  { classification: "monitoring-evaluation", terms: ["monitoring", "evaluation", "indicator", "outcome"] },
  { classification: "csr", terms: ["csr", "partnership", "corporate social responsibility"] },
  { classification: "dashboard", terms: ["dashboard", "metric", "analytics", "sla"] },
  { classification: "vendor-onboarding", terms: ["vendor onboarding", "bank details", "service scope", "credential"] },
];

const localLocations = [
  "Kamrup",
  "Dibrugarh",
  "Nagaon",
  "Barpeta",
  "Cachar",
  "Tinsukia",
  "Jorhat",
  "Golaghat",
  "Kokrajhar",
  "Dhubri",
  "Kohima",
  "Imphal",
  "Aizawl",
  "Shillong",
  "Agartala",
  "Itanagar",
];

const localOrganizations = [
  "North East Health Mission",
  "State Health Directorate",
  "Gauhati Medical College Hospital",
  "Assam Medical College Dibrugarh",
  "Silchar Medical College",
  "NEIGRIHMS Shillong",
  "Regional Institute of Medical Sciences Imphal",
  "District Hospital",
  "Mission Secretariat",
];

export function normalizeText(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s.,:/\u20B9$%-]/gu, " ")
    .trim();
}

export function tokenize(value: string) {
  return normalizeText(value)
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !stopWords.has(token));
}

export function detectLanguage(value: string): SupportedLanguage {
  const text = normalizeText(value);
  const hasAssamese = /[\u0980-\u09FF]/u.test(text) && /[\u09F0\u09F1]/u.test(text);
  const hasBengali = /[\u0980-\u09FF]/u.test(text) && !hasAssamese;
  const hasHindi = /[\u0900-\u097F]/u.test(text);
  const hasEnglish = /[a-z]/iu.test(text);
  const count = [hasAssamese, hasBengali, hasHindi, hasEnglish].filter(Boolean).length;

  if (count > 1) return "mixed";
  if (hasAssamese) return "assamese";
  if (hasBengali) return "bengali";
  if (hasHindi) return "hindi";
  if (hasEnglish) return "english";
  return "unknown";
}

export function extractKeywords(value: string, limit = 8) {
  const counts = new Map<string, number>();
  for (const token of tokenize(value)) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([keyword]) => keyword);
}

export function summarizeText(value: string, sentenceLimit = 2) {
  const sentences = normalizeText(value).split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length <= sentenceLimit) return sentences.join(" ");
  const keywords = extractKeywords(value, 10);
  return sentences
    .map((sentence) => ({
      sentence,
      score: keywords.filter((keyword) => sentence.toLowerCase().includes(keyword)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, sentenceLimit)
    .map((item) => item.sentence)
    .join(" ");
}

export function extractEntities(value: string): EntityExtraction {
  const text = normalizeText(value);
  const titleCaseMatches = text.match(/\b(?:Dr\.|Director|Commissioner|Secretary|Prof\.|Ms\.)?\s?[A-Z][a-z]+(?:\s[A-Z][a-z]+){1,3}\b/g) ?? [];

  return {
    people: [...new Set(titleCaseMatches.filter((item) => !localOrganizations.some((org) => org.includes(item))))].slice(0, 8),
    organizations: localOrganizations.filter((organization) => text.toLowerCase().includes(organization.toLowerCase())),
    locations: localLocations.filter((location) => text.toLowerCase().includes(location.toLowerCase())),
    dates: [...new Set(text.match(/\b(?:Q[1-4]\sFY\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s\d{4})\b/g) ?? [])],
    money: [...new Set(text.match(/(?:\u20B9|\$)\s?\d+(?:\.\d+)?\s?(?:crore|lakh|M|million)?/gi) ?? [])],
  };
}

export function classifyDocument(value: string): DocumentClassification {
  const normalized = normalizeText(value).toLowerCase();
  const match = classificationRules
    .map((rule) => ({
      classification: rule.classification,
      score: rule.terms.filter((term) => normalized.includes(term)).length,
    }))
    .sort((a, b) => b.score - a.score)[0];

  return match && match.score > 0 ? match.classification : "general";
}

export function suggestTags(value: string, limit = 8) {
  const classification = classifyDocument(value);
  const keywords = extractKeywords(value, limit);
  const entities = extractEntities(value);
  return [...new Set([classification, ...entities.locations.map((location) => location.toLowerCase().replace(/\s+/g, "-")), ...keywords])].slice(0, limit);
}
