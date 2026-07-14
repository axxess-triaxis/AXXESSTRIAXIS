import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../auth/serverSession";
import { auditLogsRepository, tenantScopeFromUser } from "../../../repositories/supabaseEnterpriseRepositories";
import { routeAiRequest } from "../../../services/ai/router/aiRouter";
import type { AiPromptRequest, AiRoutingContext } from "../../../services/ai/types";

export async function POST(request: Request) {
  const body = await request.json().catch(() => undefined) as Partial<AiPromptRequest> | undefined;
  if (!body?.prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const requestedContext = body.context as Partial<AiRoutingContext> | undefined;
  if (requestedContext?.organizationId && requestedContext.organizationId !== session.user.organizationId) {
    return NextResponse.json({ error: "Cross-organization AI context is not allowed." }, { status: 403 });
  }

  const context: AiRoutingContext = {
    ...requestedContext,
    organizationId: session.user.organizationId,
    userId: session.user.id,
    userRole: session.user.role,
  };

  const result = await routeAiRequest({
    prompt: body.prompt,
    task: body.task,
    context,
  });

  await auditLogsRepository.record(tenantScopeFromUser(session.user, session.accessToken), {
    action: "ai.route.completed",
    resourceType: "ai-request",
    category: "ai-governance",
    metadata: {
      providerUsed: result.providerUsed,
      modelUsed: result.modelUsed,
      confidence: result.confidence,
      humanReviewRequired: result.humanReviewRequired,
      latencyMs: result.latencyMs,
      costTier: result.costTier,
    },
  }).catch(() => undefined);

  return NextResponse.json(result);
}

