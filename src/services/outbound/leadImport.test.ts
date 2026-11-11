import { describe, expect, it } from "vitest";
import { MAX_IMPORT_ROWS, parseCsv, parseLeadImport } from "./leadImport";

const HEADER = "company,contact_name,email,phone,country,consent_basis,source";
const empty = { suppressed: new Set<string>(), existing: new Set<string>() };

describe("parseCsv", () => {
  it("handles quoted fields, escaped quotes, commas and CRLF", () => {
    expect(parseCsv('a,b\r\n"x, y","say ""hi"""\r\n')).toEqual([["a", "b"], ["x, y", 'say "hi"']]);
  });
});

describe("parseLeadImport", () => {
  it("accepts a complete row and normalises email, phone and country", () => {
    const csv = `${HEADER}\nAcme Pvt Ltd,Asha Rao, Asha@Acme.IN ,+91 98765 43210,in,b2b_legitimate_interest,Vendor list Nov 2026`;
    const result = parseLeadImport(csv, empty);
    expect(result.rejected).toEqual([]);
    expect(result.accepted).toEqual([{
      organizationName: "Acme Pvt Ltd",
      contactName: "Asha Rao",
      contactEmail: "asha@acme.in",
      contactPhoneE164: "+919876543210",
      country: "IN",
      consentBasis: "b2b_legitimate_interest",
      source: "Vendor list Nov 2026",
    }]);
  });

  it("rejects a file without the required columns", () => {
    const result = parseLeadImport("company,email\nAcme,a@acme.in", empty);
    expect(result.accepted).toEqual([]);
    expect(result.fileError).toMatch(/country.*consent_basis.*source/);
  });

  it("rejects rows with no lawful basis, no source, an unconfigured country, or no contact", () => {
    const csv = [
      HEADER,
      "A,Ann,a@a.in,,IN,,List",
      "B,Ben,b@b.in,,IN,opt_in,",
      "C,Cy,c@c.us,,US,opt_in,List",
      "D,Di,,,AE,opt_in,List",
      "E,Ed,not-an-email,,AE,opt_in,List",
      "F,Fi,,12345,AE,opt_in,List",
    ].join("\n");
    const result = parseLeadImport(csv, empty);
    expect(result.accepted).toEqual([]);
    expect(result.rejected).toEqual([
      { line: 2, reason: "invalid_consent_basis" },
      { line: 3, reason: "missing_source" },
      { line: 4, reason: "country_not_configured" },
      { line: 5, reason: "no_contact_detail" },
      { line: 6, reason: "invalid_email" },
      { line: 7, reason: "invalid_phone" },
    ]);
  });

  it("rejects suppressed contacts, existing leads and duplicates within the file", () => {
    const csv = [
      HEADER,
      "A,Ann,stop@a.in,,IN,opt_in,List",
      "B,Ben,old@b.in,,IN,opt_in,List",
      "C,Cy,new@c.in,,IN,opt_in,List",
      "C2,Cy again,NEW@c.in,,IN,opt_in,List",
    ].join("\n");
    const result = parseLeadImport(csv, { suppressed: new Set(["stop@a.in"]), existing: new Set(["old@b.in"]) });
    expect(result.accepted.map((r) => r.contactEmail)).toEqual(["new@c.in"]);
    expect(result.rejected).toEqual([
      { line: 2, reason: "suppressed" },
      { line: 3, reason: "already_a_lead" },
      { line: 5, reason: "duplicate_in_file" },
    ]);
  });

  it("refuses files above the row limit", () => {
    const rows = Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, i) => `Co${i},N,n${i}@x.in,,IN,opt_in,L`);
    expect(parseLeadImport([HEADER, ...rows].join("\n"), empty).fileError).toMatch(/limit/);
  });
});
