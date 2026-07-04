import { MockAnalyticsProvider } from "./MockAnalyticsProvider";
import { MixpanelAnalyticsProvider } from "./MixpanelAnalyticsProvider";
import type { AnalyticsProvider, AnalyticsRuntime } from "./types";

export const releaseVersion = "0.6.0-beta";
export const appVersion = process.env.NEXT_PUBLIC_AXXESS_APP_VERSION ?? "0.6.0";

export function getAnalyticsEnvironment() {
  return process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV ?? "development";
}

export function isAnalyticsEnabled() {
  return process.env.NEXT_PUBLIC_ANALYTICS_DISABLED !== "true" && Boolean(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN);
}

export function createAnalyticsProvider(): AnalyticsProvider {
  if (typeof window === "undefined") return new MockAnalyticsProvider();
  if (!isAnalyticsEnabled()) return new MockAnalyticsProvider();
  return new MixpanelAnalyticsProvider(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN);
}

export function analyticsRuntime(provider: AnalyticsProvider): AnalyticsRuntime {
  return {
    enabled: provider.enabled,
    providerName: provider.name,
    releaseVersion,
    appVersion,
  };
}
