import { sanitizeAnalyticsPayload, sanitizeUserProperties } from "./sanitize";
import type { AnalyticsEventName, AnalyticsEventPayload, AnalyticsProvider, AnalyticsUserProperties } from "./types";

export type RecordedAnalyticsEvent = {
  eventName: AnalyticsEventName;
  payload: AnalyticsEventPayload;
};

declare global {
  interface Window {
    __AXXESS_ANALYTICS_EVENTS__?: RecordedAnalyticsEvent[];
  }
}

export class MockAnalyticsProvider implements AnalyticsProvider {
  readonly name = "mock";
  readonly enabled = false;
  readonly events: RecordedAnalyticsEvent[] = [];
  identifiedUserId?: string;
  userProperties?: AnalyticsUserProperties;

  trackEvent(eventName: AnalyticsEventName, payload: AnalyticsEventPayload) {
    const event = { eventName, payload: sanitizeAnalyticsPayload(payload) };
    this.events.push(event);
    if (typeof window !== "undefined") {
      window.__AXXESS_ANALYTICS_EVENTS__ = [...(window.__AXXESS_ANALYTICS_EVENTS__ ?? []), event];
    }
  }

  identifyUser(userId: string, properties?: AnalyticsUserProperties) {
    this.identifiedUserId = userId;
    this.userProperties = sanitizeUserProperties(properties);
  }

  setUserProperties(properties: AnalyticsUserProperties) {
    this.userProperties = {
      ...this.userProperties,
      ...sanitizeUserProperties(properties),
    };
  }

  resetAnalytics() {
    this.events.length = 0;
    this.identifiedUserId = undefined;
    this.userProperties = undefined;
  }
}
