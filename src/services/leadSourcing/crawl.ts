// Crawls one company site: homepage, then the site's own team/about/contact links, with a
// headless-browser fallback for pages that come back nearly empty (sites built in JavaScript).
import { extractEmails, extractJsonLdPeople, extractRolePeople, extractTeamLinks, visibleTextLength } from "./extract.ts";
import type { FetchText, Person, RenderHtml, Seed, SiteResult } from "./types.ts";

export const USER_AGENT = "AXXESS-lead-research/1.0 (+https://triaxisventures.com)";
/** Fallback paths tried when the homepage links to nothing useful. */
const FALLBACK_PATHS = ["/about", "/about-us", "/team", "/our-team", "/contact", "/contact-us"];
/** Below this much visible text a page is treated as JavaScript-built and rendered. */
export const RENDER_THRESHOLD = 400;

export type CrawlOptions = {
  fetchText: FetchText;
  render?: RenderHtml;
  maxPages?: number;
};

/** Disallowed path prefixes for `User-agent: *` (and our own agent) from a robots.txt body. */
export function parseRobots(body: string): string[] {
  const disallow: string[] = [];
  let applies = false;
  let sawRule = false;
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, "").trim();
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const field = m[1].toLowerCase();
    const value = m[2].trim();
    if (field === "user-agent") {
      if (sawRule) {
        applies = false;
        sawRule = false;
      }
      if (value === "*" || /axxess-lead-research/i.test(value)) applies = true;
    } else {
      sawRule = true;
      if (applies && field === "disallow" && value) disallow.push(value);
    }
  }
  return disallow;
}

export function robotsAllows(disallow: string[], url: string): boolean {
  const path = new URL(url).pathname;
  return !disallow.some((prefix) => path.startsWith(prefix.replace(/\*.*$/, "")));
}

async function homepage(domain: string, fetchText: FetchText): Promise<{ url: string; html: string }> {
  for (const url of [`https://www.${domain}/`, `https://${domain}/`]) {
    const html = await fetchText(url);
    if (html) return { url, html };
  }
  return { url: `https://www.${domain}/`, html: "" };
}

export async function crawlSite(seed: Seed, options: CrawlOptions): Promise<SiteResult> {
  const domain = (seed.domain ?? "").toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  const maxPages = options.maxPages ?? 6;
  const result: SiteResult = { seed, domain, pagesFetched: [], rendered: [], emails: [], people: [], skippedByRobots: [] };
  if (!domain) {
    result.error = "no domain";
    return result;
  }
  const first = await homepage(domain, options.fetchText);
  const origin = new URL(first.url).origin;
  const disallow = parseRobots(await options.fetchText(`${origin}/robots.txt`));

  const visit = async (url: string, prefetched?: string) => {
    if (!robotsAllows(disallow, url)) {
      result.skippedByRobots.push(url);
      return "";
    }
    let html = prefetched ?? (await options.fetchText(url));
    if (options.render && visibleTextLength(html) < RENDER_THRESHOLD) {
      const rendered = await options.render(url);
      if (visibleTextLength(rendered) > visibleTextLength(html)) {
        html = rendered;
        result.rendered.push(url);
      }
    }
    if (!html) return "";
    result.pagesFetched.push(url);
    for (const email of extractEmails(html, domain)) {
      if (!result.emails.some((e) => e.email === email)) result.emails.push({ email, url });
    }
    const people: Person[] = [...extractJsonLdPeople(html, url), ...extractRolePeople(html, url)];
    for (const p of people) if (!result.people.some((q) => q.name === p.name)) result.people.push(p);
    return html;
  };

  const homeHtml = await visit(first.url, first.html);
  if (!homeHtml && !result.skippedByRobots.length) {
    result.error = "site unreachable";
    return result;
  }
  let queue = extractTeamLinks(homeHtml, first.url);
  if (queue.length < 2) queue = [...queue, ...FALLBACK_PATHS.map((p) => `${origin}${p}`)];
  const seen = new Set([first.url]);
  for (const url of queue) {
    if (result.pagesFetched.length >= maxPages) break;
    if (seen.has(url)) continue;
    seen.add(url);
    await visit(url);
  }
  return result;
}

/** Runs `fn` over `items` with at most `limit` in flight, keeping input order in the output. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}
