// Lead CSV import (GTM plan 2026-11-11, Day 1 item 5). Pure parsing and checking: every row must
// carry a lawful basis, a source and a configured country, and is refused if the contact is on the
// suppression list, is already a lead, or appears twice in the file. Nothing here writes data.
import type { ConsentBasis, ConfiguredCountry } from "../../compliance/contactability";

export const MAX_IMPORT_ROWS = 2000;
const REQUIRED_COLUMNS = ["company", "contact_name", "email", "phone", "country", "consent_basis", "source"] as const;
const CONSENT_BASES: ReadonlySet<string> = new Set<ConsentBasis>(["opt_in", "b2b_legitimate_interest"]);
const COUNTRIES: ReadonlySet<string> = new Set<ConfiguredCountry>(["IN", "AE"]);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const E164 = /^\+[1-9][0-9]{6,14}$/;

export type ImportedLead = {
  organizationName: string;
  contactName?: string;
  contactEmail?: string;
  contactPhoneE164?: string;
  country: ConfiguredCountry;
  consentBasis: ConsentBasis;
  source: string;
};

export type ImportRejection = {
  line: number;
  reason:
    | "invalid_consent_basis"
    | "missing_source"
    | "missing_company"
    | "country_not_configured"
    | "no_contact_detail"
    | "invalid_email"
    | "invalid_phone"
    | "suppressed"
    | "already_a_lead"
    | "duplicate_in_file";
};

export type LeadImportResult = { accepted: ImportedLead[]; rejected: ImportRejection[]; fileError?: string };

/** Identifiers are lower-cased emails and E.164 phone numbers. */
export type ImportContext = { suppressed: ReadonlySet<string>; existing: ReadonlySet<string> };

/** RFC 4180 CSV: quoted fields, doubled quotes, commas and newlines inside quotes, CRLF or LF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += ch;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

export function normaliseEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalisePhone(value: string): string {
  return value.replace(/[\s().-]/g, "");
}

export function parseLeadImport(text: string, context: ImportContext): LeadImportResult {
  const rows = parseCsv(text.replace(/^﻿/, ""));
  const header = (rows[0] ?? []).map((h) => h.trim().toLowerCase());
  const missing = REQUIRED_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length) return { accepted: [], rejected: [], fileError: `Missing required columns: ${missing.join(", ")}.` };

  const dataRows = rows.slice(1);
  if (dataRows.length > MAX_IMPORT_ROWS) {
    return { accepted: [], rejected: [], fileError: `File has ${dataRows.length} rows; the limit is ${MAX_IMPORT_ROWS}.` };
  }

  const col = Object.fromEntries(REQUIRED_COLUMNS.map((c) => [c, header.indexOf(c)])) as Record<typeof REQUIRED_COLUMNS[number], number>;
  const accepted: ImportedLead[] = [];
  const rejected: ImportRejection[] = [];
  const seen = new Set<string>();

  dataRows.forEach((cells, index) => {
    const line = index + 2;
    if (cells.every((c) => c.trim() === "")) return;
    const get = (c: typeof REQUIRED_COLUMNS[number]) => (cells[col[c]] ?? "").trim();
    const reject = (reason: ImportRejection["reason"]) => rejected.push({ line, reason });

    const consentBasis = get("consent_basis").toLowerCase();
    const source = get("source");
    const company = get("company");
    const country = get("country").toUpperCase();
    const email = normaliseEmail(get("email"));
    const phone = normalisePhone(get("phone"));

    if (!CONSENT_BASES.has(consentBasis)) return reject("invalid_consent_basis");
    if (!source) return reject("missing_source");
    if (!company) return reject("missing_company");
    if (!COUNTRIES.has(country)) return reject("country_not_configured");
    if (!email && !phone) return reject("no_contact_detail");
    if (email && !EMAIL.test(email)) return reject("invalid_email");
    if (phone && !E164.test(phone)) return reject("invalid_phone");

    const ids = [email, phone].filter(Boolean);
    if (ids.some((id) => context.suppressed.has(id))) return reject("suppressed");
    if (ids.some((id) => context.existing.has(id))) return reject("already_a_lead");
    if (ids.some((id) => seen.has(id))) return reject("duplicate_in_file");
    ids.forEach((id) => seen.add(id));

    accepted.push({
      organizationName: company,
      contactName: get("contact_name") || undefined,
      contactEmail: email || undefined,
      contactPhoneE164: phone || undefined,
      country: country as ConfiguredCountry,
      consentBasis: consentBasis as ConsentBasis,
      source,
    });
  });

  return { accepted, rejected };
}
