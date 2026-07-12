import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const routeSource = readFileSync(join(process.cwd(), "src", "app", "api", "pilot-readiness-events", "route.ts"), "utf8");

describe("pilot readiness events API", () => {
  it("validates stable onboarding steps and event types", () => {
    expect(routeSource).toContain("A valid pilot onboarding step is required.");
    expect(routeSource).toContain("A valid pilot event type is required.");
    expect(routeSource).toContain("\"first_ai_question\"");
    expect(routeSource).toContain("\"view_audit_trail\"");
  });

  it("inserts through the authenticated Supabase token and sanitizes metadata", () => {
    expect(routeSource).toContain("Authorization: `Bearer ${accessToken}`");
    expect(routeSource).toContain("sanitizeAnalyticsProperties");
    expect(routeSource).toContain("pilot_readiness_events");
    expect(routeSource).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("lists tenant-scoped events for the pilot conversion dashboard", () => {
    expect(routeSource).toContain("export async function GET");
    expect(routeSource).toContain("organization_id: `eq.${organizationId}`");
    expect(routeSource).toContain("order: \"created_at.desc\"");
    expect(routeSource).toContain("mapPilotReadinessEvent");
  });

  it("writes a lightweight audit event without raw metadata", () => {
    expect(routeSource).toContain("pilot_readiness.event_recorded");
    expect(routeSource).toContain("resourceType: \"pilot_readiness_event\"");
    expect(routeSource).toContain("step_id: body.stepId");
  });
});
