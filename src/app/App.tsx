"use client";

import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { EmptyState } from "../components/feedback/EmptyState";
import { LoadingState } from "../components/feedback/LoadingState";
import { Card } from "../components/ui/Card";
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
  const { session, isAuthenticated, logout } = useAuth();

  if (session.status === "loading") {
    return <LoadingState label="Checking session" />;
  }

  if (activeRoute.requiresAuth && !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F2F3F5] px-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <Card className="max-w-md p-8">
          <EmptyState
            title="Sign in required"
            message="Your session is required to access this AXXESS workspace."
          />
          <a className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-[#8B1E2D] px-4 py-2 text-sm font-semibold text-white" href="/auth">
            Sign in
          </a>
        </Card>
      </div>
    );
  }

  if (!session.user) return null;

  const currentUser = session.user;
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
      onLogout={logout}
      user={currentUser}
    >
      <RouteBoundary route={activeRoute} hasAccess={hasRouteAccess}>
        <ActiveSection />
      </RouteBoundary>
    </AppShell>
  );
}
