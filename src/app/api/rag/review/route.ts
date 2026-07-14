import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import {
  auditLogsRepository,
  documentPermissionsRepository,
  documentsRepository,
  documentVersionsRepository,
  knowledgeArticlesRepository,
  tasksRepository,
  tenantScopeFromUser,
} from "../../../../repositories/supabaseEnterpriseRepositories";
import { reviewTenantRagAnswer } from "../../../../services/rag/tenantRagWorkflow";

export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await request.json().catch(() => ({})) as {
    aiOutputAuditId?: string;
    decision?: "approved" | "rejected";
    notes?: string;
    createTask?: boolean;
    taskTitle?: string;
  };
  if (!body.aiOutputAuditId || (body.decision !== "approved" && body.decision !== "rejected")) {
    return NextResponse.json({ error: "AI output id and review decision are required." }, { status: 400 });
  }

  try {
    const scope = tenantScopeFromUser(session.user, session.accessToken);
    const result = await reviewTenantRagAnswer({
      documentsRepository,
      documentVersionsRepository,
      documentPermissionsRepository,
      knowledgeArticlesRepository,
      tasksRepository,
      auditLogsRepository,
    }, scope, {
      aiOutputAuditId: body.aiOutputAuditId,
      decision: body.decision,
      notes: body.notes,
      createTask: body.createTask,
      taskTitle: body.taskTitle,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "RAG review failed." }, { status: 400 });
  }
}
