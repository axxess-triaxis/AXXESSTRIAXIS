// Writes the import CSV (the importer's exact columns) and a review file for the founder.
import type { Candidate, SiteResult } from "./types.ts";

export const IMPORT_HEADER = "company,contact_name,email,phone,country,consent_basis,source";

const cell = (value: string | undefined) => {
  const v = value ?? "";
  return /[",\n\r]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v;
};

const KIND_LABEL = { "published-personal": "personal address published on site", "published-role": "role inbox published on site", guessed: "guessed address, QEV confirmed" } as const;

export function toImportCsv(candidates: Candidate[], date: string): string {
  const rows = candidates.map((c) =>
    [
      c.seed.company,
      c.contactName,
      c.email,
      "",
      c.seed.country,
      "b2b_legitimate_interest",
      `Company website (${c.role} named on site; ${KIND_LABEL[c.emailKind]}); ${c.seed.source}; ${date}`,
    ]
      .map(cell)
      .join(","),
  );
  return [IMPORT_HEADER, ...rows].join("\n") + "\n";
}

const md = (s: string) => s.replace(/\\/g, "\\\\").replace(/\|/g, "\\|");

export function toReviewMarkdown(candidates: Candidate[], sites: SiteResult[], stats: Record<string, number | string>): string {
  const lines = ["# Lead sourcing review", "", "Nothing here is imported or enrolled. Approve rows before import.", "", "## Run", ""];
  for (const [k, v] of Object.entries(stats)) lines.push(`- ${k}: ${v}`);
  lines.push("", "## Candidates", "", "| # | Company | Country | Contact | Role | Email | Kind | Evidence |", "|---|---|---|---|---|---|---|---|");
  candidates.forEach((c, i) => lines.push(`| ${i + 1} | ${md(c.seed.company)} | ${c.seed.country} | ${md(c.contactName)} | ${c.role} | ${c.email} | ${c.emailKind} | ${md(c.evidence.join("; "))} |`));
  const picked = new Set(candidates.map((c) => c.seed.company));
  const misses = sites.filter((s) => !picked.has(s.seed.company));
  lines.push("", "## No candidate", "", "| Company | Why |", "|---|---|");
  for (const s of misses) {
    const why = s.error ?? (s.people.length ? "named person but no usable email" : s.emails.length ? "email but no named leader" : "no email and no named leader");
    lines.push(`| ${md(s.seed.company)} | ${why} |`);
  }
  return lines.join("\n") + "\n";
}
