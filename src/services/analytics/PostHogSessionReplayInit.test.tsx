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
  });

  it("initializes posthog-js with the configured token and host on mount", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test_token");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://us.i.posthog.com");

    render(<PostHogSessionReplayInit />);

    expect(posthog.init).toHaveBeenCalledWith("phc_test_token", {
      api_host: "https://us.i.posthog.com",
      defaults: "2026-05-30",
    });
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
