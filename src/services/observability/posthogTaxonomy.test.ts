import { describe, expect, it } from "vitest";
import { getPostHogEventsForDashboard, sanitizePostHogProperties } from "./posthogTaxonomy";

describe("PostHog event taxonomy", () => {
  it("routes events to executive, developer, and security dashboards", () => {
    expect(getPostHogEventsForDashboard("executive").map((event) => event.name)).toContain("feature_adopted");
    expect(getPostHogEventsForDashboard("developer").map((event) => event.name)).toContain("api_latency_recorded");
    expect(getPostHogEventsForDashboard("security").map((event) => event.name)).toContain("security_event_recorded");
  });

  it("uses the existing analytics sanitizer before PostHog capture", () => {
    expect(
      sanitizePostHogProperties({
        module_name: "Knowledge Hub",
        email: "ananya@nehm.example",
        latency_ms: 120,
      }),
    ).toEqual({ module_name: "Knowledge Hub", latency_ms: 120 });
  });
});
