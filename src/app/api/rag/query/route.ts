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
import { answerTenantQuestion } from "../../../../services/rag/tenantRagWorkflow";

export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { question?: string; limit?: number };
  const question = body.question?.trim();
  if (!question) return NextResponse.json({ error: "Question is required." }, { status: 400 });

  try {
    const scope = tenantScopeFromUser(session.user, session.accessToken);
    const answer = await answerTenantQuestion({
      documentsRepository,
      documentVersionsRepository,
      documentPermissionsRepository,
      knowledgeArticlesRepository,
      tasksRepository,
      auditLogsRepository,
    }, scope, question, { limit: body.limit });
    return NextResponse.json(answer);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "RAG query failed." }, { status: 400 });
  }
}
