// Unit tests for the lead-sourcing tool. No network and no browser: fetch and render are injected.
// Only reserved example.com/.org/.net domains and invented names appear here.
import { describe, expect, it, vi } from "vitest";
import { parseLeadImport } from "../outbound/leadImport.ts";
import type { EmailVerification } from "./types.ts";
import { crawlSite, mapLimit, parseRobots, robotsAllows } from "./crawl.ts";
import { cleanPersonName, decodeCfEmail, domainLabel, extractEmails, extractJsonLdPeople, extractRolePeople, extractTeamLinks, textBlocks } from "./extract.ts";
import { IMPORT_HEADER, toImportCsv, toReviewMarkdown } from "./output.ts";
import { bestPerson, guessPatterns, isRoleAddress, pickCandidate, verifyGuess, type Budget, type Verifier } from "./pick.ts";
import { filterSeeds, knownFromCsv, parseApolloSeeds, parsePipeSeeds } from "./seeds.ts";
import type { Seed, SiteResult } from "./types.ts";

const seed: Seed = { segment: "brokerage", country: "AE", company: "Example Realty", domain: "example.com", source: "seed list test" };

/** Cloudflare-style obfuscation of `email` with XOR key `key`. */
const cf = (email: string, key = 0x5a) => key.toString(16).padStart(2, "0") + [...email].map((ch) => (ch.charCodeAt(0) ^ key).toString(16).padStart(2, "0")).join("");

describe("extract: names", () => {
  it("accepts real-looking names and strips Dr.", () => {
    expect(cleanPersonName("Qaiser Testname")).toEqual({ name: "Qaiser Testname", doctor: false });
    expect(cleanPersonName("Dr. Menaz Samplename")).toEqual({ name: "Menaz Samplename", doctor: true });
    expect(cleanPersonName("Najeeb Abdul Rahman")?.name).toBe("Najeeb Abdul Rahman");
  });

  it("rejects slogans, menu text, template placeholders and initials", () => {
    for (const s of ["Sensory Solutions", "Kenapa Pilih Kami", "Your Trusted Partner", "Our Team Our", "Consult Your Trusted", "Plan Communities For", "Who We Are", "Members Bassam Saadedine", "Eleanor Pena", "Chandrakala P", "United Arab Emirates", "Mohamed"]) {
      expect(cleanPersonName(s), s).toBeNull();
    }
  });
});

describe("extract: emails", () => {
  it("keeps on-domain emails across TLDs, decodes Cloudflare, drops off-domain and assets", () => {
    const html = `
      <a href="mailto:info@example.com">info@example.com</a> %20sales@example.com
      <span class="__cf_email__" data-cfemail="${cf("founder@example.com")}">[email protected]</span>
      <a href="/cdn-cgi/l/email-protection#${cf("care@example.ae")}">x</a>
      someone@gmail.com partner@other.org logo@example.com.png`;
    expect(extractEmails(html, "example.com")).toEqual(["care@example.ae", "founder@example.com", "info@example.com", "sales@example.com"]);
  });

  it("survives a malformed percent sequence", () => {
    expect(() => extractEmails("%E0%A4%info@example.com", "example.com")).not.toThrow();
    expect(extractEmails("x %zz sales@example.com", "example.com")).toEqual(["sales@example.com"]);
  });

  it("decodes a Cloudflare hex string", () => {
    expect(decodeCfEmail(cf("a.b@example.org", 0x21))).toBe("a.b@example.org");
  });

  it("finds the company label in two-level TLDs", () => {
    expect(domainLabel("www.example.co.in")).toBe("example");
    expect(domainLabel("example-re.ae")).toBe("example-re");
  });
});

describe("extract: people", () => {
  it("pairs a name and role in the same block or adjacent blocks only", () => {
    const html = `
      <h3>Qaiser Testname, CEO</h3>
      <div><h4>Amara Samplefield</h4><p>Founder</p></div>
      <p>Mohamed Exampleton Managing Director</p>
      <p>We are your trusted partner in Dubai real estate since 2010 with a founder-led team</p>
      <p>Our Insurance Partner</p>`;
    const people = extractRolePeople(html, "https://example.com/team");
    expect(people.map((p) => [p.name, p.role])).toEqual([
      ["Qaiser Testname", "CEO"],
      ["Amara Samplefield", "Founder"],
      ["Mohamed Exampleton", "Managing Director"],
    ]);
  });

  it("reads JSON-LD founders and Person job titles", () => {
    const html = `<script type="application/ld+json">{"@context":"https://schema.org","@graph":[
      {"@type":"Organization","name":"Example","founder":{"@type":"Person","name":"Dr. Lina Exampleford"}},
      {"@type":"Person","name":"Ravi Sampleton","jobTitle":"Medical Director"},
      {"@type":"Person","name":"Front Desk","jobTitle":"Receptionist"}]}</script>`;
    const people = extractJsonLdPeople(html, "https://example.com/");
    expect(people.map((p) => [p.name, p.role, p.doctor])).toEqual([
      ["Lina Exampleford", "Founder", true],
      ["Ravi Sampleton", "Medical Director", false],
    ]);
  });
});

describe("extract: links", () => {
  it("follows same-site team/about/contact links only, up to the cap", () => {
    const html = `
      <a href="/about-us">About</a><a href="https://www.example.com/our-team">Team</a>
      <a href="/listings">Buy</a><a href="https://facebook.com/example">About us on FB</a>
      <a href="/files/brochure.pdf">About (PDF)</a><a href="/contact#form">Contact</a>
      <a href="/doctors">Doctors</a>`;
    expect(extractTeamLinks(html, "https://www.example.com/")).toEqual([
      "https://www.example.com/about-us",
      "https://www.example.com/our-team",
      "https://www.example.com/contact",
      "https://www.example.com/doctors",
    ]);
    expect(extractTeamLinks(html, "https://www.example.com/", 2)).toHaveLength(2);
  });
});

describe("crawl", () => {
  it("parses robots.txt for * and respects Disallow", () => {
    const rules = parseRobots("User-agent: Googlebot\nDisallow: /\n\nUser-agent: *\nDisallow: /private\nAllow: /\n");
    expect(rules).toEqual(["/private"]);
    expect(robotsAllows(rules, "https://example.com/private/team")).toBe(false);
    expect(robotsAllows(rules, "https://example.com/team")).toBe(true);
  });

  it("follows team links, renders thin pages, stops at the page cap and skips robots-blocked pages", async () => {
    const pages: Record<string, string> = {
      "https://www.example.com/": `<p>${"Welcome to Example Realty. ".repeat(30)}</p><a href="/team">Team</a><a href="/private/about">About</a><a href="/contact">Contact</a><a href="/about-us">About us</a>`,
      "https://www.example.com/robots.txt": "User-agent: *\nDisallow: /private",
      "https://www.example.com/team": `<div id="root"></div>`,
      "https://www.example.com/contact": `<p>${"Write to us. ".repeat(40)}</p><a href="mailto:info@example.com">mail</a>`,
      "https://www.example.com/about-us": `<p>${"History. ".repeat(60)}</p>`,
    };
    const fetchText = vi.fn(async (url: string) => pages[url] ?? "");
    const render = vi.fn(async (url: string) => (url.endsWith("/team") ? `<h3>Qaiser Testname</h3><p>Founder</p><p>${"Bio text. ".repeat(50)}</p>` : ""));
    const site = await crawlSite(seed, { fetchText, render, maxPages: 3 });
    expect(site.pagesFetched).toEqual(["https://www.example.com/", "https://www.example.com/team", "https://www.example.com/contact"]);
    expect(site.skippedByRobots).toEqual(["https://www.example.com/private/about"]);
    expect(site.rendered).toEqual(["https://www.example.com/team"]);
    expect(site.people.map((p) => p.name)).toEqual(["Qaiser Testname"]);
    expect(site.emails).toEqual([{ email: "info@example.com", url: "https://www.example.com/contact" }]);
    expect(fetchText).not.toHaveBeenCalledWith("https://www.example.com/private/about");
  });

  it("reports an unreachable site without throwing", async () => {
    const site = await crawlSite(seed, { fetchText: async () => "" });
    expect(site.error).toBe("site unreachable");
  });

  it("mapLimit keeps order and caps concurrency", async () => {
    let active = 0;
    let peak = 0;
    const out = await mapLimit([1, 2, 3, 4, 5, 6], 2, async (n) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return n * 10;
    });
    expect(out).toEqual([10, 20, 30, 40, 50, 60]);
    expect(peak).toBeLessThanOrEqual(2);
  });
});

const site = (over: Partial<SiteResult> = {}): SiteResult => ({
  seed,
  domain: "example.com",
  pagesFetched: [],
  rendered: [],
  emails: [{ email: "info@example.com", url: "https://www.example.com/contact" }],
  people: [{ name: "Amara Samplefield", role: "Director", url: "https://www.example.com/team", via: "role-block", doctor: false }],
  skippedByRobots: [],
  ...over,
});

const qev = (decide: (email: string) => Partial<EmailVerification>): Verifier =>
  vi.fn(async (emails: string[]) => ({ results: emails.map((email) => ({ email, decision: "review" as const, result: "valid", reason: "", role: false, ...decide(email) })) }));

describe("pick", () => {
  it("guesses first@, first.last@, firstlast@, f.last@", () => {
    expect(guessPatterns("Amara Samplefield", "example.com")).toEqual(["amara@example.com", "amara.samplefield@example.com", "amarasamplefield@example.com", "a.samplefield@example.com"]);
    expect(guessPatterns("Madonna", "example.com")).toEqual([]);
  });

  it("stops at the first keep and counts spend", async () => {
    const verify = qev((e) => (e === "amara.samplefield@example.com" ? { decision: "keep" } : { decision: "drop", result: "invalid" }));
    const budget: Budget = { remaining: 10, spent: 0 };
    const out = await verifyGuess("Amara Samplefield", "example.com", verify, budget);
    expect(out.email).toBe("amara.samplefield@example.com");
    expect(budget).toEqual({ remaining: 8, spent: 2 });
  });

  it("stops on an accept-all domain and never exceeds the cap", async () => {
    const acceptAll = qev(() => ({ reason: "accept_all" }));
    const b1: Budget = { remaining: 10, spent: 0 };
    expect((await verifyGuess("Amara Samplefield", "example.com", acceptAll, b1)).email).toBeUndefined();
    expect(b1.spent).toBe(1);
    const drops = qev(() => ({ decision: "drop" }));
    const b2: Budget = { remaining: 3, spent: 0 };
    await verifyGuess("Amara Samplefield", "example.com", drops, b2);
    expect(b2).toEqual({ remaining: 0, spent: 3 });
  });

  it("prefers a registry-named person, then the higher role", () => {
    const s = site({ people: [{ name: "Amara Samplefield", role: "Director", url: "u", via: "role-block", doctor: false }, { name: "Ravi Sampleton", role: "Founder", url: "u", via: "role-block", doctor: false }] });
    expect(bestPerson(s)?.name).toBe("Ravi Sampleton");
    expect(bestPerson({ ...s, seed: { ...seed, registryName: "Lina Exampleford", registryRole: "Owner" } })?.via).toBe("registry");
  });

  it("uses a published personal address, then a confirmed guess, then the role inbox", async () => {
    const withPersonal = site({ emails: [{ email: "amara@example.com", url: "https://www.example.com/team" }, { email: "info@example.com", url: "c" }] });
    expect((await pickCandidate(withPersonal, { date: "2026-11-17" }))?.emailKind).toBe("published-personal");

    const verify = qev((e) => (e === "amara@example.com" ? { decision: "keep" } : {}));
    const guessed = await pickCandidate(site(), { verify, budget: { remaining: 5, spent: 0 }, date: "2026-11-17" });
    expect(guessed).toMatchObject({ email: "amara@example.com", emailKind: "guessed", verified: "keep" });

    const fallback = await pickCandidate(site(), { date: "2026-11-17" });
    expect(fallback).toMatchObject({ email: "info@example.com", emailKind: "published-role" });
    expect(await pickCandidate(site({ people: [] }), { date: "2026-11-17" })).toBeUndefined();
    expect(await pickCandidate(site({ emails: [] }), { date: "2026-11-17" })).toBeUndefined();
  });

  it("recognises role inboxes", () => {
    expect(isRoleAddress("info@example.com")).toBe(true);
    expect(isRoleAddress("enquiry@example.com")).toBe(true);
    expect(isRoleAddress("amara@example.com")).toBe(false);
  });
});

describe("seeds", () => {
  it("parses pipe seeds and saved Apollo results", () => {
    expect(parsePipeSeeds("# c\nclinic|IN|Example Clinic|example.org|Lina Exampleford|Owner\n\n", "s")).toEqual([
      { segment: "clinic", country: "IN", company: "Example Clinic", domain: "example.org", registryName: "Lina Exampleford", registryRole: "Owner", source: "s" },
    ]);
    const apollo = { organizations: [{ name: "Example Realty LLC", domain: "example.net" }, { name: "No Site" }, { name: "Web Only", website_url: "http://www.example.org" }] };
    expect(parseApolloSeeds(apollo, "brokerage", "AE").map((s) => s.domain)).toEqual(["example.net", "example.org"]);
  });

  it("never keeps an exclusion-list company and skips already-known domains", () => {
    const exclusion = knownFromCsv([`${IMPORT_HEADER}\nExample Network Co,,,,IN,b2b_legitimate_interest,Founder network`]);
    // Matching is by domain label across TLDs: old-lead.example and old-lead.test are the same company.
    const known = knownFromCsv([`${IMPORT_HEADER}\nOld Lead,Ravi Sampleton,info@old-lead.example,,IN,b2b_legitimate_interest,x`]);
    const seeds: Seed[] = [
      { ...seed, company: "Example Network Co Pvt Ltd", domain: "network-co.test" },
      { ...seed, company: "Other Name", domain: "www.old-lead.test" },
      { ...seed, company: "Fresh", domain: "fresh.example" },
      { ...seed, company: "Fresh dupe", domain: "fresh.test" },
    ];
    const report = filterSeeds(seeds, exclusion, known);
    expect(report.excluded.map((s) => s.company)).toEqual(["Example Network Co Pvt Ltd"]);
    expect(report.duplicates.map((s) => s.company)).toEqual(["Other Name", "Fresh dupe"]);
    expect(report.kept.map((s) => s.company)).toEqual(["Fresh"]);
  });
});

describe("output", () => {
  it("writes the importer's exact columns and passes the existing checker", async () => {
    const c = await pickCandidate(site(), { date: "2026-11-17" });
    const csv = toImportCsv([c!], "2026-11-17");
    expect(csv.split("\n")[0]).toBe(IMPORT_HEADER);
    const report = parseLeadImport(csv, { suppressed: new Set(), existing: new Set() });
    expect(report.rejected).toEqual([]);
    expect(report.accepted).toHaveLength(1);
    expect(report.accepted[0]).toMatchObject({ contactName: "Amara Samplefield", contactEmail: "info@example.com", country: "AE" });
  });

  it("lists misses with a reason in the review file", () => {
    const md = toReviewMarkdown([], [site({ people: [] }), site({ emails: [], people: [] }), site({ error: "site unreachable" })], { Candidates: 0 });
    expect(md).toContain("email but no named leader");
    expect(md).toContain("no email and no named leader");
    expect(md).toContain("site unreachable");
    expect(md).toContain("Nothing here is imported or enrolled");
  });
});

describe("extract: hardening", () => {
  it("decodes entities in one pass, so &amp;lt; stays literal", () => {
    expect(textBlocks("<p>A &amp;lt;b&amp;gt; &amp; B&#039;s &nbsp;x</p>")).toEqual(["A &lt;b&gt; & B's x"]);
  });

  it("drops script and style bodies even when the end tag has trailing space", () => {
    const blocks = textBlocks("<p>Visible</p><script>var a = 1;</script ><style>.x{}</style\n><p>After</p>");
    expect(blocks).toEqual(["Visible", "After"]);
  });

  it("escapes backslashes and pipes in review markdown", () => {
    const md = toReviewMarkdown([], [site({ seed: { ...seed, company: "Back\\slash | Co" }, people: [] })], { Candidates: 0 });
    expect(md).toContain("Back\\\\slash \\| Co");
  });
});
