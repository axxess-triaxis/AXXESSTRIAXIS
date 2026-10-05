// Real semantic embeddings for RAG: 384-dimension gte-small vectors from the `embed` Supabase Edge
// Function (supabase/functions/embed). Free on the existing Supabase plan (founder decision
// 2026-10-05: free models only).
//
// Never throws. Any missing configuration, network error, non-200 or malformed reply returns
// null, and callers keep using the deterministic hash score (embeddingProvider.ts) exactly as
// before -- semantic retrieval is an improvement on top, never a new way for RAG to fail.

export const SEMANTIC_EMBEDDING_MODEL = "gte-small";
export const SEMANTIC_EMBEDDING_DIMENSIONS = 384;
// The Edge Function accepts at most 64 texts per request.
const BATCH_SIZE = 32;
const TIMEOUT_MS = 20_000;

export function isSemanticEmbeddingConfigured(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.EMBED_FUNCTION_SECRET);
}

function isVector(value: unknown): value is number[] {
  return Array.isArray(value) && value.length === SEMANTIC_EMBEDDING_DIMENSIONS && value.every((n) => typeof n === "number" && Number.isFinite(n));
}

async function embedBatch(texts: string[], env: NodeJS.ProcessEnv, fetchImpl: typeof fetch): Promise<number[][] | null> {
  const url = `${env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "")}/functions/v1/embed`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-embed-secret": env.EMBED_FUNCTION_SECRET! },
      body: JSON.stringify({ texts }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload = await response.json() as { embeddings?: unknown };
    const embeddings = payload.embeddings;
    if (!Array.isArray(embeddings) || embeddings.length !== texts.length || !embeddings.every(isVector)) return null;
    return embeddings as number[][];
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** One vector per input text, in order -- or null if any batch could not be embedded. */
export async function embedTexts(
  texts: string[],
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<number[][] | null> {
  if (!isSemanticEmbeddingConfigured(env) || texts.length === 0) return null;
  const vectors: number[][] = [];
  for (let start = 0; start < texts.length; start += BATCH_SIZE) {
    const batch = await embedBatch(texts.slice(start, start + BATCH_SIZE), env, fetchImpl);
    if (!batch) return null;
    vectors.push(...batch);
  }
  return vectors;
}

/** pgvector's text input format, as PostgREST expects for a vector column or argument. */
export function toPgVector(vector: number[]) {
  return `[${vector.join(",")}]`;
}
