import { describe, expect, it, vi } from "vitest";
import { MockAnalyticsProvider } from "./MockAnalyticsProvider";
import { MixpanelAnalyticsProvider } from "./MixpanelAnalyticsProvider";
import { PostHogAnalyticsProvider } from "./PostHogAnalyticsProvider";
import { normalizeAnalyticsProvider } from "./providers";
import { sanitizeAnalyticsPayload, sanitizeAnalyticsProperties } from "./sanitize";

vi.mock("mixpanel-browser", () => ({
  default: {
    init: vi.fn(),
    identify: vi.fn(),
    people: { set: vi.fn() },
    reset: vi.fn(),
    track: vi.fn(),
  },
}));

describe("analytics service contracts", () => {
  it("records mock provider events with safe payload metadata", () => {
    const provider = new MockAnalyticsProvider();
    provider.trackEvent("project_created", {
      organization_id: "org_1",
      user_id: "user_1",
      user_role: "Manager",
      module_name: "projects",
      route: "/projects",
      event_source: "test",
      timestamp: "2026-07-03T00:00:00.000Z",
      environment: "test",
      app_version: "0.6.0",
      release_version: "0.6.0-beta",
      properties: { project_id: "project_1" },
    });

    expect(provider.events).toHaveLength(1);
    expect(provider.events[0].eventName).toBe("project_created");
    expect(provider.events[0].payload.organization_id).toBe("org_1");
  });

  it("initializes Mixpanel as disabled when no token is present", () => {
    const provider = new MixpanelAnalyticsProvider("");
    expect(provider.enabled).toBe(false);
  });

  it("initializes the PostHog adapter without requiring an SDK dependency", () => {
    const provider = new PostHogAnalyticsProvider("posthog_public_project_token", "https://us.i.posthog.com");
    expect(provider.enabled).toBe(true);
    expect(provider.name).toBe("posthog");
  });

  it("defaults analytics provider selection to noop unless explicitly configured", () => {
    expect(normalizeAnalyticsProvider(undefined)).toBe("noop");
    expect(normalizeAnalyticsProvider("posthog")).toBe("posthog");
    expect(normalizeAnalyticsProvider("mixpanel")).toBe("mixpanel");
    expect(normalizeAnalyticsProvider("unexpected")).toBe("noop");
  });

  it("removes sensitive event properties before analytics dispatch", () => {
    const safe = sanitizeAnalyticsProperties({
      project_id: "project_1",
      description: "private scope text",
      meeting_notes: "private notes",
      rating: 5,
    });

    expect(safe).toEqual({ project_id: "project_1", rating: 5 });
  });

  it("keeps event envelope metadata while removing sensitive nested properties", () => {
    const payload = sanitizeAnalyticsPayload({
      organization_id: "org_1",
      user_id: "user_1",
      module_name: "feedback",
      route: "/dashboard",
      timestamp: "2026-07-03T00:00:00.000Z",
      environment: "test",
      app_version: "0.6.0",
      release_version: "0.6.0-beta",
      properties: { feedback_type: "Bug", message: "private", permission_to_contact: true },
    });

    expect(payload.properties).toEqual({ feedback_type: "Bug", permission_to_contact: true });
  });
});
