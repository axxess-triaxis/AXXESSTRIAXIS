import type { ReactNode } from "react";
import type { UserContext } from "../../security/rbac";
import type { NavSection } from "../navigation";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

type AppShellProps = {
  active: NavSection;
  activeLabel: string;
  sidebarOpen: boolean;
  notifOpen: boolean;
  children: ReactNode;
  user: UserContext;
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
  notifOpen,
  children,
  user,
  onSelectSection,
  onToggleSidebar,
  onToggleNotifications,
  onCloseNotifications,
  onLogout,
}: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Sidebar
        active={active}
        sidebarOpen={sidebarOpen}
        onSelectSection={onSelectSection}
        onToggleSidebar={onToggleSidebar}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          activeLabel={activeLabel}
          notifOpen={notifOpen}
          onToggleNotifications={onToggleNotifications}
          user={user}
          onLogout={onLogout}
        />

        <main className="flex-1 overflow-y-auto px-6 py-6 [&::-webkit-scrollbar]:hidden" onClick={onCloseNotifications}>
          {children}
        </main>
      </div>
    </div>
  );
}
