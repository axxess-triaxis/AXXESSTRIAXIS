import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFacebookLoginStatus } from "./useFacebookLoginStatus";

// A-95 (2026-08-04): client-side-only status check against the Facebook JS SDK loaded in
// layout.tsx. The SDK script loads asynchronously (afterInteractive strategy), so the hook polls
// for window.FB rather than assuming it's present on first render. These tests exercise: the
// pre-SDK-load state, resolving once window.FB appears, reacting to auth.statusChange, cleanup on
// unmount, and giving up after the poll timeout so it never spins forever if the SDK never loads.
describe("useFacebookLoginStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    delete (window as { FB?: unknown }).FB;
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (window as { FB?: unknown }).FB;
  });

  it("starts as unavailable before the SDK has loaded", () => {
    const { result } = renderHook(() => useFacebookLoginStatus());
    expect(result.current).toBe("unavailable");
  });

  it("resolves to the real status once window.FB appears", () => {
    const { result } = renderHook(() => useFacebookLoginStatus());

    act(() => {
      window.FB = {
        getLoginStatus: (callback) => callback({ status: "connected", authResponse: { userID: "123" } }),
        Event: { subscribe: vi.fn(), unsubscribe: vi.fn() },
      };
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe("connected");
  });

  it("updates when the SDK fires auth.statusChange", () => {
    let statusChangeHandler: ((response: { status: string }) => void) | undefined;
    const { result } = renderHook(() => useFacebookLoginStatus());

    act(() => {
      window.FB = {
        getLoginStatus: (callback) => callback({ status: "not_authorized" }),
        Event: {
          subscribe: (event, callback) => {
            if (event === "auth.statusChange") statusChangeHandler = callback;
          },
          unsubscribe: vi.fn(),
        },
      };
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe("not_authorized");

    act(() => {
      statusChangeHandler?.({ status: "connected" });
    });

    expect(result.current).toBe("connected");
  });

  it("stops polling and stays unavailable if the SDK never loads", () => {
    const { result } = renderHook(() => useFacebookLoginStatus());

    act(() => {
      vi.advanceTimersByTime(20 * 500);
    });

    expect(result.current).toBe("unavailable");
  });

  it("unsubscribes on unmount without throwing", () => {
    const unsubscribe = vi.fn();
    const { unmount } = renderHook(() => useFacebookLoginStatus());

    act(() => {
      window.FB = {
        getLoginStatus: (callback) => callback({ status: "connected" }),
        Event: { subscribe: vi.fn(), unsubscribe },
      };
      vi.advanceTimersByTime(500);
    });

    expect(() => unmount()).not.toThrow();
    expect(unsubscribe).toHaveBeenCalledWith("auth.statusChange", expect.any(Function));
  });
});
