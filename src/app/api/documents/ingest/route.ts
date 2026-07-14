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
import { ingestTenantDocument } from "../../../../services/rag/tenantRagWorkflow";

export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await request.json().catch(() => ({})) as {
    title?: string;
    bodyText?: string;
    fileName?: string;
    mimeType?: string;
    visibility?: "private" | "team" | "department" | "organization" | "shared";
    classification?: "public" | "internal" | "confidential" | "restricted";
    tags?: string[];
    projectId?: string;
  };

  try {
    const scope = tenantScopeFromUser(session.user, session.accessToken);
    const result = await ingestTenantDocument({
      documentsRepository,
      documentVersionsRepository,
      documentPermissionsRepository,
      knowledgeArticlesRepository,
      tasksRepository,
      auditLogsRepository,
    }, scope, {
      title: body.title ?? "",
      bodyText: body.bodyText ?? "",
      fileName: body.fileName,
      mimeType: body.mimeType,
      visibility: body.visibility,
      classification: body.classification,
      tags: body.tags,
      projectId: body.projectId,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Document ingestion failed." }, { status: 400 });
  }
}
