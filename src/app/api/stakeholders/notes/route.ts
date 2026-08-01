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

// A-79: "Save stakeholder mapping" from the AI Workspace actionables pop-up lands here -- a
// mapping isn't a new Contact record, so it reuses this already-live note surface (GET above)
// rather than a new table.
export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await request.json().catch(() => ({} as { title?: string; body?: string }));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const noteBody = typeof body.body === "string" ? body.body.trim() : "";
  if (!title || !noteBody) return NextResponse.json({ error: "title and body are required." }, { status: 400 });

  const scope = tenantScopeFromUser(session.user, session.accessToken);
  const note = await stakeholderNotesRepository.create(scope, { title, body: noteBody });
  return NextResponse.json({ note }, { status: 201 });
}
