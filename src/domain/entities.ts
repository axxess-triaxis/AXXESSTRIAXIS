export type EntityId = string;
export type ISODateTime = string;
export type PriorityLevel = "low" | "medium" | "high" | "urgent";
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
  storagePath: string;
  mimeType: string;
  classification?: "public" | "internal" | "confidential" | "restricted";
  projectId?: EntityId;
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
