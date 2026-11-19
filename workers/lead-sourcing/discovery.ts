// Runs one claimed discovery run (2026-11-18): a model on Bedrock (gpt-oss-20b by default) finds companies with web search,
// then the deterministic checks drop anything that is not a reachable, independent business site.
// AWS clients are injected by handler.ts, so this is unit-tested without a network.
import { discoverCompanies, type Converse, type DiscoveredCompany, type WebSearch } from "../../src/services/leadSourcing/discover.ts";
import { checkHomepages, screenCompanies } from "../../src/services/leadSourcing/discoverValidate.ts";
import type { FetchText } from "../../src/services/leadSourcing/types.ts";

export type ClaimedDiscovery = { id: string; segment: string; countries: string[]; cities: string[]; target: number; maxSearches: number };

export type DiscoveryPayload = {
  companies: DiscoveredCompany[];
  searchCount: number;
  llmInputTokens: number;
  llmOutputTokens: number;
  stats: Record<string, number>;
};

export async function runDiscovery(
  run: ClaimedDiscovery,
  deps: { converse: Converse; search: WebSearch; fetchText: FetchText; modelId: string },
): Promise<DiscoveryPayload> {
  const found = await discoverCompanies(run, { converse: deps.converse, search: deps.search, modelId: deps.modelId });
  const screened = screenCompanies(found.companies, found.seenUrls, run.countries);
  const checked = await checkHomepages(screened, deps.fetchText);
  const rejected = (reason: string) => checked.rejected.filter((r) => r.reason === reason).length;
  return {
    companies: checked.kept,
    searchCount: found.searches,
    llmInputTokens: found.inputTokens,
    llmOutputTokens: found.outputTokens,
    stats: {
      "Searches used": found.searches,
      "Model turns": found.turns,
      "Companies suggested": found.companies.length,
      "Rejected: directory, social or government": rejected("blocked-domain"),
      "Rejected: no search evidence": rejected("no-evidence"),
      "Rejected: invalid or duplicate domain": rejected("invalid-domain") + rejected("duplicate"),
      "Rejected: wrong country": rejected("wrong-country"),
      "Rejected: site unreachable": rejected("unreachable"),
      "Rejected: robots.txt": rejected("robots"),
      "Companies checked": checked.kept.length,
      "Discovery incomplete": found.incomplete ? 1 : 0,
      "Listed by no-tool extraction": found.extracted ? 1 : 0,
    },
  };
}
