import type { CSSProperties, ReactNode } from "react";

// MN-1 (2026-08-23): thin wrapper around CSS env(safe-area-inset-*) (real, non-zero inside the
// Capacitor WebView once layout.tsx's viewportFit:"cover" is set -- a harmless 0 everywhere else,
// including desktop browsers with no notch/home-indicator to inset around). Deliberately just a
// padding primitive, not a full-screen wrapper -- MobileHeader applies "top", MobileTabBar applies
// "bottom", so the middle scrollable content area is never double-padded.
const edgeStyle: Record<"top" | "bottom", CSSProperties> = {
  top: { paddingTop: "env(safe-area-inset-top, 0px)" },
  bottom: { paddingBottom: "env(safe-area-inset-bottom, 0px)" },
};

export function MobileSafeArea({ edge, children, className }: { edge: "top" | "bottom"; children: ReactNode; className?: string }) {
  return (
    <div className={className} style={edgeStyle[edge]}>
      {children}
    </div>
  );
}
