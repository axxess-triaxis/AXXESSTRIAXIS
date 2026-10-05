import { describe, expect, it, vi } from "vitest";
import { embedTexts, isSemanticEmbeddingConfigured, toPgVector } from "./semanticEmbeddings";

const env = { NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co/", EMBED_FUNCTION_SECRET: "s3cret" } as unknown as NodeJS.ProcessEnv;
const vector = (fill: number) => Array.from({ length: 384 }, () => fill);

function respondWith(handler: (texts: string[]) => unknown, status = 200) {
  return vi.fn(async (_url: string, init: RequestInit) => {
    const { texts } = JSON.parse(String(init.body)) as { texts: string[] };
    return new Response(JSON.stringify(handler(texts)), { status });
  });
}

describe("semantic embeddings (gte-small via the embed Edge Function)", () => {
  it("is off without both the Supabase URL and the function secret, and makes no call", async () => {
    expect(isSemanticEmbeddingConfigured({ NEXT_PUBLIC_SUPABASE_URL: "x" } as unknown as NodeJS.ProcessEnv)).toBe(false);
    const fetchMock = vi.fn();
    expect(await embedTexts(["a"], {} as NodeJS.ProcessEnv, fetchMock)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the secret header to the embed function and returns one vector per text, in order", async () => {
    const fetchMock = respondWith((texts) => ({ embeddings: texts.map((_, i) => vector(i)) }));
    const result = await embedTexts(["a", "b"], env, fetchMock);

    expect(result?.map((v) => v[0])).toEqual([0, 1]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://example.supabase.co/functions/v1/embed");
    expect((init.headers as Record<string, string>)["x-embed-secret"]).toBe("s3cret");
  });

  it("batches large inputs and keeps order across batches", async () => {
    const fetchMock = respondWith((texts) => ({ embeddings: texts.map((t) => vector(Number(t))) }));
    const texts = Array.from({ length: 70 }, (_, i) => String(i));
    const result = await embedTexts(texts, env, fetchMock);

    expect(fetchMock).toHaveBeenCalledTimes(3); // 32 + 32 + 6
    expect(result?.map((v) => v[0])).toEqual(texts.map(Number));
  });

  it("returns null, never throws, on a non-200, wrong dimensions, a count mismatch or a network error", async () => {
    expect(await embedTexts(["a"], env, respondWith(() => ({}), 401))).toBeNull();
    expect(await embedTexts(["a"], env, respondWith(() => ({ embeddings: [[0.1, 0.2]] })))).toBeNull();
    expect(await embedTexts(["a", "b"], env, respondWith(() => ({ embeddings: [vector(0)] })))).toBeNull();
    expect(await embedTexts(["a"], env, vi.fn(async () => { throw new Error("down"); }))).toBeNull();
  });

  it("formats vectors in pgvector's text input form", () => {
    expect(toPgVector([0.5, -1, 2])).toBe("[0.5,-1,2]");
  });
});
