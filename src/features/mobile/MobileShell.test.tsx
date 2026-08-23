import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { UserContext } from "../../security/rbac";
import { MobileShell } from "./MobileShell";
import { mobilePrimaryTabs } from "./mobileFeatureRegistry";

const user: UserContext = { id: "user-1", organizationId: "org-1", role: "Employee", displayName: "Ananya Rao", avatarInitials: "AR" };

function tabBar() {
  return screen.getByRole("navigation", { name: "Primary navigation" });
}

describe("MobileShell", () => {
  it("renders the bottom tab bar with every primary tab plus More", () => {
    render(
      <MobileShell active="tasks" user={user} onSelectSection={vi.fn()}>
        <div>tasks content</div>
      </MobileShell>,
    );

    const nav = tabBar();
    for (const tab of mobilePrimaryTabs) {
      expect(within(nav).getByText(tab.label)).toBeInTheDocument();
    }
    expect(within(nav).getByText("More")).toBeInTheDocument();
  });

  it("does not render X0's desktop shell chrome (Sidebar/TopBar) anywhere", () => {
    render(
      <MobileShell active="tasks" user={user} onSelectSection={vi.fn()}>
        <div>tasks content</div>
      </MobileShell>,
    );

    // TopBar.tsx's own portfolio-search placeholder -- a string unique enough to Sidebar/TopBar
    // that its absence is real evidence this render tree never touched them, not just that
    // MobileShell doesn't statically import them (mobileIsolation.test.ts covers that separately).
    expect(screen.queryByPlaceholderText("Search portfolio...")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Collapse sidebar")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Expand sidebar")).not.toBeInTheDocument();
  });

  it("renders the real routed content (children) when `active` maps to an allowed mobile registry section", () => {
    render(
      <MobileShell active="tasks" user={user} onSelectSection={vi.fn()}>
        <div>real tasks section content</div>
      </MobileShell>,
    );

    expect(screen.getByText("real tasks section content")).toBeInTheDocument();
  });

  it("falls back to the local Home panel instead of rendering children when `active` has no mobile mapping (e.g. the forbidden Full Executive Dashboard)", () => {
    render(
      <MobileShell active="dashboard" user={user} onSelectSection={vi.fn()}>
        <div>forbidden dashboard content</div>
      </MobileShell>,
    );

    expect(screen.queryByText("forbidden dashboard content")).not.toBeInTheDocument();
    expect(screen.getByText("Ask AXXESS a question")).toBeInTheDocument();
  });

  it("navigates via onSelectSection when a primary tab is tapped", () => {
    const onSelectSection = vi.fn();
    render(
      <MobileShell active="dashboard" user={user} onSelectSection={onSelectSection}>
        <div>content</div>
      </MobileShell>,
    );

    fireEvent.click(within(tabBar()).getByText("Approvals"));
    expect(onSelectSection).toHaveBeenCalledWith("approvals");
  });

  it("shows the More panel, listing the non-primary registry entries, when the More tab is tapped", () => {
    render(
      <MobileShell active="dashboard" user={user} onSelectSection={vi.fn()}>
        <div>content</div>
      </MobileShell>,
    );

    fireEvent.click(within(tabBar()).getByText("More"));
    expect(screen.getByText("Meetings")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });
});
