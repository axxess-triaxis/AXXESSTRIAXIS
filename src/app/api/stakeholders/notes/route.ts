import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { tenantScopeFromUser } from "../../../../repositories/supabaseEnterpriseRepositories";
import { stakeholderNotesRepository } from "../../../../repositories/workflowActionRepositories";

// RAG Remediation Sprint 3 (A-57): stakeholder notes created from an approved AI Review Inbox
// escalation were already real, tenant-scoped rows (stakeholderNotesRepository), but nothing in
// the client ever fetched them -- StakeholdersSection.tsx only ever queried the Contacts table.
// This route lets the CRM workspace actually show the escalation the founder's walkthrough
// couldn't find. stakeholderNotesRepository uses the service-role client (bypasses RLS), so this
// route is the tenant boundary: it scopes strictly to the caller's own organization_id.
export async function GET() {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const scope = tenantScopeFromUser(session.user, session.accessToken);
  const notes = await stakeholderNotesRepository.list(scope, { pageSize: 50 }).catch(() => []);
  return NextResponse.json({ notes });
}
