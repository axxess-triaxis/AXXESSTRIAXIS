import type { EntityExtraction } from "./localNlp";

// Client for the OpenNLP Lambda (workers/opennlp). Server-side only: the key must never reach a browser.
// Every failure path returns null so callers fall back to the deterministic localNlp layer.

export type OpenNlpEnrichment = {
  sentences: string[];
  tokensCount: number;
  entities: EntityExtraction;
  modelVersions: Record<string, string>;
};

export type OpenNlpConfig = {
  enabled: boolean;
  endpoint?: string;
  key?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

export type OpenNlpEnricher = (text: string) => Promise<OpenNlpEnrichment | null>;

const DEFAULT_TIMEOUT_MS = 3000;
const MAX_TEXT_CHARS = 200_000;

export function openNlpConfigFromEnv(env: Record<string, string | undefined> = process.env): OpenNlpConfig {
  return {
    enabled: env.OPENNLP_ENABLED === "true",
    endpoint: env.OPENNLP_ENDPOINT?.trim().replace(/\/+$/, "") || undefined,
    key: env.OPENNLP_KEY?.trim() || undefined,
  };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function parseEnrichment(value: unknown): OpenNlpEnrichment | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  const entities = body.entities as Record<string, unknown> | undefined;
  if (!isStringArray(body.sentences) || typeof body.tokensCount !== "number" || !entities) return null;
  const keys = ["people", "organizations", "locations", "dates", "money"] as const;
  if (!keys.every((key) => isStringArray(entities[key]))) return null;
  return {
    sentences: body.sentences,
    tokensCount: body.tokensCount,
    entities: Object.fromEntries(keys.map((key) => [key, entities[key]])) as EntityExtraction,
    modelVersions: (body.modelVersions && typeof body.modelVersions === "object" ? body.modelVersions : {}) as Record<string, string>,
  };
}

export async function enrichWithOpenNlp(text: string, config: OpenNlpConfig = openNlpConfigFromEnv()): Promise<OpenNlpEnrichment | null> {
  if (!config.enabled || !config.endpoint || !config.key || !text.trim()) return null;
  const fetchImpl = config.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetchImpl(`${config.endpoint}/enrich`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-opennlp-key": config.key },
      body: JSON.stringify({ text: text.slice(0, MAX_TEXT_CHARS) }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return parseEnrichment(await response.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
