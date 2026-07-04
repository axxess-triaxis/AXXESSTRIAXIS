import type { AnalyticsEventPayload, AnalyticsUserProperties, SafeAnalyticsProperties, SafeAnalyticsPrimitive } from "./types";

const blockedKeyPattern = /(email|phone|token|secret|password|key|content|body|message|note|notes|description|document|agenda|decision|action_item|address)/i;

function isSafePrimitive(value: unknown): value is SafeAnalyticsPrimitive {
  return value === null || ["string", "number", "boolean"].includes(typeof value);
}

function sanitizeValue(value: unknown): SafeAnalyticsPrimitive | SafeAnalyticsPrimitive[] | undefined {
  if (isSafePrimitive(value)) return value;
  if (Array.isArray(value)) {
    const safeValues = value.filter(isSafePrimitive).slice(0, 10);
    return safeValues.length ? safeValues : undefined;
  }
  return undefined;
}

export function sanitizeAnalyticsProperties(properties: Record<string, unknown> | undefined): SafeAnalyticsProperties | undefined {
  if (!properties) return undefined;

  const safeEntries = Object.entries(properties)
    .filter(([key]) => !blockedKeyPattern.test(key))
    .map(([key, value]) => [key, sanitizeValue(value)] as const)
    .filter((entry): entry is readonly [string, SafeAnalyticsPrimitive | SafeAnalyticsPrimitive[]] => entry[1] !== undefined);

  return safeEntries.length ? Object.fromEntries(safeEntries) : undefined;
}

export function sanitizeAnalyticsPayload(payload: AnalyticsEventPayload): AnalyticsEventPayload {
  return {
    organization_id: payload.organization_id,
    user_id: payload.user_id,
    user_role: payload.user_role,
    module_name: payload.module_name,
    route: payload.route,
    event_source: payload.event_source,
    timestamp: payload.timestamp,
    environment: payload.environment,
    app_version: payload.app_version,
    release_version: payload.release_version,
    properties: sanitizeAnalyticsProperties(payload.properties),
  };
}

export function sanitizeUserProperties(properties: AnalyticsUserProperties | undefined): AnalyticsUserProperties | undefined {
  if (!properties) return undefined;
  return {
    user_role: properties.user_role,
    organization_id: properties.organization_id,
    organization_type: properties.organization_type,
    organization_size: properties.organization_size,
    plan_type: properties.plan_type,
    beta_user: properties.beta_user,
    signup_source: properties.signup_source,
    country: properties.country,
    state: properties.state,
  };
}
