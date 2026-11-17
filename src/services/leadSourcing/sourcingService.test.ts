// Pure rules for agent-started lead sourcing. Reserved domains and invented names only.
import { describe, expect, it } from "vitest";
import { parseLeadImport } from "../outbound/leadImport.ts";
import { knownSets } from "./seeds.ts";
import { candidatesToImportCsv, normaliseDomain, parseSeedInput, planRun, toWorkerCandidate, validateWorkerResult } from "./sourcingService.ts";
import type { Seed } from "./types.ts";

const none = { companies: new Set<string>(), labels: new Set<string>() };
const seed = (company: string, domain: string, country = "AE"): Record<string, string> => ({ company, domain, country, segment: "brokerage" });

describe("seed input", () => {
  it("normalises domains and rejects junk", () => {
    expect(normaliseDomain("https://www.Alpha-Realty.example/contact")).toBe("alpha-realty.example");
    expect(normaliseDomain("not a domain")).toBeNull();
    expect(normaliseDomain("-bad.example")).toBeNull();
  });

  it("needs company, a valid domain and IN or AE", () => {
    const { seeds, errors } = parseSeedInput([seed("Alpha", "alpha.example"), { company: "No Domain" }, seed("Beta", "beta.example", "US"), "x", { domain: "gamma.example", country: "IN" }], {});
    expect(seeds.map((s) => s.company)).toEqual(["Alpha"]);
    expect(errors.map((e) => [e.index, e.reason])).toEqual([
      [1, "a valid domain is required"],
      [2, "country must be one of IN, AE"],
      [3, "not an object"],
      [4, "company is required"],
    ]);
  });

  it("uses defaults for country and segment", () => {
    expect(parseSeedInput([{ company: "Alpha", domain: "alpha.example" }], { country: "in", segment: "clinic" }).seeds[0]).toMatchObject({ country: "IN", segment: "clinic" });
  });
});

describe("planRun", () => {
  const base = { segment: "brokerage", requestedVerify: 10, exclusion: none, known: none, creditsUsedThisMonth: 0, monthlyCap: 40 };

  it("drops exclusion-list companies and known leads before anything is fetched", () => {
    const plan = planRun({
      ...base,
      rawSeeds: [seed("Network Friend Pvt Ltd", "friend.example"), seed("Old Lead LLC", "old-lead.example"), seed("Fresh", "fresh.example"), seed("Fresh Again", "fresh.test")],
      exclusion: knownSets(["Network Friend"], []),
      known: knownSets([], ["old-lead.example"]),
    });
    expect(plan).toMatchObject({ ok: true, excluded: 1, duplicates: 2 });
    if (plan.ok) expect(plan.seeds.map((s) => s.company)).toEqual(["Fresh"]);
  });

  it("refuses more than 150 seeds and runs with nothing left", () => {
    const many = Array.from({ length: 151 }, (_, i) => seed(`Co ${i}`, `co${i}.example`));
    expect(planRun({ ...base, rawSeeds: many })).toEqual({ ok: false, reason: "At most 150 seeds per run; split the list." });
    expect(planRun({ ...base, rawSeeds: [seed("Friend", "friend.example")], exclusion: knownSets(["Friend"], []) })).toMatchObject({ ok: false });
    expect(planRun({ ...base, rawSeeds: "nope" })).toEqual({ ok: false, reason: "seeds must be an array" });
  });

  it("caps verification credits by request, per-run maximum and what is left this month", () => {
    const one = [seed("Fresh", "fresh.example")];
    const cap = (over: Partial<typeof base>) => {
      const plan = planRun({ ...base, ...over, rawSeeds: one });
      return plan.ok ? plan.verifyCap : -1;
    };
    expect(cap({ requestedVerify: 10 })).toBe(10);
    expect(cap({ requestedVerify: 100, monthlyCap: 1000 })).toBe(40);
    expect(cap({ requestedVerify: 10, creditsUsedThisMonth: 35 })).toBe(5);
    expect(cap({ requestedVerify: 10, creditsUsedThisMonth: 50 })).toBe(0);
    expect(cap({ requestedVerify: -3 })).toBe(0);
  });
});

describe("import CSV for approved candidates", () => {
  it("passes the importer's real rules, and a suppressed email is still rejected", () => {
    const csv = candidatesToImportCsv(
      [
        { company: "Alpha, Realty", contactName: "Amara Samplefield", email: "amara@alpha.example", country: "AE", role: "Founder", emailKind: "guessed", domain: "alpha.example" },
        { company: "Beta", contactName: "Ravi Sampleton", email: "info@beta.example", country: "IN", role: "CEO", emailKind: "published-role", domain: "beta.example" },
      ],
      "2026-11-17",
    );
    const result = parseLeadImport(csv, { suppressed: new Set(["info@beta.example"]), existing: new Set() });
    expect(result.accepted.map((l) => [l.organizationName, l.contactEmail, l.consentBasis])).toEqual([["Alpha, Realty", "amara@alpha.example", "b2b_legitimate_interest"]]);
    expect(result.rejected).toHaveLength(1);
    expect(result.accepted[0].source).toContain("Lead sourcing (Founder named on alpha.example; guessed)");
  });
});

describe("validateWorkerResult", () => {
  const seeds: Seed[] = [
    { segment: "brokerage", country: "AE", company: "Alpha", domain: "alpha.example", source: "Agent seed list" },
    { segment: "clinic", country: "IN", company: "Beta", domain: "beta.example", source: "Agent seed list" },
  ];
  const good = { domain: "alpha.example", contactName: "Amara Samplefield", role: "Founder", email: "Amara@Alpha.example", emailKind: "guessed", verified: "keep", score: 75, evidence: ["named on /team"] };

  it("keeps candidates that match the run's seeds and drops the rest", () => {
    const result = validateWorkerResult({ seeds, verifyCap: 5 }, {
      candidates: [good, { ...good, contactName: "Second Person" }, { ...good, domain: "stranger.example" }, { ...good, domain: "beta.example", email: "not-an-email" }, { ...good, domain: "beta.example", emailKind: "made-up" }],
      creditsSpent: 9,
      stats: { "Sites crawled": 2, nested: { x: 1 } },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({ seed: { company: "Alpha", country: "AE" }, email: "amara@alpha.example", verified: "keep" });
    expect(result.dropped).toBe(4);
    expect(result.creditsSpent).toBe(5);
    expect(result.stats).toEqual({ "Sites crawled": 2 });
  });

  it("rejects a malformed body", () => {
    expect(validateWorkerResult({ seeds, verifyCap: 0 }, null)).toMatchObject({ ok: false });
    expect(validateWorkerResult({ seeds, verifyCap: 0 }, { candidates: "x" })).toMatchObject({ ok: false });
  });

  it("round-trips a crawler candidate through the worker shape", () => {
    const flat = toWorkerCandidate({ seed: seeds[1], contactName: "Ravi Sampleton", role: "CEO", email: "info@beta.example", emailKind: "published-role", score: 60, evidence: [] });
    const result = validateWorkerResult({ seeds, verifyCap: 0 }, { candidates: [flat] });
    expect(result.ok && result.candidates[0].seed.company).toBe("Beta");
  });
});
