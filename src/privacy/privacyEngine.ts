import { createHash } from "node:crypto";

export type PrivacyRequestType = "access_export" | "erasure" | "rectification" | "consent_withdrawal" | "retention_review";
export type PrivacyRequestStatus = "queued" | "in_review" | "approved" | "processing" | "completed" | "rejected";
export type DataClassification = "public" | "internal" | "confidential" | "restricted" | "personal" | "sensitive_personal";
export type PrivacyExecutionStepTarget = "database" | "storage" | "vector_index" | "cache" | "search_index" | "analytics";

export type PrivacyRequest = {
  id: string;
  organizationId: string;
  requesterUserId: string;
  subjectUserId: string;
  type: PrivacyRequestType;
  status: PrivacyRequestStatus;
  lawfulBasis?: string;
  requestedAt: string;
};

export type PrivacyExecutionStep = {
  target: PrivacyExecutionStepTarget;
  action: "export" | "mask" | "delete" | "tombstone" | "revoke" | "review";
  description: string;
  requiresApproval: boolean;
};

const piiPattern = /(?:[\w.%+-]+@[\w.-]+\.[a-z]{2,}|\+?\d[\d -]{7,}\d)/gi;

export function maskPii(input: string): string {
  return input.replace(piiPattern, "[redacted]");
}

export function tokenizePersonalValue(value: string, organizationSalt: string): string {
  const digest = createHash("sha256").update(`${organizationSalt}:${value}`).digest("hex").slice(0, 24);
  return `tok_${digest}`;
}

export function buildPrivacyExecutionPlan(request: PrivacyRequest): PrivacyExecutionStep[] {
  if (request.type === "access_export") {
    return [
      { target: "database", action: "export", description: "Export tenant-scoped relational records.", requiresApproval: false },
      { target: "storage", action: "export", description: "Export owned document metadata and signed-file inventory.", requiresApproval: false },
      { target: "vector_index", action: "export", description: "Export document chunk metadata without embedding vectors.", requiresApproval: true },
      { target: "analytics", action: "export", description: "Export sanitized analytics profile events.", requiresApproval: true },
    ];
  }

  if (request.type === "erasure") {
    return [
      { target: "database", action: "tombstone", description: "Tombstone profile fields while retaining lawful audit records.", requiresApproval: true },
      { target: "storage", action: "delete", description: "Delete user-owned private storage objects.", requiresApproval: true },
      { target: "vector_index", action: "delete", description: "Delete subject-attributable chunks from tenant vector indexes.", requiresApproval: true },
      { target: "cache", action: "delete", description: "Purge runtime caches and session artifacts.", requiresApproval: false },
      { target: "search_index", action: "delete", description: "Remove subject-attributable search documents.", requiresApproval: false },
      { target: "analytics", action: "mask", description: "Tokenize historical analytics user identifiers.", requiresApproval: true },
    ];
  }

  if (request.type === "consent_withdrawal") {
    return [
      { target: "database", action: "revoke", description: "Mark consent record as withdrawn with timestamp.", requiresApproval: false },
      { target: "analytics", action: "revoke", description: "Stop non-essential analytics capture for the subject.", requiresApproval: false },
    ];
  }

  return [{ target: "database", action: "review", description: "Queue privacy request for data-steward review.", requiresApproval: true }];
}

export function shouldCascadePrivacyAction(request: PrivacyRequest): boolean {
  return ["erasure", "consent_withdrawal"].includes(request.type);
}
