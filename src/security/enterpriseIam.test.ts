import { describe, expect, it } from "vitest";
import {
  canDelegateRole,
  getEnterprisePermissionsForRole,
  hasEnterprisePermission,
  mapLegacyRoleToEnterpriseRole,
} from "./enterpriseIam";

describe("enterprise IAM", () => {
  it("maps existing Sprint roles into the Sprint 12 enterprise role model", () => {
    expect(mapLegacyRoleToEnterpriseRole("Executive")).toBe("Department Admin");
    expect(mapLegacyRoleToEnterpriseRole("Manager")).toBe("Project Lead");
    expect(mapLegacyRoleToEnterpriseRole("Consultant")).toBe("External Consultant");
  });

  it("enforces role capabilities and delegation boundaries", () => {
    expect(hasEnterprisePermission("Auditor", "audit:read")).toBe(true);
    expect(hasEnterprisePermission("Auditor", "project:update")).toBe(false);
    expect(canDelegateRole("Department Admin", "Project Lead")).toBe(true);
    expect(canDelegateRole("Department Admin", "Organization Admin")).toBe(false);
  });

  it("returns a defensive permission copy", () => {
    const permissions = getEnterprisePermissionsForRole("Member");
    permissions.push("security:manage");

    expect(hasEnterprisePermission("Member", "security:manage")).toBe(false);
  });
});
