import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { listWorkflowTimeline } from "../../../../services/workflows/liveTenantWorkflow";
import type { WorkflowTimelineResourceType } from "../../../../services/workflows/workflowEvidence";

const resourceTypes: WorkflowTimelineResourceType[] = [
  "organization",
  "user",
  "document",
  "email",
  "ai_review",
  "task",
  "approval",
  "project",
  "stakeholder",
  "meeting",
  "dashboard",
  "audit",
];

function resourceType(value: string | null): WorkflowTimelineResourceType | undefined {
  return resourceTypes.includes(value as WorkflowTimelineResourceType) ? value as WorkflowTimelineResourceType : undefined;
}

export async function GET(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 20), 1), 50);
  const timeline = await listWorkflowTimeline(session.user.organizationId, {
    limit,
    resourceType: resourceType(url.searchParams.get("resourceType")),
    resourceId: url.searchParams.get("resourceId") ?? undefined,
  });

  return NextResponse.json({ timeline });
}
