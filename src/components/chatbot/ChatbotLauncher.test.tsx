import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { UserContext } from "../../security/rbac";

vi.mock("./ChatbotPanel", () => ({
  ChatbotPanel: () => <div data-testid="chatbot-panel-stub" />,
}));

import { ChatbotLauncher } from "./ChatbotLauncher";

const user: UserContext = { id: "user-1", organizationId: "org-1", role: "Employee", displayName: "Ananya Rao" };

describe("ChatbotLauncher", () => {
  it("renders the trigger and does not render the panel until clicked", () => {
    render(<ChatbotLauncher user={user} routePath="/dashboard" moduleName="Dashboard" />);
    expect(screen.getByRole("button", { name: "Open AXXESS Copilot" })).toBeInTheDocument();
    expect(screen.queryByTestId("chatbot-panel-stub")).not.toBeInTheDocument();
  });

  it("opens the panel on click", () => {
    render(<ChatbotLauncher user={user} routePath="/dashboard" moduleName="Dashboard" />);
    fireEvent.click(screen.getByRole("button", { name: "Open AXXESS Copilot" }));
    expect(screen.getByTestId("chatbot-panel-stub")).toBeInTheDocument();
  });

  // Regression guard: BetaFeedbackButton occupies "fixed bottom-5 right-5 z-50" -- the trigger must
  // stay stacked above it (bottom-20) on the same edge, not silently drift onto the same spot.
  it("positions the trigger above BetaFeedbackButton's corner, not on top of it", () => {
    render(<ChatbotLauncher user={user} routePath="/dashboard" moduleName="Dashboard" />);
    const trigger = screen.getByRole("button", { name: "Open AXXESS Copilot" });
    expect(trigger.className).toContain("bottom-20");
    expect(trigger.className).toContain("right-5");
    expect(trigger.className).toContain("z-50");
  });
});
