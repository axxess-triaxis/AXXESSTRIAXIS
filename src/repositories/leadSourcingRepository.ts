// Lead sourcing data access (2026-11-17). Service-role REST like agentCallRepository.ts.
// organization_id always comes from a server-derived scope: the MCP connection's tenant for the
// agent tools, or the run row itself for the worker (which authenticates per run with an HMAC).
import type { TenantScope } from "./interfaces";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "./supabaseAdmin";
import type { Candidate, Seed } from "../services/leadSourcing/types.ts";

export type RunStatus = "discovering" | "queued" | "running" | "done" | "failed";
export type CandidateStatus = "pending" | "approved" | "rejected" | "imported";

export type SourcingRun = {
  id: string;
  organizationId: string;
  status: RunStatus;
  segment: string | null;
  country: string | null;
  seeds: Seed[];
  seedCount: number;
  verifyCap: number;
  creditsSpent: number;
  stats: Record<string, number | string>;
  error: string | null;
  createdAt: string;
  finishedAt: string | null;
  /** 2026-11-18: "discovery" runs come from a schedule and are imported automatically. */
  seedSource: "agent" | "discovery";
  requestedByUser: string | null;
  scheduleId: string | null;
};

export type SourcedCandidate = {
  id: string;
  runId: string;
  company: string;
  domain: string | null;
  country: string;
  segment: string | null;
  contactName: string;
  role: string;
  email: string;
  emailKind: Candidate["emailKind"];
  verified: Candidate["verified"] | null;
  score: number;
  evidence: string[];
  status: CandidateStatus;
  leadId: string | null;
  importedAutomatically: boolean;
  removedAt: string | null;
};

type RunRow = {
  id: string; organization_id: string; status: RunStatus; segment: string | null; country: string | null; seeds: unknown;
  seed_count: number; verify_cap: number; credits_spent: number; stats: unknown; error: string | null; created_at: string; finished_at: string | null;
  seed_source: "agent" | "discovery" | null; requested_by_user: string | null; schedule_id: string | null;
};
const RUN_SELECT = "id,organization_id,status,segment,country,seeds,seed_count,verify_cap,credits_spent,stats,error,created_at,finished_at,seed_source,requested_by_user,schedule_id";

type CandidateRow = {
  id: string; run_id: string; company: string; domain: string | null; country: string; segment: string | null; contact_name: string;
  role: string; email: string; email_kind: Candidate["emailKind"]; verified: Candidate["verified"] | null; score: number;
  evidence: unknown; status: CandidateStatus; lead_id: string | null; imported_automatically?: boolean | null; removed_at?: string | null;
};
const CANDIDATE_SELECT = "id,run_id,company,domain,country,segment,contact_name,role,email,email_kind,verified,score,evidence,status,lead_id,imported_automatically,removed_at";

const isRecord = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);

function toRun(row: RunRow): SourcingRun {
  return {
    id: row.id,
    organizationId: row.organization_id,
    status: row.status,
    segment: row.segment,
    country: row.country,
    seeds: Array.isArray(row.seeds) ? (row.seeds as Seed[]) : [],
    seedCount: row.seed_count,
    verifyCap: row.verify_cap,
    creditsSpent: row.credits_spent,
    stats: isRecord(row.stats) ? (row.stats as Record<string, number | string>) : {},
    error: row.error,
    createdAt: row.created_at,
    finishedAt: row.finished_at,
    seedSource: row.seed_source ?? "agent",
    requestedByUser: row.requested_by_user,
    scheduleId: row.schedule_id,
  };
}

function toCandidate(row: CandidateRow): SourcedCandidate {
  return {
    id: row.id, runId: row.run_id, company: row.company, domain: row.domain, country: row.country, segment: row.segment,
    contactName: row.contact_name, role: row.role, email: row.email, emailKind: row.email_kind, verified: row.verified,
    score: row.score, evidence: Array.isArray(row.evidence) ? row.evidence.filter((e): e is string => typeof e === "string") : [],
    status: row.status, leadId: row.lead_id, importedAutomatically: Boolean(row.imported_automatically), removedAt: row.removed_at ?? null,
  };
}

function ensureConfigured() {
  if (!isSupabaseAdminConfigured()) throw new Error("Lead sourcing repository is not configured (Supabase admin credentials missing).");
}

const inList = (ids: string[]) => `(${ids.map((id) => `"${id.replace(/["\\]/g, "")}"`).join(",")})`;

export async function createSourcingRun(
  scope: TenantScope,
  input: { requestedByConnection?: string; segment?: string; country?: string; seeds: Seed[]; verifyCap: number; stats: Record<string, number> },
): Promise<SourcingRun> {
  ensureConfigured();
  const rows = await supabaseAdminRest<RunRow[]>("lead_sourcing_runs", {
    method: "POST",
    query: new URLSearchParams({ select: RUN_SELECT }),
    body: {
      organization_id: scope.organizationId,
      requested_by_user: scope.userId || null,
      requested_by_connection: input.requestedByConnection ?? null,
      segment: input.segment ?? null,
      country: input.country ?? null,
      seeds: input.seeds,
      seed_count: input.seeds.length,
      verify_cap: input.verifyCap,
      stats: input.stats,
    },
  });
  if (!rows?.[0]) throw new Error("Lead sourcing run was not created.");
  return toRun(rows[0]);
}

export async function getSourcingRun(scope: TenantScope, runId: string): Promise<{ run: SourcingRun; candidates: SourcedCandidate[] } | null> {
  ensureConfigured();
  const runs = await supabaseAdminRest<RunRow[]>("lead_sourcing_runs", {
    query: new URLSearchParams({ organization_id: `eq.${scope.organizationId}`, id: `eq.${runId}`, select: RUN_SELECT, limit: "1" }),
  });
  if (!runs?.[0]) return null;
  const candidates = await supabaseAdminRest<CandidateRow[]>("lead_sourcing_candidates", {
    query: new URLSearchParams({ organization_id: `eq.${scope.organizationId}`, run_id: `eq.${runId}`, select: CANDIDATE_SELECT, order: "score.desc", limit: "500" }),
  });
  return { run: toRun(runs[0]), candidates: (candidates ?? []).map(toCandidate) };
}

export async function getCandidates(scope: TenantScope, runId: string, ids: string[]): Promise<SourcedCandidate[]> {
  ensureConfigured();
  if (ids.length === 0) return [];
  const rows = await supabaseAdminRest<CandidateRow[]>("lead_sourcing_candidates", {
    query: new URLSearchParams({ organization_id: `eq.${scope.organizationId}`, run_id: `eq.${runId}`, id: `in.${inList(ids)}`, select: CANDIDATE_SELECT }),
  });
  return (rows ?? []).map(toCandidate);
}

export async function markCandidates(scope: TenantScope, updates: { id: string; status: CandidateStatus; leadId?: string; automatic?: boolean }[]): Promise<void> {
  ensureConfigured();
  const decidedAt = new Date().toISOString();
  for (const u of updates) {
    await supabaseAdminRest("lead_sourcing_candidates", {
      method: "PATCH",
      prefer: "return=minimal",
      query: new URLSearchParams({ organization_id: `eq.${scope.organizationId}`, id: `eq.${u.id}` }),
      body: { status: u.status, lead_id: u.leadId ?? null, decided_at: decidedAt, ...(u.automatic ? { imported_automatically: true } : {}) },
    });
  }
}

/** QEV credits this organization's runs spent since the start of the current UTC month. */
export async function creditsSpentThisMonth(scope: TenantScope, now = new Date()): Promise<number> {
  ensureConfigured();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const rows = await supabaseAdminRest<{ credits_spent: number; verify_cap: number; status: RunStatus }[]>("lead_sourcing_runs", {
    query: new URLSearchParams({ organization_id: `eq.${scope.organizationId}`, created_at: `gte.${monthStart}`, select: "credits_spent,verify_cap,status", limit: "1000" }),
  });
  // A run not yet finished may spend up to its cap, so it counts at its cap.
  return (rows ?? []).reduce((sum, r) => sum + (r.status === "discovering" || r.status === "queued" || r.status === "running" ? Math.max(r.verify_cap, r.credits_spent) : r.credits_spent), 0);
}

export type ExclusionSets = { companies: Set<string>; labels: Set<string> };

export async function loadExclusions(scope: TenantScope): Promise<ExclusionSets> {
  ensureConfigured();
  const rows = await supabaseAdminRest<{ company_norm: string; domain_label: string }[]>("lead_source_exclusions", {
    query: new URLSearchParams({ organization_id: `eq.${scope.organizationId}`, select: "company_norm,domain_label", limit: "5000" }),
  });
  const out: ExclusionSets = { companies: new Set(), labels: new Set() };
  for (const r of rows ?? []) {
    if (r.company_norm) out.companies.add(r.company_norm);
    if (r.domain_label) out.labels.add(r.domain_label);
  }
  return out;
}

export async function addExclusions(
  scope: TenantScope,
  rows: { companyNorm?: string; domainLabel?: string; reason: "founder_network" | "customer" | "competitor" | "manual" }[],
): Promise<number> {
  ensureConfigured();
  if (rows.length === 0) return 0;
  const inserted = await supabaseAdminRest<{ id: string }[]>("lead_source_exclusions", {
    method: "POST",
    prefer: "return=representation,resolution=ignore-duplicates",
    query: new URLSearchParams({ select: "id", on_conflict: "organization_id,company_norm,domain_label" }),
    body: rows.map((r) => ({
      organization_id: scope.organizationId,
      company_norm: r.companyNorm ?? "",
      domain_label: r.domainLabel ?? "",
      reason: r.reason,
      created_by: scope.userId || null,
    })),
  });
  return inserted?.length ?? 0;
}

/** Company names and email domains already on leads (raw), so a run never re-researches them. */
export async function loadKnownLeadCompanies(scope: TenantScope): Promise<{ companies: string[]; domains: string[] }> {
  ensureConfigured();
  const out = { companies: [] as string[], domains: [] as string[] };
  for (let offset = 0; ; offset += 1000) {
    const rows = await supabaseAdminRest<{ organization_name: string | null; contact_email: string | null }[]>("crm_leads", {
      query: new URLSearchParams({ organization_id: `eq.${scope.organizationId}`, select: "organization_name,contact_email", order: "id.asc", limit: "1000", offset: String(offset) }),
    });
    for (const r of rows ?? []) {
      if (r.organization_name) out.companies.push(r.organization_name);
      if (r.contact_email?.includes("@")) out.domains.push(r.contact_email.split("@")[1]);
    }
    if ((rows ?? []).length < 1000) return out;
  }
}

// ---- Worker side (authenticated per run, no user session) ----------------------------------

/** Moves a queued run to running and returns it. Returns null if it is not queued (idempotent retries). */
export async function claimRun(runId: string): Promise<SourcingRun | null> {
  ensureConfigured();
  const rows = await supabaseAdminRest<RunRow[]>("lead_sourcing_runs", {
    method: "PATCH",
    query: new URLSearchParams({ id: `eq.${runId}`, status: "eq.queued", select: RUN_SELECT }),
    body: { status: "running", started_at: new Date().toISOString() },
  });
  return rows?.[0] ? toRun(rows[0]) : null;
}

export async function completeRun(
  run: Pick<SourcingRun, "id" | "organizationId">,
  result: { candidates: Candidate[]; stats: Record<string, number | string>; creditsSpent: number },
): Promise<number> {
  ensureConfigured();
  if (result.candidates.length) {
    await supabaseAdminRest("lead_sourcing_candidates", {
      method: "POST",
      prefer: "return=minimal,resolution=ignore-duplicates",
      body: result.candidates.map((c) => ({
        organization_id: run.organizationId,
        run_id: run.id,
        company: c.seed.company.slice(0, 200),
        domain: c.seed.domain ?? null,
        country: c.seed.country,
        segment: c.seed.segment ?? null,
        contact_name: c.contactName.slice(0, 120),
        role: c.role.slice(0, 60),
        email: c.email.toLowerCase(),
        email_kind: c.emailKind,
        verified: c.verified ?? null,
        score: c.score,
        evidence: c.evidence,
      })),
    });
  }
  await supabaseAdminRest("lead_sourcing_runs", {
    method: "PATCH",
    prefer: "return=minimal",
    query: new URLSearchParams({ id: `eq.${run.id}`, organization_id: `eq.${run.organizationId}`, status: "eq.running" }),
    body: { status: "done", stats: result.stats, credits_spent: result.creditsSpent, finished_at: new Date().toISOString() },
  });
  return result.candidates.length;
}

export async function failRun(runId: string, error: string, creditsSpent = 0): Promise<void> {
  ensureConfigured();
  await supabaseAdminRest("lead_sourcing_runs", {
    method: "PATCH",
    prefer: "return=minimal",
    query: new URLSearchParams({ id: `eq.${runId}`, status: "in.(discovering,queued,running)" }),
    body: { status: "failed", error: error.slice(0, 300), credits_spent: creditsSpent, finished_at: new Date().toISOString() },
  });
}

/** Claims the oldest queued run in any organization, after failing runs stuck in running. */
export async function claimNextRun(staleAfterMinutes = 30): Promise<SourcingRun | null> {
  ensureConfigured();
  const staleBefore = new Date(Date.now() - staleAfterMinutes * 60_000).toISOString();
  await supabaseAdminRest("lead_sourcing_runs", {
    method: "PATCH",
    prefer: "return=minimal",
    query: new URLSearchParams({ status: "eq.running", started_at: `lt.${staleBefore}` }),
    body: { status: "failed", error: "worker did not finish in time", finished_at: new Date().toISOString() },
  });
  const queued = await supabaseAdminRest<{ id: string }[]>("lead_sourcing_runs", {
    query: new URLSearchParams({ status: "eq.queued", select: "id", order: "created_at.asc", limit: "1" }),
  });
  return queued?.[0] ? claimRun(queued[0].id) : null;
}

/** A run by id for the worker (no tenant scope: the worker is authenticated, the row carries its organization). */
export async function getRunForWorker(runId: string): Promise<SourcingRun | null> {
  ensureConfigured();
  const rows = await supabaseAdminRest<RunRow[]>("lead_sourcing_runs", {
    query: new URLSearchParams({ id: `eq.${runId}`, select: RUN_SELECT, limit: "1" }),
  });
  return rows?.[0] ? toRun(rows[0]) : null;
}

/** Adds keys to a finished run's stats (for example, how many leads were imported automatically). */
export async function mergeRunStats(run: Pick<SourcingRun, "id" | "organizationId" | "stats">, extra: Record<string, number | string>): Promise<void> {
  ensureConfigured();
  await supabaseAdminRest("lead_sourcing_runs", {
    method: "PATCH",
    prefer: "return=minimal",
    query: new URLSearchParams({ id: `eq.${run.id}`, organization_id: `eq.${run.organizationId}` }),
    body: { stats: { ...run.stats, ...extra } },
  });
}
