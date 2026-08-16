import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { auditLogsRepository, tenantScopeFromUser } from "../../../../repositories/supabaseEnterpriseRepositories";
import { runAgenticChatTurn, type AgenticChatResumeInput } from "../../../../services/chatbot/agenticChatLoop";
import { getPostHogClient } from "../../../../lib/posthog-server";

// NOTE: this requires the Vercel plan tier to support 30s function duration (Hobby defaults to
// 10s) -- flagged, not assumed; confirm the plan tier before relying on this in production. See the
// same caveat on src/app/api/documents/extract/route.ts.
export const maxDuration = 30;

type AgenticChatRequestBody = { userMessage?: string; resume?: AgenticChatResumeInput };

export async function POST(request: Request) {
  const body = await request.json().catch(() => undefined) as AgenticChatRequestBody | undefined;
  if (!body?.userMessage && !body?.resume) {
    return NextResponse.json({ error: "userMessage or resume is required" }, { status: 400 });
  }

  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const tenantScope = tenantScopeFromUser(session.user, session.accessToken);
  const startedAt = Date.now();
  const result = await runAgenticChatTurn({
    tenantScope,
    role: session.user.role,
    userMessage: body.userMessage ?? body.resume!.userMessage,
    resume: body.resume,
  });

  // The loop bypasses routeAiRequest entirely for its own reasoning calls, so it never gets
  // routeAiRequest's own audit write (src/app/api/ai/route.ts) -- this route writes its own instead.
  // ChatbotPanel.tsx falls back to that existing /api/ai + chatCommandRegistry path on this exact
  // "agentic_unavailable" status string, with a disclosed "Running in limited mode..." note.
  if (result.status === "unavailable") {
    return NextResponse.json({ status: "agentic_unavailable", reason: result.reason });
  }

  const toolsInvoked = result.status === "cancelled" ? [] : result.steps.map((step) => step.toolName);
  const latencyMs = Date.now() - startedAt;

  await auditLogsRepository.record(tenantScope, {
    action: "ai.agentic_chat.turn.completed",
    resourceType: "ai-agentic-chat",
    category: "ai-governance",
    metadata: {
      status: result.status,
      toolsInvoked,
      costUsd: result.status === "cancelled" ? 0 : result.costUsd,
      iterationsUsed: result.status === "paused" ? result.iterationsUsed : undefined,
      latencyMs,
    },
  }).catch(() => undefined);

  const posthog = getPostHogClient();
  if (posthog) {
    posthog.capture({
      distinctId: session.user.id,
      event: "ai_agentic_chat_turn_completed",
      properties: {
        organization_id: session.user.organizationId,
        user_role: session.user.role,
        status: result.status,
        tools_invoked_count: toolsInvoked.length,
        latency_ms: latencyMs,
      },
    });
    await posthog.flush();
  }

  return NextResponse.json(result);
}
