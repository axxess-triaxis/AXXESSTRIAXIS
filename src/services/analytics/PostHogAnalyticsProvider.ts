import posthog from "posthog-js";
import { sanitizeAnalyticsPayload, sanitizeUserProperties } from "./sanitize";
import type { AnalyticsEventName, AnalyticsEventPayload, AnalyticsProvider, AnalyticsUserProperties } from "./types";

export class PostHogAnalyticsProvider implements AnalyticsProvider {
  readonly name = "posthog";
  readonly enabled: boolean;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(token?: string, _host?: string) {
    this.enabled = Boolean(token);
  }

  trackEvent(eventName: AnalyticsEventName, payload: AnalyticsEventPayload) {
    if (!this.enabled || typeof window === "undefined") return;

    const sanitizedPayload = sanitizeAnalyticsPayload(payload);
    const { properties, ...envelope } = sanitizedPayload;

    posthog.capture(eventName, {
      ...envelope,
      ...(properties ?? {}),
    });
  }

  identifyUser(userId: string, properties?: AnalyticsUserProperties) {
    if (!this.enabled || typeof window === "undefined") return;

    posthog.identify(userId, sanitizeUserProperties(properties) ?? {});
  }

  setUserProperties(properties: AnalyticsUserProperties) {
    if (!this.enabled || typeof window === "undefined") return;

    posthog.setPersonProperties(sanitizeUserProperties(properties) ?? {});
  }

  resetAnalytics() {
    if (typeof window === "undefined") return;

    posthog.reset();
  }
}
