import { renderHook, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMobileTabletLayout } from "./useMobileTabletLayout";

function stubViewport(width: number) {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
  const listeners: (() => void)[] = [];
  // jsdom does not implement matchMedia at all -- this codebase has no global polyfill for it
  // (confirmed via src/test/setup.ts), so it's stubbed directly here rather than spied on.
  window.matchMedia = vi.fn().mockReturnValue({
    matches: width >= 768,
    media: "",
    onchange: null,
    addEventListener: (_: string, cb: () => void) => listeners.push(cb),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  } as unknown as MediaQueryList);
  return { fireChange: () => listeners.forEach((cb) => cb()) };
}

describe("useMobileTabletLayout (MN-2)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is false (phone layout) below the 768px tablet breakpoint", () => {
    stubViewport(390);
    const { result } = renderHook(() => useMobileTabletLayout());
    expect(result.current).toBe(false);
  });

  it("is true (tablet layout) at or above the 768px tablet breakpoint", () => {
    stubViewport(820);
    const { result } = renderHook(() => useMobileTabletLayout());
    expect(result.current).toBe(true);
  });

  it("responds to a live viewport resize via the matchMedia change listener", () => {
    const { fireChange } = stubViewport(390);
    const { result } = renderHook(() => useMobileTabletLayout());
    expect(result.current).toBe(false);

    act(() => {
      Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 900 });
      fireChange();
    });
    expect(result.current).toBe(true);
  });
});
