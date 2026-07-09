import { createHash } from "node:crypto";
import type { EnterpriseRole } from "./enterpriseIam";

export type SecurityAuditAction =
  | "auth.login"
  | "auth.logout"
  | "auth.mfa.challenge"
  | "role.changed"
  | "permission.changed"
  | "document.viewed"
  | "document.uploaded"
  | "document.permission_changed"
  | "ai.answer.generated"
  | "ai.answer.approved"
  | "privacy.request.created"
  | "privacy.request.completed"
  | "workflow.approved"
  | "security.policy.updated";

export type SecurityAuditEvent = {
  id: string;
  organizationId: string;
  actorUserId?: string;
  actorRole?: EnterpriseRole;
  action: SecurityAuditAction;
  resourceType: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  sessionId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type AuditChainRecord = SecurityAuditEvent & {
  previousHash?: string;
  integrityHash: string;
};

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

export function createAuditIntegrityHash(event: SecurityAuditEvent, previousHash = ""): string {
  return createHash("sha256").update(`${previousHash}:${stableStringify(event)}`).digest("hex");
}

export function createAuditChainRecord(event: SecurityAuditEvent, previousHash?: string): AuditChainRecord {
  return {
    ...event,
    previousHash,
    integrityHash: createAuditIntegrityHash(event, previousHash),
  };
}

export function verifyAuditChain(records: AuditChainRecord[]): boolean {
  return records.every((record, index) => {
    const { integrityHash, previousHash, ...event } = record;
    const expectedPreviousHash = index === 0 ? previousHash : records[index - 1]?.integrityHash;

    return previousHash === expectedPreviousHash && integrityHash === createAuditIntegrityHash(event, expectedPreviousHash);
  });
}
