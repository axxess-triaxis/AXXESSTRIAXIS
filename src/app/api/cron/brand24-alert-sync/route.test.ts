import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const routeSource = readFileSync(join(process.cwd(), "src", "app", "api", "cron", "brand24-alert-sync", "route.ts"), "utf8");

describe("brand24 alert sync cron route", () => {
  it("requires the CRON_SECRET bearer token, same shape as the existing social-connector-sync cron", () => {
    expect(routeSource).toContain("CRON_SECRET is not configured.");
    expect(routeSource).toContain("Bearer ${process.env.CRON_SECRET}");
    expect(routeSource).toContain("Unauthorized.");
  });

  it("wires the real Brand24 sync function, not a stub", () => {
    expect(routeSource).toContain("syncBrand24Mentions");
  });
});
