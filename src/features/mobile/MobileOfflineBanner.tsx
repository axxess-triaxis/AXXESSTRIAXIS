import { WifiOff } from "lucide-react";

// MN-4 (2026-08-23): the roadmap's "Native Feel" checklist item "loading/empty/error/offline
// states exist" -- a real, honest banner driven by useMobileNetworkStatus() (the actual Capacitor
// Network plugin status), not a decorative placeholder. Deliberately just a banner, not a blocking
// full-screen state: every screen already reads from repositories/routes that fail closed to an
// honest empty/error state on their own, so offline mainly means "what you're viewing may be
// stale," not "nothing works."
export function MobileOfflineBanner() {
  return (
    <div className="flex items-center justify-center gap-2 bg-[#B26A00] px-4 py-1.5 text-xs font-medium text-white">
      <WifiOff size={13} />
      <span>You&apos;re offline. Some information may be out of date.</span>
    </div>
  );
}
