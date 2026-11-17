// Worker run processing with injected fetch, render, verification and clock. Reserved domains only.
import { describe, expect, it, vi } from "vitest";
import { validateWorkerResult } from "../../src/services/leadSourcing/sourcingService.ts";
import type { Seed, VerifyReport } from "../../src/services/leadSourcing/types.ts";
import { processRun } from "./process.ts";

const seeds: Seed[] = [
  { segment: "brokerage", country: "AE", company: "Alpha", domain: "alpha.example", source: "Agent seed list" },
  { segment: "clinic", country: "IN", company: "Beta", domain: "beta.example", source: "Agent seed list" },
];

const filler = "<p>" + "About our firm. ".repeat(40) + "</p>";
const pages: Record<string, string> = {
  "https://www.alpha.example/": `${filler}<h3>Amara Samplefield</h3><p>Founder</p><a href="mailto:info@alpha.example">mail</a>`,
  "https://www.beta.example/": `${filler}<p>Ravi Sampleton, CEO</p><a href="mailto:hello@beta.example">mail</a>`,
};
const fetchText = vi.fn(async (url: string) => pages[url] ?? "");

describe("worker processRun", () => {
  it("crawls each seed, picks one candidate per company and spends no credits without a verifier", async () => {
    const result = await processRun({ id: "run-1", seeds, verifyCap: 5 }, { fetchText, now: () => 0, deadline: 1 });
    expect(result.candidates.map((c) => [c.domain, c.contactName, c.email])).toEqual(
      expect.arrayContaining([
        ["alpha.example", "Amara Samplefield", "info@alpha.example"],
        ["beta.example", "Ravi Sampleton", "hello@beta.example"],
      ]),
    );
    expect(result.creditsSpent).toBe(0);
    expect(result.stats).toMatchObject({ "Sites crawled": 2, Candidates: 2, "Role inbox": 2 });
    // The server accepts exactly what the worker sends.
    const accepted = validateWorkerResult({ seeds, verifyCap: 5 }, result);
    expect(accepted.ok && accepted.candidates).toHaveLength(2);
  });

  it("verifies guesses only up to the run's cap", async () => {
    const verify = vi.fn(async (emails: string[]): Promise<VerifyReport> => ({ results: emails.map((email) => ({ email, decision: "drop", result: "invalid", reason: "", role: false })) }));
    const result = await processRun({ id: "run-1", seeds, verifyCap: 3 }, { fetchText, verify, now: () => 0, deadline: 1 });
    expect(result.creditsSpent).toBe(3);
    expect(verify).toHaveBeenCalledTimes(3);
  });

  it("stops starting new sites after the deadline", async () => {
    let t = 0;
    const result = await processRun({ id: "run-1", seeds, verifyCap: 0 }, { fetchText, now: () => t++, deadline: 1, concurrency: 1 });
    expect(result.stats).toMatchObject({ "Sites crawled": 1, "Sites skipped for time": 1 });
  });
});
