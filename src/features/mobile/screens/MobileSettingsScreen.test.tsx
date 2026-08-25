import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// MN-7 (2026-08-24): MobileSettingsScreen's own test exercises routing/composition only -- which
// panel renders for which row, and that Permissions is genuinely absent -- not each panel's real
// data-fetching behavior (each has its own dedicated test file for that), matching the established
// pattern MobileShell.test.tsx already uses for its own screen mocks.
vi.mock("./MobileSettingsProfilePanel", () => ({ MobileSettingsProfilePanel: () => <div>profile panel content</div> }));
vi.mock("./MobileSettingsOrganizationPanel", () => ({ MobileSettingsOrganizationPanel: () => <div>organization panel content</div> }));
vi.mock("./MobileSettingsTeamPanel", () => ({ MobileSettingsTeamPanel: () => <div>team panel content</div> }));

import { MobileBackHandlerProvider } from "../MobileBackHandlerContext";
import { MobileSettingsScreen } from "./MobileSettingsScreen";

function renderScreen() {
  return render(
    <MobileBackHandlerProvider>
      <MobileSettingsScreen />
    </MobileBackHandlerProvider>,
  );
}

// useMobileTabletLayout reads window.innerWidth directly (not just matchMedia's `matches`), so both
// must be stubbed together -- matching useMobileTabletLayout.test.ts's own stubViewport helper.
function stubViewport(width: number) {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
  window.matchMedia = vi.fn().mockReturnValue({ matches: width >= 768, addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaQueryList);
}

describe("MobileSettingsScreen (MN-7)", () => {
  beforeEach(() => {
    stubViewport(390);
  });

  it("lists Profile, Organization, and Team & Access, with no Permissions row anywhere", () => {
    renderScreen();
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Organization")).toBeInTheDocument();
    expect(screen.getByText("Team & Access")).toBeInTheDocument();
    // Explicit regression assertion for item 11 (Permissions dropped from mobile) --
    // docs/readiness/ANDROID_BETA_0_9_V3_WALKTHROUGH_TRIAGE_2026_08_24.md.
    expect(screen.queryByText("Permissions")).not.toBeInTheDocument();
  });

  it("drills into a panel on tap and hides the list on phone layout", () => {
    renderScreen();
    fireEvent.click(screen.getByText("Profile"));
    expect(screen.getByText("profile panel content")).toBeInTheDocument();
    expect(screen.queryByText("Organization")).not.toBeInTheDocument();
  });

  it("navigates back to the list via the phone-layout back link", () => {
    renderScreen();
    fireEvent.click(screen.getByText("Team & Access"));
    expect(screen.getByText("team panel content")).toBeInTheDocument();
    fireEvent.click(screen.getByText("← Back to Settings"));
    expect(screen.getByText("Team & Access")).toBeInTheDocument();
    expect(screen.queryByText("team panel content")).not.toBeInTheDocument();
  });

  it("renders list and detail side by side on tablet layout", () => {
    stubViewport(820);
    renderScreen();
    fireEvent.click(screen.getByText("Organization"));
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("organization panel content")).toBeInTheDocument();
  });
});
