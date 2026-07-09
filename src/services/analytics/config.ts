import { MockAnalyticsProvider } from "./MockAnalyticsProvider";
import { MixpanelAnalyticsProvider } from "./MixpanelAnalyticsProvider";
import { PostHogAnalyticsProvider } from "./PostHogAnalyticsProvider";
import { normalizeAnalyticsProvider } from "./providers";
import type { AnalyticsProvider, AnalyticsRuntime } from "./types";

export const releaseVersion = "0.6.0-beta";
export const appVersion = process.env.NEXT_PUBLIC_AXXESS_APP_VERSION ?? "0.6.0";

export function getAnalyticsEnvironment() {
  return process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV ?? "development";
}

export function isAnalyticsEnabled() {
  return (
    process.env.NEXT_PUBLIC_ANALYTICS_DISABLED !== "true" &&
    normalizeAnalyticsProvider(process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER) !== "noop" &&
    (
      Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY) ||
      Boolean(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN)
    )
  );
}

export function createAnalyticsProvider(): AnalyticsProvider {
  if (typeof window === "undefined") return new MockAnalyticsProvider();
  if (!isAnalyticsEnabled()) return new MockAnalyticsProvider();
  const requestedProvider = normalizeAnalyticsProvider(process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER);
  if ((requestedProvider === "posthog" || requestedProvider === "auto") && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return new PostHogAnalyticsProvider(process.env.NEXT_PUBLIC_POSTHOG_KEY, process.env.NEXT_PUBLIC_POSTHOG_HOST);
  }
  if ((requestedProvider === "mixpanel" || requestedProvider === "auto") && process.env.NEXT_PUBLIC_MIXPANEL_TOKEN) {
    return new MixpanelAnalyticsProvider(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN);
  }
  return new MockAnalyticsProvider();
}

export function analyticsRuntime(provider: AnalyticsProvider): AnalyticsRuntime {
  return {
    enabled: provider.enabled,
    providerName: provider.name,
    releaseVersion,
    appVersion,
  };
}
