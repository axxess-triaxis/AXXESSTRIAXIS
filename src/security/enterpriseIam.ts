import type { RoleName } from "../domain";

export type EnterpriseRole =
  | "Super Admin"
  | "Organization Admin"
  | "Department Admin"
  | "Project Lead"
  | "Member"
  | "Auditor"
  | "External Consultant"
  | "Guest";

export type EnterprisePermission =
  | "organization:admin"
  | "department:admin"
  | "workspace:admin"
  | "project:create"
  | "project:read"
  | "project:update"
  | "project:approve"
  | "task:create"
  | "task:read"
  | "task:update"
  | "document:create"
  | "document:read"
  | "document:update"
  | "document:approve"
  | "knowledge:read"
  | "knowledge:curate"
  | "ai:query"
  | "ai:approve"
  | "audit:read"
  | "privacy:manage"
  | "security:manage"
  | "analytics:read";

export type WorkspacePermission = {
  workspaceId: string;
  role: EnterpriseRole;
  departmentId?: string;
  permissions: EnterprisePermission[];
};

export type DepartmentNode = {
  id: string;
  organizationId: string;
  name: string;
  parentDepartmentId?: string;
};

export const enterpriseRoleOrder: EnterpriseRole[] = [
  "Guest",
  "External Consultant",
  "Member",
  "Auditor",
  "Project Lead",
  "Department Admin",
  "Organization Admin",
  "Super Admin",
];

export const enterpriseRolePermissions: Record<EnterpriseRole, EnterprisePermission[]> = {
  "Super Admin": [
    "organization:admin",
    "department:admin",
    "workspace:admin",
    "project:create",
    "project:read",
    "project:update",
    "project:approve",
    "task:create",
    "task:read",
    "task:update",
    "document:create",
    "document:read",
    "document:update",
    "document:approve",
    "knowledge:read",
    "knowledge:curate",
    "ai:query",
    "ai:approve",
    "audit:read",
    "privacy:manage",
    "security:manage",
    "analytics:read",
  ],
  "Organization Admin": [
    "organization:admin",
    "department:admin",
    "workspace:admin",
    "project:create",
    "project:read",
    "project:update",
    "project:approve",
    "task:create",
    "task:read",
    "task:update",
    "document:create",
    "document:read",
    "document:update",
    "document:approve",
    "knowledge:read",
    "knowledge:curate",
    "ai:query",
    "ai:approve",
    "audit:read",
    "privacy:manage",
    "security:manage",
    "analytics:read",
  ],
  "Department Admin": [
    "department:admin",
    "workspace:admin",
    "project:create",
    "project:read",
    "project:update",
    "project:approve",
    "task:create",
    "task:read",
    "task:update",
    "document:create",
    "document:read",
    "document:update",
    "document:approve",
    "knowledge:read",
    "knowledge:curate",
    "ai:query",
    "ai:approve",
    "audit:read",
    "analytics:read",
  ],
  "Project Lead": [
    "project:create",
    "project:read",
    "project:update",
    "project:approve",
    "task:create",
    "task:read",
    "task:update",
    "document:create",
    "document:read",
    "document:update",
    "knowledge:read",
    "knowledge:curate",
    "ai:query",
    "analytics:read",
  ],
  Member: [
    "project:read",
    "task:create",
    "task:read",
    "task:update",
    "document:create",
    "document:read",
    "document:update",
    "knowledge:read",
    "ai:query",
  ],
  Auditor: ["project:read", "task:read", "document:read", "knowledge:read", "audit:read", "analytics:read"],
  "External Consultant": ["project:read", "task:read", "document:read", "knowledge:read", "ai:query"],
  Guest: ["project:read", "document:read", "knowledge:read"],
};

export function mapLegacyRoleToEnterpriseRole(role: RoleName): EnterpriseRole {
  switch (role) {
    case "Super Admin":
    case "Organization Admin":
      return role;
    case "Executive":
      return "Department Admin";
    case "Manager":
      return "Project Lead";
    case "Employee":
      return "Member";
    case "Consultant":
      return "External Consultant";
    case "Guest":
      return "Guest";
  }
}

export function hasEnterprisePermission(role: EnterpriseRole, permission: EnterprisePermission): boolean {
  return enterpriseRolePermissions[role].includes(permission);
}

export function canDelegateRole(actorRole: EnterpriseRole, targetRole: EnterpriseRole): boolean {
  if (actorRole === "Super Admin") return true;
  if (actorRole === "Organization Admin" && targetRole !== "Super Admin") return true;
  if (actorRole === "Department Admin") {
    return ["Project Lead", "Member", "Auditor", "External Consultant", "Guest"].includes(targetRole);
  }

  return false;
}

export function compareEnterpriseRoleAuthority(left: EnterpriseRole, right: EnterpriseRole): number {
  return enterpriseRoleOrder.indexOf(left) - enterpriseRoleOrder.indexOf(right);
}

export function getEnterprisePermissionsForRole(role: EnterpriseRole): EnterprisePermission[] {
  return [...enterpriseRolePermissions[role]];
}
