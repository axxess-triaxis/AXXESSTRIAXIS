import { describe, expect, it, vi } from "vitest";
import { enrichWithOpenNlp, openNlpConfigFromEnv, type OpenNlpConfig } from "./openNlpClient";

const payload = {
  sentences: ["The audit closed in Kamrup.", "Budget was ₹ 4 crore."],
  tokensCount: 11,
  entities: { people: [], organizations: [], locations: ["Kamrup"], dates: [], money: ["₹ 4 crore"] },
  modelVersions: { sentdetect: "test", tokenizer: "test" },
};

function config(fetchImpl: typeof fetch, overrides: Partial<OpenNlpConfig> = {}): OpenNlpConfig {
  return { enabled: true, endpoint: "https://nlp.example.test", key: "test-key", timeoutMs: 50, fetchImpl, ...overrides };
}

describe("openNlpClient", () => {
  it("posts text with the shared key and returns the enrichment", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 }));
    const result = await enrichWithOpenNlp("The audit closed in Kamrup.", config(fetchImpl as unknown as typeof fetch));
    expect(result).toEqual(payload);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://nlp.example.test/enrich");
    expect((init.headers as Record<string, string>)["x-opennlp-key"]).toBe("test-key");
    expect(JSON.parse(String(init.body))).toEqual({ text: "The audit closed in Kamrup." });
  });

  it("returns null and never calls out when the flag is off", async () => {
    const fetchImpl = vi.fn();
    expect(await enrichWithOpenNlp("text", config(fetchImpl as unknown as typeof fetch, { enabled: false }))).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns null when endpoint or key is missing", async () => {
    const fetchImpl = vi.fn();
    expect(await enrichWithOpenNlp("text", config(fetchImpl as unknown as typeof fetch, { endpoint: undefined }))).toBeNull();
    expect(await enrichWithOpenNlp("text", config(fetchImpl as unknown as typeof fetch, { key: undefined }))).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns null on a 5xx", async () => {
    const fetchImpl = vi.fn(async () => new Response("boom", { status: 503 }));
    expect(await enrichWithOpenNlp("text", config(fetchImpl as unknown as typeof fetch))).toBeNull();
  });

  it("returns null on timeout", async () => {
    const fetchImpl = vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    }));
    expect(await enrichWithOpenNlp("text", config(fetchImpl as unknown as typeof fetch, { timeoutMs: 10 }))).toBeNull();
  });

  it("returns null on a malformed body", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ sentences: "nope" }), { status: 200 }));
    expect(await enrichWithOpenNlp("text", config(fetchImpl as unknown as typeof fetch))).toBeNull();
  });

  it("reads config from env and is off unless OPENNLP_ENABLED is true", () => {
    expect(openNlpConfigFromEnv({}).enabled).toBe(false);
    const cfg = openNlpConfigFromEnv({ OPENNLP_ENABLED: "true", OPENNLP_ENDPOINT: "https://x.test/", OPENNLP_KEY: "k" });
    expect(cfg).toMatchObject({ enabled: true, endpoint: "https://x.test", key: "k" });
  });
});
