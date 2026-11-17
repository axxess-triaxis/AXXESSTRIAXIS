// Pure rules for agent-started lead sourcing (2026-11-17). No I/O: the MCP tools and the worker
// route call these with data loaded by src/repositories/leadSourcingRepository.ts.
import { filterSeeds } from "./seeds.ts";
import type { Seed } from "./types.ts";

export const MAX_SEEDS_PER_RUN = 150;
export const MAX_VERIFY_PER_RUN = 40;
/** Default monthly QuickEmailVerification credits an organization's runs may spend. */
export const DEFAULT_MONTHLY_VERIFY_CAP = 40;
export const SOURCING_COUNTRIES = ["IN", "AE"] as const;

const DOMAIN = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.[a-z0-9-]{1,63})*\.[a-z]{2,24}$/;

export function normaliseDomain(raw: string): string | null {
  const host = raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/[/?#].*$/, "");
  return DOMAIN.test(host) ? host : null;
}

export type SeedInputError = { index: number; reason: string };

/** Validates raw seeds from an agent. Every accepted seed has a domain and a supported country. */
export function parseSeedInput(raw: unknown, defaults: { segment?: string; country?: string }): { seeds: Seed[]; errors: SeedInputError[] } {
  const seeds: Seed[] = [];
  const errors: SeedInputError[] = [];
  if (!Array.isArray(raw)) return { seeds, errors: [{ index: -1, reason: "seeds must be an array" }] };
  raw.forEach((item, index) => {
    if (!item || typeof item !== "object") return errors.push({ index, reason: "not an object" });
    const r = item as Record<string, unknown>;
    const company = typeof r.company === "string" ? r.company.trim().slice(0, 200) : "";
    const domain = typeof r.domain === "string" ? normaliseDomain(r.domain) : null;
    const country = (typeof r.country === "string" ? r.country : defaults.country ?? "").toUpperCase();
    const segment = (typeof r.segment === "string" ? r.segment : defaults.segment ?? "unknown").trim().slice(0, 40);
    if (!company) return errors.push({ index, reason: "company is required" });
    if (!domain) return errors.push({ index, reason: "a valid domain is required" });
    if (!(SOURCING_COUNTRIES as readonly string[]).includes(country)) return errors.push({ index, reason: `country must be one of ${SOURCING_COUNTRIES.join(", ")}` });
    seeds.push({ segment, country, company, domain, source: "Agent seed list" });
  });
  return { seeds, errors };
}

export type RunPlan =
  | { ok: false; reason: string }
  | { ok: true; seeds: Seed[]; verifyCap: number; excluded: number; duplicates: number; invalid: SeedInputError[] };

/**
 * Decides what a run will crawl: drops exclusion-list companies (never fetched), companies already
 * on a lead, and duplicates; caps seeds and verification credits.
 */
export function planRun(input: {
  rawSeeds: unknown;
  segment?: string;
  country?: string;
  requestedVerify: number;
  exclusion: { companies: Set<string>; labels: Set<string> };
  known: { companies: Set<string>; labels: Set<string> };
  creditsUsedThisMonth: number;
  monthlyCap: number;
}): RunPlan {
  if (Array.isArray(input.rawSeeds) && input.rawSeeds.length > MAX_SEEDS_PER_RUN) {
    return { ok: false, reason: `At most ${MAX_SEEDS_PER_RUN} seeds per run; split the list.` };
  }
  const { seeds, errors } = parseSeedInput(input.rawSeeds, { segment: input.segment, country: input.country });
  if (errors.some((e) => e.index === -1)) return { ok: false, reason: errors[0].reason };
  const filtered = filterSeeds(seeds, input.exclusion, input.known);
  if (filtered.kept.length === 0) return { ok: false, reason: "No seeds left to crawl after validation, the exclusion list and known leads." };
  const left = Math.max(0, input.monthlyCap - input.creditsUsedThisMonth);
  const requested = Math.max(0, Math.floor(Number.isFinite(input.requestedVerify) ? input.requestedVerify : 0));
  return {
    ok: true,
    seeds: filtered.kept,
    verifyCap: Math.min(requested, MAX_VERIFY_PER_RUN, left),
    excluded: filtered.excluded.length,
    duplicates: filtered.duplicates.length,
    invalid: errors,
  };
}

const csvCell = (value: string | undefined | null) => {
  const v = value ?? "";
  return /[",\n\r]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v;
};

export type ImportableCandidate = { company: string; contactName: string; email: string; country: string; role: string; emailKind: string; domain: string | null };

/** Approved candidates as an import CSV, so they pass through parseLeadImport's normal rules. */
export function candidatesToImportCsv(candidates: ImportableCandidate[], date: string): string {
  const header = "company,contact_name,email,phone,country,consent_basis,source";
  const rows = candidates.map((c) =>
    [c.company, c.contactName, c.email, "", c.country, "b2b_legitimate_interest", `Lead sourcing (${c.role} named on ${c.domain ?? "company site"}; ${c.emailKind}); approved ${date}`]
      .map(csvCell)
      .join(","),
  );
  return [header, ...rows].join("\n") + "\n";
}

const EMAIL = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
const EMAIL_KINDS = new Set(["published-personal", "published-role", "guessed"]);
const VERIFIED = new Set(["keep", "review", "drop"]);

export type WorkerCandidateInput = { domain: string; contactName: string; role: string; email: string; emailKind: string; verified?: string; score?: number; evidence?: string[] };

/**
 * Checks what the worker posts back. Each candidate must belong to one of the run's own seeds (by
 * domain), so a misbehaving worker cannot add companies nobody asked for. Credits are clamped to the
 * run's cap. Invalid rows are dropped and counted, not stored.
 */
export function validateWorkerResult(
  run: { seeds: Seed[]; verifyCap: number },
  body: unknown,
): { ok: true; candidates: import("./types.ts").Candidate[]; creditsSpent: number; stats: Record<string, number | string>; dropped: number } | { ok: false; reason: string } {
  if (!body || typeof body !== "object") return { ok: false, reason: "body must be an object" };
  const b = body as { candidates?: unknown; creditsSpent?: unknown; stats?: unknown };
  if (!Array.isArray(b.candidates) || b.candidates.length > MAX_SEEDS_PER_RUN) return { ok: false, reason: `candidates must be an array of at most ${MAX_SEEDS_PER_RUN}` };
  const byDomain = new Map(run.seeds.filter((s) => s.domain).map((s) => [s.domain!, s]));
  const candidates: import("./types.ts").Candidate[] = [];
  const seen = new Set<string>();
  let dropped = 0;
  for (const raw of b.candidates as unknown[]) {
    const c = (raw && typeof raw === "object" ? raw : {}) as Partial<WorkerCandidateInput>;
    const seed = typeof c.domain === "string" ? byDomain.get(c.domain.toLowerCase()) : undefined;
    const email = typeof c.email === "string" ? c.email.trim().toLowerCase() : "";
    const name = typeof c.contactName === "string" ? c.contactName.trim() : "";
    const role = typeof c.role === "string" ? c.role.trim() : "";
    if (!seed || seen.has(seed.domain!) || !EMAIL.test(email) || !name || name.length > 120 || !role || role.length > 60 || !EMAIL_KINDS.has(String(c.emailKind))) {
      dropped++;
      continue;
    }
    seen.add(seed.domain!);
    candidates.push({
      seed,
      contactName: name,
      role,
      email,
      emailKind: c.emailKind as import("./types.ts").EmailKind,
      verified: typeof c.verified === "string" && VERIFIED.has(c.verified) ? (c.verified as "keep" | "review" | "drop") : undefined,
      score: typeof c.score === "number" && Number.isFinite(c.score) ? Math.round(c.score) : 0,
      evidence: Array.isArray(c.evidence) ? c.evidence.filter((e): e is string => typeof e === "string").slice(0, 10).map((e) => e.slice(0, 500)) : [],
    });
  }
  const credits = typeof b.creditsSpent === "number" && Number.isFinite(b.creditsSpent) ? Math.max(0, Math.floor(b.creditsSpent)) : 0;
  const stats: Record<string, number | string> = {};
  if (b.stats && typeof b.stats === "object") {
    for (const [k, v] of Object.entries(b.stats as Record<string, unknown>).slice(0, 30)) {
      if (typeof v === "number" || typeof v === "string") stats[k.slice(0, 60)] = typeof v === "string" ? v.slice(0, 200) : v;
    }
  }
  return { ok: true, candidates, creditsSpent: Math.min(credits, run.verifyCap), stats, dropped };
}

/** What the worker needs from a candidate, flattened for the HTTP body. */
export function toWorkerCandidate(c: import("./types.ts").Candidate): WorkerCandidateInput {
  return { domain: c.seed.domain ?? "", contactName: c.contactName, role: c.role, email: c.email, emailKind: c.emailKind, verified: c.verified, score: c.score, evidence: c.evidence };
}
