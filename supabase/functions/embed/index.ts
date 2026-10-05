// Supabase Edge Function: text -> 384-dimension gte-small embeddings, using the model built into
// the Supabase Edge Runtime (Supabase.ai.Session). Free on the existing plan: no external embedding
// API, no key, no per-token billing (founder decision 2026-10-05: free models only).
//
// Called server-to-server only (src/services/rag/embeddings/supabaseEmbeddingProvider.ts and
// scripts/backfill-rag-embeddings.mjs). verify_jwt is off in supabase/config.toml because this
// project's server credential is the new sb_secret_ key format, which is not a JWT; the function
// instead requires a shared secret in the x-embed-secret header, set with
// `supabase secrets set EMBED_FUNCTION_SECRET=...` and the same value in the app's environment.
// Without that secret configured, every request is refused -- it never runs open.

declare const Supabase: {
  ai: { Session: new (model: string) => { run(input: string, options: { mean_pool: boolean; normalize: boolean }): Promise<number[]> } };
};

const MAX_TEXTS = 64;
// gte-small reads at most 512 tokens; longer input is truncated by the model anyway, so cap the
// payload rather than spend time tokenizing text it will ignore.
const MAX_CHARS = 4000;

const session = new Supabase.ai.Session("gte-small");

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "POST only" });

  const secret = Deno.env.get("EMBED_FUNCTION_SECRET");
  if (!secret) return json(503, { error: "embed function is not configured" });
  if (!timingSafeEqual(req.headers.get("x-embed-secret") ?? "", secret)) return json(401, { error: "unauthorized" });

  let texts: unknown;
  try {
    texts = (await req.json())?.texts;
  } catch {
    return json(400, { error: "body must be JSON: { texts: string[] }" });
  }
  if (!Array.isArray(texts) || texts.length === 0 || texts.length > MAX_TEXTS || !texts.every((t) => typeof t === "string")) {
    return json(400, { error: `texts must be 1-${MAX_TEXTS} strings` });
  }

  const embeddings: number[][] = [];
  for (const text of texts as string[]) {
    const output = await session.run(text.slice(0, MAX_CHARS), { mean_pool: true, normalize: true });
    embeddings.push(Array.from(output));
  }
  return json(200, { model: "gte-small", dimensions: 384, embeddings });
});
