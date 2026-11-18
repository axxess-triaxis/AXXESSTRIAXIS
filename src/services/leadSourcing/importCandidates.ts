// Importing sourced candidates as CRM leads (2026-11-18). One path for both callers:
//   - approve_sourced_leads (MCP, a person approves every call), and
//   - automatic discovery runs (founder decision 2026-11-18: "Always auto-import").
// Candidates go through the normal lead import rules (parseLeadImport: suppressions, existing
// contacts, consent basis). Leads are created open with the importing user as owner. Nothing here
// enrols a lead in a sequence or sends anything; that stays a separate human step.
import type { TenantScope } from "../../repositories/interfaces";
import { markCandidates, type SourcedCandidate } from "../../repositories/leadSourcingRepository";
import { insertImportedLeadsReturningIds, loadImportContext } from "../../repositories/outboundRepository";
import { parseLeadImport } from "../outbound/leadImport";
import { candidatesToImportCsv } from "./sourcingService.ts";

export type ImportOutcome =
  | { ok: false; reason: string }
  | { ok: true; imported: SourcedCandidate[]; skipped: SourcedCandidate[]; leadIds: string[]; rejected: Array<{ line: number; reason: string }> };

export async function importCandidates(
  scope: TenantScope,
  candidates: SourcedCandidate[],
  options: { automatic: boolean; now?: Date },
): Promise<ImportOutcome> {
  if (candidates.length === 0) return { ok: true, imported: [], skipped: [], leadIds: [], rejected: [] };
  const date = (options.now ?? new Date()).toISOString().slice(0, 10);
  const csv = candidatesToImportCsv(candidates, date, options.automatic);
  const result = parseLeadImport(csv, await loadImportContext(scope));
  if (result.fileError) return { ok: false, reason: result.fileError };
  const inserted = await insertImportedLeadsReturningIds(scope, result.accepted);
  const leadByEmail = new Map(inserted.map((r) => [r.contactEmail?.toLowerCase(), r.id]));
  const imported = candidates.filter((c) => leadByEmail.has(c.email));
  const skipped = candidates.filter((c) => !leadByEmail.has(c.email));
  await markCandidates(scope, [
    ...imported.map((c) => ({ id: c.id, status: "imported" as const, leadId: leadByEmail.get(c.email), ...(options.automatic ? { automatic: true } : {}) })),
    ...skipped.map((c) => ({ id: c.id, status: "rejected" as const })),
  ]);
  return {
    ok: true,
    imported,
    skipped,
    leadIds: imported.map((c) => leadByEmail.get(c.email) as string),
    rejected: result.rejected.map((r) => ({ line: r.line, reason: r.reason })),
  };
}
