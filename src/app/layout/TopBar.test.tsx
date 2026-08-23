import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnalyticsProviderShell } from "../../services/analytics";
import { MockAnalyticsProvider } from "../../services/analytics/MockAnalyticsProvider";
import type { UserContext } from "../../security/rbac";
import type { Notification } from "../../domain";
import { TopBar } from "./TopBar";

// SA-1: the top-right avatar used to be a purely decorative <Avatar> with no click target at
// all. These tests lock in that it now opens the real Profile tab, is keyboard-accessible (a
// native <a href>, not a div with a synthetic click handler), and that Sign Out is unaffected.
vi.mock("../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
}));

const { mockNotificationsList, mockNotificationsUpdate, mockProjectsList } = vi.hoisted(() => ({
  mockNotificationsList: vi.fn(async () => [] as Notification[]),
  mockNotificationsUpdate: vi.fn(async (_scope: unknown, id: string, patch: Partial<Notification>) => ({ id, ...patch }) as Notification),
  // Analytics Sprint 2: TopBar's "Search portfolio..." box now fetches real projects.
  mockProjectsList: vi.fn(async () => [] as { id: string; name: string }[]),
}));

vi.mock("../../providers/serviceProvider", () => ({
  applicationServices: {
    notificationsRepository: { list: mockNotificationsList, update: mockNotificationsUpdate },
    projectsRepository: { list: mockProjectsList },
  },
}));

const mockNavigateToSection = vi.fn();
vi.mock("../../hooks/useWorkspaceRouting", () => ({
  useWorkspaceRouting: () => ({ navigateToSection: mockNavigateToSection }),
}));

const testUser: UserContext = { id: "user-1", organizationId: "org-1", role: "Organization Admin", avatarInitials: "SK" };

function renderTopBar(overrides: { onLogout?: () => void; notifOpen?: boolean; onToggleNotifications?: () => void } = {}) {
  return render(
    <AnalyticsProviderShell provider={new MockAnalyticsProvider()}>
      <TopBar
        activeLabel="Executive Dashboard"
        notifOpen={overrides.notifOpen ?? false}
        user={testUser}
        onToggleNotifications={overrides.onToggleNotifications ?? (() => {})}
        onLogout={overrides.onLogout ?? vi.fn()}
      />
    </AnalyticsProviderShell>,
  );
}

describe("TopBar avatar (SA-1 fix)", () => {
  it("renders the avatar as a real, accessible link to the Profile tab, not a decorative element", () => {
    renderTopBar();

    const profileLink = screen.getByRole("link", { name: "Open profile" });
    expect(profileLink).toHaveAttribute("href", "/settings?tab=profile");
    expect(profileLink.tagName).toBe("A");
  });

  it("still shows the user's avatar initials inside the profile link", () => {
    renderTopBar();

    const profileLink = screen.getByRole("link", { name: "Open profile" });
    expect(profileLink).toHaveTextContent("SK");
  });

  it("Sign Out remains present and unaffected by the profile link", () => {
    const onLogout = vi.fn();
    renderTopBar({ onLogout });

    const signOutButton = screen.getByRole("button", { name: "Sign out" });
    expect(signOutButton).toBeInTheDocument();
  });
});

// Notification click-through (2026-08-16): clicking a notification used to only mark it read and
// show an inline detail panel -- it never navigated anywhere despite Notification already carrying
// resourceType/resourceId. These tests lock in that each notification type now routes to the
// section that actually holds the corresponding item.
describe("TopBar notification click-through", () => {
  afterEach(() => {
    mockNavigateToSection.mockReset();
    mockNotificationsList.mockReset();
    mockNotificationsUpdate.mockReset();
  });

  function makeNotification(overrides: Partial<Notification> = {}): Notification {
    return {
      id: "notif-1",
      organizationId: "org-1",
      userId: "user-1",
      type: "task",
      title: "Task created",
      body: "A task was created.",
      createdAt: new Date().toISOString(),
      ...overrides,
    };
  }

  it("navigates to Tasks & Workflow when a task notification is clicked", async () => {
    mockNotificationsList.mockResolvedValue([makeNotification({ type: "task" })]);
    mockNotificationsUpdate.mockResolvedValue(makeNotification({ type: "task", readAt: new Date().toISOString() }));
    const onToggleNotifications = vi.fn();
    renderTopBar({ notifOpen: true, onToggleNotifications });

    const item = await screen.findByText("Task created");
    fireEvent.click(item);

    await waitFor(() => expect(mockNavigateToSection).toHaveBeenCalledWith("tasks"));
    expect(onToggleNotifications).toHaveBeenCalledTimes(1);
  });

  it("navigates to the matching section for project/meeting/admin notification types", async () => {
    const cases: Array<[Notification["type"], string]> = [
      ["project", "projects"],
      ["meeting", "meetings"],
      ["admin", "organization-admin"],
    ];

    for (const [type, expectedSection] of cases) {
      mockNavigateToSection.mockReset();
      mockNotificationsList.mockResolvedValue([makeNotification({ id: `notif-${type}`, type, title: `${type} event` })]);
      mockNotificationsUpdate.mockResolvedValue(makeNotification({ id: `notif-${type}`, type, readAt: new Date().toISOString() }));
      const { unmount } = render(
        <AnalyticsProviderShell provider={new MockAnalyticsProvider()}>
          <TopBar activeLabel="Executive Dashboard" notifOpen user={testUser} onToggleNotifications={() => {}} onLogout={vi.fn()} />
        </AnalyticsProviderShell>,
      );

      const item = await screen.findByText(`${type} event`);
      fireEvent.click(item);

      await waitFor(() => expect(mockNavigateToSection).toHaveBeenCalledWith(expectedSection));
      unmount();
    }
  });

  it("does not navigate for a system-type notification -- no single owning section exists", async () => {
    mockNotificationsList.mockResolvedValue([makeNotification({ type: "system", title: "System alert" })]);
    mockNotificationsUpdate.mockResolvedValue(makeNotification({ type: "system", readAt: new Date().toISOString() }));
    renderTopBar({ notifOpen: true });

    const item = await screen.findByText("System alert");
    fireEvent.click(item);

    await waitFor(() => expect(mockNotificationsUpdate).toHaveBeenCalled());
    expect(mockNavigateToSection).not.toHaveBeenCalled();
  });
});
