"use client";

import { useState } from "react";
import { getCurrentAuthSession } from "../auth/session";
import { AppShell } from "./layout/AppShell";
import { navGroups } from "./navigation";
import { lazyRouteComponents } from "./routing/lazyRoutes";
import { RouteBoundary } from "./routing/RouteBoundary";
import { useAppRouting } from "./routing/useAppRouting";
import { canAccessRoute, getVisibleNavGroups } from "../security/rbac";

export default function App() {
  const { active, activeRoute, navigateToSection } = useAppRouting("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);

  const authSession = getCurrentAuthSession();
  const currentUser = authSession.user;
  const visibleNavGroups = getVisibleNavGroups(navGroups, currentUser);
  const activeLabel = visibleNavGroups.flatMap((group) => group.items).find((item) => item.id === active)?.label || activeRoute.label;
  const ActiveSection = lazyRouteComponents[active] ?? lazyRouteComponents.dashboard;
  const hasRouteAccess = canAccessRoute(currentUser, activeRoute);

  return (
    <AppShell
      active={active}
      activeLabel={activeLabel}
      sidebarOpen={sidebarOpen}
      notifOpen={notifOpen}
      onSelectSection={navigateToSection}
      onToggleSidebar={() => setSidebarOpen((open) => !open)}
      onToggleNotifications={() => setNotifOpen((open) => !open)}
      onCloseNotifications={() => notifOpen && setNotifOpen(false)}
    >
      <RouteBoundary route={activeRoute} hasAccess={hasRouteAccess}>
        <ActiveSection />
      </RouteBoundary>
    </AppShell>
  );
}
