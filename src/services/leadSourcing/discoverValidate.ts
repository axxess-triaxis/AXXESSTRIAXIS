// Deterministic checks on what discovery proposes (2026-11-18). The model's word is never enough:
// a company survives only if its domain is a real hostname, is not a directory/social/government
// site, had a page in the search results, and its homepage answers
// with HTML where robots.txt allows it. Exclusions and known leads are checked on the server.
import { parseRobots, robotsAllows } from "./crawl.ts";
import type { DiscoveredCompany } from "./discover.ts";
import { normaliseDomain } from "./sourcingService.ts";
import type { FetchText } from "./types.ts";

/** Hosts that list or talk about businesses rather than being one. Matched on the host and its parents. */
export const BLOCKED_DOMAINS = [
  // social and professional networks
  "linkedin.com", "facebook.com", "instagram.com", "x.com", "twitter.com", "youtube.com", "tiktok.com", "pinterest.com", "threads.net", "wa.me", "whatsapp.com",
  // search, maps, generic platforms
  "google.com", "goo.gl", "bing.com", "wikipedia.org", "medium.com", "blogspot.com", "wordpress.com", "wixsite.com", "sites.google.com", "linktr.ee",
  // UAE property portals and listings
  "propertyfinder.ae", "bayut.com", "dubizzle.com", "houza.com", "zoopla.co.uk", "rightmove.co.uk", "justproperty.com", "propsearch.ae",
  // India property portals
  "99acres.com", "magicbricks.com", "housing.com", "nobroker.in", "commonfloor.com", "makaan.com", "squareyards.com", "proptiger.com",
  // clinic and doctor directories
  "practo.com", "lybrate.com", "justdial.com", "sulekha.com", "credihealth.com", "docprime.com", "okadoc.com", "healthgrades.com", "vezeeta.com",
  // business directories and review sites
  "yellowpages.ae", "yello.ae", "indiamart.com", "tradeindia.com", "clutch.co", "glassdoor.com", "ambitionbox.com", "crunchbase.com", "zaubacorp.com",
  "tofler.in", "yelp.com", "tripadvisor.com", "trustpilot.com", "dnb.com", "zoominfo.com", "apollo.io", "rocketreach.co", "signalhire.com",
];

const GOVERNMENT = [/\.gov(\.[a-z]{2})?$/, /\.nic\.in$/, /\.gov\.ae$/, /\.ae\.gov$/];

export function isBlockedDomain(domain: string): boolean {
  const host = domain.toLowerCase();
  if (GOVERNMENT.some((re) => re.test(host))) return true;
  return BLOCKED_DOMAINS.some((b) => host === b || host.endsWith(`.${b}`));
}

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
};

const sameSite = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

export type RejectReason = "invalid-domain" | "blocked-domain" | "no-evidence" | "wrong-country" | "duplicate" | "unreachable" | "robots";
export type ValidationReport = { kept: DiscoveredCompany[]; rejected: Array<{ company: string; domain: string; reason: RejectReason }> };

/** Checks that need no network. `seenUrls` are the URLs the searches returned. */
export function screenCompanies(companies: DiscoveredCompany[], seenUrls: string[], countries: string[]): ValidationReport {
  const seenHosts = new Set(seenUrls.map(hostOf).filter(Boolean));
  const report: ValidationReport = { kept: [], rejected: [] };
  const taken = new Set<string>();
  for (const c of companies) {
    const domain = normaliseDomain(c.domain);
    const reject = (reason: RejectReason) => report.rejected.push({ company: c.company, domain: domain ?? c.domain, reason });
    if (!domain) { reject("invalid-domain"); continue; }
    if (isBlockedDomain(domain)) { reject("blocked-domain"); continue; }
    if (!countries.includes(c.country)) { reject("wrong-country"); continue; }
    // Evidence: a page on the domain itself came back from a search. A domain mentioned only inside
    // an article could be a guess by the model, so it does not count.
    if (![...seenHosts].some((h) => sameSite(h, domain))) { reject("no-evidence"); continue; }
    if (taken.has(domain)) { reject("duplicate"); continue; }
    taken.add(domain);
    report.kept.push({ ...c, domain });
  }
  return report;
}

/** Homepage check: robots.txt must allow "/" for our user agent and the page must return HTML. */
export async function checkHomepages(report: ValidationReport, fetchText: FetchText, limit = 4): Promise<ValidationReport> {
  const out: ValidationReport = { kept: [], rejected: [...report.rejected] };
  const results = await Promise.all(
    chunk(report.kept, limit).map(async (group) => {
      const verdicts: Array<{ c: DiscoveredCompany; reason?: RejectReason }> = [];
      for (const c of group) {
        const robots = await fetchText(`https://${c.domain}/robots.txt`);
        if (robots && !robotsAllows(parseRobots(robots), `https://${c.domain}/`)) {
          verdicts.push({ c, reason: "robots" });
          continue;
        }
        const html = (await fetchText(`https://${c.domain}/`)) || (await fetchText(`https://www.${c.domain}/`));
        verdicts.push({ c, reason: /<html|<body|<head/i.test(html) ? undefined : "unreachable" });
      }
      return verdicts;
    }),
  );
  for (const { c, reason } of results.flat()) {
    if (reason) out.rejected.push({ company: c.company, domain: c.domain, reason });
    else out.kept.push(c);
  }
  return out;
}

function chunk<T>(items: T[], parts: number): T[][] {
  const groups: T[][] = Array.from({ length: Math.max(1, parts) }, () => []);
  items.forEach((item, i) => groups[i % groups.length].push(item));
  return groups.filter((g) => g.length);
}

