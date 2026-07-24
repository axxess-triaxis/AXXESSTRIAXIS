import { MockAnalyticsProvider } from "./MockAnalyticsProvider";
import { MixpanelAnalyticsProvider } from "./MixpanelAnalyticsProvider";
import { MultiAnalyticsProvider } from "./MultiAnalyticsProvider";
import { PostHogAnalyticsProvider } from "./PostHogAnalyticsProvider";
import { normalizeAnalyticsProvider } from "./providers";
import type { AnalyticsProvider, AnalyticsRuntime } from "./types";

export const releaseVersion = "0.7.0-beta";
export const appVersion = process.env.NEXT_PUBLIC_AXXESS_APP_VERSION ?? "0.7.0";

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

  // "posthog"/"mixpanel" force a single named provider (useful for isolating one during
  // debugging). "auto" (and any other configured value) runs every provider with a token
  // present simultaneously -- for every visit to beta or demo, both Mixpanel and PostHog receive
  // the same event stream rather than one being chosen over the other, since neither should be
  // silently dropped just because the other happens to be configured too.
  if (requestedProvider === "posthog") {
    return process.env.NEXT_PUBLIC_POSTHOG_KEY
      ? new PostHogAnalyticsProvider(process.env.NEXT_PUBLIC_POSTHOG_KEY, process.env.NEXT_PUBLIC_POSTHOG_HOST)
      : new MockAnalyticsProvider();
  }
  if (requestedProvider === "mixpanel") {
    return process.env.NEXT_PUBLIC_MIXPANEL_TOKEN
      ? new MixpanelAnalyticsProvider(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN)
      : new MockAnalyticsProvider();
  }

  const activeProviders: AnalyticsProvider[] = [];
  if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    activeProviders.push(new PostHogAnalyticsProvider(process.env.NEXT_PUBLIC_POSTHOG_KEY, process.env.NEXT_PUBLIC_POSTHOG_HOST));
  }
  if (process.env.NEXT_PUBLIC_MIXPANEL_TOKEN) {
    activeProviders.push(new MixpanelAnalyticsProvider(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN));
  }
  if (activeProviders.length === 0) return new MockAnalyticsProvider();
  return activeProviders.length === 1 ? activeProviders[0] : new MultiAnalyticsProvider(activeProviders);
}

export function analyticsRuntime(provider: AnalyticsProvider): AnalyticsRuntime {
  return {
    enabled: provider.enabled,
    providerName: provider.name,
    releaseVersion,
    appVersion,
  };
}
