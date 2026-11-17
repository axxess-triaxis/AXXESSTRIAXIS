// Lead sourcing MCP tools (2026-11-17, founder: "build this scraping and lead-feeding into AXXESS
// as agent+MCP").
//   source_leads           (auto)     - queue a crawl of seed companies; exclusion list and known
//                                        leads are dropped first, verification credits are capped.
//   get_sourcing_run       (auto)     - a run's status, stats and candidates with evidence.
//   approve_sourced_leads  (critical, requiresFreshApproval) - import chosen candidates as leads
//                                        through the normal import rules; a person approves every call.
// All three are opt-in capabilities (leadSourcingAgentCapabilities): existing keys gain nothing.
import type { RoleName } from "../../domain";
import type { TenantScope } from "../../repositories/interfaces";
import {
  createSourcingRun,
  creditsSpentThisMonth,
  getCandidates,
  getSourcingRun,
  loadExclusions,
  loadKnownLeadCompanies,
  markCandidates,
} from "../../repositories/leadSourcingRepository";
import { insertImportedLeadsReturningIds, loadImportContext } from "../../repositories/outboundRepository";
import { auditLogsRepository } from "../../repositories/supabaseEnterpriseRepositories";
import { canReadAllLeads, canUseCapability } from "../../security/rbac";
import type { AgentScope } from "../../security/agentScope";
import { parseLeadImport } from "../outbound/leadImport";
import { knownSets } from "../leadSourcing/seeds.ts";
import { DEFAULT_MONTHLY_VERIFY_CAP, MAX_SEEDS_PER_RUN, candidatesToImportCsv, planRun } from "../leadSourcing/sourcingService.ts";
import type { McpToolDefinition, McpToolResult } from "./toolRegistry";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(payload: unknown): McpToolResult {
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

function refuse(message: string): McpToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

/** Sourced contacts are personal data: the in-app copilot may use these tools only for senior roles. */
function inAppRoleRefusal(scope: AgentScope, needsCreate: boolean): string | undefined {
  if (scope.provider !== "axxess_copilot_inapp") return undefined;
  const role = scope.issuedByRole as RoleName | undefined;
  if (!role || !canReadAllLeads(role) || (needsCreate && !canUseCapability(role, "crm.create"))) {
    return "Lead sourcing is limited to senior roles.";
  }
  return undefined;
}

function tenant(scope: AgentScope): TenantScope {
  return { organizationId: scope.organizationId, userId: scope.issuedByUserId ?? "", role: scope.issuedByRole ?? "Organization Admin" } as TenantScope;
}

function monthlyCap(): number {
  const n = Number(process.env.LEAD_SOURCING_MONTHLY_VERIFY_CAP ?? DEFAULT_MONTHLY_VERIFY_CAP);
  return Number.isInteger(n) && n >= 0 ? n : DEFAULT_MONTHLY_VERIFY_CAP;
}

export const sourceLeadsTool: McpToolDefinition = {
  name: "source_leads",
  version: "1",
  description:
    `Queue a lead-sourcing run: AXXESS crawls each seed company's public website for a named leader and a business email. ` +
    `Give up to ${MAX_SEEDS_PER_RUN} seeds with company and domain. Companies on the organization's do-not-contact list and companies already on a lead are dropped before any site is fetched. ` +
    `Results arrive within minutes; read them with get_sourcing_run. Nothing is imported or contacted.`,
  requiredCapability: "source_leads",
  criticality: "auto",
  inputSchema: {
    type: "object",
    properties: {
      seeds: { type: "array", description: "Seed companies: [{company, domain, country (IN or AE), segment}].", items: { type: "object" } },
      segment: { type: "string", description: "Default segment for seeds without one, such as brokerage or clinic." },
      country: { type: "string", description: "Default country for seeds without one.", enum: ["IN", "AE"] },
      verify_cap: { type: "number", description: "Most email-verification credits this run may spend on guessed personal addresses (default 0, max 40, limited by the monthly cap)." },
    },
    required: ["seeds"],
  },
  handler: async (scope, args) => {
    const refusal = inAppRoleRefusal(scope, false);
    if (refusal) return refuse(refusal);
    const t = tenant(scope);
    const [exclusion, known, used] = await Promise.all([loadExclusions(t), loadKnownLeadCompanies(t), creditsSpentThisMonth(t)]);
    const plan = planRun({
      rawSeeds: args.seeds,
      segment: typeof args.segment === "string" ? args.segment : undefined,
      country: typeof args.country === "string" ? args.country : undefined,
      requestedVerify: typeof args.verify_cap === "number" ? args.verify_cap : 0,
      exclusion,
      known: knownSets(known.companies, known.domains),
      creditsUsedThisMonth: used,
      monthlyCap: monthlyCap(),
    });
    if (!plan.ok) return refuse(plan.reason);
    const run = await createSourcingRun(t, {
      requestedByConnection: scope.agentConnectionId,
      segment: typeof args.segment === "string" ? args.segment.slice(0, 40) : undefined,
      country: typeof args.country === "string" ? args.country : undefined,
      seeds: plan.seeds,
      verifyCap: plan.verifyCap,
      stats: { excluded: plan.excluded, duplicates: plan.duplicates, invalid: plan.invalid.length },
    });
    return text({
      runId: run.id,
      status: run.status,
      queued: plan.seeds.length,
      excluded: plan.excluded,
      alreadyKnownOrDuplicate: plan.duplicates,
      invalid: plan.invalid,
      verifyCap: plan.verifyCap,
    });
  },
};

export const getSourcingRunTool: McpToolDefinition = {
  name: "get_sourcing_run",
  version: "1",
  description: "Read a lead-sourcing run: status (queued, running, done, failed), stats, and candidates with the evidence for each (where the name and email were found). Candidates are not leads until approved with approve_sourced_leads.",
  requiredCapability: "get_sourcing_run",
  criticality: "auto",
  inputSchema: {
    type: "object",
    properties: { run_id: { type: "string", description: "The runId returned by source_leads." } },
    required: ["run_id"],
  },
  handler: async (scope, args) => {
    const refusal = inAppRoleRefusal(scope, false);
    if (refusal) return refuse(refusal);
    const runId = String(args.run_id);
    if (!UUID.test(runId)) return refuse("run_id must be a run id.");
    const found = await getSourcingRun(tenant(scope), runId);
    if (!found) return refuse("Run not found.");
    const { run, candidates } = found;
    return text({
      runId: run.id,
      status: run.status,
      seedCount: run.seedCount,
      verifyCap: run.verifyCap,
      creditsSpent: run.creditsSpent,
      stats: run.stats,
      error: run.error,
      candidates: candidates.map((c) => ({
        id: c.id, company: c.company, country: c.country, contactName: c.contactName, role: c.role,
        email: c.email, emailKind: c.emailKind, status: c.status, evidence: c.evidence,
      })),
    });
  },
};

export const approveSourcedLeadsTool: McpToolDefinition = {
  name: "approve_sourced_leads",
  version: "1",
  description: "Ask a person to approve importing chosen candidates from a sourcing run as CRM leads. Every call waits for human approval; nothing is imported or contacted until then, and enrollment in any campaign stays a separate human step.",
  requiredCapability: "approve_sourced_leads",
  criticality: "critical",
  requiresFreshApproval: true,
  inputSchema: {
    type: "object",
    properties: {
      run_id: { type: "string", description: "The sourcing run." },
      candidate_ids: { type: "array", description: "Candidate ids from get_sourcing_run (at most 150).", items: { type: "string" } },
    },
    required: ["run_id", "candidate_ids"],
  },
  handler: async (scope, args) => {
    const refusal = inAppRoleRefusal(scope, true);
    if (refusal) return refuse(refusal);
    const runId = String(args.run_id);
    const ids = Array.isArray(args.candidate_ids) ? [...new Set(args.candidate_ids.map(String))] : [];
    if (!UUID.test(runId)) return refuse("run_id must be a run id.");
    if (ids.length === 0 || ids.length > 150 || ids.some((id) => !UUID.test(id))) return refuse("candidate_ids must be 1 to 150 candidate ids.");
    const t = tenant(scope);
    const candidates = (await getCandidates(t, runId, ids)).filter((c) => c.status === "pending" || c.status === "approved");
    if (candidates.length === 0) return refuse("No pending candidates with those ids in this run.");
    // Imported leads are owned by the person who issued this agent key; without one there is no owner.
    if (!scope.issuedByUserId) return refuse("This agent key has no issuing user, so imported leads would have no owner.");

    const date = new Date().toISOString().slice(0, 10);
    const csv = candidatesToImportCsv(candidates, date);
    const result = parseLeadImport(csv, await loadImportContext(t));
    if (result.fileError) return refuse(result.fileError);
    const inserted = await insertImportedLeadsReturningIds(t, result.accepted);
    const leadByEmail = new Map(inserted.map((r) => [r.contactEmail?.toLowerCase(), r.id]));
    const imported = candidates.filter((c) => leadByEmail.has(c.email));
    const rejected = candidates.filter((c) => !leadByEmail.has(c.email));
    await markCandidates(t, [
      ...imported.map((c) => ({ id: c.id, status: "imported" as const, leadId: leadByEmail.get(c.email) })),
      ...rejected.map((c) => ({ id: c.id, status: "rejected" as const })),
    ]);
    await auditLogsRepository.record(t, {
      action: "crm.leads.sourced_imported",
      resourceType: "crm_lead",
      category: "crm",
      metadata: { runId, imported: imported.length, rejected: rejected.length, agentConnectionId: scope.agentConnectionId },
    }).catch(() => undefined);
    return text({
      imported: imported.length,
      rejected: result.rejected.map((r) => ({ line: r.line, reason: r.reason })),
      leadIds: imported.map((c) => leadByEmail.get(c.email)),
    });
  },
};

export const leadSourcingTools: McpToolDefinition[] = [sourceLeadsTool, getSourcingRunTool, approveSourcedLeadsTool];
