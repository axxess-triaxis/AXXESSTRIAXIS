import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AuthPage from "./page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/auth",
  useRouter: () => ({ push: vi.fn() }),
}));

describe("/auth page", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("renders the real login form for a fresh browser with no session (F-001/F-003 regression)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ user: null }), { status: 401 })));

    render(<AuthPage />);

    expect(await screen.findByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open investor preview/i })).toBeInTheDocument();

    expect(screen.queryByText(/^signed in$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/is authenticated/i)).not.toBeInTheDocument();
  });
});
