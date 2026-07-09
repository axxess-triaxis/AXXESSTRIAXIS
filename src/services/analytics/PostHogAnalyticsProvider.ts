import { sanitizeAnalyticsPayload, sanitizeUserProperties } from "./sanitize";
import type { AnalyticsEventName, AnalyticsEventPayload, AnalyticsProvider, AnalyticsUserProperties } from "./types";

type PostHogCapturePayload = {
  api_key: string;
  event: string;
  distinct_id: string;
  properties: Record<string, unknown>;
};

export class PostHogAnalyticsProvider implements AnalyticsProvider {
  readonly name = "posthog";
  readonly enabled: boolean;
  private readonly token: string;
  private readonly host: string;

  constructor(token?: string, host = "https://us.i.posthog.com") {
    this.token = token ?? "";
    this.host = host.replace(/\/$/, "");
    this.enabled = Boolean(token);
  }

  trackEvent(eventName: AnalyticsEventName, payload: AnalyticsEventPayload) {
    if (!this.enabled || typeof window === "undefined") return;

    const sanitizedPayload = sanitizeAnalyticsPayload(payload);
    const capturePayload: PostHogCapturePayload = {
      api_key: this.token,
      event: eventName,
      distinct_id: sanitizedPayload.user_id ?? "anonymous",
      properties: {
        ...sanitizedPayload,
        ...(sanitizedPayload.properties ?? {}),
        $process_person_profile: false,
      },
    };

    this.dispatch(capturePayload);
  }

  identifyUser(userId: string, properties?: AnalyticsUserProperties) {
    if (!this.enabled || typeof window === "undefined") return;

    this.dispatch({
      api_key: this.token,
      event: "$identify",
      distinct_id: userId,
      properties: {
        $set: sanitizeUserProperties(properties) ?? {},
      },
    });
  }

  setUserProperties(properties: AnalyticsUserProperties) {
    if (!this.enabled || typeof window === "undefined") return;

    this.dispatch({
      api_key: this.token,
      event: "$set",
      distinct_id: "anonymous",
      properties: {
        $set: sanitizeUserProperties(properties) ?? {},
      },
    });
  }

  resetAnalytics() {
    // PostHog browser state is not persisted by this lightweight adapter.
  }

  private dispatch(payload: PostHogCapturePayload) {
    const body = JSON.stringify(payload);
    const url = `${this.host}/capture/`;

    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      return;
    }

    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body,
    }).catch(() => undefined);
  }
}
