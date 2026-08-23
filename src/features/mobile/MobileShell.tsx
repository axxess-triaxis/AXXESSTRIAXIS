import { useState, type ComponentType, type ReactNode } from "react";
import type { UserContext } from "../../security/rbac";
import type { NavSection } from "../../app/navigation";
import { mobileFeatureForSection, mobileFeatureRegistry, type MobileFeatureId } from "./mobileFeatureRegistry";
import { MobileCommandHome } from "./MobileCommandHome";
import { MobileMorePanel } from "./MobileMorePanel";
import { MobileHeader } from "./MobileHeader";
import { MobileTabBar } from "./MobileTabBar";
import { MobileTasksScreen } from "./screens/MobileTasksScreen";
import { MobileMeetingsScreen } from "./screens/MobileMeetingsScreen";
import { MobileProjectsScreen } from "./screens/MobileProjectsScreen";
import { MobileApprovalsScreen } from "./screens/MobileApprovalsScreen";
import { MobileKnowledgeScreen } from "./screens/MobileKnowledgeScreen";
import { MobileAskAiScreen } from "./screens/MobileAskAiScreen";
import { MobileStakeholdersScreen } from "./screens/MobileStakeholdersScreen";
import { MobileBackHandlerProvider } from "./MobileBackHandlerContext";
import { useMobileBackButton } from "./useMobileBackButton";
import { useMobileNetworkStatus } from "./useMobileNetworkStatus";
import { MobileOfflineBanner } from "./MobileOfflineBanner";

type MobileShellProps = {
  active: NavSection;
  user: UserContext;
  onSelectSection: (section: NavSection) => void;
  // MN-2 (2026-08-23): only used as a fallback for registry entries with no dedicated native
  // screen below (currently just "settings") -- every other primaryTab/more-tab entry now renders
  // its own real MN-2 screen instead of the reused desktop ActiveSection. See the roadmap's own
  // "MN-2 -- Core Mobile Workflows" section: this is the planned replacement of MN-1's transitional
  // reuse, not a parallel path.
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
export function MobileShell(props: MobileShellProps) {
  // MN-4 (2026-08-23): MobileBackHandlerProvider must wrap MobileShellContent, not sit alongside it
  // -- useMobileBackButton (called inside MobileShellContent) and every screen's own
  // useRegisterMobileBackHandler call both consume this context, so they must render as its
  // descendants, not as siblings of the component that creates it.
  return (
    <MobileBackHandlerProvider>
      <MobileShellContent {...props} />
    </MobileBackHandlerProvider>
  );
}

function MobileShellContent({ active, user, onSelectSection, children }: MobileShellProps) {
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

  // MN-4 (2026-08-23): real Android hardware back-button handling -- see useMobileBackButton.ts
  // for the full precedence order (registered screen handler, then tab-level "go to Home", then
  // App.minimizeApp() at the true root). A no-op outside the real Capacitor app.
  useMobileBackButton(activeTabId === "home", () => handleSelect("home"));
  const isOnline = useMobileNetworkStatus();

  const title = activeTabId === "home" ? "Today" : activeTabId === "more" ? "More" : matchedEntry?.label ?? "AXXESS";

  // MN-2 (2026-08-23): every registry entry maps to its own real native screen now (not the reused
  // desktop ActiveSection) -- "settings" is the sole remaining exception, since it was never in
  // MN-2's explicit scope and its desktop content (account/security preferences) has no native-only
  // requirement that would justify a rebuild this sprint. "ai-workspace" needs a prop (the
  // create-task-from-answer handoff), so it renders via its own branch rather than the generic
  // no-props component map the rest share.
  const nativeScreens: Partial<Record<MobileFeatureId, ComponentType>> = {
    tasks: MobileTasksScreen,
    reminders: MobileTasksScreen,
    meetings: MobileMeetingsScreen,
    projects: MobileProjectsScreen,
    approvals: MobileApprovalsScreen,
    knowledge: MobileKnowledgeScreen,
    stakeholders: MobileStakeholdersScreen,
  };
  const NativeScreen = matchedEntry ? nativeScreens[matchedEntry.id] : undefined;
  const isAskAi = showRoutedContent && matchedEntry?.id === "ai-workspace";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F8F9FA]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <MobileHeader title={title} avatarInitials={user.avatarInitials} onAvatarPress={() => handleSelect("settings")} />
      {!isOnline && <MobileOfflineBanner />}

      <main className="flex-1 overflow-y-auto">
        {activeTabId === "home" && <MobileCommandHome displayName={user.displayName} onNavigate={handleSelect} />}
        {activeTabId === "more" && <MobileMorePanel onNavigate={handleSelect} />}
        {isAskAi && <MobileAskAiScreen onCreateTaskFromAnswer={() => handleSelect("tasks")} />}
        {showRoutedContent && !isAskAi && NativeScreen && <NativeScreen />}
        {showRoutedContent && !isAskAi && !NativeScreen && children}
      </main>

      <MobileTabBar active={activeTabId} onSelect={handleSelect} />
    </div>
  );
}
