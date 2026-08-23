import { afterEach, describe, expect, it } from "vitest";
import { isNativeMobileSurface } from "./isNativeMobileSurface";

// MN-1 (2026-08-23): the roadmap checklist requires tests proving a tablet breakpoint does not
// expose the desktop shell. isNativeMobileSurface() has no viewport-width branch at all (unlike
// useIsMobile()'s 768px matchMedia check) -- it is purely "are we inside the Capacitor native
// wrapper," so the same MobileShell renders for a tablet-sized Capacitor app as a phone-sized one.
// These tests prove that independence directly, at varying simulated window widths.
describe("isNativeMobileSurface", () => {
  afterEach(() => {
    delete (window as { Capacitor?: unknown }).Capacitor;
  });

  it("returns false when window.Capacitor is absent, regardless of viewport width", () => {
    Object.defineProperty(window, "innerWidth", { value: 1024, configurable: true });
    expect(isNativeMobileSurface()).toBe(false);
  });

  it("returns true when Capacitor reports a native platform, at a phone-sized viewport", () => {
    Object.defineProperty(window, "innerWidth", { value: 375, configurable: true });
    window.Capacitor = { isNativePlatform: () => true };
    expect(isNativeMobileSurface()).toBe(true);
  });

  it("returns true when Capacitor reports a native platform, at a tablet-sized viewport -- proving tablet width alone never falls back to the desktop shell", () => {
    Object.defineProperty(window, "innerWidth", { value: 1024, configurable: true });
    window.Capacitor = { isNativePlatform: () => true };
    expect(isNativeMobileSurface()).toBe(true);
  });

  it("returns false when Capacitor is present but reports a web platform", () => {
    window.Capacitor = { isNativePlatform: () => false };
    expect(isNativeMobileSurface()).toBe(false);
  });
});
