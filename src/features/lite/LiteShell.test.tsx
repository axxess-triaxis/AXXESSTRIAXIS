import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LiteShell } from "./LiteShell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/lite",
}));

const mockLogout = vi.fn().mockResolvedValue(undefined);

vi.mock("../../auth/AuthProvider", () => ({
  useAuth: () => ({
    session: { status: "authenticated", source: "supabase-auth", user: { id: "user-1", organizationId: "org-1", role: "Employee", displayName: "Asha Verma", avatarInitials: "AV", email: "asha@example.com" } },
    logout: mockLogout,
  }),
}));

describe("LiteShell", () => {
  it("renders AXXESS Lite's own nav, not X0's Sidebar/TopBar chrome", () => {
    render(
      <LiteShell>
        <div>Lite page content</div>
      </LiteShell>,
    );

    expect(screen.getByText("AXXESS Lite")).toBeInTheDocument();
    expect(screen.getByText("Lite page content")).toBeInTheDocument();

    // AXXESS Lite's own small nav (8 items, the XL-2 production navigation contract), not X0's
    // role-aware nav groups (Overview, Operations, Intelligence, Relationships, Governance, Admin
    // from src/app/navigation.ts).
    expect(screen.getByRole("navigation", { name: "AXXESS Lite navigation" })).toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Work")).toBeInTheDocument();
    expect(screen.getByText("Meetings")).toBeInTheDocument();
    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.getByText("People")).toBeInTheDocument();
    expect(screen.getByText("Files")).toBeInTheDocument();
    expect(screen.getByText("Ask AXXESS")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();

    // X0-only vocabulary must never appear inside the Lite shell.
    expect(screen.queryByText("Executive Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Beta Readiness")).not.toBeInTheDocument();
    expect(screen.queryByText("Organization Admin")).not.toBeInTheDocument();
    expect(screen.queryByText("Tenant Health Command Center")).not.toBeInTheDocument();

    // XL-2 production navigation contract Hard Boundaries #4-#7: Golden Path, Social Alerts,
    // Agentic MCP admin, and the full integration catalogue must never render in the Lite shell.
    expect(screen.queryByText("Social Alerts")).not.toBeInTheDocument();
    expect(screen.queryByText("Agent Connections")).not.toBeInTheDocument();
    expect(screen.queryByText(/enterprise golden path/i)).not.toBeInTheDocument();
  });

  it("has a working sign-out control -- 2026-08-28: founder found Lite had none, anywhere", () => {
    mockLogout.mockClear();
    render(
      <LiteShell>
        <div>Lite page content</div>
      </LiteShell>,
    );

    const signOutButton = screen.getByRole("button", { name: "Sign out" });
    expect(signOutButton).toBeInTheDocument();

    fireEvent.click(signOutButton);
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it("shows a sign-in prompt, not the shell, when unauthenticated", async () => {
    vi.resetModules();
    vi.doMock("../../auth/AuthProvider", () => ({
      useAuth: () => ({ session: { status: "unauthenticated", source: "supabase-auth", user: null } }),
    }));
    const { LiteShell: LiteShellUnauth } = await import("./LiteShell");

    render(
      <LiteShellUnauth>
        <div>Lite page content</div>
      </LiteShellUnauth>,
    );

    expect(screen.getByText("Sign in to use AXXESS Lite")).toBeInTheDocument();
    expect(screen.queryByText("Lite page content")).not.toBeInTheDocument();
  });
});
