import { NextResponse } from "next/server";
import { routeAiRequest } from "../../../services/ai/router/aiRouter";
import type { AiPromptRequest } from "../../../services/ai/types";

export async function POST(request: Request) {
  const body = await request.json().catch(() => undefined) as Partial<AiPromptRequest> | undefined;
  if (!body?.prompt || !body.context?.organizationId || !body.context.userId || !body.context.userRole) {
    return NextResponse.json({ error: "prompt and tenant context are required" }, { status: 400 });
  }

  const result = await routeAiRequest(body as AiPromptRequest);
  return NextResponse.json(result);
}

