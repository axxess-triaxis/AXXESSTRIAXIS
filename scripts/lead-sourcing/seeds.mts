// Seed lists: the pipe format, saved Apollo organizations_lookup JSON, plus de-duplication and
// the do-not-contact exclusion list.
import type { Seed } from "./types.mts";
import { domainLabel } from "./extract.mts";

/** Lines of `segment|country|company|domain[|registryName|registryRole]`. */
export function parsePipeSeeds(text: string, source = "seed list"): Seed[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const [segment, country, company, domain, registryName, registryRole] = l.split("|").map((s) => s.trim());
      return { segment, country, company, domain: domain || undefined, registryName: registryName || undefined, registryRole: registryRole || undefined, source };
    })
    .filter((s) => s.company && s.country);
}

type ApolloOrg = { name?: string; domain?: string; website_url?: string };

/** A saved `apollo_organizations_lookup` response (or an array of them). Orgs without a domain are skipped. */
export function parseApolloSeeds(json: unknown, segment: string, country: string): Seed[] {
  const pages = Array.isArray(json) ? json : [json];
  const orgs = pages.flatMap((p) => ((p as { organizations?: ApolloOrg[] }).organizations ?? []) as ApolloOrg[]);
  return orgs
    .filter((o) => o.name && (o.domain || o.website_url))
    .map((o) => ({
      segment,
      country,
      company: o.name!.trim(),
      domain: (o.domain ?? new URL(o.website_url!).hostname).replace(/^www\./, ""),
      source: "Apollo company list",
    }));
}

const normCompany = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").replace(/\b(llc|l l c|pvt|ltd|private|limited|fze|fzco|real estate|brokerage|properties)\b/g, "").replace(/\s+/g, " ").trim();

/** Company names and email/site domain labels found in previous lead CSVs or the exclusion list. */
export function knownFromCsv(texts: string[]): { companies: Set<string>; labels: Set<string> } {
  const companies = new Set<string>();
  const labels = new Set<string>();
  for (const text of texts) {
    const [header, ...rows] = text.split(/\r?\n/).filter(Boolean);
    const cols = header.toLowerCase().split(",");
    const companyCol = cols.indexOf("company");
    for (const row of rows) {
      const cells = row.split(",");
      if (companyCol >= 0 && cells[companyCol]) companies.add(normCompany(cells[companyCol]));
      for (const m of row.matchAll(/@([a-z0-9.-]+\.[a-z]{2,})/gi)) labels.add(domainLabel(m[1]));
      for (const m of row.matchAll(/(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+\.[a-z.]{2,})(?=[\s,/]|$)/gi)) {
        if (!m[0].includes("@")) labels.add(domainLabel(m[1]));
      }
    }
  }
  return { companies, labels };
}

export type FilterReport = { kept: Seed[]; excluded: Seed[]; duplicates: Seed[] };

/**
 * Drops seeds on the exclusion list (never fetched) and seeds already researched or imported,
 * and de-duplicates within the list by domain label.
 */
export function filterSeeds(seeds: Seed[], exclusion: { companies: Set<string>; labels: Set<string> }, already: { companies: Set<string>; labels: Set<string> }): FilterReport {
  const report: FilterReport = { kept: [], excluded: [], duplicates: [] };
  const seen = new Set<string>();
  for (const seed of seeds) {
    const label = seed.domain ? domainLabel(seed.domain) : "";
    const company = normCompany(seed.company);
    if (exclusion.companies.has(company) || (label && exclusion.labels.has(label))) report.excluded.push(seed);
    else if (already.companies.has(company) || (label && already.labels.has(label)) || (label && seen.has(label))) report.duplicates.push(seed);
    else {
      report.kept.push(seed);
      if (label) seen.add(label);
    }
  }
  return report;
}
