import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const routeSource = readFileSync(join(process.cwd(), "src", "app", "api", "invitations", "accept", "route.ts"), "utf8");

describe("invitation acceptance identity binding (Sprint 3)", () => {
  it("rejects acceptance when the signed-in user's email does not match the invited email", () => {
    expect(routeSource).toContain("session.user.email");
    expect(routeSource).toContain("invitation.email");
    expect(routeSource).toContain("This invitation was sent to a different email address");
    expect(routeSource).toContain("status: 403");
  });

  it("checks the email match before any membership/role row is written", () => {
    const checkIndex = routeSource.indexOf("different email address");
    const profilesWriteIndex = routeSource.indexOf('"profiles"');
    const membersWriteIndex = routeSource.indexOf("organization_members");
    const rolesWriteIndex = routeSource.indexOf('"user_roles"');

    expect(checkIndex).toBeGreaterThan(-1);
    expect(checkIndex).toBeLessThan(profilesWriteIndex);
    expect(checkIndex).toBeLessThan(membersWriteIndex);
    expect(checkIndex).toBeLessThan(rolesWriteIndex);
  });

  it("still validates the invitation token and expiry before the email check", () => {
    const expiryCheckIndex = routeSource.indexOf("Invitation is invalid or expired");
    const emailCheckIndex = routeSource.indexOf("different email address");
    expect(expiryCheckIndex).toBeGreaterThan(-1);
    expect(expiryCheckIndex).toBeLessThan(emailCheckIndex);
  });
});
