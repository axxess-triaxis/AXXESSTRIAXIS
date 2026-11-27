// Discovery loop and checks with a fake Converse and fake search. Reserved domains and invented names.
import { describe, expect, it } from "vitest";
import { countryCode, discoverCompanies, parseJsonObject, parseSubmission, systemPrompt, type Converse, type ConverseRequest, type ConverseResponse } from "./discover";
import { checkHomepages, isBlockedDomain, screenCompanies } from "./discoverValidate";

const REQ = { segment: "brokerage", countries: ["AE"], cities: ["Dubai"], target: 3, maxSearches: 2 };

const toolUse = (id: string, name: string, input: unknown): ConverseResponse => ({
  output: { message: { role: "assistant", content: [{ toolUse: { toolUseId: id, name, input } }] } },
  stopReason: "tool_use",
  usage: { inputTokens: 100, outputTokens: 20 },
});

/** Plays back scripted model turns and records each request. */
function scripted(turns: Array<(req: ConverseRequest) => ConverseResponse>) {
  const requests: ConverseRequest[] = [];
  const converse: Converse = async (req) => {
    requests.push(structuredClone(req));
    const next = turns[requests.length - 1];
    if (!next) throw new Error("unexpected extra turn");
    return next(req);
  };
  return { converse, requests };
}

const hits = [
  { title: "Alpha Homes", url: "https://alpha-homes.example/contact", text: "Alpha Homes, Dubai brokerage" },
  { title: "Portal listing", url: "https://propertyfinder.ae/agency/beta", text: "Beta Realty on a portal" },
];

describe("discoverCompanies", () => {
  it("searches, then returns the submitted companies with usage", async () => {
    const queries: string[] = [];
    const { converse, requests } = scripted([
      () => toolUse("t1", "web_search", { query: "Dubai real estate brokerage official website" }),
      () => toolUse("t2", "submit_companies", { companies: [{ company: "Alpha Homes", domain: "alpha-homes.example", country: "AE", city: "Dubai", evidence_url: "https://alpha-homes.example/contact" }] }),
    ]);
    const result = await discoverCompanies(REQ, { converse, modelId: "m", search: async (q) => (queries.push(q), hits) });
    expect(queries).toEqual(["Dubai real estate brokerage official website"]);
    expect(result).toMatchObject({ searches: 1, turns: 2, inputTokens: 200, outputTokens: 40 });
    expect(result.companies).toEqual([{ company: "Alpha Homes", domain: "alpha-homes.example", country: "AE", city: "Dubai", evidenceUrl: "https://alpha-homes.example/contact" }]);
    expect(result.seenUrls).toEqual(hits.map((h) => h.url));
    // The search results went back to the model as a tool result.
    const back = requests[1].messages.at(-1)?.content[0];
    expect(back && "toolResult" in back && back.toolResult.toolUseId).toBe("t1");
    expect(requests[0].modelId).toBe("m");
  });

  it("never runs more searches than the budget and forces a submission once it is used", async () => {
    let searches = 0;
    const { converse, requests } = scripted([
      () => ({
        output: { message: { role: "assistant", content: [1, 2, 3].map((i) => ({ toolUse: { toolUseId: `s${i}`, name: "web_search", input: { query: `q${i}` } } })) } },
        usage: {},
      }),
      () => toolUse("t9", "submit_companies", { companies: [] }),
    ]);
    const result = await discoverCompanies(REQ, { converse, modelId: "m", search: async () => (searches++, []) });
    expect(searches).toBe(2);
    expect(result.searches).toBe(2);
    expect(requests[1].toolConfig.toolChoice).toEqual({ any: {} });
    expect(requests[1].toolConfig.tools.map((t) => t.toolSpec.name)).toEqual(["submit_companies"]);
    const third = requests[1].messages.at(-1)?.content[2];
    expect(third && "toolResult" in third && third.toolResult.status).toBe("error");
  });

  it("stops after the turn limit plus submit-only retries and says so", async () => {
    const thinking = () => ({ output: { message: { role: "assistant", content: [{ text: "thinking" }] } } });
    const { converse, requests } = scripted([thinking, thinking, thinking]);
    const result = await discoverCompanies(REQ, { converse, modelId: "m", search: async () => [], maxTurns: 2 });
    expect(result.turns).toBe(3);
    expect(result.incomplete).toContain("3 turns");
    expect(result.companies).toEqual([]);
    expect(requests[0].toolConfig.tools.map((t) => t.toolSpec.name)).toEqual(["web_search", "submit_companies"]);
    for (const r of requests.slice(1)) expect(r.toolConfig.tools.map((t) => t.toolSpec.name)).toEqual(["submit_companies"]);
  });

  it("refuses a stray search once it must submit and recovers on a retry (gpt-oss behaviour)", async () => {
    let searches = 0;
    const { converse, requests } = scripted([
      () => toolUse("t1", "web_search", { query: "q1" }),
      () => toolUse("t2", "web_search", { query: "q2" }),
      () => toolUse("t3", "submit_companies", { companies: [] }),
    ]);
    const result = await discoverCompanies(REQ, { converse, modelId: "m", search: async () => (searches++, []), maxTurns: 2 });
    expect(searches).toBe(1);
    expect(result.incomplete).toBeUndefined();
    expect(result.turns).toBe(3);
    const refused = requests[2].messages.at(-1)?.content[0];
    expect(refused && "toolResult" in refused && refused.toolResult.status).toBe("error");
  });

  it("falls back to a no-tool JSON extraction when the model never submits (staging run dc81bd30)", async () => {
    const searchOnly = () => toolUse("x", "web_search", { query: "again" });
    const { converse, requests } = scripted([
      () => toolUse("t1", "web_search", { query: "Dubai brokerages" }),
      searchOnly,
      searchOnly,
      () => ({
        output: { message: { role: "assistant", content: [{ text: 'Here you go: ```json\n{"companies":[{"company":"Alpha Homes","domain":"alpha-homes.example","country":"United Arab Emirates","city":"Dubai","evidence_url":"https://alpha-homes.example/contact"}]}\n```' }] } },
        usage: { inputTokens: 500, outputTokens: 50 },
      }),
    ]);
    const result = await discoverCompanies(REQ, { converse, modelId: "m", search: async () => hits, maxTurns: 2 });
    expect(result.extracted).toBe(true);
    expect(result.incomplete).toBeUndefined();
    expect(result.companies).toEqual([{ company: "Alpha Homes", domain: "alpha-homes.example", country: "AE", city: "Dubai", evidenceUrl: "https://alpha-homes.example/contact" }]);
    const last = requests.at(-1)!;
    expect(last.toolConfig).toBeUndefined();
    expect(last.messages).toHaveLength(1);
    const prompt = (last.messages[0].content[0] as { text: string }).text;
    expect(prompt).toContain("https://alpha-homes.example/contact");
    expect(prompt).toContain("untrusted");
  });

  // Production run ad073faf (2026-11-23, gpt-oss-20b): 7 searches, 10 turns, 5,284 output tokens,
  // 0 companies, "Discovery incomplete". gpt-oss returns its reasoning as a reasoningContent block
  // that counts against maxTokens; at 4,096 a long reasoning pass ends with stopReason max_tokens and
  // no text or tool call at all (reproduced on Bedrock with a 200-token limit on 2026-11-26).
  const cutOff = (): ConverseResponse => ({
    output: { message: { role: "assistant", content: [{ reasoningContent: { reasoningText: { text: "Let me think about which of these..." } } }] } },
    stopReason: "max_tokens",
    usage: { inputTokens: 900, outputTokens: 4096 },
  });

  it("gives every call room for gpt-oss reasoning before the answer (run ad073faf)", async () => {
    const { converse, requests } = scripted([
      () => toolUse("t1", "web_search", { query: "Dubai brokerages" }),
      () => toolUse("t2", "submit_companies", { companies: [] }),
    ]);
    await discoverCompanies(REQ, { converse, modelId: "m", search: async () => hits });
    for (const r of requests) expect(r.inferenceConfig.maxTokens).toBeGreaterThanOrEqual(16384);
  });

  it("says when calls were cut off at the token limit instead of a bare 'no submission' (run ad073faf)", async () => {
    const { converse, requests } = scripted([
      () => toolUse("t1", "web_search", { query: "Dubai brokerages" }),
      cutOff,
      cutOff,
      cutOff,
    ]);
    const result = await discoverCompanies(REQ, { converse, modelId: "m", search: async () => hits, maxTurns: 2 });
    expect(requests.at(-1)!.toolConfig).toBeUndefined();
    expect(requests.at(-1)!.inferenceConfig.maxTokens).toBeGreaterThanOrEqual(16384);
    expect(result.companies).toEqual([]);
    expect(result.cutOffTurns).toBe(3);
    expect(result.incomplete).toContain("token limit");
  });

  it("skips extraction when no search ever returned anything", async () => {
    const thinking = () => ({ output: { message: { role: "assistant", content: [{ text: "thinking" }] } } });
    const { converse, requests } = scripted([thinking, thinking, thinking]);
    const result = await discoverCompanies(REQ, { converse, modelId: "m", search: async () => [], maxTurns: 2 });
    expect(result.incomplete).toBeDefined();
    expect(requests).toHaveLength(3);
  });

  it("maps country names to ISO codes and reads JSON wrapped in prose", () => {
    expect(countryCode("United Arab Emirates")).toBe("AE");
    expect(countryCode("u.a.e.")).toBe("AE");
    expect(countryCode("India")).toBe("IN");
    expect(countryCode("ae")).toBe("AE");
    expect(countryCode("Atlantis")).toBe("");
    expect(parseJsonObject('noise {"a":1} more')).toEqual({ a: 1 });
    expect(parseJsonObject("no json here")).toBeNull();
    expect(parseJsonObject("{broken")).toBeNull();
  });

  it("reports a failed search to the model instead of crashing", async () => {
    const { converse, requests } = scripted([
      () => toolUse("t1", "web_search", { query: "x" }),
      () => toolUse("t2", "submit_companies", { companies: [] }),
    ]);
    await discoverCompanies(REQ, { converse, modelId: "m", search: async () => { throw new Error("throttled"); } });
    const back = requests[1].messages.at(-1)?.content[0];
    expect(back && "toolResult" in back && back.toolResult.status).toBe("error");
  });

  it("drops malformed submissions and names the segment, place and budget in the prompt", () => {
    expect(parseSubmission({ companies: [{ company: "A", domain: "a.example", country: "ae", evidence_url: "https://a.example" }, { company: "", domain: "b.example" }, "junk"] })).toEqual([
      { company: "A", domain: "a.example", country: "AE", city: "", evidenceUrl: "https://a.example" },
    ]);
    expect(parseSubmission(null)).toEqual([]);
    const prompt = systemPrompt(REQ);
    expect(prompt).toContain("real estate brokerages");
    expect(prompt).toContain("Dubai");
    expect(prompt).toContain("United Arab Emirates");
    expect(prompt).toContain("at most 2 web searches");
  });
});

describe("discovery checks", () => {
  it("blocks portals, directories, social and government domains, including subdomains", () => {
    for (const d of ["propertyfinder.ae", "www.practo.com", "in.linkedin.com", "dubailand.gov.ae", "maharera.mahaonline.gov.in", "x.nic.in"]) expect(isBlockedDomain(d)).toBe(true);
    for (const d of ["alpha-homes.example", "linkedinsights.example"]) expect(isBlockedDomain(d)).toBe(false);
  });

  it("keeps only valid, unblocked, in-country domains whose own pages a search returned, once each", () => {
    const seen = ["https://alpha-homes.example/contact", "https://propertyfinder.ae/agency/beta", "https://news.example/top-brokers"];
    const report = screenCompanies(
      [
        { company: "Alpha Homes", domain: "https://www.Alpha-Homes.example/", country: "AE", city: "Dubai", evidenceUrl: "https://alpha-homes.example/contact" },
        { company: "Alpha again", domain: "alpha-homes.example", country: "AE", city: "", evidenceUrl: "https://alpha-homes.example/contact" },
        { company: "Beta Realty", domain: "propertyfinder.ae", country: "AE", city: "", evidenceUrl: "https://propertyfinder.ae/agency/beta" },
        { company: "Gamma", domain: "gamma.example", country: "AE", city: "", evidenceUrl: "https://news.example/top-brokers" },
        { company: "Made up", domain: "made-up.example", country: "AE", city: "", evidenceUrl: "https://made-up.example/" },
        { company: "Delhi", domain: "delhi-homes.example", country: "IN", city: "", evidenceUrl: "https://delhi-homes.example/" },
        { company: "Bad", domain: "not a domain", country: "AE", city: "", evidenceUrl: "x" },
      ],
      seen,
      ["AE"],
    );
    expect(report.kept.map((c) => c.domain)).toEqual(["alpha-homes.example"]);
    // Gamma only appeared inside a news article; Made up never appeared at all.
    expect(report.rejected.map((r) => r.reason)).toEqual(["duplicate", "blocked-domain", "no-evidence", "no-evidence", "wrong-country", "invalid-domain"]);
  });

  it("drops sites whose robots.txt disallows the homepage or that return no HTML", async () => {
    const pages: Record<string, string> = {
      "https://ok.example/": "<html><body>Hi</body></html>",
      "https://closed.example/robots.txt": "User-agent: *\nDisallow: /",
      "https://closed.example/": "<html></html>",
    };
    const report = await checkHomepages(
      { kept: ["ok.example", "closed.example", "dead.example"].map((domain) => ({ company: domain, domain, country: "AE", city: "", evidenceUrl: "" })), rejected: [] },
      async (url) => pages[url] ?? "",
    );
    expect(report.kept.map((c) => c.domain)).toEqual(["ok.example"]);
    expect(report.rejected).toEqual([
      { company: "closed.example", domain: "closed.example", reason: "robots" },
      { company: "dead.example", domain: "dead.example", reason: "unreachable" },
    ]);
  });
});
