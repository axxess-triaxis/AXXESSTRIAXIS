import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkLeadCsv, formatLeadCsvReport } from "./check-leads-csv.mts";

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
