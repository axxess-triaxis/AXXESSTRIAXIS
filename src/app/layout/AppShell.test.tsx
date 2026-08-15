import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { UserContext } from "../../security/rbac";

vi.mock("./Sidebar", () => ({ Sidebar: () => <div data-testid="sidebar-stub" /> }));
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
});
