import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../auth/serverSession";
import type { BetaFeedbackType } from "../../../domain";
import { auditLogsRepository, betaFeedbackRepository, tenantScopeFromUser } from "../../../repositories/supabaseEnterpriseRepositories";
import type { RepositoryQuery } from "../../../repositories/interfaces";

const feedbackTypes: BetaFeedbackType[] = ["Bug", "Feature Request", "Confusing Workflow", "General Feedback"];
const adminRoles = ["Super Admin", "Organization Admin"];

function repositoryQueryFromUrl(url: URL): RepositoryQuery {
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "50");

  return {
    page: Number.isFinite(page) ? page : 1,
    pageSize: Number.isFinite(pageSize) ? pageSize : 50,
    search: url.searchParams.get("search") ?? undefined,
  };
}

async function jsonBody(request: Request) {
  const body = await request.json().catch(() => ({}));
  return typeof body === "object" && body !== null && !Array.isArray(body) ? body as Record<string, unknown> : {};
}

function validateFeedback(body: Record<string, unknown>) {
  const feedbackType = body.feedbackType;
  const moduleName = typeof body.module === "string" ? body.module.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const rating = Number(body.rating);

  if (!feedbackTypes.includes(feedbackType as BetaFeedbackType)) return "Feedback type is required.";
  if (!moduleName) return "Module is required.";
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return "Rating must be between 1 and 5.";
  if (!message || message.length < 3) return "Feedback message is required.";
  if (message.length > 4000) return "Feedback message is too long.";
  return undefined;
}

export async function GET(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!adminRoles.includes(session.user.role)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const scope = tenantScopeFromUser(session.user, session.accessToken);
  const rows = await betaFeedbackRepository.list(scope, repositoryQueryFromUrl(new URL(request.url)));
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await jsonBody(request);
  const validationError = validateFeedback(body);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const scope = tenantScopeFromUser(session.user, session.accessToken);
  const feedback = await betaFeedbackRepository.create(scope, {
    feedbackType: body.feedbackType as BetaFeedbackType,
    module: String(body.module).trim().slice(0, 80),
    rating: Number(body.rating),
    message: String(body.message).trim(),
    permissionToContact: Boolean(body.permissionToContact),
    metadata: typeof body.metadata === "object" && body.metadata !== null && !Array.isArray(body.metadata) ? body.metadata as Record<string, unknown> : {},
  });

  await auditLogsRepository.record(scope, {
    action: "beta_feedback.submitted",
    resourceType: "beta_feedback",
    resourceId: feedback.id,
    category: "beta-readiness",
    metadata: {
      feedback_type: feedback.feedbackType,
      module: feedback.module,
      rating: feedback.rating,
      permission_to_contact: feedback.permissionToContact,
    },
  }).catch(() => undefined);

  return NextResponse.json(feedback, { status: 201 });
}
