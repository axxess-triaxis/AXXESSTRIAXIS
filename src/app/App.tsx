"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { EmptyState } from "../components/feedback/EmptyState";
import { LoadingState } from "../components/feedback/LoadingState";
import { PostDemoSatisfactionPrompt } from "../components/feedback/PostDemoSatisfactionPrompt";
import { WhatsNewPanel } from "../components/feedback/WhatsNewPanel";
import { Card } from "../components/ui/Card";
import { GuidedDemoBanner } from "../components/demo/GuidedDemoBanner";
import { WhatsAppLiveNotificationBanner } from "../components/messaging/WhatsAppLiveNotificationBanner";
import { useIsMobile } from "./components/ui/use-mobile";
import { isNativeMobileSurface } from "../features/mobile/isNativeMobileSurface";
import { MobileShell } from "../features/mobile/MobileShell";
import { usePostDemoSatisfactionPrompt } from "../hooks/usePostDemoSatisfactionPrompt";
import { useWhatsAppLiveEvents } from "../hooks/useWhatsAppLiveEvents";
import { useWhatsNewPanel } from "../hooks/useWhatsNewPanel";
import { AppShell } from "./layout/AppShell";
import { navGroups } from "./navigation";
import { lazyRouteComponents } from "./routing/lazyRoutes";
import { RouteBoundary } from "./routing/RouteBoundary";
import { useAppRouting } from "./routing/useAppRouting";
import { defaultSectionForRole } from "./routing/routes";
import { canAccessRoute, getVisibleNavGroups } from "../security/rbac";
import { useAnalytics } from "../services/analytics";
import type { NavSection } from "./navigation";

export default function App() {
  const { active, activeRoute, navigateToSection } = useAppRouting("dashboard");
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  // MN-1 (2026-08-23): distinct from `isMobile` above (a viewport-width check that also covers a
  // narrow desktop browser window) -- this is specifically "are we running inside the Capacitor
  // native app," the trigger for replacing the shell entirely rather than just making the existing
  // one responsive. Starts false (SSR-safe default, matching this codebase's established pattern
  // for any window-dependent check) and corrects after mount.
  const [isNativeMobile, setIsNativeMobile] = useState(false);
  useEffect(() => {
    setIsNativeMobile(isNativeMobileSurface());
  }, []);

  // Beta tester feedback (2026-08-23, Android): the sidebar rendered as a permanent ~232px rail
  // on every screen regardless of viewport width, squeezing real page content into a cramped
  // remainder on phones. `sidebarOpen` here now means "rail expanded" on desktop but "drawer open"
  // on mobile (AppShell branches its rendering on isMobile) -- closing it once on the initial
  // transition to mobile, rather than fighting the user's own later manual toggles, matches how a
  // real mobile drawer should default (closed) without changing desktop's existing default (open).
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);
  const { session, isAuthenticated, logout } = useAuth();
  const analytics = useAnalytics();
  const postDemoSatisfaction = usePostDemoSatisfactionPrompt();
  const whatsNew = useWhatsNewPanel();
  const whatsAppLiveEvents = useWhatsAppLiveEvents(session.status === "authenticated" && Boolean(session.user));
  const currentUser = session.user;
  const routePath = `/${activeRoute.path}`;
  const screenshotMode = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("screenshot") === "true";

  useEffect(() => {
    if (!currentUser || session.status !== "authenticated") return;
    if (activeRoute.id !== "app") return;
    const roleDefault = defaultSectionForRole(currentUser.role);
    if (roleDefault !== active) navigateToSection(roleDefault);
  }, [active, activeRoute.id, currentUser, navigateToSection, session.status]);

  useEffect(() => {
    // Safety net: a real, authenticated user with no provisioned organization yet
    // (needsOnboarding, see supabaseUser.ts) must never reach a page that queries live
    // repositories -- organizationId isn't a real tenant id yet and every such query fails.
    // The login flow (src/app/auth/page.tsx) already routes correctly; this catches any other
    // path into the workspace shell (bookmarks, direct links, the marketing site's entry point).
    if (!currentUser?.needsOnboarding) return;
    window.location.assign("/onboarding");
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || session.status !== "authenticated") return;
    analytics.identifyUser(currentUser.id, {
      user_role: currentUser.role,
      organization_id: currentUser.organizationId,
      beta_user: true,
      signup_source: "enterprise_beta",
    });
    analytics.trackEvent("app_opened", { session_source: session.source }, {
      organization_id: currentUser.organizationId,
      user_id: currentUser.id,
      user_role: currentUser.role,
      module_name: activeRoute.module,
      route: routePath,
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
    // Sprint (2026-08-17): fire-and-forget persistence for the real "Most Used Modules" view on
    // Product Analytics -- additive to the client-analytics event above, not a replacement.
    void fetch("/api/module-usage-events", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ module: activeRoute.module }),
    }).catch(() => undefined);
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

  // MN-1 (2026-08-23): the actual product-boundary switch -- inside the Capacitor native app,
  // MobileShell replaces AppShell/Sidebar/TopBar entirely (not just a responsive variant of it).
  // Deliberately omits GuidedDemoBanner/WhatsAppLiveNotificationBanner/PostDemoSatisfactionPrompt/
  // WhatsNewPanel here -- these are desktop-web engagement/marketing surfaces, out of scope for a
  // "restrained enterprise UI" per the roadmap's own Mobile Surface Contract; RouteBoundary's real
  // RBAC/access check is unchanged and still applies, since that boundary must never weaken.
  if (isNativeMobile) {
    return (
      <MobileShell active={active} user={currentUser} onSelectSection={handleSelectSection} onLogout={handleLogout}>
        <RouteBoundary route={activeRoute} hasAccess={hasRouteAccess}>
          <ActiveSection />
        </RouteBoundary>
      </MobileShell>
    );
  }

  return (
    <AppShell
      active={active}
      activeLabel={activeLabel}
      sidebarOpen={sidebarOpen}
      isMobile={isMobile}
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
      {!screenshotMode && <WhatsAppLiveNotificationBanner events={whatsAppLiveEvents.events} onDismiss={whatsAppLiveEvents.dismiss} />}
      <RouteBoundary route={activeRoute} hasAccess={hasRouteAccess}>
        <ActiveSection />
      </RouteBoundary>
      {!screenshotMode && postDemoSatisfaction.visible && (
        <PostDemoSatisfactionPrompt user={currentUser} route={routePath} onDismiss={postDemoSatisfaction.dismiss} />
      )}
      {!screenshotMode && whatsNew.visible && (
        <WhatsNewPanel user={currentUser} route={routePath} onDismiss={whatsNew.dismiss} />
      )}
    </AppShell>
  );
}
