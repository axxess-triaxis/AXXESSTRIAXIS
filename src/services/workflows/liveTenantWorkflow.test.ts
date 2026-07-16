import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AiReviewInboxItem } from "../ai/reviewInbox";
import type { AuditLog, Task } from "../../domain";
import type {
  AuditLogsRepository,
  NotificationsRepository,
  TasksRepository,
  TenantScope,
} from "../../repositories/interfaces";
import { createWorkflowActionFromAiReview } from "./liveTenantWorkflow";
import type { ApprovalRequest, ProjectUpdate, StakeholderNote } from "./workflowActionRecords";

const scope: TenantScope = {
  organizationId: "org-live-pilot",
  userId: "user-reviewer",
  role: "Manager",
};

const review: AiReviewInboxItem = {
  id: "review-oxygen-risk",
  organizationId: "org-live-pilot",
  sourceAuditId: "audit-ai-answer",
  taskCategory: "risk_assessment",
  status: "pending",
  confidence: 0.81,
  humanReviewFlag: true,
  answerExcerpt: "Dibrugarh oxygen dependency requires a district-level mitigation task before the next review.",
  citations: [{ title: "Oxygen Resilience Risk Register", sourceId: "doc-oxygen", excerpt: "Mitigation owner required.", score: 0.88 }],
  createdAt: "2026-07-16T08:00:00.000Z",
};

function createRepositories() {
  const createdTasks: Task[] = [];
  const recordedAudits: AuditLog[] = [];

  const tasksRepository: TasksRepository = {
    list: vi.fn(async () => createdTasks),
    getById: vi.fn(async (_scope, id) => createdTasks.find((task) => task.id === id)),
    create: vi.fn(async (tenantScope, input) => {
      const task: Task = {
        id: `task-${createdTasks.length + 1}`,
        organizationId: tenantScope.organizationId,
        title: input.title ?? "Generated task",
        description: input.description,
        assigneeId: input.assigneeId,
        priority: input.priority ?? "medium",
        status: input.status ?? "pending",
        tags: input.tags ?? [],
      };
      createdTasks.push(task);
      return task;
    }),
    update: vi.fn(async (_scope, id, input) => {
      const current = createdTasks.find((task) => task.id === id);
      if (!current) throw new Error("Task not found.");
      Object.assign(current, input);
      return current;
    }),
  };

  const auditLogsRepository: AuditLogsRepository = {
    list: vi.fn(async () => recordedAudits),
    record: vi.fn(async (tenantScope, input) => {
      const audit: AuditLog = {
        id: `audit-${recordedAudits.length + 1}`,
        organizationId: tenantScope.organizationId,
        actorUserId: tenantScope.userId,
        actorRole: tenantScope.role,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        category: input.category,
        metadata: input.metadata,
        createdAt: "2026-07-16T09:00:00.000Z",
      };
      recordedAudits.push(audit);
      return audit;
    }),
  };

  const notificationsRepository: NotificationsRepository = {
    list: vi.fn(async () => []),
    getById: vi.fn(async () => undefined),
    create: vi.fn(async (tenantScope, input) => ({
      id: "notification-1",
      organizationId: tenantScope.organizationId,
      userId: input.userId ?? tenantScope.userId,
      type: input.type ?? "system",
      title: input.title ?? "Notification",
      body: input.body ?? "",
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      createdAt: "2026-07-16T09:00:00.000Z",
    })),
    update: vi.fn(async () => {
      throw new Error("Not needed in this test.");
    }),
  };

  return { tasksRepository, auditLogsRepository, notificationsRepository, createdTasks, recordedAudits };
}

describe("live tenant workflow execution", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  });

  it("creates a task, timeline events, progress records, notification, and audit evidence for an approved AI answer", async () => {
    const repositories = createRepositories();

    const result = await createWorkflowActionFromAiReview(repositories, scope, {
      review,
      decision: "approved",
      actionType: "task",
      actionTitle: "Assign oxygen resilience mitigation owner",
      notes: "Approved after district programme manager review.",
    });

    expect(result.createdTask?.title).toBe("Assign oxygen resilience mitigation owner");
    expect(result.createdTask?.tags).toContain("ai-review");
    expect(result.timelineEvents.map((event) => event.eventType)).toEqual([
      "human_decision",
      "workflow_action_created",
      "audit_recorded",
    ]);
    expect(result.progress.find((step) => step.stepId === "workflow-action")?.status).toBe("complete");
    expect(repositories.auditLogsRepository.record).toHaveBeenCalledWith(scope, expect.objectContaining({
      action: "ai.review.workflow_action_created",
      category: "workflow",
    }));
    expect(repositories.notificationsRepository.create).toHaveBeenCalled();
  });

  it("records rejection evidence without creating work", async () => {
    const repositories = createRepositories();

    const result = await createWorkflowActionFromAiReview(repositories, scope, {
      review,
      decision: "rejected",
      notes: "Insufficient evidence for a task.",
    });

    expect(result.createdTask).toBeUndefined();
    expect(result.timelineEvents.map((event) => event.eventType)).toEqual(["human_decision", "audit_recorded"]);
    expect(result.progress.find((step) => step.stepId === "workflow-action")?.status).toBe("ready");
    expect(repositories.tasksRepository.create).not.toHaveBeenCalled();
  });

  it("creates dedicated approval, stakeholder, and project records from approved reviews", async () => {
    const repositories = createRepositories();
    const approvalRequests: ApprovalRequest[] = [];
    const stakeholderNotes: StakeholderNote[] = [];
    const projectUpdates: ProjectUpdate[] = [];

    const approvalResult = await createWorkflowActionFromAiReview({
      ...repositories,
      approvalRequestsRepository: {
        list: vi.fn(async () => approvalRequests),
        create: vi.fn(async (tenantScope, input) => {
          const record: ApprovalRequest = {
            id: "approval-1",
            organizationId: tenantScope.organizationId,
            requestedByUserId: input.requestedByUserId,
            reviewerUserId: input.reviewerUserId,
            sourceAiReviewId: input.sourceAiReviewId,
            title: input.title,
            description: input.description,
            priority: input.priority ?? "high",
            status: "pending",
            dueAt: input.dueAt,
            metadata: input.metadata ?? {},
            createdAt: "2026-07-16T09:00:00.000Z",
            updatedAt: "2026-07-16T09:00:00.000Z",
          };
          approvalRequests.push(record);
          return record;
        }),
      },
    }, scope, {
      review,
      decision: "approved",
      actionType: "approval_request",
      actionTitle: "Approve oxygen resilience escalation",
    });

    const stakeholderResult = await createWorkflowActionFromAiReview({
      ...repositories,
      stakeholderNotesRepository: {
        list: vi.fn(async () => stakeholderNotes),
        create: vi.fn(async (tenantScope, input) => {
          const record: StakeholderNote = {
            id: "stakeholder-note-1",
            organizationId: tenantScope.organizationId,
            createdByUserId: input.createdByUserId,
            sourceAiReviewId: input.sourceAiReviewId,
            title: input.title,
            body: input.body,
            sentiment: input.sentiment ?? "neutral",
            visibility: input.visibility ?? "organization",
            tags: input.tags ?? [],
            metadata: input.metadata ?? {},
            createdAt: "2026-07-16T09:00:00.000Z",
            updatedAt: "2026-07-16T09:00:00.000Z",
          };
          stakeholderNotes.push(record);
          return record;
        }),
      },
    }, scope, {
      review,
      decision: "approved",
      actionType: "stakeholder_note",
      actionTitle: "Record stakeholder context",
    });

    const projectResult = await createWorkflowActionFromAiReview({
      ...repositories,
      projectUpdatesRepository: {
        list: vi.fn(async () => projectUpdates),
        create: vi.fn(async (tenantScope, input) => {
          const record: ProjectUpdate = {
            id: "project-update-1",
            organizationId: tenantScope.organizationId,
            createdByUserId: input.createdByUserId,
            sourceAiReviewId: input.sourceAiReviewId,
            title: input.title,
            body: input.body,
            updateType: input.updateType ?? "ai_review",
            status: input.status ?? "recorded",
            progressDelta: input.progressDelta ?? 0,
            riskLevel: input.riskLevel,
            tags: input.tags ?? [],
            metadata: input.metadata ?? {},
            createdAt: "2026-07-16T09:00:00.000Z",
            updatedAt: "2026-07-16T09:00:00.000Z",
          };
          projectUpdates.push(record);
          return record;
        }),
      },
    }, scope, {
      review,
      decision: "approved",
      actionType: "project_update",
      actionTitle: "Update district oxygen resilience project",
    });

    expect(approvalResult.createdApprovalRequest?.title).toBe("Approve oxygen resilience escalation");
    expect(stakeholderResult.createdStakeholderNote?.tags).toContain("stakeholder-intelligence");
    expect(projectResult.createdProjectUpdate?.updateType).toBe("ai_review");
    expect(approvalResult.timelineEvents[1]?.resourceType).toBe("approval_request");
    expect(stakeholderResult.timelineEvents[1]?.resourceType).toBe("stakeholder_note");
    expect(projectResult.timelineEvents[1]?.resourceType).toBe("project_update");
  });
});
