import type { ReactNode } from "react";
import type { UserContext } from "../../security/rbac";
import { BetaFeedbackButton } from "../../components/feedback/BetaFeedbackButton";
import { ChatbotLauncher } from "../../components/chatbot/ChatbotLauncher";
import type { NavSection } from "../navigation";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

type AppShellProps = {
  active: NavSection;
  activeLabel: string;
  sidebarOpen: boolean;
  isMobile: boolean;
  notifOpen: boolean;
  children: ReactNode;
  user: UserContext;
  routePath: string;
  onSelectSection: (section: NavSection) => void;
  onToggleSidebar: () => void;
  onToggleNotifications: () => void;
  onCloseNotifications: () => void;
  onLogout: () => void;
};

// AppShell is intentionally composition-only. Feature modules own content,
// while layout primitives own persistent navigation and page chrome.
export function AppShell({
  active,
  activeLabel,
  sidebarOpen,
  isMobile,
  notifOpen,
  children,
  user,
  routePath,
  onSelectSection,
  onToggleSidebar,
  onToggleNotifications,
  onCloseNotifications,
  onLogout,
}: AppShellProps) {
  // Beta tester feedback (2026-08-23, Android): on mobile, `sidebarOpen` now means "drawer open,"
  // not "rail expanded" -- closing the drawer after a nav click matches how every mobile drawer
  // pattern behaves (tap a destination, the drawer gets out of the way), without changing
  // Sidebar.tsx's own props/behavior at all.
  const handleSelectSection = (section: NavSection) => {
    onSelectSection(section);
    if (isMobile && sidebarOpen) onToggleSidebar();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={onToggleSidebar}
          aria-hidden="true"
        />
      )}
      <div
        className={isMobile ? `fixed inset-y-0 left-0 z-50 transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}` : undefined}
      >
        <Sidebar
          active={active}
          sidebarOpen={isMobile ? true : sidebarOpen}
          onSelectSection={handleSelectSection}
          onToggleSidebar={onToggleSidebar}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          activeLabel={activeLabel}
          notifOpen={notifOpen}
          isMobile={isMobile}
          onToggleSidebar={onToggleSidebar}
          onToggleNotifications={onToggleNotifications}
          user={user}
          onLogout={onLogout}
        />

        <main className="flex-1 overflow-y-auto px-6 py-6 [&::-webkit-scrollbar]:hidden" onClick={onCloseNotifications}>
          {children}
        </main>
      </div>
      <BetaFeedbackButton user={user} moduleName={activeLabel} route={routePath} />
      <ChatbotLauncher user={user} routePath={routePath} moduleName={activeLabel} />
    </div>
  );
}
