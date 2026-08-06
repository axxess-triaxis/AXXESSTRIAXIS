import { type AxxessSurface, getAxxessSurfaceFromEnv, isLiteHost } from "../../config/liteSurfaceHosts";

export type { AxxessSurface };

export const liteSurfaceId: AxxessSurface = "lite";

// XL-4 (2026-08-06): previously a stub that unconditionally returned "lite" regardless of any
// real signal (no env check, no host check) -- consolidated to delegate to
// src/config/liteSurfaceHosts.ts, the canonical, tested surface-resolution logic already driving
// src/proxy.ts's Edge Runtime enforcement and src/demo/demoMode.ts's client-side
// demo-mode-forced-off check. A third, independently hand-maintained "what surface am I"
// implementation (this file previously redefined its own AxxessSurface type too) would reintroduce
// the exact drift risk XLA-21/XL-4 exist to close -- see that file's own header comment.
// Client-safe: checks the AXXESS_SURFACE declaration first (works both server- and client-side),
// then falls back to the Lite host list once hydrated (window.location, unavailable during SSR).
export function getLiteSurface(): AxxessSurface {
  const declared = getAxxessSurfaceFromEnv(process.env.AXXESS_SURFACE);
  if (declared) {
    return declared;
  }
  if (typeof window !== "undefined" && isLiteHost(window.location.hostname, undefined)) {
    return "lite";
  }
  return "x0";
}

export function isLiteSurface(surface: string | undefined): boolean {
  return surface === liteSurfaceId;
}

export function isForbiddenForLiteSurface(surface: string | undefined): boolean {
  return surface === "x0" || surface === "demo";
}
