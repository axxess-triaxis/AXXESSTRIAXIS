import { afterEach, describe, expect, it, vi } from "vitest";
import { MockAnalyticsProvider } from "./MockAnalyticsProvider";
import { MixpanelAnalyticsProvider } from "./MixpanelAnalyticsProvider";
import { MultiAnalyticsProvider } from "./MultiAnalyticsProvider";
import { PostHogAnalyticsProvider } from "./PostHogAnalyticsProvider";
import { normalizeAnalyticsProvider } from "./providers";
import { sanitizeAnalyticsPayload, sanitizeAnalyticsProperties } from "./sanitize";
import type { AnalyticsProvider } from "./types";

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

  describe("MultiAnalyticsProvider", () => {
    function fakeProvider(name: string, overrides: Partial<AnalyticsProvider> = {}): AnalyticsProvider {
      return {
        name,
        enabled: true,
        trackEvent: vi.fn(),
        identifyUser: vi.fn(),
        setUserProperties: vi.fn(),
        resetAnalytics: vi.fn(),
        ...overrides,
      };
    }

    const payload = {
      timestamp: "2026-07-03T00:00:00.000Z",
      environment: "test",
      app_version: "0.6.0",
      release_version: "0.6.0-beta",
    };

    it("fans every call out to all wrapped providers", () => {
      const posthog = fakeProvider("posthog");
      const mixpanel = fakeProvider("mixpanel");
      const multi = new MultiAnalyticsProvider([posthog, mixpanel]);

      multi.trackEvent("project_created", payload);
      multi.identifyUser("user_1", { user_role: "Manager" });
      multi.setUserProperties({ plan_type: "beta" });
      multi.resetAnalytics();

      for (const provider of [posthog, mixpanel]) {
        expect(provider.trackEvent).toHaveBeenCalledWith("project_created", payload);
        expect(provider.identifyUser).toHaveBeenCalledWith("user_1", { user_role: "Manager" });
        expect(provider.setUserProperties).toHaveBeenCalledWith({ plan_type: "beta" });
        expect(provider.resetAnalytics).toHaveBeenCalled();
      }
    });

    it("is enabled when at least one wrapped provider is enabled, and names all of them", () => {
      const multi = new MultiAnalyticsProvider([fakeProvider("posthog"), fakeProvider("mixpanel", { enabled: false })]);
      expect(multi.enabled).toBe(true);
      expect(multi.name).toBe("posthog+mixpanel");
    });

    it("does not let one provider throwing block the others from receiving the event", () => {
      const broken = fakeProvider("posthog", { trackEvent: vi.fn(() => { throw new Error("network down"); }) });
      const healthy = fakeProvider("mixpanel");
      const multi = new MultiAnalyticsProvider([broken, healthy]);

      expect(() => multi.trackEvent("project_created", payload)).not.toThrow();
      expect(healthy.trackEvent).toHaveBeenCalledWith("project_created", payload);
    });
  });

  describe("createAnalyticsProvider dual-provider selection", () => {
    afterEach(() => {
      vi.unstubAllEnvs();
      vi.resetModules();
    });

    it("runs both Mixpanel and PostHog simultaneously when both tokens are configured", async () => {
      vi.stubEnv("NEXT_PUBLIC_ANALYTICS_DISABLED", "false");
      vi.stubEnv("NEXT_PUBLIC_ANALYTICS_PROVIDER", "auto");
      vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "posthog_public_project_token");
      vi.stubEnv("NEXT_PUBLIC_MIXPANEL_TOKEN", "mixpanel_project_token");

      const { createAnalyticsProvider } = await import("./config");
      const provider = createAnalyticsProvider();

      expect(provider.name).toBe("posthog+mixpanel");
      expect(provider.enabled).toBe(true);
    });

    it("falls back to a single provider when only one token is configured", async () => {
      vi.stubEnv("NEXT_PUBLIC_ANALYTICS_DISABLED", "false");
      vi.stubEnv("NEXT_PUBLIC_ANALYTICS_PROVIDER", "auto");
      vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "posthog_public_project_token");
      vi.stubEnv("NEXT_PUBLIC_MIXPANEL_TOKEN", "");

      const { createAnalyticsProvider } = await import("./config");
      const provider = createAnalyticsProvider();

      expect(provider.name).toBe("posthog");
    });
  });
});
