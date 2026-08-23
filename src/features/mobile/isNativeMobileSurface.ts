// MN-1 (2026-08-23): the same Next.js deployment serves desktop web, mobile web, and the
// Capacitor-wrapped Android/iOS app -- apps/mobile-capacitor has no separate src/, it's a WebView
// pointed at this app's own remote URL (see docs/readiness/MOBILE_NATIVE_CAPACITOR_RESEARCH_AND_
// ROADMAP_2026_08_23.md). Capacitor's native bridge injects a global `window.Capacitor` object into
// the page before it loads -- checking it is the standard, dependency-free way to distinguish "the
// real native app" from "a browser tab," without adding @capacitor/core as a root dependency (it's
// only ever installed inside apps/mobile-capacitor's own package.json today).
//
// Deliberately narrower than a viewport-width check: MobileShell should only replace the desktop
// shell inside the actual native wrapper, not just because a browser window happens to be narrow --
// the responsive sidebar fix (docs/readiness/ANDROID_BETA_0_9_TESTER_FEEDBACK_RITASHREE_2026_08_23.md)
// already handles narrow desktop-web browsers correctly; this is a distinct, stricter signal.
declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      getPlatform?: () => string;
    };
  }
}

export function isNativeMobileSurface(): boolean {
  if (typeof window === "undefined") return false;
  return window.Capacitor?.isNativePlatform?.() === true;
}
