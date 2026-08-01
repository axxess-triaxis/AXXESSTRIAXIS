import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../auth/serverSession";
import { tenantScopeFromUser } from "../../../repositories/supabaseEnterpriseRepositories";
import { approvalRequestsRepository } from "../../../repositories/workflowActionRepositories";

// RAG Remediation Sprint 3 (A-60 precondition): real approval_requests rows are already created
// when an AI Review Inbox item is approved with "Create approval request" (see
// createApprovedAction() in liveTenantWorkflow.ts), but ApprovalsSection.tsx never fetched or
// displayed them for a live tenant -- it showed only an honest "not wired yet" empty state. This
// route is what makes a real Export Report action possible: there was nothing tenant-scoped to
// export before this existed.
export async function GET() {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const scope = tenantScopeFromUser(session.user, session.accessToken);
  const approvals = await approvalRequestsRepository.list(scope, { pageSize: 100 }).catch(() => []);
  return NextResponse.json({ approvals });
}
