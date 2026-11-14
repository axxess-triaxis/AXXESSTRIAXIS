import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkLeadCsv,
  classifyQev,
  formatLeadCsvReport,
  formatVerifyReport,
  parseArgs,
  verifiedCsv,
  verifyEmails,
} from "./check-leads-csv.mts";

// Reserved example.com / example.org domains only: nothing in this file can reach a real person.
// Read by path from the repo root (vitest's cwd): under the jsdom environment import.meta.url is not a file URL.
const dummy = readFileSync(join(process.cwd(), "scripts", "fixtures", "leads_dummy_batch1.csv"), "utf8");

describe("lead CSV pre-check", () => {
  it("accepts the 9 valid dummy rows and rejects each planted mistake with its reason", () => {
    const report = checkLeadCsv(dummy, {
      suppressed: new Set(["suppressed@realty-sup.example.com"]),
      existing: new Set(["existing@clinic-old.example.org"]),
    });
    expect(report.accepted).toHaveLength(9);
    expect(report.byCountry).toEqual({ IN: 5, AE: 4 });
    expect(report.rejected.map((r) => [r.line, r.reason])).toEqual([
      [11, "duplicate_in_file"],
      [12, "invalid_consent_basis"],
      [13, "missing_source"],
      [14, "missing_company"],
      [15, "country_not_configured"],
      [16, "invalid_email"],
      [17, "invalid_phone"],
      [18, "no_contact_detail"],
      [19, "suppressed"],
      [20, "already_a_lead"],
      [21, "invalid_consent_basis"],
    ]);
    expect(report.personalMailboxes).toEqual([]);
  });

  it("without database lists, suppressed and existing rows pass the local check (the app rechecks them)", () => {
    const report = checkLeadCsv(dummy);
    expect(report.accepted).toHaveLength(11);
    expect(report.rejected.map((r) => r.reason)).not.toContain("suppressed");
  });

  it("warns about personal mailboxes, which the importer itself accepts", () => {
    const csv = "company,contact_name,email,phone,country,consent_basis,source\n" +
      "Example Realty,Test,someone@gmail.com,,IN,b2b_legitimate_interest,https://realty.example.com\n" +
      "Example Clinic,Test,ops@clinic.example.org,,AE,opt_in,Founder network\n";
    const report = checkLeadCsv(csv);
    expect(report.accepted).toHaveLength(2);
    expect(report.personalMailboxes).toEqual(["someone@gmail.com"]);
    expect(formatLeadCsvReport(report)).toEqual([
      "Accepted 2 (IN 1, AE 1); rejected 0.",
      "Warning: 1 personal mailbox(es); the plan allows business domains only:",
      "  someone@gmail.com",
    ]);
  });

  it("reports a file error for missing columns", () => {
    const report = checkLeadCsv("company,email\nExample,ops@x.example.com\n");
    expect(formatLeadCsvReport(report)).toEqual([
      "File error: Missing required columns: contact_name, phone, country, consent_basis, source.",
    ]);
  });
});

describe("email verification (QuickEmailVerification, mocked)", () => {
  const KEY = "test-key-not-real";
  const qev = (body: Record<string, unknown>, init: { status?: number; credits?: string } = {}) =>
    new Response(JSON.stringify(body), {
      status: init.status ?? 200,
      headers: init.credits ? { "X-QEV-Remaining-Credits": init.credits } : {},
    });
  const ok = (extra: Record<string, unknown>) => ({ success: "true", result: "valid", safe_to_send: "true", ...extra });

  it("classifies keep, review and drop, accepting string or real booleans", () => {
    expect(classifyQev(ok({})).decision).toBe("keep");
    expect(classifyQev({ success: true, result: "valid", safe_to_send: true }).decision).toBe("keep");
    expect(classifyQev(ok({ accept_all: "true" }))).toMatchObject({ decision: "review", reason: "accept_all" });
    expect(classifyQev(ok({ result: "unknown", safe_to_send: "false", reason: "timeout" }))).toMatchObject({ decision: "review", reason: "timeout" });
    expect(classifyQev(ok({ result: "invalid", safe_to_send: "false", reason: "rejected_email" })).decision).toBe("drop");
    expect(classifyQev(ok({ disposable: "true" })).decision).toBe("drop");
    expect(classifyQev(ok({ role: "true" })).role).toBe(true);
  });

  it("verifies each email once, sends only the address and key, and reports remaining credits", async () => {
    const urls: string[] = [];
    const answers: Record<string, Record<string, unknown>> = {
      "ops@a.example.com": ok({ role: "true" }),
      "x@b.example.com": ok({ result: "invalid", safe_to_send: "false", reason: "rejected_email" }),
      "y@c.example.com": ok({ accept_all: "true" }),
    };
    const fetchFn = async (url: string) => {
      urls.push(url);
      const email = new URL(url).searchParams.get("email") ?? "";
      return qev(answers[email], { credits: "2997" });
    };
    const report = await verifyEmails(Object.keys(answers), { apiKey: KEY, fetchFn });
    expect(urls).toHaveLength(3);
    for (const u of urls) expect([...new URL(u).searchParams.keys()].sort()).toEqual(["apikey", "email"]);
    const lines = formatVerifyReport(report);
    expect(lines).toEqual([
      "Verified 3: keep 1, review 1, drop 1.",
      "  review: y@c.example.com (valid, accept_all)",
      "  drop: x@b.example.com (invalid, rejected_email)",
      "Role addresses (such as info@): 1.",
      "QEV credits remaining: 2997.",
    ]);
    expect(lines.join("\n")).not.toContain(KEY);
  });

  it("stops on an API failure with QEV's message and never echoes the key", async () => {
    const fetchFn = async () => qev({ success: "false", message: `Invalid API key ${KEY}` }, { status: 401 });
    await expect(verifyEmails(["ops@a.example.com"], { apiKey: KEY, fetchFn })).rejects.toThrow(
      "Email verification failed for ops@a.example.com: Invalid API key [key]",
    );
  });

  it("writes only kept rows and phone-only rows to the verified CSV", () => {
    const csv = "company,contact_name,email,phone,country,consent_basis,source\n" +
      "\"Keep, Ltd\",Test,keep@a.example.com,,IN,opt_in,Founder network\n" +
      "Drop Co,Test,drop@b.example.com,,AE,b2b_legitimate_interest,https://b.example.com\n" +
      "Phone Co,,,+919000000001,IN,opt_in,Founder network\n";
    const report = checkLeadCsv(csv);
    const out = verifiedCsv(report.accepted, {
      results: [
        { email: "keep@a.example.com", decision: "keep", result: "valid", reason: "", role: false },
        { email: "drop@b.example.com", decision: "drop", result: "invalid", reason: "", role: false },
      ],
    });
    expect(out.trim().split("\n")).toEqual([
      "company,contact_name,email,phone,country,consent_basis,source",
      "\"Keep, Ltd\",Test,keep@a.example.com,,IN,opt_in,Founder network",
      "Phone Co,,,+919000000001,IN,opt_in,Founder network",
    ]);
    expect(checkLeadCsv(out).accepted).toHaveLength(2);
  });

  it("parses --verify and --out arguments", () => {
    expect(parseArgs(["leads.csv"])).toMatchObject({ path: "leads.csv", verify: false, usageError: false });
    expect(parseArgs(["--verify", "--out", "ok.csv", "leads.csv"])).toMatchObject({ path: "leads.csv", verify: true, outPath: "ok.csv", usageError: false });
    expect(parseArgs(["leads.csv", "--out"]).usageError).toBe(true);
    expect(parseArgs([]).usageError).toBe(true);
  });
});
