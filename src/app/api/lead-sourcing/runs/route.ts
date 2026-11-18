import { NextResponse } from "next/server";
import { capUsageThisMonth, listRuns, loadCapOverride } from "../../../../repositories/leadSourcingScheduleRepository";
import { capLimits } from "../../../../services/leadSourcing/schedule";
import { leadSourcingAccess } from "../../../../services/leadSourcing/sessionAccess";

// Lead sourcing runs (2026-11-18): the organization's recent runs and this month's usage against
// its caps, for the Lead sourcing page. Senior roles only.
export async function GET() {
  const access = await leadSourcingAccess(false, "/api/lead-sourcing/runs", "GET");
  if (!access.ok) return access.response;
  const orgId = access.scope.organizationId;
  const [runs, override, usage] = await Promise.all([listRuns(access.scope), loadCapOverride(orgId), capUsageThisMonth(orgId)]);
  const limits = capLimits(override);
  return NextResponse.json({
    runs,
    // Platform-wide figures stay on the server; an organization sees only its own usage.
    usage: { searches: usage.orgSearches, searchLimit: limits.orgSearches, companies: usage.orgCompanies, companyLimit: limits.orgCompanies },
  });
}
