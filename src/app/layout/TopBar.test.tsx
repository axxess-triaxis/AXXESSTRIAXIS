import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AnalyticsProviderShell } from "../../services/analytics";
import { MockAnalyticsProvider } from "../../services/analytics/MockAnalyticsProvider";
import type { UserContext } from "../../security/rbac";
import { TopBar } from "./TopBar";

// SA-1: the top-right avatar used to be a purely decorative <Avatar> with no click target at
// all. These tests lock in that it now opens the real Profile tab, is keyboard-accessible (a
// native <a href>, not a div with a synthetic click handler), and that Sign Out is unaffected.
vi.mock("../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
}));

vi.mock("../../providers/serviceProvider", () => ({
  applicationServices: {
    notificationsRepository: { list: async () => [] },
  },
}));

const testUser: UserContext = { id: "user-1", organizationId: "org-1", role: "Organization Admin", avatarInitials: "SK" };

function renderTopBar(onLogout = vi.fn()) {
  return render(
    <AnalyticsProviderShell provider={new MockAnalyticsProvider()}>
      <TopBar activeLabel="Executive Dashboard" notifOpen={false} user={testUser} onToggleNotifications={() => {}} onLogout={onLogout} />
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
    renderTopBar(onLogout);

    const signOutButton = screen.getByRole("button", { name: "Sign out" });
    expect(signOutButton).toBeInTheDocument();
  });
});
