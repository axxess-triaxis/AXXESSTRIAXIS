// XL-4 (2026-08-05): the Lite host list previously lived only inside src/proxy.ts (Edge Runtime).
// XLA-21 was a real incident caused by that single list missing the real custom domain; as more
// surfaces need to recognize "is this a Lite request" (proxy.ts's page/API gating, and now
// src/demo/demoMode.ts's client-side demo-mode-forced-off check), a *second* hand-maintained copy
// would reintroduce exactly that drift risk. This module is the one source of truth both import.
export const defaultLiteHosts = ["lite.triaxisventures.com", "triaxis-product-lite-web.vercel.app"];

export function normalizeHost(host: string | null | undefined): string | null {
  if (!host) {
    return null;
  }
  return host.toLowerCase().split(":")[0] ?? null;
}

// `hostsEnvValue` is `AXXESS_LITE_HOSTS`, a server-only env var -- pass `undefined` from any
// client-side call site (it will fall back to `defaultLiteHosts`, which is what actually matters
// for the client-side demo-mode-forced-off check; a client-configurable host override was judged
// unnecessary scope for that use case).
export function getLiteHosts(hostsEnvValue: string | undefined): string[] {
  if (!hostsEnvValue) {
    return defaultLiteHosts;
  }
  const parsed = hostsEnvValue
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : defaultLiteHosts;
}

export function isLiteHost(host: string | null | undefined, hostsEnvValue: string | undefined): boolean {
  const normalized = normalizeHost(host);
  if (!normalized) {
    return false;
  }
  return getLiteHosts(hostsEnvValue).includes(normalized);
}

export type AxxessSurface = "lite" | "x0" | "demo";

export function getAxxessSurfaceFromEnv(surfaceEnvValue: string | undefined): AxxessSurface | null {
  if (surfaceEnvValue === "lite" || surfaceEnvValue === "x0" || surfaceEnvValue === "demo") {
    return surfaceEnvValue;
  }
  return null;
}

// The authoritative "is this request/deployment Lite" check: true if the request's own host
// matches a known Lite host (works with zero configuration, since this is what's live today), OR
// the deployment has explicitly declared itself AXXESS_SURFACE=lite. The latter is deliberately
// NOT required for correct behavior -- it's an additive declaration for the deployment that owns
// it, not a replacement for host-based detection. Setting AXXESS_SURFACE=lite on any Vercel
// project other than triaxis-product-lite-web would restrict that entire deployment to /lite
// routes -- this is intentional (a strong, explicit assertion), but it means the env var must
// never be copied blindly between projects (see docs/ENVIRONMENT_VARIABLES.md).
export function resolveIsLiteSurface(
  host: string | null | undefined,
  hostsEnvValue: string | undefined,
  surfaceEnvValue: string | undefined,
): boolean {
  if (getAxxessSurfaceFromEnv(surfaceEnvValue) === "lite") {
    return true;
  }
  return isLiteHost(host, hostsEnvValue);
}
