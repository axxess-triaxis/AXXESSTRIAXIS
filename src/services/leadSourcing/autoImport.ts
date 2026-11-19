// Automatic import of a finished discovery run (2026-11-18, founder decision: "Always auto-import").
// Every candidate of a scheduled run becomes an open CRM lead owned by the person who created the
// schedule, through the normal import rules. Nothing is enrolled in a sequence or sent. Users review
// afterwards and can remove a lead (PR4). A run with no owner is left for review instead.
import type { TenantScope } from "../../repositories/interfaces";
import { getSourcingRun, mergeRunStats, type SourcingRun } from "../../repositories/leadSourcingRepository";
import { auditLogsRepository } from "../../repositories/supabaseEnterpriseRepositories";
import { importCandidates } from "./importCandidates";

export type AutoImportResult = { attempted: boolean; imported: number; skipped: number; reason?: string };

export async function autoImportRun(run: SourcingRun): Promise<AutoImportResult> {
  if (run.seedSource !== "discovery") return { attempted: false, imported: 0, skipped: 0 };
  const note = async (reason: string) => {
    await mergeRunStats(run, { "Auto-import": reason }).catch(() => undefined);
    return { attempted: false, imported: 0, skipped: 0, reason };
  };
  if (!run.requestedByUser) return note("not imported: the schedule has no owner; review the candidates");

  // The schedule creator owns the leads. Role only labels the audit entry; access was checked when
  // the schedule was created (senior role with crm.create).
  const scope = { organizationId: run.organizationId, userId: run.requestedByUser, role: "Organization Admin" } as TenantScope;
  try {
    const found = await getSourcingRun(scope, run.id);
    const pending = (found?.candidates ?? []).filter((c) => c.status === "pending");
    const outcome = await importCandidates(scope, pending, { automatic: true });
    if (!outcome.ok) return note(`not imported: ${outcome.reason}`.slice(0, 200));
    await mergeRunStats(found?.run ?? run, { "Leads imported automatically": outcome.imported.length, "Not imported (import rules)": outcome.skipped.length });
    await auditLogsRepository.record(scope, {
      action: "lead_sourcing.auto_imported",
      resourceType: "lead_sourcing_run",
      resourceId: run.id,
      category: "crm",
      metadata: { runId: run.id, scheduleId: run.scheduleId, imported: outcome.imported.length, skipped: outcome.skipped.length, enrolled: 0 },
    }).catch(() => undefined);
    return { attempted: true, imported: outcome.imported.length, skipped: outcome.skipped.length };
  } catch (error) {
    // The crawl result is already stored; a failed import leaves the candidates pending for review.
    return note(`not imported: ${error instanceof Error ? error.message : String(error)}`.slice(0, 200));
  }
}
