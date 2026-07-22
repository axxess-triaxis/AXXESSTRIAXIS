import type { AnalyticsEventName, AnalyticsEventPayload, AnalyticsProvider, AnalyticsUserProperties } from "./types";

// Fans every call out to all configured providers, so Mixpanel and PostHog can both receive the
// same event stream simultaneously rather than one being chosen over the other (see config.ts's
// createAnalyticsProvider(), which builds this from whichever provider tokens are present). A
// failure in one provider's send must never block another's -- each call is individually guarded.
export class MultiAnalyticsProvider implements AnalyticsProvider {
  readonly name: string;
  readonly enabled: boolean;
  private readonly providers: AnalyticsProvider[];

  constructor(providers: AnalyticsProvider[]) {
    this.providers = providers;
    this.enabled = providers.some((provider) => provider.enabled);
    this.name = providers.length ? providers.map((provider) => provider.name).join("+") : "noop";
  }

  private forEach(action: (provider: AnalyticsProvider) => void) {
    for (const provider of this.providers) {
      try {
        action(provider);
      } catch {
        // A single provider's SDK throwing (network, malformed config) must not stop the others
        // or surface as an application error -- analytics is best-effort infrastructure.
      }
    }
  }

  trackEvent(eventName: AnalyticsEventName, payload: AnalyticsEventPayload) {
    this.forEach((provider) => provider.trackEvent(eventName, payload));
  }

  identifyUser(userId: string, properties?: AnalyticsUserProperties) {
    this.forEach((provider) => provider.identifyUser(userId, properties));
  }

  setUserProperties(properties: AnalyticsUserProperties) {
    this.forEach((provider) => provider.setUserProperties(properties));
  }

  resetAnalytics() {
    this.forEach((provider) => provider.resetAnalytics());
  }
}
