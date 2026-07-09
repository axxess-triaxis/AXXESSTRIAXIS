import type { DocumentVisibility } from "../domain";
import type { EnterprisePermission, EnterpriseRole } from "./enterpriseIam";
import { hasEnterprisePermission } from "./enterpriseIam";

export type TenantRequestContext = {
  tenantId: string;
  organizationId: string;
  userId: string;
  role: EnterpriseRole;
  departmentId?: string;
  workspaceIds?: string[];
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
};

export type TenantScopedResource = {
  id: string;
  organizationId: string;
  tenantId?: string;
  ownerUserId?: string;
  departmentId?: string;
  workspaceId?: string;
  visibility?: DocumentVisibility;
  allowedUserIds?: string[];
  allowedDepartmentIds?: string[];
  allowedRoles?: EnterpriseRole[];
};

export class TenantAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantAccessError";
  }
}

export function assertTenantBoundary(context: TenantRequestContext, resource: TenantScopedResource): void {
  if (!context.tenantId || !context.organizationId || !context.userId) {
    throw new TenantAccessError("Missing tenant request context.");
  }

  if (resource.tenantId && resource.tenantId !== context.tenantId) {
    throw new TenantAccessError("Cross-tenant access denied.");
  }

  if (resource.organizationId !== context.organizationId) {
    throw new TenantAccessError("Cross-organization access denied.");
  }
}

export function canAccessTenantResource(
  context: TenantRequestContext,
  resource: TenantScopedResource,
  permission: EnterprisePermission,
): boolean {
  try {
    assertTenantBoundary(context, resource);
  } catch {
    return false;
  }

  if (!hasEnterprisePermission(context.role, permission)) return false;
  if (context.role === "Super Admin" || context.role === "Organization Admin") return true;
  if (resource.ownerUserId === context.userId) return true;

  if (resource.allowedUserIds?.includes(context.userId)) return true;
  if (resource.allowedRoles?.includes(context.role)) return true;
  if (resource.departmentId && resource.departmentId === context.departmentId) return true;
  if (resource.workspaceId && context.workspaceIds?.includes(resource.workspaceId)) return true;

  if (resource.visibility === "organization") return true;
  if (resource.visibility === "department") return Boolean(resource.departmentId && resource.departmentId === context.departmentId);
  if (resource.visibility === "team") return Boolean(resource.workspaceId && context.workspaceIds?.includes(resource.workspaceId));

  return false;
}

export function requireTenantResourceAccess(
  context: TenantRequestContext,
  resource: TenantScopedResource,
  permission: EnterprisePermission,
): void {
  if (!canAccessTenantResource(context, resource, permission)) {
    throw new TenantAccessError(`Permission denied for ${permission}.`);
  }
}

export function buildTenantVectorNamespace(organizationId: string, documentVisibility: DocumentVisibility): string {
  return `org:${organizationId}:visibility:${documentVisibility}`;
}
