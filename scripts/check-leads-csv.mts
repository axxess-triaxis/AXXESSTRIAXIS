// Checks a lead CSV against AXXESS's real import rules before upload (lead list plan
// docs/readiness/LEAD_LIST_PLAN_2026_11_14.md). It runs the same parseLeadImport the import route
// uses, locally, and writes nothing to the database and sends nothing.
//
//   pnpm run gtm:check-leads path/to/leads.csv
//   pnpm run gtm:check-leads path/to/leads.csv --verify [--out path/to/verified.csv]
//
// Suppressed contacts and existing leads live in the database, so they are checked again by the
// app on upload. This script also warns about personal mailboxes, which the plan excludes but the
// importer does not reject.
//
// --verify checks each accepted email with QuickEmailVerification (QEV). The API key is read from
// QEV_API_KEY (put it in the gitignored .env.local; never commit it). Only the email address is
// sent to QEV. --out writes a new CSV holding only rows whose email verified as safe to send, plus
// phone-only rows.
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { parseLeadImport, type ImportContext, type ImportedLead, type LeadImportResult } from "../src/services/outbound/leadImport.ts";

const PERSONAL_MAILBOX = /@(gmail|googlemail|yahoo|ymail|hotmail|outlook|live|icloud|me|aol|proton|protonmail|rediffmail|zoho)\.[a-z.]+$/i;
const QEV_VERIFY_URL = "https://api.quickemailverification.com/v1/verify";

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

// ---- Email verification (QuickEmailVerification) ----

export type VerifyDecision = "keep" | "review" | "drop";
export type EmailVerification = { email: string; decision: VerifyDecision; result: string; reason: string; role: boolean };
export type VerifyReport = { results: EmailVerification[]; remainingCredits?: string };
type FetchFn = (url: string) => Promise<Response>;

/** QEV returns booleans as true/false or "true"/"false". */
const flag = (value: unknown) => value === true || value === "true";

export function classifyQev(body: Record<string, unknown>): Pick<EmailVerification, "decision" | "result" | "reason" | "role"> {
  const result = String(body.result ?? "unknown");
  const acceptAll = flag(body.accept_all);
  let decision: VerifyDecision;
  if (result === "invalid" || flag(body.disposable)) decision = "drop";
  else if (result === "valid" && flag(body.safe_to_send) && !acceptAll) decision = "keep";
  else decision = "review";
  return { decision, result, reason: acceptAll ? "accept_all" : String(body.reason ?? ""), role: flag(body.role) };
}

/** Verifies one address at a time. Throws on an API failure, with QEV's message but never the key. */
export async function verifyEmails(emails: string[], options: { apiKey: string; fetchFn?: FetchFn }): Promise<VerifyReport> {
  const fetchFn = options.fetchFn ?? ((url: string) => fetch(url));
  const results: EmailVerification[] = [];
  let remainingCredits: string | undefined;
  for (const email of emails) {
    const url = `${QEV_VERIFY_URL}?email=${encodeURIComponent(email)}&apikey=${encodeURIComponent(options.apiKey)}`;
    let response: Response;
    try {
      response = await fetchFn(url);
    } catch {
      throw new Error(`Email verification request failed for ${email} (network error).`);
    }
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok || !flag(body.success)) {
      const message = String(body.message ?? `HTTP ${response.status}`).replaceAll(options.apiKey, "[key]");
      throw new Error(`Email verification failed for ${email}: ${message}`);
    }
    remainingCredits = response.headers.get("x-qev-remaining-credits") ?? remainingCredits;
    results.push({ email, ...classifyQev(body) });
  }
  return { results, remainingCredits };
}

export function formatVerifyReport(report: VerifyReport): string[] {
  const count = (d: VerifyDecision) => report.results.filter((r) => r.decision === d).length;
  const lines = [`Verified ${report.results.length}: keep ${count("keep")}, review ${count("review")}, drop ${count("drop")}.`];
  for (const d of ["review", "drop"] as const) {
    for (const r of report.results.filter((x) => x.decision === d)) lines.push(`  ${d}: ${r.email} (${r.result}${r.reason ? `, ${r.reason}` : ""})`);
  }
  const roles = report.results.filter((r) => r.role).length;
  if (roles) lines.push(`Role addresses (such as info@): ${roles}.`);
  if (report.remainingCredits !== undefined) lines.push(`QEV credits remaining: ${report.remainingCredits}.`);
  return lines;
}

const csvCell = (value: string | undefined) => {
  const v = value ?? "";
  return /[",\n\r]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v;
};

/** A CSV of accepted rows whose email is "keep", plus phone-only rows, in the import's column order. */
export function verifiedCsv(accepted: ImportedLead[], report: VerifyReport): string {
  const keep = new Set(report.results.filter((r) => r.decision === "keep").map((r) => r.email));
  const rows = accepted.filter((lead) => (lead.contactEmail ? keep.has(lead.contactEmail) : Boolean(lead.contactPhoneE164)));
  const header = "company,contact_name,email,phone,country,consent_basis,source";
  const body = rows.map((l) => [l.organizationName, l.contactName, l.contactEmail, l.contactPhoneE164, l.country, l.consentBasis, l.source].map(csvCell).join(","));
  return [header, ...body].join("\n") + "\n";
}

export function parseArgs(argv: string[]): { path?: string; verify: boolean; outPath?: string; usageError: boolean } {
  const outIndex = argv.indexOf("--out");
  const outPath = outIndex >= 0 ? argv[outIndex + 1] : undefined;
  const path = argv.find((a, i) => !a.startsWith("--") && (outIndex < 0 || i !== outIndex + 1));
  return { path, verify: argv.includes("--verify"), outPath, usageError: !path || (outIndex >= 0 && !outPath) };
}

async function main(argv: string[]): Promise<number> {
  const args = parseArgs(argv);
  if (args.usageError || !args.path) {
    console.error("Usage: pnpm run gtm:check-leads <file.csv> [--verify] [--out <verified.csv>]");
    return 2;
  }
  const report = checkLeadCsv(readFileSync(args.path, "utf8"));
  for (const line of formatLeadCsvReport(report)) console.log(line);
  if (report.fileError) return 1;
  let failed = report.rejected.length > 0;
  if (!args.verify) return failed ? 1 : 0;

  const apiKey = process.env.QEV_API_KEY;
  if (!apiKey) {
    console.error("QEV_API_KEY is not set. Add it to .env.local (gitignored) and run again.");
    return 2;
  }
  const emails = report.accepted.map((l) => l.contactEmail).filter((e): e is string => Boolean(e));
  const verified = await verifyEmails(emails, { apiKey });
  for (const line of formatVerifyReport(verified)) console.log(line);
  if (args.outPath) {
    writeFileSync(args.outPath, verifiedCsv(report.accepted, verified));
    console.log(`Wrote verified rows to ${args.outPath}.`);
  }
  if (verified.results.some((r) => r.decision === "drop")) failed = true;
  return failed ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // Set exitCode rather than calling process.exit inside a promise: on Windows that can trip a
  // libuv assertion while handles are closing.
  main(process.argv.slice(2)).then(
    (code) => { process.exitCode = code; },
    (error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    },
  );
}
