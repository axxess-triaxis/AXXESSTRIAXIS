import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { UserContext } from "../../security/rbac";
import { mobilePrimaryTabs } from "./mobileFeatureRegistry";

const user: UserContext = { id: "user-1", organizationId: "org-1", role: "Employee", displayName: "Ananya Rao", avatarInitials: "AR" };

// MN-2 (2026-08-23): MobileShell's own tests exercise routing/composition only -- which top-level
// screen renders for a given `active` value -- not each screen's real data-fetching behavior (every
// screen below has its own dedicated test file for that). Mocking them here keeps this file free of
// the AuthProvider/applicationServices wiring those screens need.
vi.mock("./MobileCommandHome", () => ({ MobileCommandHome: () => <div>Ask AXXESS a question</div> }));
vi.mock("./screens/MobileTasksScreen", () => ({ MobileTasksScreen: () => <div>native tasks screen</div> }));
vi.mock("./screens/MobileMeetingsScreen", () => ({ MobileMeetingsScreen: () => <div>native meetings screen</div> }));
vi.mock("./screens/MobileProjectsScreen", () => ({ MobileProjectsScreen: () => <div>native projects screen</div> }));
vi.mock("./screens/MobileApprovalsScreen", () => ({ MobileApprovalsScreen: () => <div>native approvals screen</div> }));
vi.mock("./screens/MobileKnowledgeScreen", () => ({ MobileKnowledgeScreen: () => <div>native knowledge screen</div> }));
vi.mock("./screens/MobileAskAiScreen", () => ({ MobileAskAiScreen: () => <div>native ask ai screen</div> }));
vi.mock("./screens/MobileStakeholdersScreen", () => ({ MobileStakeholdersScreen: () => <div>native stakeholders screen</div> }));

import { MobileShell } from "./MobileShell";

function tabBar() {
  return screen.getByRole("navigation", { name: "Primary navigation" });
}

describe("MobileShell", () => {
  it("renders the bottom tab bar with every primary tab plus More", () => {
    render(
      <MobileShell active="tasks" user={user} onSelectSection={vi.fn()} onLogout={vi.fn()}>
        <div>desktop settings content</div>
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
      <MobileShell active="tasks" user={user} onSelectSection={vi.fn()} onLogout={vi.fn()}>
        <div>desktop settings content</div>
      </MobileShell>,
    );

    // TopBar.tsx's own portfolio-search placeholder -- a string unique enough to Sidebar/TopBar
    // that its absence is real evidence this render tree never touched them, not just that
    // MobileShell doesn't statically import them (mobileIsolation.test.ts covers that separately).
    expect(screen.queryByPlaceholderText("Search portfolio...")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Collapse sidebar")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Expand sidebar")).not.toBeInTheDocument();
  });

  it("renders a real native MN-2 screen (not the reused desktop ActiveSection) for a registry entry that has one, e.g. Tasks", () => {
    render(
      <MobileShell active="tasks" user={user} onSelectSection={vi.fn()} onLogout={vi.fn()}>
        <div>desktop settings content</div>
      </MobileShell>,
    );

    expect(screen.getByText("native tasks screen")).toBeInTheDocument();
    expect(screen.queryByText("desktop settings content")).not.toBeInTheDocument();
  });

  it("still falls back to the reused desktop `children` for the one registry entry with no native MN-2 screen (Settings)", () => {
    render(
      <MobileShell active="settings" user={user} onSelectSection={vi.fn()} onLogout={vi.fn()}>
        <div>desktop settings content</div>
      </MobileShell>,
    );

    expect(screen.getByText("desktop settings content")).toBeInTheDocument();
  });

  it("falls back to the local Home panel instead of rendering children when `active` has no mobile mapping (e.g. the forbidden Full Executive Dashboard)", () => {
    render(
      <MobileShell active="dashboard" user={user} onSelectSection={vi.fn()} onLogout={vi.fn()}>
        <div>forbidden dashboard content</div>
      </MobileShell>,
    );

    expect(screen.queryByText("forbidden dashboard content")).not.toBeInTheDocument();
    expect(screen.getByText("Ask AXXESS a question")).toBeInTheDocument();
  });

  it("navigates via onSelectSection when a primary tab is tapped", () => {
    const onSelectSection = vi.fn();
    render(
      <MobileShell active="dashboard" user={user} onSelectSection={onSelectSection} onLogout={vi.fn()}>
        <div>content</div>
      </MobileShell>,
    );

    fireEvent.click(within(tabBar()).getByText("Approvals"));
    expect(onSelectSection).toHaveBeenCalledWith("approvals");
  });

  it("shows the More panel, listing the non-primary registry entries, when the More tab is tapped", () => {
    render(
      <MobileShell active="dashboard" user={user} onSelectSection={vi.fn()} onLogout={vi.fn()}>
        <div>content</div>
      </MobileShell>,
    );

    fireEvent.click(within(tabBar()).getByText("More"));
    expect(screen.getByText("Meetings")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  // MN-6 (2026-08-24): before this fix, there was no reachable sign-out control anywhere in the
  // native shell -- MN-1 replaced TopBar.tsx (the only prior home of sign-out) and never carried
  // the control forward. See docs/readiness/ANDROID_BETA_0_9_V3_WALKTHROUGH_TRIAGE_2026_08_24.md,
  // item 1.
  it("renders a real, callable Sign out control in the More panel", () => {
    const onLogout = vi.fn();
    render(
      <MobileShell active="dashboard" user={user} onSelectSection={vi.fn()} onLogout={onLogout}>
        <div>content</div>
      </MobileShell>,
    );

    fireEvent.click(within(tabBar()).getByText("More"));
    fireEvent.click(screen.getByLabelText("Sign out"));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
