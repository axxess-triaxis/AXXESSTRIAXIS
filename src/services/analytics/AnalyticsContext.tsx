"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { appVersion, createAnalyticsProvider, getAnalyticsEnvironment, releaseVersion } from "./config";
import { sanitizeAnalyticsProperties, sanitizeUserProperties } from "./sanitize";
import type {
  AnalyticsContext as AnalyticsMetadata,
  AnalyticsEventName,
  AnalyticsProvider,
  AnalyticsRuntime,
  AnalyticsUserProperties,
  SafeAnalyticsProperties,
} from "./types";

type AnalyticsContextValue = AnalyticsRuntime & {
  trackEvent(eventName: AnalyticsEventName, properties?: Record<string, unknown>, metadata?: AnalyticsMetadata): void;
  identifyUser(userId: string, properties?: AnalyticsUserProperties): void;
  setUserProperties(properties: AnalyticsUserProperties): void;
  resetAnalytics(): void;
};

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

export function AnalyticsProviderShell({
  children,
  provider,
}: {
  children: ReactNode;
  provider?: AnalyticsProvider;
}) {
  const providerRef = useRef<AnalyticsProvider | null>(provider ?? null);
  if (!providerRef.current) providerRef.current = createAnalyticsProvider();
  const analyticsProvider = providerRef.current;

  const trackEvent = useCallback<AnalyticsContextValue["trackEvent"]>((eventName, properties, metadata) => {
    const safeProperties = sanitizeAnalyticsProperties(properties) as SafeAnalyticsProperties | undefined;
    analyticsProvider.trackEvent(eventName, {
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
      properties: safeProperties,
    });
  }, [analyticsProvider]);

  const identifyUser = useCallback((userId: string, properties?: AnalyticsUserProperties) => {
    analyticsProvider.identifyUser(userId, sanitizeUserProperties(properties));
  }, [analyticsProvider]);

  const setUserProperties = useCallback((properties: AnalyticsUserProperties) => {
    analyticsProvider.setUserProperties(sanitizeUserProperties(properties) ?? {});
  }, [analyticsProvider]);

  const resetAnalytics = useCallback(() => {
    analyticsProvider.resetAnalytics();
  }, [analyticsProvider]);

  useEffect(() => {
    return () => {
      analyticsProvider.trackEvent("beta_session_ended", {
        timestamp: new Date().toISOString(),
        environment: getAnalyticsEnvironment(),
        app_version: appVersion,
        release_version: releaseVersion,
        event_source: "client",
      });
    };
  }, [analyticsProvider]);

  const value = useMemo<AnalyticsContextValue>(() => ({
    enabled: analyticsProvider.enabled,
    providerName: analyticsProvider.name,
    releaseVersion,
    appVersion,
    trackEvent,
    identifyUser,
    setUserProperties,
    resetAnalytics,
  }), [analyticsProvider, identifyUser, resetAnalytics, setUserProperties, trackEvent]);

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (!context) throw new Error("useAnalytics must be used inside AnalyticsProviderShell.");
  return context;
}
