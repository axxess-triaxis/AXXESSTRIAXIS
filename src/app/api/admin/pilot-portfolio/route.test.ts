import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const routeSource = readFileSync(join(process.cwd(), "src", "app", "api", "admin", "pilot-portfolio", "route.ts"), "utf8");

describe("pilot portfolio admin API", () => {
  it("protects the cross-tenant rollup behind the narrow platform-operator gate, not tenant-scoped canManageOrganization", () => {
    expect(routeSource).toContain("getServerAuthSession(true)");
    expect(routeSource).toContain("canViewCrossTenantPilotPortfolio");
    expect(routeSource).toContain("Unauthorized.");
    expect(routeSource).toContain("Cross-tenant pilot portfolio access is restricted.");
    // The dangerous, tenant-scoped gate must never be used for this cross-tenant route.
    expect(routeSource).not.toContain("canManageOrganization");
  });

  it("fails to an honest not-configured snapshot rather than a 500 when Supabase admin isn't configured", () => {
    expect(routeSource).toContain("isSupabaseAdminConfigured()");
    expect(routeSource).toContain("not-configured");
  });

  it("reads structural columns only -- never selects metadata, the one tenant-authored column excluded from this cross-tenant read", () => {
    // Every supabaseAdminRest select= string in this route must be free of "metadata" -- the
    // security requirement this route operates under is aggregate/structural data only, never
    // another tenant's actual content.
    const selectStrings = [...routeSource.matchAll(/select:\s*"([^"]+)"/g)].map((match) => match[1]);
    expect(selectStrings.length).toBeGreaterThan(0);
    selectStrings.forEach((select) => expect(select).not.toContain("metadata"));
  });

  it("audits every successful cross-tenant view", () => {
    expect(routeSource).toContain("platform.pilot_portfolio.viewed");
    expect(routeSource).toContain("auditLogsRepository.record");
  });

  it("wires all 4 honest integration-health checks into the response", () => {
    expect(routeSource).toContain("fetchSentryProjectHealth");
    expect(routeSource).toContain("fetchPostHogQueryHealth");
    expect(routeSource).toContain("fetchMixpanelQueryHealth");
    expect(routeSource).toContain("fetchAsanaPortfolioHealth");
  });

  it("uses the service-role admin REST client, never a client-side RLS-scoped query, for the cross-tenant read", () => {
    expect(routeSource).toContain("supabaseAdminRest");
  });
});
