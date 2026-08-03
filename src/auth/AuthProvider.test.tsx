import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthProvider";
import { demoSessionCookieName, setDemoModeEnabled } from "../demo/demoMode";

const clearLiveWorkspaceMetricsCacheMock = vi.fn();
vi.mock("../hooks/liveWorkspaceMetricsCache", () => ({
  clearLiveWorkspaceMetricsCache: () => clearLiveWorkspaceMetricsCacheMock(),
}));

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
    clearLiveWorkspaceMetricsCacheMock.mockClear();
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

  it("clears the tenant-scoped live-metrics dedup cache on logout, so a different user signing in next never reuses a stale entry (Sprint 5, F-021)", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/auth/session")) {
        return new Response(JSON.stringify({
          user: { id: "user_1", organizationId: "org_1", role: "Organization Admin", email: "admin@example.com" },
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

    expect(clearLiveWorkspaceMetricsCacheMock).toHaveBeenCalled();
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

  it("refreshes the edge-visible demo-session cookie on mount when the (non-expiring) demo-mode flag is already set, so a lapsed cookie never desyncs from a still-active localStorage flag (Attempt 4, 2026-07-24)", async () => {
    setDemoModeEnabled(true);
    document.cookie = `${demoSessionCookieName}=; path=/; max-age=0`;
    expect(document.cookie).not.toContain(`${demoSessionCookieName}=true`);

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("authed").textContent).toBe("yes"));
    expect(document.cookie).toContain(`${demoSessionCookieName}=true`);

    setDemoModeEnabled(false);
  });

  // 2026-08-01 incident: the focus/visibilitychange revalidation this test covered was removed --
  // it fired an extra concurrent /api/auth/session call on tab focus/navigation that could race
  // against a page's own parallel data-fetch calls on Supabase's single-use refresh token,
  // logging real users out of the app entirely. See serverSession.ts and AuthProvider.tsx for the
  // full incident note. This test asserts the mechanism is gone: focus/visibilitychange no longer
  // triggers any session re-check.
  it("does not re-check the session on tab focus/visibility return (removed 2026-08-01, see incident note)", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/auth/session")) {
        return new Response(JSON.stringify({
          user: { id: "user_1", organizationId: "org_1", role: "Organization Admin", email: "admin@example.com" },
        }), { status: 200 });
      }
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("authed").textContent).toBe("yes"));
    const callsAfterMount = fetchMock.mock.calls.length;

    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("focus"));
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(fetchMock.mock.calls.length).toBe(callsAfterMount);
    expect(screen.getByTestId("authed").textContent).toBe("yes");
  });
});
