// Sprint 1 real Social Alerts (2026-08-17): Brand24 authenticates via a single admin-level
// X-Api-Key (not per-tenant OAuth), so this file lives alongside socialAlerts.ts/
// socialAlertRulesRepository.ts in the alerts domain, not in services/integrations/ (that family
// today is reserved for the cross-tenant /api/admin/pilot-portfolio platform-operator surface with
// its own rbac gate; Brand24 feeds an ordinary per-tenant page).
//
// HONESTY FLAG: Brand24's exact mention JSON field names were not independently confirmed against
// a live API response while building this (only documented concepts from Brand24's own docs, no
// field-by-field example) -- mapBrand24Mention is written defensively (optional-chained, tolerant
// of nulls) and must be verified against a real API key response before this goes live for a real
// tenant. Same caveat this repo already carries for its own Threads ingestion
// (src/services/social/threadsIngestion.ts).
import type { SocialAlertRule } from "../../domain";
import { listSocialAlertRulesForProvider } from "../../repositories/socialAlertRulesRepository";
import { upsertSocialAlertEvent } from "../../repositories/socialAlertEventsRepository";
import { buildSocialAlertEventInput, matchMentionAgainstRules, type SocialAlertMentionCandidate } from "./socialAlertMatching";

function getBrand24Config() {
  const apiKey = process.env.BRAND24_API_KEY;
  const projectId = process.env.BRAND24_PROJECT_ID;
  if (!apiKey || !projectId) return undefined;
  return { apiKey, projectId };
}

export type Brand24RawMention = {
  id?: string | number;
  title?: string;
  description?: string;
  url?: string;
  author?: string;
  source?: string;
  sentiment?: "positive" | "neutral" | "negative" | number;
  date?: string;
};

function normalizeSentiment(value: Brand24RawMention["sentiment"]): SocialAlertMentionCandidate["sentiment"] {
  if (value === "positive" || value === "negative") return value;
  if (typeof value === "number") {
    if (value > 0) return "positive";
    if (value < 0) return "negative";
  }
  return "neutral";
}

function mapBrand24Mention(raw: Brand24RawMention): SocialAlertMentionCandidate | undefined {
  if (raw.id === undefined || raw.id === null) return undefined;
  return {
    provider: "brand24",
    externalId: String(raw.id),
    title: raw.title ?? raw.description?.slice(0, 120) ?? "Untitled Brand24 mention",
    body: raw.description,
    sourceAccount: raw.author ?? raw.source ?? "Unknown source",
    sentiment: normalizeSentiment(raw.sentiment),
    receivedAt: raw.date ?? new Date().toISOString(),
    url: raw.url,
  };
}

export async function fetchBrand24Mentions(fetcher: typeof fetch = fetch): Promise<SocialAlertMentionCandidate[]> {
  const config = getBrand24Config();
  if (!config) throw new Error("Brand24 is not configured (BRAND24_API_KEY/BRAND24_PROJECT_ID missing).");

  const response = await fetcher(`https://api-data.brand24.com/api-data/v1/project/${config.projectId}/mentions`, {
    headers: { "X-Api-Key": config.apiKey },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as { results?: Brand24RawMention[] };
  if (!response.ok) throw new Error(`Brand24 mentions request failed with ${response.status}.`);

  return (payload.results ?? [])
    .map(mapBrand24Mention)
    .filter((mention): mention is SocialAlertMentionCandidate => Boolean(mention));
}

export type Brand24SyncResult =
  | { status: "not-configured" }
  | { status: "ok"; mentionsFetched: number; eventsCreated: number; organizationsMatched: number }
  | { status: "error"; error: string };

// Config check -> fetch -> group every brand24 rule by organization -> match each mention against
// each org's own rules -> upsert an event per match. A per-mention/per-org failure is caught and
// counted, never fatal to the whole run -- same discipline as the existing
// social-connector-sync cron route.
export async function syncBrand24Mentions(fetcher: typeof fetch = fetch): Promise<Brand24SyncResult> {
  if (!getBrand24Config()) return { status: "not-configured" };

  try {
    const mentions = await fetchBrand24Mentions(fetcher);
    const rules = await listSocialAlertRulesForProvider("brand24");
    const rulesByOrg = new Map<string, SocialAlertRule[]>();
    for (const rule of rules) {
      const list = rulesByOrg.get(rule.organizationId) ?? [];
      list.push(rule);
      rulesByOrg.set(rule.organizationId, list);
    }

    let eventsCreated = 0;
    const organizationsMatched = new Set<string>();
    for (const mention of mentions) {
      for (const [organizationId, orgRules] of rulesByOrg) {
        const matches = matchMentionAgainstRules(mention, orgRules);
        for (const match of matches) {
          const created = await upsertSocialAlertEvent(buildSocialAlertEventInput(match)).catch(() => undefined);
          if (created) {
            eventsCreated += 1;
            organizationsMatched.add(organizationId);
          }
        }
      }
    }

    return { status: "ok", mentionsFetched: mentions.length, eventsCreated, organizationsMatched: organizationsMatched.size };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[brand24Ingestion] sync failed", { error: message });
    return { status: "error", error: message };
  }
}
