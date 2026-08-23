import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MobileBackHandlerProvider, useRegisterMobileBackHandler } from "./MobileBackHandlerContext";
import { useMobileBackButton } from "./useMobileBackButton";

type CapturedListener = (event: { canGoBack: boolean }) => void;

function stubCapacitorApp() {
  let captured: CapturedListener | undefined;
  const addListener = vi.fn((_event: string, cb: CapturedListener) => {
    captured = cb;
    return Promise.resolve({ remove: vi.fn() });
  });
  const minimizeApp = vi.fn(() => Promise.resolve());
  window.Capacitor = { isNativePlatform: () => true, Plugins: { App: { addListener, minimizeApp } } };
  return { addListener, minimizeApp, fire: () => captured?.({ canGoBack: true }) };
}

function Harness({ isAtHome, goHome, screenHandler }: { isAtHome: boolean; goHome: () => void; screenHandler?: () => boolean }) {
  useMobileBackButton(isAtHome, goHome);
  // Rules of Hooks: always call the hook, with a false-returning no-op standing in for "nothing
  // registered" when the test doesn't pass a screenHandler -- equivalent to the real screens'
  // behavior where no handler is registered at all, but without a conditional hook call here.
  useRegisterMobileBackHandler(screenHandler ?? (() => false));
  return null;
}

// MN-4 (2026-08-23): proves the exact precedence order the sprint prompt specifies -- a registered
// screen handler first, then tab-level "go to Home," then App.minimizeApp() at the true root --
// and that this whole mechanism is a no-op outside the real Capacitor app (no accidental listener,
// no accidental minimize, on desktop/mobile web).
describe("useMobileBackButton (MN-4)", () => {
  afterEach(() => {
    delete (window as { Capacitor?: unknown }).Capacitor;
  });

  it("never registers a native listener outside the real Capacitor app", () => {
    const goHome = vi.fn();
    render(
      <MobileBackHandlerProvider>
        <Harness isAtHome={false} goHome={goHome} />
      </MobileBackHandlerProvider>,
    );
    expect(window.Capacitor).toBeUndefined();
  });

  it("defers to the currently registered screen handler first, and does not fall through to Home when it reports it handled the press", async () => {
    const { addListener, minimizeApp, fire } = stubCapacitorApp();
    const goHome = vi.fn();
    const screenHandler = vi.fn(() => true);

    render(
      <MobileBackHandlerProvider>
        <Harness isAtHome={false} goHome={goHome} screenHandler={screenHandler} />
      </MobileBackHandlerProvider>,
    );
    await waitFor(() => expect(addListener).toHaveBeenCalledWith("backButton", expect.any(Function)));

    fire();

    expect(screenHandler).toHaveBeenCalled();
    expect(goHome).not.toHaveBeenCalled();
    expect(minimizeApp).not.toHaveBeenCalled();
  });

  it("falls through to tab-level 'go to Home' when nothing is registered and the app is not already on Home", async () => {
    const { addListener, minimizeApp, fire } = stubCapacitorApp();
    const goHome = vi.fn();

    render(
      <MobileBackHandlerProvider>
        <Harness isAtHome={false} goHome={goHome} />
      </MobileBackHandlerProvider>,
    );
    await waitFor(() => expect(addListener).toHaveBeenCalled());

    fire();

    expect(goHome).toHaveBeenCalledTimes(1);
    expect(minimizeApp).not.toHaveBeenCalled();
  });

  it("minimizes the app (never exitApp, never logout) when already on Home with nothing left to pop", async () => {
    const { addListener, minimizeApp, fire } = stubCapacitorApp();
    const goHome = vi.fn();

    render(
      <MobileBackHandlerProvider>
        <Harness isAtHome={true} goHome={goHome} />
      </MobileBackHandlerProvider>,
    );
    await waitFor(() => expect(addListener).toHaveBeenCalled());

    fire();

    expect(minimizeApp).toHaveBeenCalledTimes(1);
    expect(goHome).not.toHaveBeenCalled();
  });

  it("falls through to Home when the registered screen handler reports it had nothing to pop (returns false)", async () => {
    const { addListener, minimizeApp, fire } = stubCapacitorApp();
    const goHome = vi.fn();
    const screenHandler = vi.fn(() => false);

    render(
      <MobileBackHandlerProvider>
        <Harness isAtHome={false} goHome={goHome} screenHandler={screenHandler} />
      </MobileBackHandlerProvider>,
    );
    await waitFor(() => expect(addListener).toHaveBeenCalled());

    fire();

    expect(screenHandler).toHaveBeenCalled();
    expect(goHome).toHaveBeenCalledTimes(1);
    expect(minimizeApp).not.toHaveBeenCalled();
  });
});
