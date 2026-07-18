import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const routeSource = readFileSync(join(process.cwd(), "src", "app", "api", "admin", "pilot-acceptance", "route.ts"), "utf8");

describe("pilot acceptance admin API", () => {
  it("protects acceptance reads and writes behind organization admin access", () => {
    expect(routeSource).toContain("getServerAuthSession(true)");
    expect(routeSource).toContain("canManageOrganization");
    expect(routeSource).toContain("Organization admin access is required.");
  });

  it("persists acceptance decisions and writes audit evidence", () => {
    expect(routeSource).toContain("persistPilotAcceptanceSnapshot");
    expect(routeSource).toContain("pilot_acceptance.accepted");
    expect(routeSource).toContain("pilot_acceptance.live_ops_recorded");
    expect(routeSource).toContain("pilot_tenant_acceptance_run");
  });

  it("allows only stable Sprint 29 decision types", () => {
    expect(routeSource).toContain("\"snapshot\"");
    expect(routeSource).toContain("\"accepted\"");
    expect(routeSource).toContain("\"handoff_recorded\"");
  });
});
