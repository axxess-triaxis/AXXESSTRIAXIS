// Lead-sourcing tool: seeds -> crawl (with JS render fallback) -> pick one contact per company ->
// optional guessed-address verification -> import CSV + review file. Never imports or enrolls.
//
//   pnpm run gtm:source-leads --seeds seeds.txt --out gtm/leads_x.csv --review gtm/leads_x_review.md
//     [--apollo saved.json --segment clinic --country AE] [--exclude gtm/do_not_contact.csv]
//     [--known gtm/leads_a.csv,gtm/leads_b.csv] [--no-render] [--verify --max-verify 20] [--json raw.jsonl]
//
// --verify spends QuickEmailVerification credits on guessed addresses only (QEV_API_KEY from the
// gitignored .env.local). The cap defaults to 20 and the run prints how many it spent.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { checkLeadCsv, formatLeadCsvReport, verifyEmails } from "../check-leads-csv.mts";
import { USER_AGENT, crawlSite, mapLimit } from "./crawl.mts";
import { toImportCsv, toReviewMarkdown } from "./output.mts";
import { pickCandidate, type Budget, type Verifier } from "./pick.mts";
import { filterSeeds, knownFromCsv, parseApolloSeeds, parsePipeSeeds } from "./seeds.mts";
import type { Candidate, FetchText, RenderHtml, Seed } from "./types.mts";

export type Args = {
  seeds?: string;
  apollo?: string;
  segment: string;
  country: string;
  out?: string;
  review?: string;
  json?: string;
  exclude: string[];
  known: string[];
  render: boolean;
  verify: boolean;
  maxVerify: number;
  usageError?: string;
};

export function parseArgs(argv: string[]): Args {
  const value = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const list = (flag: string) => (value(flag) ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const args: Args = {
    seeds: value("--seeds"),
    apollo: value("--apollo"),
    segment: value("--segment") ?? "unknown",
    country: value("--country") ?? "",
    out: value("--out"),
    review: value("--review"),
    json: value("--json"),
    exclude: list("--exclude"),
    known: list("--known"),
    render: !argv.includes("--no-render"),
    verify: argv.includes("--verify"),
    maxVerify: Number(value("--max-verify") ?? 20),
  };
  if (!args.seeds && !args.apollo) args.usageError = "Give --seeds <file> or --apollo <file>.";
  else if (args.apollo && !args.country) args.usageError = "--apollo needs --country (IN or AE).";
  else if (!args.out) args.usageError = "Give --out <file.csv>.";
  else if (!Number.isInteger(args.maxVerify) || args.maxVerify < 0) args.usageError = "--max-verify must be a whole number.";
  return args;
}

function fetchTextFactory(): FetchText {
  return async (url) => {
    try {
      const response = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "text/html,*/*" }, redirect: "follow", signal: AbortSignal.timeout(10_000) });
      if (!response.ok) return "";
      const type = response.headers.get("content-type") ?? "";
      if (type && !/text|html|xml/.test(type)) return "";
      return (await response.text()).slice(0, 800_000);
    } catch {
      return "";
    }
  };
}

/** A lazily launched headless Chromium shared by all sites. Returns a closer. */
async function rendererFactory(): Promise<{ render: RenderHtml; close: () => Promise<void> }> {
  let browser: import("@playwright/test").Browser | undefined;
  let launching: Promise<import("@playwright/test").Browser> | undefined;
  const get = async () => {
    if (browser) return browser;
    launching ??= import("@playwright/test").then(({ chromium }) => chromium.launch({ headless: true }));
    browser = await launching;
    return browser;
  };
  return {
    render: async (url) => {
      try {
        const context = await (await get()).newContext({ userAgent: USER_AGENT });
        try {
          const page = await context.newPage();
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15_000 });
          await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
          return await page.content();
        } finally {
          await context.close();
        }
      } catch {
        return "";
      }
    },
    close: async () => {
      await browser?.close();
    },
  };
}

function loadSeeds(args: Args): Seed[] {
  const seeds: Seed[] = [];
  if (args.seeds) seeds.push(...parsePipeSeeds(readFileSync(args.seeds, "utf8"), `seed list ${args.seeds.split(/[\\/]/).pop()}`));
  if (args.apollo) seeds.push(...parseApolloSeeds(JSON.parse(readFileSync(args.apollo, "utf8")), args.segment, args.country));
  return seeds;
}

const readAll = (paths: string[]) => paths.filter((p) => existsSync(p)).map((p) => readFileSync(p, "utf8"));

async function main(argv: string[]): Promise<number> {
  const args = parseArgs(argv);
  if (args.usageError) {
    console.error(args.usageError);
    console.error("Usage: pnpm run gtm:source-leads --seeds <file> --out <file.csv> [--review <file.md>] [--exclude a.csv] [--known b.csv,c.csv] [--no-render] [--verify --max-verify N]");
    return 2;
  }
  const missing = [...args.exclude, ...args.known].filter((p) => !existsSync(p));
  if (missing.length) {
    console.error(`Not found: ${missing.join(", ")}`);
    return 2;
  }
  const filtered = filterSeeds(loadSeeds(args), knownFromCsv(readAll(args.exclude)), knownFromCsv(readAll(args.known)));
  console.log(`Seeds: ${filtered.kept.length} to crawl, ${filtered.excluded.length} on the exclusion list (not fetched), ${filtered.duplicates.length} already known or duplicate.`);

  let verify: Verifier | undefined;
  if (args.verify) {
    const apiKey = process.env.QEV_API_KEY;
    if (!apiKey) {
      console.error("QEV_API_KEY is not set. Add it to .env.local (gitignored) and run again.");
      return 2;
    }
    verify = (emails) => verifyEmails(emails, { apiKey });
  }
  const budget: Budget = { remaining: args.maxVerify, spent: 0 };
  const renderer = args.render ? await rendererFactory() : undefined;
  const fetchText = fetchTextFactory();
  const date = new Date().toISOString().slice(0, 10);

  try {
    const sites = await mapLimit(filtered.kept, 4, (seed) => crawlSite(seed, { fetchText, render: renderer?.render }));
    if (args.json) writeFileSync(args.json, sites.map((s) => JSON.stringify(s)).join("\n") + "\n");
    const candidates: Candidate[] = [];
    // Sequential so the credit cap is exact.
    for (const site of sites) {
      const c = await pickCandidate(site, { verify, budget, date });
      if (c) candidates.push(c);
    }
    candidates.sort((a, b) => b.score - a.score);
    const csv = toImportCsv(candidates, date);
    writeFileSync(args.out!, csv);

    const count = (k: string) => candidates.filter((c) => c.emailKind === k).length;
    const stats = {
      "Sites crawled": sites.length,
      "Sites reached": sites.filter((s) => !s.error).length,
      "Pages rendered in a browser": sites.reduce((n, s) => n + s.rendered.length, 0),
      "Sites with an on-domain email": sites.filter((s) => s.emails.length).length,
      "Sites with a named leader": sites.filter((s) => s.people.length).length,
      Candidates: candidates.length,
      "Personal address published": count("published-personal"),
      "Guessed and confirmed": count("guessed"),
      "Role inbox": count("published-role"),
      "QEV credits spent": budget.spent,
      "Exclusion-list seeds skipped": filtered.excluded.length,
    };
    for (const [k, v] of Object.entries(stats)) console.log(`${k}: ${v}`);
    if (args.review) writeFileSync(args.review, toReviewMarkdown(candidates, sites, stats));

    const report = checkLeadCsv(csv);
    for (const line of formatLeadCsvReport(report)) console.log(line);
    console.log(`Wrote ${args.out}${args.review ? ` and ${args.review}` : ""}. Nothing was imported or enrolled.`);
    return report.rejected.length ? 1 : 0;
  } finally {
    await renderer?.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    },
  );
}
