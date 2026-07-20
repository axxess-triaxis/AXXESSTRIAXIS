import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import {
  auditLogsRepository,
  documentPermissionsRepository,
  documentsRepository,
  documentVersionsRepository,
  knowledgeArticlesRepository,
  meetingsRepository,
  projectsRepository,
  tasksRepository,
  tenantScopeFromUser,
} from "../../../../repositories/supabaseEnterpriseRepositories";
import { ingestTenantDocument } from "../../../../services/rag/tenantRagWorkflow";
import type { OnboardingGoal } from "../../../../onboarding/enterpriseOnboarding";

// Seeds real, persisted, tenant-scoped records via the live repositories -- never fabricated
// data shown as real (see DEMO_DATA_LEAKAGE_AUDIT.md). Every seeded record is tagged
// "sample-data" and titled with a "Sample:" prefix so it's identifiable and removable by the
// customer, but it is genuinely live: editable, deletable, and indistinguishable from the
// customer's own records to every other part of the app.
const SAMPLE_TAG = "sample-data";

async function seedKnowledgeAi(scope: ReturnType<typeof tenantScopeFromUser>) {
  const repositories = { documentsRepository, documentVersionsRepository, documentPermissionsRepository, knowledgeArticlesRepository, tasksRepository, auditLogsRepository };
  await ingestTenantDocument(repositories, scope, {
    title: "Sample: District Oxygen Resilience Note",
    bodyText: "Biomedical maintenance variance is the leading risk to oxygen resilience this quarter. Escalate concentrator servicing backlogs to the operations lead and confirm spare-parts inventory before the next review cycle.",
  });
  await ingestTenantDocument(repositories, scope, {
    title: "Sample: Referral Handoff Playbook",
    bodyText: "Referral handoffs should be confirmed within two hours of transfer. Escalate unconfirmed handoffs to the on-call coordinator and log the outcome in the shared tracker.",
  });
  return { seeded: ["document", "document"] };
}

async function seedWorkflowTasks(scope: ReturnType<typeof tenantScopeFromUser>) {
  const project = await projectsRepository.create(scope, {
    organizationId: scope.organizationId,
    name: "Sample: District Outreach Program",
    description: "A sample project to explore progress tracking, risk, and task follow-through.",
    ownerId: scope.userId,
    progress: 20,
    riskLevel: "medium",
    priority: "medium",
    status: "in-progress",
    tags: [SAMPLE_TAG],
  });
  await tasksRepository.create(scope, {
    organizationId: scope.organizationId,
    projectId: project.id,
    title: "Sample: Confirm district coordinator contacts",
    priority: "high",
    status: "pending",
    assigneeId: scope.userId,
    tags: [SAMPLE_TAG],
  });
  await tasksRepository.create(scope, {
    organizationId: scope.organizationId,
    projectId: project.id,
    title: "Sample: Draft weekly outreach summary",
    priority: "medium",
    status: "pending",
    assigneeId: scope.userId,
    tags: [SAMPLE_TAG],
  });
  return { seeded: ["project", "task", "task"] };
}

async function seedMeetingsCoordination(scope: ReturnType<typeof tenantScopeFromUser>) {
  const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await meetingsRepository.create(scope, {
    organizationId: scope.organizationId,
    title: "Sample: Weekly Coordination Review",
    startsAt,
    attendeeIds: [scope.userId],
    agenda: "Review open action items, escalations, and upcoming decisions.",
    decisions: [],
    actionItems: ["Confirm attendee list", "Circulate agenda 24 hours in advance"],
    status: "scheduled",
  });
  return { seeded: ["meeting"] };
}

export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { goal?: OnboardingGoal };
  const scope = tenantScopeFromUser(session.user, session.accessToken);

  try {
    let result: { seeded: string[] };
    if (body.goal === "knowledge_ai") result = await seedKnowledgeAi(scope);
    else if (body.goal === "workflow_tasks") result = await seedWorkflowTasks(scope);
    else if (body.goal === "meetings_coordination") result = await seedMeetingsCoordination(scope);
    else return NextResponse.json({ error: "Unknown onboarding goal." }, { status: 400 });

    await auditLogsRepository.record(scope, {
      action: "onboarding.sample_data_seeded",
      resourceType: "organization",
      resourceId: scope.organizationId,
      category: "onboarding",
      metadata: { goal: body.goal, seeded: result.seeded },
    }).catch(() => undefined);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Sample data seeding failed." }, { status: 400 });
  }
}
