import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/app/api/admin/mobile-release/route.ts"), "utf8");

describe("mobile release admin API", () => {
  it("requires an authenticated organization admin session", () => {
    expect(source).toContain("getServerAuthSession(true)");
    expect(source).toContain("canManageOrganization");
    expect(source).toContain("Organization admin access is required.");
  });

  it("persists mobile release snapshots and writes audit evidence", () => {
    expect(source).toContain("persistMobileStoreLaunchSnapshot");
    expect(source).toContain("mobile_release.${action}");
    expect(source).toContain("mobile_release_run");
    expect(source).toContain("buildMobileStoreLaunchSnapshot");
  });

  it("allows only stable Sprint 32 release actions", () => {
    expect(source).toContain("\"snapshot_recorded\"");
    expect(source).toContain("\"reviewer_provisioned\"");
    expect(source).toContain("\"rollout_updated\"");
  });
});
