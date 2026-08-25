import { isNativeMobileSurface } from "./isNativeMobileSurface";

// MN-4 (2026-08-23): the roadmap's "Native Feel" checklist item "haptics used sparingly for key
// actions" -- deliberately a single light tap, called only at genuine confirmation points (a task
// marked complete, an approval decided), never on routine navigation. A no-op outside the real
// Capacitor app and a no-op (never throws) if the Haptics plugin bridge isn't present.
export function triggerMobileHaptic(): void {
  if (!isNativeMobileSurface()) return;
  void window.Capacitor?.Plugins?.Haptics?.impact?.({ style: "LIGHT" });
}
