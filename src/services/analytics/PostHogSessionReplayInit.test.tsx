import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import posthog from "posthog-js";
import { PostHogSessionReplayInit } from "./PostHogSessionReplayInit";

vi.mock("posthog-js", () => ({
  default: { __loaded: false, init: vi.fn() },
}));

describe("PostHogSessionReplayInit", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.mocked(posthog.init).mockClear();
    (posthog as unknown as { __loaded: boolean }).__loaded = false;
    delete (window as { Capacitor?: unknown }).Capacitor;
  });

  it("initializes posthog-js with the configured token and host on mount, with session recording enabled outside the native app", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test_token");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://us.i.posthog.com");

    render(<PostHogSessionReplayInit />);

    expect(posthog.init).toHaveBeenCalledWith("phc_test_token", {
      api_host: "https://us.i.posthog.com",
      defaults: "2026-05-30",
      disable_session_recording: false,
    });
  });

  // MN-5 (2026-08-23): the sprint's own required remediation for session replay potentially
  // capturing rendered documents/stakeholder PII/approval payloads/AI answers on mobile screens
  // with no per-route masking built yet -- session recording is disabled entirely inside the real
  // Capacitor app. Autocapture/named-event tracking are unaffected (already sanitized separately).
  it("disables session recording entirely inside the real Capacitor native app", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test_token");
    window.Capacitor = { isNativePlatform: () => true };

    render(<PostHogSessionReplayInit />);

    expect(posthog.init).toHaveBeenCalledWith("phc_test_token", expect.objectContaining({ disable_session_recording: true }));
  });

  it("keeps session recording enabled on desktop/mobile web (outside the native app)", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test_token");
    window.Capacitor = { isNativePlatform: () => false };

    render(<PostHogSessionReplayInit />);

    expect(posthog.init).toHaveBeenCalledWith("phc_test_token", expect.objectContaining({ disable_session_recording: false }));
  });

  it("falls back to the default US host when NEXT_PUBLIC_POSTHOG_HOST is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test_token");

    render(<PostHogSessionReplayInit />);

    expect(posthog.init).toHaveBeenCalledWith("phc_test_token", expect.objectContaining({
      api_host: "https://us.i.posthog.com",
    }));
  });

  it("does not initialize when no token is configured", () => {
    render(<PostHogSessionReplayInit />);

    expect(posthog.init).not.toHaveBeenCalled();
  });

  it("does not re-initialize if already loaded", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test_token");
    (posthog as unknown as { __loaded: boolean }).__loaded = true;

    render(<PostHogSessionReplayInit />);

    expect(posthog.init).not.toHaveBeenCalled();
  });
});
