// Lead sourcing schedules and discovery runs (2026-11-18). Service-role REST like
// leadSourcingRepository.ts. User routes pass a server-derived tenant scope; the worker tick has no
// tenant and acts on rows by id, each row carrying its own organization.
import type { TenantScope } from "./interfaces";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "./supabaseAdmin";
import type { CapUsage, Cadence, ScheduleInput } from "../services/leadSourcing/schedule";

export type SourcingSchedule = {
  id: string;
  organizationId: string;
  name: string;
  segment: string;
  countries: string[];
  cities: string[];
  perRun: number;
  cadence: Cadence;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  hourLocal: number;
  timezone: string;
  enabled: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastSkipReason: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

type ScheduleRow = {
  id: string; organization_id: string; name: string; segment: string; countries: string[]; cities: string[]; per_run: number;
  cadence: Cadence; day_of_week: number | null; day_of_month: number | null; hour_local: number; timezone: string; enabled: boolean;
  next_run_at: string | null; last_run_at: string | null; last_skip_reason: string | null; created_by: string | null;
  created_at: string; updated_at: string;
};
const SCHEDULE_SELECT =
  "id,organization_id,name,segment,countries,cities,per_run,cadence,day_of_week,day_of_month,hour_local,timezone,enabled,next_run_at,last_run_at,last_skip_reason,created_by,created_at,updated_at";

function toSchedule(r: ScheduleRow): SourcingSchedule {
  return {
    id: r.id, organizationId: r.organization_id, name: r.name, segment: r.segment, countries: r.countries ?? [], cities: r.cities ?? [],
    perRun: r.per_run, cadence: r.cadence, dayOfWeek: r.day_of_week, dayOfMonth: r.day_of_month, hourLocal: r.hour_local,
    timezone: r.timezone, enabled: r.enabled, nextRunAt: r.next_run_at, lastRunAt: r.last_run_at, lastSkipReason: r.last_skip_reason,
    createdBy: r.created_by, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function toRow(input: Partial<ScheduleInput>): Record<string, unknown> {
  const map: Record<string, string> = {
    name: "name", segment: "segment", countries: "countries", cities: "cities", perRun: "per_run", cadence: "cadence",
    dayOfWeek: "day_of_week", dayOfMonth: "day_of_month", hourLocal: "hour_local", timezone: "timezone", enabled: "enabled",
  };
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) if (k in map && v !== undefined) out[map[k]] = v;
  return out;
}

function ensureConfigured() {
  if (!isSupabaseAdminConfigured()) throw new Error("Lead sourcing repository is not configured (Supabase admin credentials missing).");
}

export const MAX_SCHEDULES_PER_ORG = 20;

export async function listSchedules(scope: TenantScope): Promise<SourcingSchedule[]> {
  ensureConfigured();
  const rows = await supabaseAdminRest<ScheduleRow[]>("lead_sourcing_schedules", {
    query: new URLSearchParams({ organization_id: `eq.${scope.organizationId}`, select: SCHEDULE_SELECT, order: "created_at.asc", limit: "100" }),
  });
  return (rows ?? []).map(toSchedule);
}

export async function getSchedule(scope: TenantScope, id: string): Promise<SourcingSchedule | null> {
  ensureConfigured();
  const rows = await supabaseAdminRest<ScheduleRow[]>("lead_sourcing_schedules", {
    query: new URLSearchParams({ organization_id: `eq.${scope.organizationId}`, id: `eq.${id}`, select: SCHEDULE_SELECT, limit: "1" }),
  });
  return rows?.[0] ? toSchedule(rows[0]) : null;
}

export async function createSchedule(scope: TenantScope, input: ScheduleInput, nextRunAt: Date | null): Promise<SourcingSchedule> {
  ensureConfigured();
  const rows = await supabaseAdminRest<ScheduleRow[]>("lead_sourcing_schedules", {
    method: "POST",
    query: new URLSearchParams({ select: SCHEDULE_SELECT }),
    body: { ...toRow(input), organization_id: scope.organizationId, created_by: scope.userId || null, next_run_at: nextRunAt?.toISOString() ?? null },
  });
  if (!rows?.[0]) throw new Error("Lead sourcing schedule was not created.");
  return toSchedule(rows[0]);
}

export async function updateSchedule(
  scope: TenantScope,
  id: string,
  input: Partial<ScheduleInput>,
  nextRunAt: Date | null,
): Promise<SourcingSchedule | null> {
  ensureConfigured();
  const rows = await supabaseAdminRest<ScheduleRow[]>("lead_sourcing_schedules", {
    method: "PATCH",
    query: new URLSearchParams({ organization_id: `eq.${scope.organizationId}`, id: `eq.${id}`, select: SCHEDULE_SELECT }),
    body: { ...toRow(input), next_run_at: nextRunAt?.toISOString() ?? null, updated_at: new Date().toISOString() },
  });
  return rows?.[0] ? toSchedule(rows[0]) : null;
}

export async function deleteSchedule(scope: TenantScope, id: string): Promise<boolean> {
  ensureConfigured();
  const rows = await supabaseAdminRest<{ id: string }[]>("lead_sourcing_schedules", {
    method: "DELETE",
    query: new URLSearchParams({ organization_id: `eq.${scope.organizationId}`, id: `eq.${id}`, select: "id" }),
  });
  return (rows ?? []).length > 0;
}

// ---- Caps --------------------------------------------------------------------------------------

export async function loadCapOverride(organizationId: string): Promise<{ monthlySearchCap: number | null; monthlyCompanyCap: number | null } | null> {
  ensureConfigured();
  const rows = await supabaseAdminRest<{ monthly_search_cap: number | null; monthly_company_cap: number | null }[]>("lead_sourcing_settings", {
    query: new URLSearchParams({ organization_id: `eq.${organizationId}`, select: "monthly_search_cap,monthly_company_cap", limit: "1" }),
  });
  return rows?.[0] ? { monthlySearchCap: rows[0].monthly_search_cap, monthlyCompanyCap: rows[0].monthly_company_cap } : null;
}

type UsageRow = { organization_id: string; status: string; seed_source: string; seed_count: number; search_count: number; discovery: unknown };

/** Reads `discovery.target` / `discovery.maxSearches` safely. */
const reserved = (d: unknown, key: "target" | "maxSearches") => {
  const v = d && typeof d === "object" ? (d as Record<string, unknown>)[key] : undefined;
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
};

/**
 * Searches and companies used this UTC month by discovery runs. A run still discovering counts at
 * what it reserved, so two schedules due in the same tick cannot both spend the same allowance.
 */
export function sumUsage(rows: UsageRow[], organizationId: string): CapUsage {
  const usage: CapUsage = { orgSearches: 0, orgCompanies: 0, globalSearches: 0 };
  for (const r of rows) {
    if (r.seed_source !== "discovery") continue;
    const pending = r.status === "discovering";
    const searches = pending ? Math.max(r.search_count, reserved(r.discovery, "maxSearches")) : r.search_count;
    const companies = pending ? reserved(r.discovery, "target") : r.seed_count;
    usage.globalSearches += searches;
    if (r.organization_id === organizationId) {
      usage.orgSearches += searches;
      usage.orgCompanies += companies;
    }
  }
  return usage;
}

export async function capUsageThisMonth(organizationId: string, now = new Date()): Promise<CapUsage> {
  ensureConfigured();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const rows: UsageRow[] = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await supabaseAdminRest<UsageRow[]>("lead_sourcing_runs", {
      query: new URLSearchParams({
        created_at: `gte.${monthStart}`, seed_source: "eq.discovery", select: "organization_id,status,seed_source,seed_count,search_count,discovery",
        order: "id.asc", limit: "1000", offset: String(offset),
      }),
    });
    rows.push(...(page ?? []));
    if ((page ?? []).length < 1000) break;
  }
  return sumUsage(rows, organizationId);
}

// ---- Scheduler (worker tick) ---------------------------------------------------------------------

export async function dueSchedules(now: Date, limit = 50): Promise<SourcingSchedule[]> {
  ensureConfigured();
  const rows = await supabaseAdminRest<ScheduleRow[]>("lead_sourcing_schedules", {
    query: new URLSearchParams({ enabled: "eq.true", next_run_at: `lte.${now.toISOString()}`, select: SCHEDULE_SELECT, order: "next_run_at.asc", limit: String(limit) }),
  });
  return (rows ?? []).map(toSchedule);
}

/**
 * Moves a due schedule to its next slot, only if nobody else did first (compare-and-set on the old
 * next_run_at). True means this caller owns the due slot.
 */
export async function advanceSchedule(id: string, expectedNextRunAt: string, next: Date): Promise<boolean> {
  ensureConfigured();
  const rows = await supabaseAdminRest<{ id: string }[]>("lead_sourcing_schedules", {
    method: "PATCH",
    query: new URLSearchParams({ id: `eq.${id}`, enabled: "eq.true", next_run_at: `eq.${expectedNextRunAt}`, select: "id" }),
    body: { next_run_at: next.toISOString() },
  });
  return (rows ?? []).length > 0;
}

export async function noteScheduleOutcome(id: string, outcome: { ranAt?: Date; skipReason: string | null }): Promise<void> {
  ensureConfigured();
  await supabaseAdminRest("lead_sourcing_schedules", {
    method: "PATCH",
    prefer: "return=minimal",
    query: new URLSearchParams({ id: `eq.${id}` }),
    body: { last_skip_reason: outcome.skipReason?.slice(0, 200) ?? null, ...(outcome.ranAt ? { last_run_at: outcome.ranAt.toISOString() } : {}) },
  });
}

export type DiscoverySpec = { segment: string; countries: string[]; cities: string[]; target: number; maxSearches: number; trigger: "schedule" | "manual" };

export async function createDiscoveryRun(
  schedule: Pick<SourcingSchedule, "id" | "organizationId">,
  spec: DiscoverySpec,
  requestedByUser: string | null,
): Promise<{ id: string }> {
  ensureConfigured();
  const rows = await supabaseAdminRest<{ id: string }[]>("lead_sourcing_runs", {
    method: "POST",
    query: new URLSearchParams({ select: "id" }),
    body: {
      organization_id: schedule.organizationId,
      requested_by_user: requestedByUser,
      schedule_id: schedule.id,
      seed_source: "discovery",
      status: "discovering",
      segment: spec.segment,
      country: spec.countries.length === 1 ? spec.countries[0] : null,
      seeds: [],
      seed_count: 0,
      verify_cap: 0,
      discovery: spec,
      stats: {},
    },
  });
  if (!rows?.[0]) throw new Error("Discovery run was not created.");
  return rows[0];
}

export type DiscoveryClaim = { id: string; organizationId: string; discovery: DiscoverySpec };

/** Claims the oldest unclaimed discovery run, after failing claimed ones that never reported back. */
export async function claimNextDiscovery(staleAfterMinutes = 30): Promise<DiscoveryClaim | null> {
  ensureConfigured();
  const now = new Date();
  const staleBefore = new Date(now.getTime() - staleAfterMinutes * 60_000).toISOString();
  await supabaseAdminRest("lead_sourcing_runs", {
    method: "PATCH",
    prefer: "return=minimal",
    query: new URLSearchParams({ status: "eq.discovering", started_at: `lt.${staleBefore}` }),
    body: { status: "failed", error: "discovery did not finish in time", finished_at: now.toISOString() },
  });
  const open = await supabaseAdminRest<{ id: string }[]>("lead_sourcing_runs", {
    query: new URLSearchParams({ status: "eq.discovering", started_at: "is.null", select: "id", order: "created_at.asc", limit: "1" }),
  });
  if (!open?.[0]) return null;
  const rows = await supabaseAdminRest<{ id: string; organization_id: string; discovery: DiscoverySpec }[]>("lead_sourcing_runs", {
    method: "PATCH",
    query: new URLSearchParams({ id: `eq.${open[0].id}`, status: "eq.discovering", started_at: "is.null", select: "id,organization_id,discovery" }),
    body: { started_at: now.toISOString() },
  });
  return rows?.[0] ? { id: rows[0].id, organizationId: rows[0].organization_id, discovery: rows[0].discovery } : null;
}

/** Fails discovery runs nobody claimed within `hours` (for example, discovery switched off), releasing their reserved allowance. */
export async function expireUnclaimedDiscovery(hours = 24, now = new Date()): Promise<void> {
  ensureConfigured();
  const before = new Date(now.getTime() - hours * 3_600_000).toISOString();
  await supabaseAdminRest("lead_sourcing_runs", {
    method: "PATCH",
    prefer: "return=minimal",
    query: new URLSearchParams({ status: "eq.discovering", started_at: "is.null", created_at: `lt.${before}` }),
    body: { status: "failed", error: "discovery was not picked up in time", finished_at: now.toISOString() },
  });
}

// ---- Discovery results (worker) ---------------------------------------------------------------

export type DiscoveryRun = { id: string; organizationId: string; status: string; seedSource: string; startedAt: string | null; discovery: DiscoverySpec | null; stats: Record<string, number | string> };

export async function getDiscoveryRun(runId: string): Promise<DiscoveryRun | null> {
  ensureConfigured();
  const rows = await supabaseAdminRest<{ id: string; organization_id: string; status: string; seed_source: string; started_at: string | null; discovery: DiscoverySpec | null; stats: Record<string, number | string> | null }[]>("lead_sourcing_runs", {
    query: new URLSearchParams({ id: `eq.${runId}`, select: "id,organization_id,status,seed_source,started_at,discovery,stats", limit: "1" }),
  });
  const r = rows?.[0];
  return r ? { id: r.id, organizationId: r.organization_id, status: r.status, seedSource: r.seed_source, startedAt: r.started_at, discovery: r.discovery, stats: r.stats ?? {} } : null;
}

export type DiscoveryUsage = { searchCount: number; llmInputTokens: number; llmOutputTokens: number };
const usageColumns = (u: DiscoveryUsage) => ({ search_count: u.searchCount, llm_input_tokens: u.llmInputTokens, llm_output_tokens: u.llmOutputTokens });

/**
 * Hands a discovered run to the crawler: stores its seeds and moves it from discovering to queued.
 * started_at is cleared so the crawl claim sets its own start time. False if the run moved on.
 */
export async function queueDiscoveredSeeds(
  run: Pick<DiscoveryRun, "id" | "organizationId">,
  seeds: import("../services/leadSourcing/types.ts").Seed[],
  usage: DiscoveryUsage,
  stats: Record<string, number | string>,
): Promise<boolean> {
  ensureConfigured();
  const rows = await supabaseAdminRest<{ id: string }[]>("lead_sourcing_runs", {
    method: "PATCH",
    query: new URLSearchParams({ id: `eq.${run.id}`, organization_id: `eq.${run.organizationId}`, status: "eq.discovering", select: "id" }),
    body: { status: "queued", seeds, seed_count: seeds.length, verify_cap: 0, started_at: null, stats, ...usageColumns(usage) },
  });
  return (rows ?? []).length > 0;
}

/** Ends a discovery run that produced nothing to crawl (done) or broke (failed), recording what it used. */
export async function finishDiscovery(
  run: Pick<DiscoveryRun, "id" | "organizationId">,
  outcome: { status: "done" | "failed"; error?: string; stats: Record<string, number | string> },
  usage: DiscoveryUsage,
): Promise<void> {
  ensureConfigured();
  await supabaseAdminRest("lead_sourcing_runs", {
    method: "PATCH",
    prefer: "return=minimal",
    query: new URLSearchParams({ id: `eq.${run.id}`, organization_id: `eq.${run.organizationId}`, status: "eq.discovering" }),
    body: { status: outcome.status, error: outcome.error?.slice(0, 300) ?? null, stats: outcome.stats, finished_at: new Date().toISOString(), ...usageColumns(usage) },
  });
}

/** Domains this organization's earlier runs already researched, so discovery never re-proposes them. */
export async function loadPastSeedDomains(organizationId: string): Promise<string[]> {
  ensureConfigured();
  const rows = await supabaseAdminRest<{ seeds: unknown }[]>("lead_sourcing_runs", {
    query: new URLSearchParams({ organization_id: `eq.${organizationId}`, select: "seeds", order: "created_at.desc", limit: "500" }),
  });
  const out: string[] = [];
  for (const r of rows ?? []) {
    if (!Array.isArray(r.seeds)) continue;
    for (const s of r.seeds) {
      const d = s && typeof s === "object" ? (s as Record<string, unknown>).domain : undefined;
      if (typeof d === "string" && d) out.push(d);
    }
  }
  return out;
}

// ---- App page (session routes, tenant-scoped) ----------------------------------------------------

export type RunSummary = {
  id: string;
  status: string;
  seedSource: "agent" | "discovery";
  scheduleId: string | null;
  segment: string | null;
  seedCount: number;
  searchCount: number;
  stats: Record<string, number | string>;
  error: string | null;
  createdAt: string;
  finishedAt: string | null;
};

export async function listRuns(scope: TenantScope, limit = 30): Promise<RunSummary[]> {
  ensureConfigured();
  const rows = await supabaseAdminRest<{
    id: string; status: string; seed_source: "agent" | "discovery"; schedule_id: string | null; segment: string | null; seed_count: number;
    search_count: number; stats: Record<string, number | string> | null; error: string | null; created_at: string; finished_at: string | null;
  }[]>("lead_sourcing_runs", {
    query: new URLSearchParams({
      organization_id: `eq.${scope.organizationId}`,
      select: "id,status,seed_source,schedule_id,segment,seed_count,search_count,stats,error,created_at,finished_at",
      order: "created_at.desc",
      limit: String(Math.min(100, Math.max(1, limit))),
    }),
  });
  return (rows ?? []).map((r) => ({
    id: r.id, status: r.status, seedSource: r.seed_source, scheduleId: r.schedule_id, segment: r.segment, seedCount: r.seed_count,
    searchCount: r.search_count, stats: r.stats ?? {}, error: r.error, createdAt: r.created_at, finishedAt: r.finished_at,
  }));
}

export type Exclusion = { id: string; companyNorm: string; domainLabel: string; reason: string; createdAt: string };

export async function listExclusions(scope: TenantScope): Promise<Exclusion[]> {
  ensureConfigured();
  const rows = await supabaseAdminRest<{ id: string; company_norm: string; domain_label: string; reason: string; created_at: string }[]>("lead_source_exclusions", {
    query: new URLSearchParams({ organization_id: `eq.${scope.organizationId}`, select: "id,company_norm,domain_label,reason,created_at", order: "created_at.desc", limit: "2000" }),
  });
  return (rows ?? []).map((r) => ({ id: r.id, companyNorm: r.company_norm, domainLabel: r.domain_label, reason: r.reason, createdAt: r.created_at }));
}

export async function deleteExclusion(scope: TenantScope, id: string): Promise<boolean> {
  ensureConfigured();
  const rows = await supabaseAdminRest<{ id: string }[]>("lead_source_exclusions", {
    method: "DELETE",
    query: new URLSearchParams({ organization_id: `eq.${scope.organizationId}`, id: `eq.${id}`, select: "id" }),
  });
  return (rows ?? []).length > 0;
}

/**
 * Removes a sourced lead after review: the lead is closed as lost (kept for the record, never
 * deleted) and the candidate is marked removed. Only a lead nobody has worked on yet (stage new,
 * status open) can be removed here; anything further along is changed in Leads & Calls.
 */
export async function removeSourcedLead(scope: TenantScope, candidate: { id: string; leadId: string }): Promise<boolean> {
  ensureConfigured();
  const now = new Date().toISOString();
  const leads = await supabaseAdminRest<{ id: string }[]>("crm_leads", {
    method: "PATCH",
    query: new URLSearchParams({ organization_id: `eq.${scope.organizationId}`, id: `eq.${candidate.leadId}`, stage: "eq.new", status: "eq.open", select: "id" }),
    body: { status: "lost", stage: "lost", updated_at: now },
  });
  if ((leads ?? []).length === 0) return false;
  await supabaseAdminRest("lead_sourcing_candidates", {
    method: "PATCH",
    prefer: "return=minimal",
    query: new URLSearchParams({ organization_id: `eq.${scope.organizationId}`, id: `eq.${candidate.id}` }),
    body: { removed_at: now },
  });
  return true;
}
