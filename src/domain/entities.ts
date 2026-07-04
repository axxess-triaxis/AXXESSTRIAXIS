export type EntityId = string;
export type ISODateTime = string;
export type PriorityLevel = "low" | "medium" | "high" | "urgent";
export type DocumentKind = "pdf" | "docx" | "xlsx" | "pptx" | "image" | "text" | "markdown" | "link" | "unknown";
export type DocumentStatus = "active" | "archived" | "deleted";
export type DocumentVisibility = "private" | "team" | "department" | "organization" | "shared";
export type DocumentPermissionPrincipal = "user" | "role" | "team" | "department" | "organization" | "external";
export type DocumentPermissionLevel = "viewer" | "editor" | "owner";
export type DocumentActivityAction =
  | "uploaded"
  | "viewed"
  | "edited"
  | "downloaded"
  | "deleted"
  | "archived"
  | "restored"
  | "permission_changed";
export type KnowledgeArticleStatus = "draft" | "published" | "archived";
export type RoleName =
  | "Super Admin"
  | "Organization Admin"
  | "Executive"
  | "Manager"
  | "Employee"
  | "Consultant"
  | "Guest";

export interface Organization {
  id: EntityId;
  name: string;
  slug: string;
  sector: "government" | "enterprise" | "healthcare" | "ngo" | "consulting" | "other";
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Permission {
  id: EntityId;
  resource: string;
  action: "create" | "read" | "update" | "delete" | "approve" | "admin";
  description?: string;
}

export interface Role {
  id: EntityId;
  organizationId: EntityId | null;
  name: RoleName;
  permissions: Permission[];
}

export interface User {
  id: EntityId;
  organizationId: EntityId;
  email: string;
  displayName: string;
  avatarInitials: string;
  role: RoleName;
  roleIds: EntityId[];
  status: "active" | "invited" | "suspended";
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Program {
  id: EntityId;
  organizationId: EntityId;
  name: string;
  ownerId: EntityId;
  status: "planning" | "active" | "at-risk" | "completed" | "archived";
  startDate?: ISODateTime;
  endDate?: ISODateTime;
}

export interface Project {
  id: EntityId;
  organizationId: EntityId;
  programId?: EntityId;
  name: string;
  description?: string;
  ownerId: EntityId;
  progress: number;
  riskLevel: PriorityLevel;
  priority: PriorityLevel;
  status: "planning" | "in-progress" | "review" | "complete" | "at-risk";
  startDate?: ISODateTime;
  dueDate?: ISODateTime;
  tags: string[];
}

export interface Task {
  id: EntityId;
  organizationId: EntityId;
  programId?: EntityId;
  projectId?: EntityId;
  title: string;
  description?: string;
  assigneeId?: EntityId;
  priority: PriorityLevel;
  status: "pending" | "in-progress" | "blocked" | "completed";
  dueDate?: ISODateTime;
  tags: string[];
}

export interface Stakeholder {
  id: EntityId;
  organizationId: EntityId;
  name: string;
  affiliation: string;
  relationshipOwnerId?: EntityId;
  influenceScore: number;
  engagementLevel: "low" | "medium" | "high";
}

export interface Document {
  id: EntityId;
  organizationId: EntityId;
  name: string;
  title?: string;
  description?: string;
  storagePath: string;
  fileName?: string;
  fileSize?: number;
  mimeType: string;
  documentType?: DocumentKind;
  status?: DocumentStatus;
  visibility?: DocumentVisibility;
  categoryId?: EntityId;
  categoryName?: string;
  ownerId?: EntityId;
  createdByUserId?: EntityId;
  updatedByUserId?: EntityId;
  currentVersion?: number;
  tags?: string[];
  isFavorite?: boolean;
  lastViewedAt?: ISODateTime;
  classification?: "public" | "internal" | "confidential" | "restricted";
  projectId?: EntityId;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  archivedAt?: ISODateTime;
  deletedAt?: ISODateTime;
}

export interface DocumentVersion {
  id: EntityId;
  organizationId: EntityId;
  documentId: EntityId;
  versionNumber: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  checksum?: string;
  createdByUserId?: EntityId;
  createdAt: ISODateTime;
}

export interface DocumentCategory {
  id: EntityId;
  organizationId: EntityId;
  name: string;
  slug: string;
  description?: string;
  parentId?: EntityId;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface DocumentTag {
  id: EntityId;
  organizationId: EntityId;
  name: string;
  color?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface DocumentPermission {
  id: EntityId;
  organizationId: EntityId;
  documentId: EntityId;
  principalType: DocumentPermissionPrincipal;
  principalId?: EntityId;
  accessLevel: DocumentPermissionLevel;
  createdByUserId?: EntityId;
  expiresAt?: ISODateTime;
  createdAt: ISODateTime;
}

export interface DocumentActivity {
  id: EntityId;
  organizationId: EntityId;
  documentId: EntityId;
  actorUserId?: EntityId;
  action: DocumentActivityAction;
  metadata: Record<string, unknown>;
  createdAt: ISODateTime;
}

export interface KnowledgeArticle {
  id: EntityId;
  organizationId: EntityId;
  title: string;
  bodyMarkdown: string;
  summary?: string;
  status: KnowledgeArticleStatus;
  categoryId?: EntityId;
  categoryName?: string;
  authorUserId: EntityId;
  tags: string[];
  isFavorite?: boolean;
  lastViewedAt?: ISODateTime;
  publishedAt?: ISODateTime;
  archivedAt?: ISODateTime;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Meeting {
  id: EntityId;
  organizationId: EntityId;
  projectId?: EntityId;
  programId?: EntityId;
  stakeholderId?: EntityId;
  title: string;
  startsAt: ISODateTime;
  endsAt?: ISODateTime;
  attendeeIds: EntityId[];
  agenda?: string;
  notes?: string;
  decisions: string[];
  actionItems: string[];
  status: "scheduled" | "completed" | "cancelled";
}

export interface Decision {
  id: EntityId;
  organizationId: EntityId;
  title: string;
  summary: string;
  decidedById: EntityId;
  meetingId?: EntityId;
  decidedAt: ISODateTime;
}

export interface Risk {
  id: EntityId;
  organizationId: EntityId;
  projectId?: EntityId;
  title: string;
  severity: "low" | "medium" | "high" | "urgent";
  likelihood: "low" | "medium" | "high";
  status: "open" | "mitigating" | "accepted" | "closed";
  ownerId?: EntityId;
}

export interface Notification {
  id: EntityId;
  organizationId: EntityId;
  userId: EntityId;
  type: "system" | "project" | "task" | "meeting" | "admin";
  title: string;
  body: string;
  resourceType?: string;
  resourceId?: EntityId;
  readAt?: ISODateTime;
  createdAt: ISODateTime;
}

export interface Invitation {
  id: EntityId;
  organizationId: EntityId;
  email: string;
  role: RoleName;
  invitedByUserId?: EntityId;
  status: "pending" | "accepted" | "expired" | "revoked";
  expiresAt: ISODateTime;
  acceptedAt?: ISODateTime;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface AuditLog {
  id: EntityId;
  organizationId: EntityId;
  actorUserId?: EntityId;
  actorRole?: RoleName;
  action: string;
  resourceType: string;
  resourceId?: EntityId;
  category?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
  createdAt: ISODateTime;
}

export type BetaFeedbackType = "Bug" | "Feature Request" | "Confusing Workflow" | "General Feedback";
export type BetaFeedbackStatus = "new" | "triaged" | "in-review" | "resolved" | "closed";

export interface BetaFeedback {
  id: EntityId;
  organizationId: EntityId;
  userId: EntityId;
  feedbackType: BetaFeedbackType;
  module: string;
  rating: number;
  message: string;
  permissionToContact: boolean;
  status: BetaFeedbackStatus;
  metadata: Record<string, unknown>;
  createdAt: ISODateTime;
}
