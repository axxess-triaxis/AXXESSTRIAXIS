import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { auditLogsRepository, tenantScopeFromUser } from "../../../../repositories/supabaseEnterpriseRepositories";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "../../../../repositories/supabaseAdmin";
import { getAiProviderConfigurations } from "../../../../services/ai/model-routing-policy";
import { classifyAiPrompt } from "../../../../services/ai/prompt-classifier";
import { buildTenantModelPolicy, selectTenantModelRoute } from "../../../../services/ai/tenantModelPolicy";
import type { AiPromptRequest, AiRoutingContext } from "../../../../services/ai/types";
import { getAiRouterStatusSnapshot } from "../../../../services/ai/router/aiRouter";

export async function GET() {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  return NextResponse.json({
    organizationId: session.user.organizationId,
    router: getAiRouterStatusSnapshot(),
    policy: buildTenantModelPolicy(session.user.organizationId),
  });
}

export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await request.json().catch(() => undefined) as Partial<AiPromptRequest> | undefined;
  if (!body?.prompt) return NextResponse.json({ error: "prompt is required." }, { status: 400 });

  const requestedContext = body.context as Partial<AiRoutingContext> | undefined;
  if (requestedContext?.organizationId && requestedContext.organizationId !== session.user.organizationId) {
    return NextResponse.json({ error: "Cross-organization AI policy preview is not allowed." }, { status: 403 });
  }

  const context: AiRoutingContext = {
    ...requestedContext,
    organizationId: session.user.organizationId,
    userId: session.user.id,
    userRole: session.user.role,
  };
  const classification = classifyAiPrompt({ prompt: body.prompt, task: body.task, context });
  const decision = selectTenantModelRoute(body.prompt, classification, context, getAiProviderConfigurations());
  const scope = tenantScopeFromUser(session.user, session.accessToken);

  await auditLogsRepository.record(scope, {
    action: "ai.model_policy.evaluated",
    resourceType: "ai-model-policy",
    category: "ai-governance",
    metadata: {
      policyId: decision.policy.policyId,
      provider: decision.provider.name,
      fallbackChain: decision.fallbackChain,
      estimatedCostUsd: decision.estimatedCostUsd,
      requiresHumanApproval: decision.requiresHumanApproval,
      gatewayTags: decision.gatewayTags,
    },
  }).catch(() => undefined);

  if (isSupabaseAdminConfigured()) {
    await supabaseAdminRest("ai_usage_ledger", {
      method: "POST",
      body: {
        organization_id: session.user.organizationId,
        user_id: session.user.id,
        provider: decision.provider.name,
        model_policy_id: decision.policy.policyId,
        task_category: classification.category,
        estimated_cost_usd: decision.estimatedCostUsd,
        latency_ms: null,
        human_review_required: decision.requiresHumanApproval,
        metadata: {
          fallbackChain: decision.fallbackChain,
          gatewayTags: decision.gatewayTags,
          sensitivity: classification.sensitivity,
        },
      },
    }).catch(() => undefined);
  }

  return NextResponse.json({ classification, decision });
}
