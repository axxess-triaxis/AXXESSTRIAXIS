import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../auth/AuthProvider";
import { ApprovalsSection } from "./ApprovalsSection";

describe("ApprovalsSection (Sprint 3 -- does not hang, F-010)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("renders its content immediately, with no unresolved loading gate blocking the page", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ user: null }), { status: 401 })));

    render(
      <AuthProvider>
        <ApprovalsSection />
      </AuthProvider>,
    );

    expect(await screen.findByText("Approvals & Governance")).toBeInTheDocument();
    expect(screen.queryByText(/^Loading/)).not.toBeInTheDocument();
  });

  it("shows the honest not-yet-connected empty state outside Demo Mode, not a spinner", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ user: null }), { status: 401 })));

    render(
      <AuthProvider>
        <ApprovalsSection />
      </AuthProvider>,
    );

    expect(await screen.findByText(/live approvals workflow isn't wired/i)).toBeInTheDocument();
  });
});
