import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthProvider";

function Harness() {
  const { session, isAuthenticated, logout } = useAuth();
  return (
    <div>
      <span data-testid="status">{session.status}</span>
      <span data-testid="authed">{isAuthenticated ? "yes" : "no"}</span>
      <button onClick={() => void logout()}>sign out</button>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("clears authenticated state on logout and does not rehydrate a mock session (F-002 regression)", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/auth/session")) {
        return new Response(JSON.stringify({
          user: {
            id: "user_1",
            organizationId: "org_1",
            role: "Organization Admin",
            email: "admin@example.com",
          },
        }), { status: 200 });
      }
      if (url.includes("/api/auth/logout")) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    }));

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("authed").textContent).toBe("yes"));

    fireEvent.click(screen.getByText("sign out"));

    await waitFor(() => expect(screen.getByTestId("authed").textContent).toBe("no"));
    expect(screen.getByTestId("status").textContent).toBe("unauthenticated");

    // No further effect should silently restore an authenticated (mock or otherwise) session.
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(screen.getByTestId("authed").textContent).toBe("no");
    expect(screen.getByTestId("status").textContent).toBe("unauthenticated");
  });

  it("stays unauthenticated when the server reports no real session (client/server session agreement)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ user: null }), { status: 401 })));

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("unauthenticated"));
    expect(screen.getByTestId("authed").textContent).toBe("no");
  });
});
