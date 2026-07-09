import { describe, expect, it } from "vitest";
import { createAuditChainRecord, verifyAuditChain } from "./auditIntegrity";

describe("audit integrity", () => {
  it("detects tampering in the immutable audit hash chain", () => {
    const first = createAuditChainRecord({
      id: "audit_1",
      organizationId: "org_ne_hm",
      action: "auth.login",
      resourceType: "session",
      createdAt: "2026-07-09T08:00:00.000Z",
    });
    const second = createAuditChainRecord(
      {
        id: "audit_2",
        organizationId: "org_ne_hm",
        actorRole: "Organization Admin",
        action: "document.viewed",
        resourceType: "document",
        resourceId: "doc_1",
        createdAt: "2026-07-09T08:01:00.000Z",
      },
      first.integrityHash,
    );

    expect(verifyAuditChain([first, second])).toBe(true);
    expect(verifyAuditChain([first, { ...second, resourceId: "doc_2" }])).toBe(false);
  });
});
