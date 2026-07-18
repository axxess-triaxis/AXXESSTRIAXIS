import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/app/api/admin/customer-success/live-ops/route.ts"), "utf8");

describe("customer-success live-ops API", () => {
  it("requires admin session and organization management permission", () => {
    expect(source).toContain("getServerAuthSession(true)");
    expect(source).toContain("canManageOrganization");
  });

  it("persists snapshots and records audit evidence", () => {
    expect(source).toContain("persistCustomerSuccessLiveOpsSnapshot");
    expect(source).toContain("customer_success.live_ops_snapshot_recorded");
    expect(source).toContain("buildCustomerSuccessLiveOpsSnapshot");
  });
});
