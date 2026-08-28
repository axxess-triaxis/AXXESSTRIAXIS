"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import { useAuth } from "../../auth/AuthProvider";
import { liteNavItems, liteNavItemForPath } from "./liteNavigation";

// XL-1 (2026-08-05): AXXESS Lite's own shell -- intentionally NOT AppShell/Sidebar/TopBar
// (src/app/layout/*). Those components are X0's enterprise chrome (role-aware nav groups,
// tenant-scope badges, notifications dropdown, Golden Path banner). Lite gets a small, fixed,
// mobile-first top bar and bottom nav instead. See
// docs/readiness/AXXESS_LITE_DOCTRINE_AND_SURFACE_CONSTITUTION_2026_08_05.md Section 5.
export function LiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { session, logout } = useAuth();
  const active = liteNavItemForPath(pathname ?? "/lite");

  if (session.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA] text-sm text-[#5F6B73]">
        AXXESS Lite
      </div>
    );
  }

  if (session.status === "unauthenticated") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#F8F9FA] px-6 text-center">
        <p className="text-sm font-semibold text-[#0F1117]">Sign in to use AXXESS Lite</p>
        <Link href="/auth" className="rounded-lg bg-[#8B1E2D] px-4 py-2 text-sm font-medium text-white">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F8F9FA]">
      <header className="flex items-center justify-between border-b border-[rgba(0,0,0,0.06)] bg-white px-4 py-3">
        <span className="text-sm font-bold tracking-wide text-[#0F1117]">AXXESS Lite</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#5F6B73]">{session.user.displayName}</span>
          {/* 2026-08-28: founder found Lite had no way to sign out at all -- the header only ever
              showed the display name as plain text, no control anywhere in the shell or Settings.
              Reuses AuthProvider's logout() directly (same call X0's TopBar makes), matching this
              shell's own always-authenticated-or-sign-in-prompt render contract above: logout()
              flips session.status to "unauthenticated" and this component re-renders the sign-in
              screen on its own, no manual redirect needed. */}
          <button
            type="button"
            onClick={() => void logout()}
            aria-label="Sign out"
            title="Sign out"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#5F6B73] transition-colors hover:bg-[#F2F3F5] hover:text-[#0F1117]"
          >
            <LogOut size={14} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 pb-20 sm:pb-4">{children}</main>

      <nav
        aria-label="AXXESS Lite navigation"
        className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-[rgba(0,0,0,0.06)] bg-white py-1.5 sm:static sm:justify-start sm:gap-1 sm:border-t-0 sm:border-t sm:px-4"
      >
        {liteNavItems.map((item) => {
          const isActive = active?.id === item.id;
          return (
            <Link
              key={item.id}
              href={item.path}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] font-medium sm:flex-row sm:gap-1.5 sm:px-3 sm:py-2 sm:text-xs ${
                isActive ? "text-[#8B1E2D]" : "text-[#5F6B73]"
              }`}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
