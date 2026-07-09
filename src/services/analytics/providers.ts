export type AnalyticsProviderName = "noop" | "posthog" | "mixpanel" | "auto";

export function normalizeAnalyticsProvider(value: string | undefined): AnalyticsProviderName {
  if (value === "posthog" || value === "mixpanel" || value === "auto") return value;
  return "noop";
}
