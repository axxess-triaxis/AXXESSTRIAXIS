import { useState, type ReactNode } from "react";
import type { UserContext } from "../../security/rbac";
import type { NavSection } from "../../app/navigation";
import { mobileFeatureForSection, mobileFeatureRegistry, type MobileFeatureId } from "./mobileFeatureRegistry";
import { MobileCommandHome } from "./MobileCommandHome";
import { MobileMorePanel } from "./MobileMorePanel";
import { MobileHeader } from "./MobileHeader";
import { MobileTabBar } from "./MobileTabBar";

type MobileShellProps = {
  active: NavSection;
  user: UserContext;
  onSelectSection: (section: NavSection) => void;
  children: ReactNode;
};

// MN-1 (2026-08-23): X0 Mobile's own shell -- intentionally NOT AppShell/Sidebar/TopBar
// (src/app/layout/*), the same "own shell, not a shrunk desktop one" principle Lite already
// established (src/features/lite/LiteShell.tsx). Bottom tabs + compact header replace the
// persistent side rail entirely; there is no desktop chrome anywhere in this component's render
// tree. See docs/readiness/MOBILE_NATIVE_CAPACITOR_RESEARCH_AND_ROADMAP_2026_08_23.md.
//
// `children` is the real ActiveSection the caller (App.tsx) already resolved for `active` via the
// existing lazyRouteComponents/routing -- this shell does not fork, duplicate, or re-fetch that
// content. It only renders `children` when `active` maps to an allowed mobile registry entry;
// otherwise (e.g. `active === "dashboard"`, the Full Executive Dashboard, or any other section with
// no mobile mapping) it falls back to the local Home panel instead of ever rendering forbidden
// content -- this is a real safety boundary, not just a UX default, since App.tsx's own
// defaultSectionForRole effect routes non-Employee roles to "dashboard" on first load.
export function MobileShell({ active, user, onSelectSection, children }: MobileShellProps) {
  // Cold launch: default to Home unless `active` already resolves to an allowed section (e.g. a
  // direct link into /tasks or /approvals) -- in that case respect it instead of overriding.
  const [localOverride, setLocalOverride] = useState<"home" | "more" | null>(() => (mobileFeatureForSection(active) ? null : "home"));

  const matchedEntry = localOverride ? undefined : mobileFeatureForSection(active);
  const activeTabId: MobileFeatureId | "more" = localOverride ?? matchedEntry?.id ?? "home";
  const showRoutedContent = !localOverride && Boolean(matchedEntry);

  function handleSelect(id: MobileFeatureId | "more") {
    if (id === "more" || id === "home") {
      setLocalOverride(id);
      return;
    }
    const target = mobileFeatureRegistry.find((entry) => entry.id === id)?.section;
    if (target) {
      setLocalOverride(null);
      onSelectSection(target);
    }
  }

  const title = activeTabId === "home" ? "Today" : activeTabId === "more" ? "More" : matchedEntry?.label ?? "AXXESS";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F8F9FA]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <MobileHeader title={title} avatarInitials={user.avatarInitials} onAvatarPress={() => handleSelect("settings")} />

      <main className="flex-1 overflow-y-auto">
        {activeTabId === "home" && <MobileCommandHome displayName={user.displayName} onNavigate={handleSelect} />}
        {activeTabId === "more" && <MobileMorePanel onNavigate={handleSelect} />}
        {showRoutedContent && children}
      </main>

      <MobileTabBar active={activeTabId} onSelect={handleSelect} />
    </div>
  );
}
