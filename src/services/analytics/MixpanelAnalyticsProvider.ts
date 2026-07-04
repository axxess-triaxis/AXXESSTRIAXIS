import mixpanel from "mixpanel-browser";
import { sanitizeAnalyticsPayload, sanitizeUserProperties } from "./sanitize";
import type { AnalyticsEventName, AnalyticsEventPayload, AnalyticsProvider, AnalyticsUserProperties } from "./types";

export class MixpanelAnalyticsProvider implements AnalyticsProvider {
  readonly name = "mixpanel";
  readonly enabled: boolean;
  private initialized = false;

  constructor(token?: string) {
    this.enabled = Boolean(token);
    if (!token) return;

    mixpanel.init(token, {
      debug: process.env.NODE_ENV !== "production",
      ignore_dnt: false,
      persistence: "localStorage",
      secure_cookie: typeof window !== "undefined" && window.location.protocol === "https:",
      track_pageview: false,
    });
    this.initialized = true;
  }

  trackEvent(eventName: AnalyticsEventName, payload: AnalyticsEventPayload) {
    if (!this.initialized) return;
    mixpanel.track(eventName, sanitizeAnalyticsPayload(payload));
  }

  identifyUser(userId: string, properties?: AnalyticsUserProperties) {
    if (!this.initialized) return;
    mixpanel.identify(userId);
    const safeProperties = sanitizeUserProperties(properties);
    if (safeProperties) mixpanel.people.set(safeProperties);
  }

  setUserProperties(properties: AnalyticsUserProperties) {
    if (!this.initialized) return;
    mixpanel.people.set(sanitizeUserProperties(properties) ?? {});
  }

  resetAnalytics() {
    if (!this.initialized) return;
    mixpanel.reset();
  }
}
