import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { addExclusions } from "../../../../repositories/leadSourcingRepository";
import { auditLogsRepository, tenantScopeFromUser } from "../../../../repositories/supabaseEnterpriseRepositories";
import { canReadAllLeads, canUseCapability } from "../../../../security/rbac";
import { recordDeniedAttempt } from "../../../../services/audit/auditEvents";
import { domainLabel } from "../../../../services/leadSourcing/extract";
import { normCompany } from "../../../../services/leadSourcing/seeds";

const REASONS = ["founder_network", "customer", "competitor", "manual"] as const;
type Reason = (typeof REASONS)[number];

// Lead sourcing do-not-contact list by company (2026-11-17). Senior roles add companies or domains;
// a matching seed is dropped before any site is fetched. Names are stored normalised, the same way
// the seed filter compares them. Kept out of migrations so the list never enters the repository.
export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!canUseCapability(session.user.role, "crm.create") || !canReadAllLeads(session.user.role)) {
    await recordDeniedAttempt(session, { route: "/api/lead-sourcing/exclusions", method: "POST" });
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const body = (await request.json().catch(() => ({}))) as { companies?: unknown; domains?: unknown; reason?: unknown };
  const companies = Array.isArray(body.companies) ? body.companies.filter((c): c is string => typeof c === "string") : [];
  const domains = Array.isArray(body.domains) ? body.domains.filter((d): d is string => typeof d === "string") : [];
  const reason: Reason = REASONS.includes(body.reason as Reason) ? (body.reason as Reason) : "manual";
  if (companies.length + domains.length === 0 || companies.length + domains.length > 1000) {
    return NextResponse.json({ error: "Give 1 to 1000 companies or domains." }, { status: 400 });
  }
  const rows = [
    ...companies.map((c) => normCompany(c)).filter(Boolean).map((companyNorm) => ({ companyNorm, reason })),
    ...domains.map((d) => domainLabel(d.trim())).filter(Boolean).map((domainLabel) => ({ domainLabel, reason })),
  ];
  const scope = tenantScopeFromUser(session.user, session.accessToken);
  const added = await addExclusions(scope, rows);
  await auditLogsRepository.record(scope, {
    action: "lead_sourcing.exclusions_added",
    resourceType: "lead_source_exclusion",
    category: "crm",
    metadata: { added, submitted: rows.length, reason },
  }).catch(() => undefined);
  return NextResponse.json({ added, submitted: rows.length });
}
