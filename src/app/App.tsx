"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { EmptyState } from "../components/feedback/EmptyState";
import { LoadingState } from "../components/feedback/LoadingState";
import { Card } from "../components/ui/Card";
import { GuidedDemoBanner } from "../components/demo/GuidedDemoBanner";
import { AppShell } from "./layout/AppShell";
import { navGroups } from "./navigation";
import { lazyRouteComponents } from "./routing/lazyRoutes";
import { RouteBoundary } from "./routing/RouteBoundary";
import { useAppRouting } from "./routing/useAppRouting";
import { canAccessRoute, getVisibleNavGroups } from "../security/rbac";
import { useAnalytics } from "../services/analytics";
import type { NavSection } from "./navigation";

export default function App() {
  const { active, activeRoute, navigateToSection } = useAppRouting("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const { session, isAuthenticated, logout } = useAuth();
  const analytics = useAnalytics();
  const currentUser = session.user;
  const routePath = `/${activeRoute.path}`;
  const screenshotMode = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("screenshot") === "true";

  useEffect(() => {
    if (!currentUser || session.status !== "authenticated") return;
    analytics.identifyUser(currentUser.id, {
      user_role: currentUser.role,
      organization_id: currentUser.organizationId,
      beta_user: true,
      signup_source: "enterprise_beta",
    });
    analytics.trackEvent("beta_session_started", { session_source: session.source }, {
      organization_id: currentUser.organizationId,
      user_id: currentUser.id,
      user_role: currentUser.role,
      module_name: activeRoute.module,
      route: routePath,
    });
  }, [analytics, currentUser, session.status, session.source, activeRoute.module, routePath]);

  useEffect(() => {
    if (!currentUser || session.status !== "authenticated") return;
    analytics.trackEvent("module_opened", { module: activeRoute.module, label: activeRoute.label }, {
      organization_id: currentUser.organizationId,
      user_id: currentUser.id,
      user_role: currentUser.role,
      module_name: activeRoute.module,
      route: routePath,
    });
    if (active === "dashboard") {
      analytics.trackEvent("dashboard_viewed", { module: "dashboard" }, {
        organization_id: currentUser.organizationId,
        user_id: currentUser.id,
        user_role: currentUser.role,
        module_name: "dashboard",
        route: routePath,
      });
    }
  }, [active, activeRoute.label, activeRoute.module, analytics, currentUser, session.status, routePath]);

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

  if (!currentUser) return null;

  const visibleNavGroups = getVisibleNavGroups(navGroups, currentUser);
  const activeLabel = visibleNavGroups.flatMap((group) => group.items).find((item) => item.id === active)?.label || activeRoute.label;
  const ActiveSection = lazyRouteComponents[active] ?? lazyRouteComponents.dashboard;
  const hasRouteAccess = canAccessRoute(currentUser, activeRoute);

  const handleSelectSection = (section: NavSection) => {
    analytics.trackEvent("sidebar_navigation_clicked", { target_section: section }, {
      organization_id: currentUser.organizationId,
      user_id: currentUser.id,
      user_role: currentUser.role,
      module_name: activeRoute.module,
      route: routePath,
    });
    navigateToSection(section);
  };

  const handleLogout = async () => {
    analytics.trackEvent("user_logout", { session_source: session.source }, {
      organization_id: currentUser.organizationId,
      user_id: currentUser.id,
      user_role: currentUser.role,
      module_name: activeRoute.module,
      route: routePath,
    });
    await logout();
    analytics.resetAnalytics();
  };

  return (
    <AppShell
      active={active}
      activeLabel={activeLabel}
      sidebarOpen={sidebarOpen}
      notifOpen={notifOpen}
      routePath={routePath}
      onSelectSection={handleSelectSection}
      onToggleSidebar={() => setSidebarOpen((open) => !open)}
      onToggleNotifications={() => setNotifOpen((open) => !open)}
      onCloseNotifications={() => notifOpen && setNotifOpen(false)}
      onLogout={handleLogout}
      user={currentUser}
    >
      {!screenshotMode && <GuidedDemoBanner activeSection={active} onNavigate={handleSelectSection} />}
      <RouteBoundary route={activeRoute} hasAccess={hasRouteAccess}>
        <ActiveSection />
      </RouteBoundary>
    </AppShell>
  );
}
