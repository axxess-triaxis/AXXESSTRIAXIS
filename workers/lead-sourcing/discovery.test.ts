// Worker discovery step with fake Bedrock, search and fetch. Reserved domains and invented names only.
import { describe, expect, it } from "vitest";
import type { ConverseResponse } from "../../src/services/leadSourcing/discover.ts";
import { runDiscovery } from "./discovery.ts";

const use = (name: string, input: unknown): ConverseResponse => ({
  output: { message: { role: "assistant", content: [{ toolUse: { toolUseId: name, name, input } }] } },
  usage: { inputTokens: 500, outputTokens: 50 },
});

describe("worker runDiscovery", () => {
  it("returns only checked companies with search and token usage, in the shape the seeds route reads", async () => {
    const turns = [
      use("web_search", { query: "Dubai brokerage official website" }),
      use("submit_companies", {
        companies: [
          { company: "Alpha Homes", domain: "alpha-homes.example", country: "AE", city: "Dubai", evidence_url: "https://alpha-homes.example/" },
          { company: "Portal", domain: "bayut.com", country: "AE", city: "Dubai", evidence_url: "https://bayut.com/x" },
          { company: "Down", domain: "down.example", country: "AE", city: "Dubai", evidence_url: "https://down.example/" },
        ],
      }),
    ];
    let turn = 0;
    const payload = await runDiscovery(
      { id: "run-1", segment: "brokerage", countries: ["AE"], cities: ["Dubai"], target: 5, maxSearches: 8 },
      {
        modelId: "openai.gpt-oss-20b-1:0",
        converse: async () => turns[turn++],
        search: async () => [
          { title: "Alpha", url: "https://alpha-homes.example/", text: "" },
          { title: "Bayut", url: "https://bayut.com/x", text: "" },
          { title: "Down", url: "https://down.example/", text: "" },
        ],
        fetchText: async (url) => (url.startsWith("https://alpha-homes.example/") && !url.endsWith("robots.txt") ? "<html><body>Alpha</body></html>" : ""),
      },
    );
    expect(payload.companies.map((c) => c.domain)).toEqual(["alpha-homes.example"]);
    expect(payload).toMatchObject({ searchCount: 1, llmInputTokens: 1000, llmOutputTokens: 100 });
    expect(payload.stats).toMatchObject({
      "Companies suggested": 3,
      "Rejected: directory, social or government": 1,
      "Rejected: site unreachable": 1,
      "Companies checked": 1,
      "Discovery incomplete": 0,
    });
  });
});
