import type { TenantScope } from "../repositories/interfaces";
import type { Meeting } from "../domain";

// A-20 (2026-08-15): useCalendarSignals and useOverdueMeetingCount both independently fetched
// GET /api/repositories/meetings?pageSize=500 for the same tenant on every dashboard mount --
// useCalendarSignals's own header comment already documented this as a known, deliberately
// deferred tradeoff. Mirrors liveWorkspaceMetricsCache.ts's short-TTL, in-flight-promise-sharing
// pattern (Sprint 5, F-021) rather than merging the two hooks, since their derivations (and
// useCalendarSignals's demo-mode branch) genuinely differ and must not change.
const CACHE_TTL_MS = 5000;

type CacheEntry = { promise: Promise<Meeting[]>; expiresAt: number };

const cache = new Map<string, CacheEntry>();

function cacheKey(scope: TenantScope) {
  return `${scope.organizationId}:${scope.userId}`;
}

export function getSharedMeetingsList(scope: TenantScope): Promise<Meeting[]> {
  const key = cacheKey(scope);
  const now = Date.now();
  const existing = cache.get(key);
  if (existing && existing.expiresAt > now) {
    return existing.promise;
  }

  const promise = fetch("/api/repositories/meetings?pageSize=500", { credentials: "include", cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) throw new Error(`meetings fetch failed: ${response.status}`);
      const rows = await response.json().catch(() => undefined) as Meeting[] | undefined;
      if (!Array.isArray(rows)) throw new Error("meetings fetch returned a non-array payload");
      return rows;
    });
  cache.set(key, { promise, expiresAt: now + CACHE_TTL_MS });
  // A failed fetch must not poison the cache for the rest of the TTL window -- drop it immediately
  // so the next caller gets a fresh attempt instead of a cached rejection.
  promise.catch(() => {
    if (cache.get(key)?.promise === promise) cache.delete(key);
  });
  return promise;
}

// Drops one tenant scope's cached entry so the next getSharedMeetingsList call for that scope
// issues a fresh fetch instead of reusing a value inside the TTL window. Used by an explicit
// user-initiated "Refresh" action, mirroring invalidateLiveWorkspaceMetricsCache.
export function invalidateMeetingsListCache(scope: TenantScope) {
  cache.delete(cacheKey(scope));
}
