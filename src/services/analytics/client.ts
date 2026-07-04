import { appVersion, createAnalyticsProvider, getAnalyticsEnvironment, releaseVersion } from "./config";
import { sanitizeAnalyticsProperties, sanitizeUserProperties } from "./sanitize";
import type { AnalyticsContext, AnalyticsEventName, AnalyticsProvider, AnalyticsUserProperties } from "./types";

let singletonProvider: AnalyticsProvider | undefined;

function provider() {
  singletonProvider ??= createAnalyticsProvider();
  return singletonProvider;
}

export function trackEvent(eventName: AnalyticsEventName, properties?: Record<string, unknown>, metadata?: AnalyticsContext) {
  provider().trackEvent(eventName, {
    organization_id: metadata?.organization_id,
    user_id: metadata?.user_id,
    user_role: metadata?.user_role,
    module_name: metadata?.module_name,
    route: metadata?.route,
    event_source: metadata?.event_source ?? "client",
    timestamp: new Date().toISOString(),
    environment: getAnalyticsEnvironment(),
    app_version: appVersion,
    release_version: releaseVersion,
    properties: sanitizeAnalyticsProperties(properties),
  });
}

export function identifyUser(userId: string, properties?: AnalyticsUserProperties) {
  provider().identifyUser(userId, sanitizeUserProperties(properties));
}

export function setUserProperties(properties: AnalyticsUserProperties) {
  provider().setUserProperties(sanitizeUserProperties(properties) ?? {});
}

export function resetAnalytics() {
  provider().resetAnalytics();
}
