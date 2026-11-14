// Checks a lead CSV against AXXESS's real import rules before upload (lead list plan
// docs/readiness/LEAD_LIST_PLAN_2026_11_14.md). It runs the same parseLeadImport the import route
// uses, locally, and writes nothing: no database, no sending.
//
//   pnpm run gtm:check-leads path/to/leads.csv
//
// Suppressed contacts and existing leads live in the database, so they are checked again by the
// app on upload. This script also warns about personal mailboxes, which the plan excludes but the
// importer does not reject.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { parseLeadImport, type ImportContext, type LeadImportResult } from "../src/services/outbound/leadImport.ts";

const PERSONAL_MAILBOX = /@(gmail|googlemail|yahoo|ymail|hotmail|outlook|live|icloud|me|aol|proton|protonmail|rediffmail|zoho)\.[a-z.]+$/i;

export type LeadCsvReport = LeadImportResult & {
  byCountry: Record<string, number>;
  personalMailboxes: string[];
};

export function checkLeadCsv(text: string, context: ImportContext = { suppressed: new Set(), existing: new Set() }): LeadCsvReport {
  const result = parseLeadImport(text, context);
  const byCountry: Record<string, number> = {};
  for (const lead of result.accepted) byCountry[lead.country] = (byCountry[lead.country] ?? 0) + 1;
  const personalMailboxes = result.accepted
    .map((lead) => lead.contactEmail)
    .filter((email): email is string => Boolean(email && PERSONAL_MAILBOX.test(email)));
  return { ...result, byCountry, personalMailboxes };
}

export function formatLeadCsvReport(report: LeadCsvReport): string[] {
  if (report.fileError) return [`File error: ${report.fileError}`];
  const countries = Object.entries(report.byCountry).map(([c, n]) => `${c} ${n}`).join(", ") || "none";
  const lines = [`Accepted ${report.accepted.length} (${countries}); rejected ${report.rejected.length}.`];
  for (const r of report.rejected) lines.push(`  line ${r.line}: ${r.reason}`);
  if (report.personalMailboxes.length) {
    lines.push(`Warning: ${report.personalMailboxes.length} personal mailbox(es); the plan allows business domains only:`);
    for (const email of report.personalMailboxes) lines.push(`  ${email}`);
  }
  return lines;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: pnpm run gtm:check-leads <file.csv>");
    process.exit(2);
  }
  const report = checkLeadCsv(readFileSync(path, "utf8"));
  for (const line of formatLeadCsvReport(report)) console.log(line);
  process.exit(report.fileError || report.rejected.length ? 1 : 0);
}
