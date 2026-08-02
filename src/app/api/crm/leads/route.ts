import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import type { CrmLeadStage, CrmLeadStatus, PriorityLevel } from "../../../../domain";
import { auditLogsRepository, tenantScopeFromUser } from "../../../../repositories/supabaseEnterpriseRepositories";
import { createCrmLead, listCrmLeads, type CreateCrmLeadInput } from "../../../../repositories/crmRepository";

// Executive Dashboard Redesign Sprint ED-R2. organization_id/userId are derived from the
// authenticated server session via tenantScopeFromUser -- never accepted from the client.
export async function GET() {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const scope = tenantScopeFromUser(session.user, session.accessToken);
  const leads = await listCrmLeads(scope);
  return NextResponse.json({ leads });
}

type CreateLeadRequest = {
  title?: string;
  organizationName?: string;
  contactName?: string;
  stage?: CrmLeadStage;
  estimatedValue?: number;
  currency?: string;
  priority?: PriorityLevel;
  nextFollowUpAt?: string;
  status?: CrmLeadStatus;
  source?: string;
};

export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await request.json().catch(() => ({})) as CreateLeadRequest;
  if (!body.title?.trim()) return NextResponse.json({ error: "Lead title is required." }, { status: 400 });

  const scope = tenantScopeFromUser(session.user, session.accessToken);
  const input: CreateCrmLeadInput = {
    title: body.title.trim(),
    organizationName: body.organizationName,
    contactName: body.contactName,
    stage: body.stage,
    estimatedValue: body.estimatedValue,
    currency: body.currency,
    priority: body.priority,
    nextFollowUpAt: body.nextFollowUpAt,
    status: body.status,
    source: body.source,
  };

  const lead = await createCrmLead(scope, input);
  await auditLogsRepository.record(scope, {
    action: "crm.lead.created",
    resourceType: "crm_lead",
    resourceId: lead.id,
    category: "crm",
    metadata: { stage: lead.stage, status: lead.status, priority: lead.priority },
  }).catch(() => undefined);

  return NextResponse.json({ lead }, { status: 201 });
}
