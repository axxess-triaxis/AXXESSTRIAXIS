import type { ApplicationServices } from "../providers/serviceProvider";
import type { TenantScope } from "../repositories/interfaces";
import { getLiveWorkspaceMetrics, type LiveWorkspaceMetrics } from "../services/live-platform/livePlatform";

// Sprint 5, F-021: useLiveWorkspaceMetrics is independently called by DashboardSection directly,
// plus by useEnterpriseGoldenPath and useLiveRagHealth (both also used by DashboardSection) -- three
// independent hook instances, each with its own useEffect, each issuing its own
// getLiveWorkspaceMetrics() call (four repository requests: projects/tasks/notifications/documents)
// for the exact same tenant scope on the same page load. A live replay against beta.triaxisventures.com
// during Sprint 5 confirmed this: the same 4 requests fired 3x, then the whole batch fired again a
// second time. This module collapses concurrent/near-simultaneous calls for the same scope into a
// single shared in-flight request, and keeps the resolved value fresh for a short window so a second
// render pass for the same scope reuses it instead of re-fetching.
const CACHE_TTL_MS = 5000;

type CacheEntry = { promise: Promise<LiveWorkspaceMetrics>; expiresAt: number };

const cache = new Map<string, CacheEntry>();

function cacheKey(scope: TenantScope) {
  return `${scope.organizationId}:${scope.userId}`;
}

export function getSharedLiveWorkspaceMetrics(services: ApplicationServices, scope: TenantScope): Promise<LiveWorkspaceMetrics> {
  const key = cacheKey(scope);
  const now = Date.now();
  const existing = cache.get(key);
  if (existing && existing.expiresAt > now) {
    return existing.promise;
  }

  const promise = getLiveWorkspaceMetrics(services, scope);
  cache.set(key, { promise, expiresAt: now + CACHE_TTL_MS });
  // A failed fetch must not poison the cache for the rest of the TTL window -- drop it immediately
  // so the next caller gets a fresh attempt instead of a cached rejection.
  promise.catch(() => {
    if (cache.get(key)?.promise === promise) cache.delete(key);
  });
  return promise;
}

// Tenant-scoped cache keys (organizationId:userId) already prevent a different tenant/user from
// reading another tenant's cached metrics -- this clears everything on logout/session change so a
// subsequent login (same browser, different user) never reuses a stale entry within the TTL window.
export function clearLiveWorkspaceMetricsCache() {
  cache.clear();
}
