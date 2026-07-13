import type {
  AuditLog,
  BetaFeedback,
  Document,
  DocumentActivity,
  DocumentCategory,
  DocumentPermission,
  DocumentTag,
  DocumentVersion,
  Invitation,
  KnowledgeArticle,
  Meeting,
  Notification,
  Organization,
  Program,
  Project,
  RoleName,
  Stakeholder,
  Task,
  User,
} from "../domain";
import type {
  AiMessageView,
  ApprovalView,
  DocumentView,
  IntegrationView,
  MeetingView,
  OkrMetricView,
  PerformanceMetricView,
  ProjectView,
  StakeholderView,
  TaskView,
  WorkloadMetricView,
} from "../services/contracts";
import { defaultProductivityPlugins } from "@axxess/shared";
import { demoOrganization } from "./demoMode";

const baseDate = new Date("2026-07-04T08:30:00.000Z");

const departments = [
  "Primary Care Access",
  "Maternal & Child Health",
  "Disease Surveillance",
  "Digital Health",
  "Supply Chain & Pharmacy",
  "Finance & Grants",
  "Community Outreach",
  "Emergency Preparedness",
  "Hospital Modernization",
  "Workforce Development",
  "Policy & Governance",
  "Mental Health Programs",
];

const projectThemes = [
  "Mobile clinic expansion",
  "District oxygen resilience",
  "Maternal referral network",
  "Immunization cold-chain upgrade",
  "Telehealth command center",
  "Community health worker enablement",
  "Tuberculosis screening acceleration",
  "Emergency stockpile modernization",
  "Rural diagnostics access",
  "Hospital discharge coordination",
];

const stakeholderOrganizations = [
  "State Health Directorate",
  "District Hospital Network",
  "Medical College Consortium",
  "Community Health Coalition",
  "Regional Procurement Authority",
  "Treasury & Planning Department",
  "Emergency Management Cell",
  "UNICEF Field Office",
  "North East Nursing Council",
  "Rural Clinics Association",
];

const districts = [
  "Kamrup Metropolitan",
  "Dibrugarh",
  "Nagaon",
  "Barpeta",
  "Cachar",
  "Tinsukia",
  "Jorhat",
  "Golaghat",
  "Kokrajhar",
  "Dhubri",
  "Kohima",
  "Imphal East",
  "Aizawl",
  "Shillong",
  "Agartala",
  "Itanagar",
];

const institutions = [
  "Gauhati Medical College Hospital",
  "Assam Medical College Dibrugarh",
  "Silchar Medical College",
  "Jorhat Medical College",
  "Regional Institute of Medical Sciences Imphal",
  "NEIGRIHMS Shillong",
  "Agartala Government Medical College",
  "Tom Riba Institute of Health Sciences",
  "Kohima District Hospital",
  "Aizawl Civil Hospital",
  "Barpeta District Public Health Office",
  "Dhubri Maternal Referral Unit",
];

const documentBlueprints = [
  { title: "Public Health Policy Note", category: "Policy", type: "policy note", tags: ["policy", "governance"], summary: "policy position on district health access, escalation thresholds and state-level sign-off" },
  { title: "Hospital Standard Operating Procedure", category: "Hospital Operations", type: "hospital SOP", tags: ["clinical", "sop"], summary: "ward-level operating procedure for triage, infection control, referral and shift handover" },
  { title: "Monthly Public Health Surveillance Report", category: "Public Health Reports", type: "public health report", tags: ["surveillance", "district"], summary: "district surveillance review covering fever clusters, maternal indicators, immunization gaps and response actions" },
  { title: "Budget Variance Memorandum", category: "Finance", type: "budget memo", tags: ["finance", "variance"], summary: "finance memorandum explaining grant utilization, variance drivers and corrective approvals" },
  { title: "Procurement Evaluation File", category: "Procurement", type: "procurement file", tags: ["procurement", "vendor"], summary: "procurement evaluation file with vendor due diligence, technical scoring and award recommendation" },
  { title: "District Review Meeting Minutes", category: "Meeting Minutes", type: "meeting minutes", tags: ["meeting", "district"], summary: "review minutes capturing decisions, action owners, overdue items and state-level dependencies" },
  { title: "Health Systems Grant Proposal", category: "Grants", type: "grant proposal", tags: ["grant", "funding"], summary: "grant proposal for resilient primary care, diagnostics, digital reporting and monitoring capacity" },
  { title: "Compliance Checklist", category: "Compliance", type: "compliance checklist", tags: ["compliance", "audit"], summary: "compliance checklist for procurement, data handling, clinical governance and reporting controls" },
  { title: "Stakeholder Brief", category: "Stakeholder Briefs", type: "stakeholder brief", tags: ["stakeholder", "briefing"], summary: "stakeholder briefing for district officials, hospital leadership and community partners" },
  { title: "Risk Register Update", category: "Risk", type: "risk register", tags: ["risk", "governance"], summary: "risk register update with severity, mitigation owner, residual exposure and escalation path" },
  { title: "Implementation Plan", category: "Implementation", type: "implementation plan", tags: ["implementation", "milestone"], summary: "implementation plan for staffing, procurement, reporting, training and district rollout" },
  { title: "District Review Note", category: "District Reviews", type: "district review note", tags: ["district", "review"], summary: "district review note summarizing progress, bottlenecks, field observations and support needs" },
  { title: "Audit Observation", category: "Audit", type: "audit observation", tags: ["audit", "control"], summary: "audit observation describing control gaps, evidence reviewed, management response and target closure" },
  { title: "Monitoring and Evaluation Report", category: "M&E", type: "monitoring and evaluation report", tags: ["monitoring", "evaluation"], summary: "monitoring and evaluation report for outcomes, variance, evidence quality and next review cycle" },
  { title: "CSR Partnership Proposal", category: "CSR", type: "CSR proposal", tags: ["csr", "partnership"], summary: "CSR proposal aligning private-sector support to district health mission priorities" },
  { title: "Mission Dashboard Export", category: "Dashboards", type: "health mission dashboard", tags: ["dashboard", "analytics"], summary: "dashboard export covering service delivery, risks, budgets, alerts and district performance" },
  { title: "Vendor Onboarding File", category: "Vendor Onboarding", type: "vendor onboarding file", tags: ["vendor", "onboarding"], summary: "vendor onboarding file with credentials, bank details, compliance documents and service scope" },
];

const firstNames = ["Ananya", "Rohan", "Meera", "Dev", "Ishita", "Tashi", "Priya", "Kabir", "Nima", "Farah", "Arjun", "Lina", "Sahil", "Maya", "Nikhil", "Asha"];
const lastNames = ["Rao", "Das", "Sarmah", "Choudhury", "Lepcha", "Borah", "Deka", "Phukan", "Lal", "Sharma", "Baruah", "Nongrum"];
const roles: RoleName[] = ["Organization Admin", "Executive", "Manager", "Employee", "Guest"];
const priorities = ["low", "medium", "high", "urgent"] as const;
const projectStatuses = ["planning", "in-progress", "review", "complete", "at-risk"] as const;
const taskStatuses = ["pending", "in-progress", "blocked", "completed"] as const;

function dayOffset(days: number) {
  const date = new Date(baseDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function compactDate(days: number) {
  return dayOffset(days).slice(0, 10);
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function money(amount: number) {
  return `$${amount.toFixed(1)}M`;
}

function id(prefix: string, index: number) {
  return `${prefix}_${String(index + 1).padStart(3, "0")}`;
}

function pick<T>(items: readonly T[], index: number) {
  return items[index % items.length];
}

function displayName(index: number) {
  return `${pick(firstNames, index)} ${pick(lastNames, Math.floor(index * 1.7))}`;
}

export type DemoDataset = {
  organization: Organization;
  organizations: Organization[];
  users: User[];
  programs: Program[];
  projects: Project[];
  tasks: Task[];
  stakeholders: Stakeholder[];
  documents: Document[];
  documentVersions: DocumentVersion[];
  documentCategories: DocumentCategory[];
  documentTags: DocumentTag[];
  documentPermissions: DocumentPermission[];
  documentActivity: DocumentActivity[];
  knowledgeArticles: KnowledgeArticle[];
  meetings: Meeting[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  invitations: Invitation[];
  betaFeedback: BetaFeedback[];
  institutional: {
    aiMessages: AiMessageView[];
    approvals: ApprovalView[];
    documents: DocumentView[];
    integrations: IntegrationView[];
    meetings: MeetingView[];
    okrData: OkrMetricView[];
    performanceData: PerformanceMetricView[];
    projects: ProjectView[];
    stakeholders: StakeholderView[];
    tasks: TaskView[];
    workloadData: WorkloadMetricView[];
  };
};

export const demoDatasetSummary = {
  organizationName: demoOrganization.name,
  projects: 186,
  programs: departments.length,
  documents: 2200,
  knowledgeArticles: 128,
  activities: 4200,
  stakeholders: 64,
  approvals: 42,
  auditLogs: 680,
  users: 36,
} as const;

export function createDemoDataset(): DemoDataset {
  const organization: Organization = {
    id: demoOrganization.id,
    name: demoOrganization.name,
    slug: demoOrganization.slug,
    sector: "healthcare",
    createdAt: dayOffset(-330),
    updatedAt: dayOffset(-1),
  };

  const users: User[] = Array.from({ length: 36 }, (_, index) => {
    const name = index === 0 ? "Ananya Rao" : displayName(index);
    const role = index === 0 ? "Organization Admin" : pick(roles, index);
    return {
      id: index === 0 ? "user_demo_executive" : id("user_nehealth", index),
      organizationId: organization.id,
      email: index === 0 ? "investor.preview@axxess.demo" : `${name.toLowerCase().replace(/\s+/g, ".")}@nehealth.example`,
      displayName: name,
      avatarInitials: initials(name),
      role,
      roleIds: [],
      status: index % 17 === 0 && index !== 0 ? "suspended" : "active",
      createdAt: dayOffset(-300 + index),
      updatedAt: dayOffset(-index),
    };
  });

  const programs: Program[] = departments.map((department, index) => ({
    id: id("program_nehealth", index),
    organizationId: organization.id,
    name: department,
    ownerId: users[(index % (users.length - 1)) + 1].id,
    status: index % 9 === 0 ? "at-risk" : index % 7 === 0 ? "planning" : index % 11 === 0 ? "completed" : "active",
    startDate: dayOffset(-260 + index * 4),
    endDate: dayOffset(80 + index * 11),
  }));

  const projects: Project[] = Array.from({ length: 186 }, (_, index) => {
    const program = programs[index % programs.length];
    const theme = pick(projectThemes, index);
    const district = pick(districts, index);
    const status = pick(projectStatuses, index + Math.floor(index / 8));
    const riskLevel = index % 19 === 0 ? "urgent" : index % 7 === 0 ? "high" : index % 5 === 0 ? "medium" : "low";
    return {
      id: id("project_nehealth", index),
      organizationId: organization.id,
      programId: program.id,
      name: `${district} ${theme}`,
      description: `${program.name} workstream for ${district}, active in the North East Health Mission operating model.`,
      ownerId: users[(index % (users.length - 1)) + 1].id,
      progress: Math.min(98, 18 + ((index * 13) % 81)),
      riskLevel,
      priority: riskLevel,
      status,
      startDate: dayOffset(-220 + (index % 60)),
      dueDate: dayOffset(12 + (index % 180)),
      tags: [program.name.split(" ")[0].toLowerCase(), district.toLowerCase(), status],
    };
  });

  const tasks: Task[] = Array.from({ length: 520 }, (_, index) => {
    const project = projects[index % projects.length];
    return {
      id: id("task_nehealth", index),
      organizationId: organization.id,
      programId: project.programId,
      projectId: project.id,
      title: `${pick(["Finalize", "Review", "Validate", "Coordinate", "Approve", "Prepare"], index)} ${pick(["field report", "procurement packet", "district briefing", "risk response", "training roster", "budget variance"], index + 2)} for ${project.name}`,
      description: `Operational task linked to ${project.name}; generated from six months of demo activity.`,
      assigneeId: users[(index % (users.length - 1)) + 1].id,
      priority: pick(priorities, index + 1),
      status: pick(taskStatuses, index + Math.floor(index / 6)),
      dueDate: dayOffset(-18 + (index % 74)),
      tags: project.tags.slice(0, 2),
    };
  });

  const stakeholders: Stakeholder[] = Array.from({ length: 64 }, (_, index) => ({
    id: id("stakeholder_nehealth", index),
    organizationId: organization.id,
    name: `${pick(["Dr.", "Director", "Commissioner", "Secretary", "Prof.", "Ms."], index)} ${displayName(index + 4)}`,
    affiliation: pick(stakeholderOrganizations, index),
    relationshipOwnerId: users[(index % (users.length - 1)) + 1].id,
    influenceScore: 54 + ((index * 7) % 45),
    engagementLevel: index % 5 === 0 ? "low" : index % 3 === 0 ? "medium" : "high",
  }));

  const documentCategories: DocumentCategory[] = documentBlueprints.map((blueprint, index) => ({
    id: id("doc_category_nehealth", index),
    organizationId: organization.id,
    name: blueprint.category,
    slug: blueprint.category.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    description: `${blueprint.category} records used by North East Health Mission teams for governed institutional operations.`,
    createdAt: dayOffset(-250 + index),
    updatedAt: dayOffset(-index),
  }));

  const supplementalCategories: DocumentCategory[] = [
    "Clinical Operations",
    "Training",
    "Field Reports",
  ].map((name, index) => ({
    id: id("doc_category_nehealth", index),
    organizationId: organization.id,
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    description: `${name} knowledge and document records for the North East Health Mission.`,
    createdAt: dayOffset(-250 + index),
    updatedAt: dayOffset(-index),
  }));

  documentCategories.push(...supplementalCategories.map((category, index) => ({
    ...category,
    id: id("doc_category_nehealth_extra", index),
  })));

  const documentTags: DocumentTag[] = [
    "governance",
    "clinical",
    "district",
    "finance",
    "risk",
    "procurement",
    "training",
    "field-report",
    "approved",
    "pilot",
    "urgent",
    "board-ready",
  ].map((name, index) => ({
    id: id("doc_tag_nehealth", index),
    organizationId: organization.id,
    name,
    color: pick(["#8B1E2D", "#2C4A7C", "#1A6B4A", "#C9A227", "#5F6B73"], index),
    createdAt: dayOffset(-230 + index),
    updatedAt: dayOffset(-index),
  }));

  const mimeTypes = [
    ["application/pdf", "pdf"],
    ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
    ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"],
    ["application/vnd.openxmlformats-officedocument.presentationml.presentation", "pptx"],
    ["text/markdown", "md"],
    ["image/png", "png"],
  ] as const;

  const documents: Document[] = Array.from({ length: demoDatasetSummary.documents }, (_, index) => {
    const project = projects[index % projects.length];
    const blueprint = pick(documentBlueprints, index);
    const district = pick(districts, index + Math.floor(index / 17));
    const institution = pick(institutions, index + Math.floor(index / 11));
    const category = documentCategories.find((item) => item.name === blueprint.category) ?? documentCategories[index % documentCategories.length];
    const [mimeType, extension] = pick(mimeTypes, index);
    const quarter = `Q${(index % 4) + 1} FY2026`;
    const cycle = String((index % 24) + 1).padStart(2, "0");
    const title = `${district} ${blueprint.title} - ${institution} - ${quarter} Cycle ${cycle}`;
    const docId = id("document_nehealth", index);
    return {
      id: docId,
      organizationId: organization.id,
      projectId: project.id,
      categoryId: category.id,
      categoryName: category.name,
      name: `${title}.${extension}`,
      title,
      description: `${blueprint.summary}. Connected to ${project.name}; includes ${district} field evidence, ${institution} accountability notes, budget exposure, risk owner, timeline variance and follow-up actions for the North East Health Mission.`,
      storagePath: `organizations/${organization.id}/documents/${docId}/versions/version_001/${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${extension}`,
      fileName: `${title}.${extension}`,
      fileSize: 80_000 + index * 18_500,
      mimeType,
      documentType: (extension === "md" ? "markdown" : extension === "png" ? "image" : extension) as NonNullable<Document["documentType"]>,
      status: index % 17 === 0 ? "archived" : "active",
      visibility: index % 11 === 0 ? "shared" : index % 7 === 0 ? "team" : "organization",
      classification: index % 13 === 0 ? "restricted" : index % 5 === 0 ? "confidential" : "internal",
      ownerId: users[(index % (users.length - 1)) + 1].id,
      createdByUserId: users[(index % (users.length - 1)) + 1].id,
      updatedByUserId: users[((index + 4) % (users.length - 1)) + 1].id,
      currentVersion: 1 + (index % 5),
      tags: [...blueprint.tags, district.toLowerCase().replace(/[^a-z0-9]+/g, "-"), documentTags[(index + 4) % documentTags.length].name],
      isFavorite: index % 14 === 0,
      lastViewedAt: dayOffset(-(index % 21)),
      createdAt: dayOffset(-210 + (index % 140)),
      updatedAt: dayOffset(-(index % 45)),
      archivedAt: index % 17 === 0 ? dayOffset(-(index % 25)) : undefined,
    };
  });

  const documentVersions: DocumentVersion[] = documents.flatMap((document) => (
    Array.from({ length: document.currentVersion ?? 1 }, (_, index) => ({
      id: `${document.id}_version_${index + 1}`,
      organizationId: organization.id,
      documentId: document.id,
      versionNumber: index + 1,
      fileName: document.fileName ?? document.name,
      fileSize: document.fileSize ?? 0,
      mimeType: document.mimeType,
      storagePath: document.storagePath.replace("version_001", `version_${String(index + 1).padStart(3, "0")}`),
      checksum: `demo-${document.id}-${index + 1}`,
      createdByUserId: document.createdByUserId,
      createdAt: dayOffset(-190 + index * 12),
    }))
  ));

  const documentPermissions: DocumentPermission[] = documents.filter((_, index) => index % 11 === 0).map((document, index) => ({
    id: id("doc_permission_nehealth", index),
    organizationId: organization.id,
    documentId: document.id,
    principalType: index % 2 === 0 ? "organization" : "user",
    principalId: index % 2 === 0 ? organization.id : users[(index % (users.length - 1)) + 1].id,
    accessLevel: index % 3 === 0 ? "editor" : "viewer",
    createdByUserId: users[0].id,
    createdAt: dayOffset(-70 + index),
  }));

  const knowledgeArticles: KnowledgeArticle[] = Array.from({ length: 128 }, (_, index) => {
    const category = documentCategories[index % documentCategories.length];
    const project = projects[index % projects.length];
    return {
      id: id("knowledge_article_nehealth", index),
      organizationId: organization.id,
      title: `${category.name}: ${pick(["Operating Playbook", "Decision Log", "Field Pattern", "Governance Note", "Service Standard"], index)} ${index + 1}`,
      bodyMarkdown: `# ${category.name}\n\nThis article captures reusable institutional knowledge from ${project.name}, including decisions, field lessons, controls, and next-step guidance.`,
      summary: `Reusable guidance from ${project.name} for ${category.name.toLowerCase()} teams.`,
      status: index % 9 === 0 ? "draft" : index % 23 === 0 ? "archived" : "published",
      categoryId: category.id,
      categoryName: category.name,
      authorUserId: users[(index % (users.length - 1)) + 1].id,
      tags: [documentTags[index % documentTags.length].name, "board-ready"],
      isFavorite: index % 12 === 0,
      lastViewedAt: dayOffset(-(index % 32)),
      publishedAt: index % 9 === 0 ? undefined : dayOffset(-180 + index),
      archivedAt: index % 23 === 0 ? dayOffset(-5) : undefined,
      createdAt: dayOffset(-200 + index),
      updatedAt: dayOffset(-(index % 60)),
    };
  });

  const documentActivity: DocumentActivity[] = Array.from({ length: demoDatasetSummary.activities }, (_, index) => {
    const document = documents[index % documents.length];
    return {
      id: id("document_activity_nehealth", index),
      organizationId: organization.id,
      documentId: document.id,
      actorUserId: users[(index % (users.length - 1)) + 1].id,
      action: pick(["uploaded", "viewed", "edited", "downloaded", "archived", "restored", "permission_changed"] as const, index),
      metadata: { fileName: document.fileName, projectId: document.projectId },
      createdAt: dayOffset(-180 + (index % 180)),
    };
  });

  const meetings: Meeting[] = Array.from({ length: 96 }, (_, index) => {
    const project = projects[index % projects.length];
    return {
      id: id("meeting_nehealth", index),
      organizationId: organization.id,
      projectId: project.id,
      programId: project.programId,
      title: `${pick(["Steering Committee", "District Review", "Risk Board", "Finance Checkpoint", "Clinical Operations"], index)}: ${project.name}`,
      startsAt: dayOffset(-120 + index * 2),
      endsAt: dayOffset(-120 + index * 2),
      attendeeIds: users.slice(0, 6).map((user) => user.id),
      agenda: "Review progress, risks, decisions, dependencies, and next actions.",
      notes: "Demo record generated from the North East Health Mission operating rhythm.",
      decisions: [`Decision ${index + 1}: maintain current escalation path.`],
      actionItems: [`Action ${index + 1}: update district readiness tracker.`],
      status: index % 4 === 0 ? "scheduled" : "completed",
    };
  });

  const notifications: Notification[] = Array.from({ length: 96 }, (_, index) => {
    const project = projects[index % projects.length];
    return {
      id: id("notification_nehealth", index),
      organizationId: organization.id,
      userId: users[index % users.length].id,
      type: pick(["project", "task", "meeting", "admin", "system"] as const, index),
      title: `${project.name} update`,
      body: `${pick(["Approval needed", "Risk changed", "New briefing ready", "Meeting notes published"], index)} for ${project.name}.`,
      resourceType: "project",
      resourceId: project.id,
      readAt: index % 3 === 0 ? dayOffset(-(index % 10)) : undefined,
      createdAt: dayOffset(-(index % 21)),
    };
  });

  const auditLogs: AuditLog[] = Array.from({ length: 680 }, (_, index) => {
    const project = projects[index % projects.length];
    return {
      id: id("audit_nehealth", index),
      organizationId: organization.id,
      actorUserId: users[(index % (users.length - 1)) + 1].id,
      actorRole: users[(index % (users.length - 1)) + 1].role,
      action: pick(["project.updated", "task.completed", "document.viewed", "approval.changed", "permission.changed", "meeting.completed"], index),
      resourceType: pick(["projects", "tasks", "documents", "approvals", "meetings"], index),
      resourceId: project.id,
      category: pick(["project-management", "task-management", "knowledge-hub", "access-control", "governance"], index),
      metadata: { demoTenant: organization.slug, project: project.name },
      createdAt: dayOffset(-190 + (index % 190)),
    };
  });

  const invitations: Invitation[] = Array.from({ length: 8 }, (_, index) => ({
    id: id("invitation_nehealth", index),
    organizationId: organization.id,
    email: `pilot.invitee.${index + 1}@nehealth.example`,
    role: pick(["Employee", "Manager", "Guest"] as RoleName[], index),
    invitedByUserId: users[0].id,
    status: "pending",
    expiresAt: dayOffset(7 + index),
    createdAt: dayOffset(-index),
    updatedAt: dayOffset(-index),
  }));

  const betaFeedback: BetaFeedback[] = [];

  const approvals: ApprovalView[] = Array.from({ length: 42 }, (_, index) => {
    const project = projects[index % projects.length];
    const amount = index % 4 === 0 ? money(0.4 + (index % 9) * 0.7) : null;
    return {
      id: index + 1,
      title: `${project.name} - ${pick(["Grant Release", "Procurement Approval", "Clinical Policy Exception", "Risk Acceptance", "Board Briefing"], index)}`,
      type: pick(["Finance", "Procurement", "Clinical", "Legal", "Governance"], index),
      requester: users[(index % (users.length - 1)) + 1].avatarInitials,
      amount,
      urgency: pick(["urgent", "high", "medium"] as const, index),
      dueDate: compactDate(-2 + index),
      status: index % 5 === 0 ? "Under Review" : index % 7 === 0 ? "Completed" : "Pending",
      description: `Approval record connected to ${project.name}, including documented rationale, risk posture, and audit trail.`,
    };
  });

  const projectViews: ProjectView[] = projects.map((project, index) => ({
    id: index + 1,
    name: project.name,
    dept: programs.find((program) => program.id === project.programId)?.name ?? "Portfolio",
    progress: project.progress,
    risk: project.riskLevel,
    owner: users.find((user) => user.id === project.ownerId)?.avatarInitials ?? "NE",
    dueDate: project.dueDate?.slice(0, 10) ?? compactDate(index),
    status: project.status === "complete" ? "Complete" : project.status === "at-risk" ? "At Risk" : project.status === "review" ? "Review" : project.status === "planning" ? "Planning" : "In Progress",
    budget: money(0.8 + (index % 16) * 0.55),
    spent: money(0.3 + (index % 12) * 0.42),
  }));

  const taskViews: TaskView[] = tasks.slice(0, 120).map((task, index) => ({
    id: index + 1,
    title: task.title,
    project: projects.find((project) => project.id === task.projectId)?.name ?? "Portfolio",
    priority: task.priority,
    assignee: users.find((user) => user.id === task.assigneeId)?.avatarInitials ?? "NE",
    due: task.dueDate?.slice(0, 10) ?? compactDate(index),
    status: task.status === "in-progress" ? "In Progress" : task.status === "completed" ? "Completed" : task.status === "blocked" ? "Blocked" : "Pending",
    aiSuggested: index % 5 === 0,
  }));

  const stakeholderViews: StakeholderView[] = stakeholders.map((stakeholder, index) => ({
    id: index + 1,
    name: stakeholder.name,
    org: stakeholder.affiliation,
    role: pick(["Executive Sponsor", "Clinical Authority", "Finance Reviewer", "District Lead", "Community Partner"], index),
    influence: stakeholder.influenceScore,
    engagement: stakeholder.engagementLevel === "high" ? "High" : stakeholder.engagementLevel === "medium" ? "Medium" : "Low",
    lastContact: compactDate(-(index % 45)),
    avatar: initials(stakeholder.name.replace(/^(Dr\.|Director|Commissioner|Secretary|Prof\.|Ms\.)\s+/, "")),
  }));

  const documentViews: DocumentView[] = documents.map((document, index) => ({
    id: index + 1,
    name: document.title ?? document.name,
    type: document.documentType === "markdown" ? "MD" : document.documentType === "image" ? "IMG" : (document.documentType ?? "PDF").toUpperCase(),
    size: document.fileSize ? `${Math.max(1, Math.round(document.fileSize / 1024 / 1024))} MB` : "1 MB",
    modified: document.updatedAt.slice(0, 10),
    tags: document.tags ?? [],
    aiSummary: document.description ?? "Institutional document in the North East Health Mission Knowledge Hub.",
    project: projects.find((project) => project.id === document.projectId)?.name.split(" ").slice(0, 3).join(" ") ?? "Portfolio",
  }));

  const meetingViews: MeetingView[] = meetings.map((meeting, index) => ({
    id: index + 1,
    title: meeting.title,
    date: meeting.startsAt.slice(0, 10),
    time: meeting.startsAt.slice(11, 16),
    duration: "60 min",
    attendees: meeting.attendeeIds.length,
    type: pick(["Executive", "Clinical", "Governance", "Finance", "District"], index),
    status: meeting.status === "scheduled" ? "Upcoming" : "Completed",
    aiSummary: meeting.status === "completed" ? meeting.notes ?? "Meeting completed with linked decisions." : null,
  }));

  const performanceData: PerformanceMetricView[] = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"].map((month, index) => ({
    month,
    completed: 48 + index * 8 + (index % 2) * 3,
    planned: 52 + index * 7,
  }));

  const workloadData: WorkloadMetricView[] = departments.slice(0, 8).map((department, index) => ({
    name: department.split(" ")[0],
    value: 58 + ((index * 9) % 37),
    capacity: 100,
  }));

  const okrData: OkrMetricView[] = [
    { name: "Care Access", progress: 86, target: 100 },
    { name: "Maternal Outcomes", progress: 79, target: 100 },
    { name: "Stockout Reduction", progress: 92, target: 100 },
    { name: "Digital Coverage", progress: 74, target: 100 },
    { name: "Audit Readiness", progress: 88, target: 100 },
  ];

  const integrations: IntegrationView[] = defaultProductivityPlugins.map((plugin, index) => ({
    name: plugin.name,
    category: plugin.category,
    status: "connected",
    lastSync: index < 4 ? `${2 + index * 3} min ago` : `${1 + (index % 3)} hr ago`,
    icon: plugin.icon,
  }));

  const aiMessages: AiMessageView[] = [
    { role: "user", content: "Summarize the current operational risk across oxygen resilience, maternal referrals, and district stockouts." },
    {
      role: "assistant",
      content: "North East Health Mission shows a mature operating rhythm: 186 projects, 2,200 institutional documents, and 4,200 document activities. Current priority risks are oxygen resilience in three districts, maternal referral turnaround in two corridors, and pharmacy stockout variance in rural blocks.",
      toolUsed: "Knowledge Hub - Risk Register - Meeting Notes",
    },
  ];

  return {
    organization,
    organizations: [organization],
    users,
    programs,
    projects,
    tasks,
    stakeholders,
    documents,
    documentVersions,
    documentCategories,
    documentTags,
    documentPermissions,
    documentActivity,
    knowledgeArticles,
    meetings,
    notifications,
    auditLogs,
    invitations,
    betaFeedback,
    institutional: {
      aiMessages,
      approvals,
      documents: documentViews,
      integrations,
      meetings: meetingViews,
      okrData,
      performanceData,
      projects: projectViews,
      stakeholders: stakeholderViews,
      tasks: taskViews,
      workloadData,
    },
  };
}
