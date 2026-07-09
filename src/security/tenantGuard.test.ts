import { describe, expect, it } from "vitest";
import { buildTenantVectorNamespace, canAccessTenantResource, requireTenantResourceAccess, TenantAccessError } from "./tenantGuard";

const context = {
  tenantId: "tenant_ne_hm",
  organizationId: "org_ne_hm",
  userId: "user_1",
  role: "Project Lead" as const,
  departmentId: "dept_quality",
  workspaceIds: ["workspace_quality"],
};

describe("tenant guard", () => {
  it("blocks cross-organization and cross-tenant access", () => {
    expect(
      canAccessTenantResource(
        context,
        { id: "doc_1", tenantId: "tenant_other", organizationId: "org_ne_hm", visibility: "organization" },
        "document:read",
      ),
    ).toBe(false);

    expect(() =>
      requireTenantResourceAccess(
        context,
        { id: "doc_2", tenantId: "tenant_ne_hm", organizationId: "org_other", visibility: "organization" },
        "document:read",
      ),
    ).toThrow(TenantAccessError);
  });

  it("allows department and workspace-scoped access when context matches", () => {
    expect(
      canAccessTenantResource(
        context,
        {
          id: "doc_3",
          tenantId: "tenant_ne_hm",
          organizationId: "org_ne_hm",
          departmentId: "dept_quality",
          visibility: "department",
        },
        "document:read",
      ),
    ).toBe(true);

    expect(
      canAccessTenantResource(
        context,
        {
          id: "doc_4",
          tenantId: "tenant_ne_hm",
          organizationId: "org_ne_hm",
          workspaceId: "workspace_quality",
          visibility: "team",
        },
        "document:read",
      ),
    ).toBe(true);
  });

  it("creates isolated vector namespaces", () => {
    expect(buildTenantVectorNamespace("org_ne_hm", "department")).toBe("org:org_ne_hm:visibility:department");
  });
});
