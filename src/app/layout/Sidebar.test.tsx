import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../auth/AuthProvider";
import { Sidebar } from "./Sidebar";

function stubAuthenticatedSession() {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
    user: {
      id: "user_1",
      organizationId: "org_1",
      role: "Super Admin",
      email: "admin@example.com",
    },
  }), { status: 200 })));
}

describe("Sidebar (Sprint 4 -- badge/count consistency, F-020)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("does not show fabricated tenant-count badges (Social Alerts, Approvals) outside Demo Mode", async () => {
    stubAuthenticatedSession();

    render(
      <AuthProvider>
        <Sidebar active="dashboard" sidebarOpen onSelectSection={() => {}} onToggleSidebar={() => {}} />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText("Social Alerts")).toBeInTheDocument());
    expect(screen.getByText("Approvals & Governance")).toBeInTheDocument();

    // Neither hardcoded count ("4" for Social Alerts, "23" for Approvals) is backed by a live
    // repository (see DEMO_DATA_LEAKAGE_AUDIT.md) -- a live tenant must never see them.
    expect(screen.queryByText("4")).not.toBeInTheDocument();
    expect(screen.queryByText("23")).not.toBeInTheDocument();
    // The "AI" badge is a static feature tag, not a tenant count, and must still show.
    expect(screen.getByText("AI")).toBeInTheDocument();
  });

  it("shows the seeded demo counts once Demo Mode is explicitly enabled", async () => {
    stubAuthenticatedSession();
    window.localStorage.setItem("axxess.demoMode.enabled", "true");

    render(
      <AuthProvider>
        <Sidebar active="dashboard" sidebarOpen onSelectSection={() => {}} onToggleSidebar={() => {}} />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText("Social Alerts")).toBeInTheDocument());
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("23")).toBeInTheDocument();
  });
});
