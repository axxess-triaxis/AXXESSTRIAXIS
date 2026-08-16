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
  department?: string;
  title?: string;
  timezone?: string;
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

// A-103 (2026-08-09): a real, dedicated Reminder type inside Tasks & Workflow -- previously a
// Reminder created from an AI answer silently became a Task tagged "reminder" (see
// AGENTIC_ROUTE_CAVEAT.reminder, now removed since this type exists). See
// supabase/migrations/20260809130000_reminders.sql.
export interface Reminder {
  id: EntityId;
  organizationId: EntityId;
  title: string;
  description?: string;
  remindAt: ISODateTime;
  recurrence: "none" | "daily" | "weekly" | "monthly";
  linkedEntityType?: "task" | "project" | "stakeholder";
  linkedEntityId?: EntityId;
  ownerId?: EntityId;
  status: "pending" | "completed" | "dismissed";
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Stakeholder {
  id: EntityId;
  organizationId: EntityId;
  name: string;
  affiliation: string;
  relationshipOwnerId?: EntityId;
  influenceScore: number;
  /** "unrated" (RAG Remediation Sprint 3, A-58): the honest default before anyone supplies a real
   * assessment -- distinct from "low," which asserts a real (if weak) signal was actually rated. */
  engagementLevel: "unrated" | "low" | "medium" | "high";
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
  extractedText?: string;
  extractionMethod?: "text-layer" | "ocr" | "docx" | "plain";
  extractionTruncated?: boolean;
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

// Executive Dashboard Redesign Sprint ED-R2: minimal first-version CRM pipeline entity. A single
// stage/status pair represents leads and opportunities together rather than separate lead/deal
// entities -- see supabase/migrations/20260801120000_crm_leads.sql.
export type CrmLeadStage = "new" | "qualifying" | "proposal" | "negotiation" | "won" | "lost";
export type CrmLeadStatus = "open" | "stalled" | "won" | "lost";

export interface CrmLead {
  id: EntityId;
  organizationId: EntityId;
  stakeholderId?: EntityId;
  title: string;
  organizationName?: string;
  contactName?: string;
  stage: CrmLeadStage;
  estimatedValue?: number;
  currency?: string;
  priority: PriorityLevel;
  ownerUserId?: EntityId;
  nextFollowUpAt?: ISODateTime;
  status: CrmLeadStatus;
  source?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

// Executive Dashboard Redesign Sprint ED-R3: a MANUAL financial watchlist item -- not a bank feed.
// No banking/payment provider integration exists in this codebase; this entity represents a
// tenant's own manually-entered threshold, never live account data. See
// supabase/migrations/20260801140000_financial_watch_items.sql.
export type FinancialWatchCategory = "budget" | "bank_balance" | "accounts_actionable" | "other";
export type FinancialWatchThresholdType = "below" | "above";
export type FinancialWatchStatus = "open" | "resolved";

export interface FinancialWatchItem {
  id: EntityId;
  organizationId: EntityId;
  title: string;
  category: FinancialWatchCategory;
  thresholdType: FinancialWatchThresholdType;
  thresholdAmount: number;
  currentAmount?: number;
  currency: string;
  status: FinancialWatchStatus;
  ownerUserId?: EntityId;
  dueAt?: ISODateTime;
  notes?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

// A-96 (2026-08-04): real, tenant-settable keyword -> topic/urgency mapping rules, backed by
// social_alert_rules (supabase/migrations/202607100001_sprint14_rag_integrations_alerts.sql,
// widened by 20260804120000_social_alert_rules_providers.sql). Not demo-only -- this is a real
// capability for real tenants, matching the SocialAlertProvider union in
// src/services/alerts/socialAlerts.ts.
export type SocialAlertRuleProvider = "x" | "facebook" | "instagram" | "linkedin" | "threads" | "rss" | "manual" | "demo" | "brand24";
export type SocialAlertRuleUrgency = "low" | "medium" | "high";

export interface SocialAlertRule {
  id: EntityId;
  organizationId: EntityId;
  provider: SocialAlertRuleProvider;
  keyword: string;
  topic: string;
  urgency: SocialAlertRuleUrgency;
  createdBy?: EntityId;
  createdAt: ISODateTime;
}

// Sprint 1 real Social Alerts (2026-08-17): social_alert_events has real schema and RLS
// (supabase/migrations/202607100001_sprint14_rag_integrations_alerts.sql) but no application code
// wrote to it before this change -- see src/services/alerts/socialAlertMatching.ts and
// brand24Ingestion.ts for the rule-matching engine that now populates it.
export type SocialAlertEventSentiment = "positive" | "neutral" | "negative";

export interface SocialAlertEvent {
  id: EntityId;
  organizationId: EntityId;
  ruleId?: EntityId;
  provider: SocialAlertRuleProvider;
  title: string;
  sourceAccount: string;
  sentiment: SocialAlertEventSentiment;
  urgency: SocialAlertRuleUrgency;
  actionTargets: string[];
  receivedAt: ISODateTime;
  reviewedAt?: ISODateTime;
  reviewedBy?: EntityId;
  externalId?: string;
  metadata: Record<string, unknown>;
}

// MC-2 (2026-08-02): Meta Business Suite + Threads + WhatsApp Live Ops. See
// supabase/migrations/20260802120000_meta_threads_whatsapp_events.sql for the backing tables.
export type WhatsAppEventType = "message_inbound" | "message_status" | "call" | "system";
export type WhatsAppMessageStatus = "sent" | "delivered" | "read" | "failed" | "received";
export type WhatsAppEventDirection = "inbound" | "outbound";

export interface WhatsAppBusinessEvent {
  id: EntityId;
  organizationId: EntityId;
  connectionId?: EntityId;
  eventType: WhatsAppEventType;
  wabaPhoneNumberId?: string;
  waMessageId?: string;
  direction?: WhatsAppEventDirection;
  fromNumber?: string;
  toNumber?: string;
  messageType?: string;
  messageStatus?: WhatsAppMessageStatus;
  callStatus?: string;
  payload: Record<string, unknown>;
  receivedAt: ISODateTime;
  acknowledgedAt?: ISODateTime;
  acknowledgedBy?: EntityId;
  createdAt: ISODateTime;
}

export type SocialPlatformProviderId = "threads" | "meta_business" | "x_twitter" | "linkedin";
export type SocialPlatformSurface = "facebook_page" | "instagram" | "threads" | "x" | "linkedin";
export type PublishedContentType = "text" | "image" | "video" | "carousel" | "reel" | "link";
export type PublishedContentStatus = "draft" | "scheduled" | "published" | "failed";

export interface PublishedContentItem {
  id: EntityId;
  organizationId: EntityId;
  providerId: SocialPlatformProviderId;
  connectionId?: EntityId;
  platformSurface: SocialPlatformSurface;
  externalPostId?: string;
  contentType: PublishedContentType;
  caption?: string;
  mediaUrls: string[];
  status: PublishedContentStatus;
  scheduledAt?: ISODateTime;
  publishedAt?: ISODateTime;
  permalink?: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  impressionCount: number;
  metadata: Record<string, unknown>;
  createdBy?: EntityId;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type CampaignStatus = "draft" | "active" | "paused" | "completed" | "archived";

export interface CampaignPromotion {
  id: EntityId;
  organizationId: EntityId;
  providerId: SocialPlatformProviderId;
  connectionId?: EntityId;
  externalCampaignId?: string;
  name: string;
  objective?: string;
  status: CampaignStatus;
  budgetAmount?: number;
  budgetCurrency: string;
  spendAmount: number;
  startAt?: ISODateTime;
  endAt?: ISODateTime;
  reachCount: number;
  clickCount: number;
  conversionCount: number;
  metadata: Record<string, unknown>;
  createdBy?: EntityId;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type CommunityEngagementType = "comment" | "dm" | "mention" | "reply";
export type CommunityEngagementStatus = "open" | "replied" | "dismissed";

export interface CommunityEngagementItem {
  id: EntityId;
  organizationId: EntityId;
  providerId: SocialPlatformProviderId;
  connectionId?: EntityId;
  platformSurface: SocialPlatformSurface;
  engagementType: CommunityEngagementType;
  externalEngagementId?: string;
  relatedContentId?: EntityId;
  authorHandle?: string;
  authorDisplayName?: string;
  bodyText?: string;
  sentiment: "positive" | "neutral" | "negative";
  status: CommunityEngagementStatus;
  receivedAt: ISODateTime;
  repliedAt?: ISODateTime;
  repliedBy?: EntityId;
  metadata: Record<string, unknown>;
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
