import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { UserContext } from "../../security/rbac";

vi.mock("./Sidebar", () => ({
  Sidebar: ({ onSelectSection }: { onSelectSection: (section: string) => void }) => (
    <div data-testid="sidebar-stub">
      <button onClick={() => onSelectSection("projects")}>go to projects</button>
    </div>
  ),
}));
vi.mock("./TopBar", () => ({ TopBar: () => <div data-testid="topbar-stub" /> }));
vi.mock("../../components/feedback/BetaFeedbackButton", () => ({
  BetaFeedbackButton: () => <div data-testid="beta-feedback-stub" />,
}));
vi.mock("../../components/chatbot/ChatbotLauncher", () => ({
  ChatbotLauncher: () => <div data-testid="chatbot-launcher-stub" />,
}));

import { AppShell } from "./AppShell";

const user: UserContext = { id: "user-1", organizationId: "org-1", role: "Employee", displayName: "Ananya Rao" };

describe("AppShell", () => {
  it("mounts both BetaFeedbackButton and ChatbotLauncher as persistent, shell-level siblings of the page content", () => {
    render(
      <AppShell
        active="dashboard"
        activeLabel="Dashboard"
        sidebarOpen
        isMobile={false}
        notifOpen={false}
        user={user}
        routePath="/dashboard"
        onSelectSection={vi.fn()}
        onToggleSidebar={vi.fn()}
        onToggleNotifications={vi.fn()}
        onCloseNotifications={vi.fn()}
        onLogout={vi.fn()}
      >
        <div>page content</div>
      </AppShell>,
    );

    expect(screen.getByTestId("beta-feedback-stub")).toBeInTheDocument();
    expect(screen.getByTestId("chatbot-launcher-stub")).toBeInTheDocument();
    expect(screen.getByText("page content")).toBeInTheDocument();
  });

  // Beta tester feedback (2026-08-23, Android): the sidebar previously stayed a permanent ~232px
  // rail on every screen, squeezing real content into a cramped remainder on phones. These lock in
  // the mobile drawer behavior that replaced it.
  it("shows a backdrop on mobile when the drawer is open, and closing it calls onToggleSidebar", () => {
    const onToggleSidebar = vi.fn();
    const { container } = render(
      <AppShell
        active="dashboard"
        activeLabel="Dashboard"
        sidebarOpen
        isMobile
        notifOpen={false}
        user={user}
        routePath="/dashboard"
        onSelectSection={vi.fn()}
        onToggleSidebar={onToggleSidebar}
        onToggleNotifications={vi.fn()}
        onCloseNotifications={vi.fn()}
        onLogout={vi.fn()}
      >
        <div>page content</div>
      </AppShell>,
    );

    const backdrop = container.querySelector(".bg-black\\/40");
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(onToggleSidebar).toHaveBeenCalledTimes(1);
  });

  it("renders no backdrop on mobile when the drawer is closed", () => {
    const { container } = render(
      <AppShell
        active="dashboard"
        activeLabel="Dashboard"
        sidebarOpen={false}
        isMobile
        notifOpen={false}
        user={user}
        routePath="/dashboard"
        onSelectSection={vi.fn()}
        onToggleSidebar={vi.fn()}
        onToggleNotifications={vi.fn()}
        onCloseNotifications={vi.fn()}
        onLogout={vi.fn()}
      >
        <div>page content</div>
      </AppShell>,
    );

    expect(container.querySelector(".bg-black\\/40")).toBeNull();
  });

  it("closes the mobile drawer after selecting a nav destination", () => {
    const onSelectSection = vi.fn();
    const onToggleSidebar = vi.fn();
    render(
      <AppShell
        active="dashboard"
        activeLabel="Dashboard"
        sidebarOpen
        isMobile
        notifOpen={false}
        user={user}
        routePath="/dashboard"
        onSelectSection={onSelectSection}
        onToggleSidebar={onToggleSidebar}
        onToggleNotifications={vi.fn()}
        onCloseNotifications={vi.fn()}
        onLogout={vi.fn()}
      >
        <div>page content</div>
      </AppShell>,
    );

    fireEvent.click(screen.getByText("go to projects"));
    expect(onSelectSection).toHaveBeenCalledWith("projects");
    expect(onToggleSidebar).toHaveBeenCalledTimes(1);
  });

  it("does not auto-close the sidebar on desktop after selecting a nav destination", () => {
    const onSelectSection = vi.fn();
    const onToggleSidebar = vi.fn();
    render(
      <AppShell
        active="dashboard"
        activeLabel="Dashboard"
        sidebarOpen
        isMobile={false}
        notifOpen={false}
        user={user}
        routePath="/dashboard"
        onSelectSection={onSelectSection}
        onToggleSidebar={onToggleSidebar}
        onToggleNotifications={vi.fn()}
        onCloseNotifications={vi.fn()}
        onLogout={vi.fn()}
      >
        <div>page content</div>
      </AppShell>,
    );

    fireEvent.click(screen.getByText("go to projects"));
    expect(onSelectSection).toHaveBeenCalledWith("projects");
    expect(onToggleSidebar).not.toHaveBeenCalled();
  });
});
