// Executive Dashboard Redesign Sprint ED-R2: pure aggregation of already-fetched crm_leads rows
// into the three dashboard-ready counts. No network calls here -- the hook/route own fetching.
import type { CrmLead } from "../../domain";
import { countStalledLeads, listFollowUpsDue } from "../../repositories/crmRepository";

export type CrmDashboardSignals = {
  openLeadsCount: number;
  followUpsDueCount: number;
  stalledCount: number;
};

export function computeCrmDashboardSignals(leads: CrmLead[], now = new Date()): CrmDashboardSignals {
  return {
    openLeadsCount: leads.filter((lead) => lead.status === "open").length,
    followUpsDueCount: listFollowUpsDue(leads, now).length,
    stalledCount: countStalledLeads(leads),
  };
}
