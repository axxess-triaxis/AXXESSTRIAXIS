import { afterEach, describe, expect, it } from "vitest";
import { phoneAuthEnabled } from "./authApi";

describe("phoneAuthEnabled", () => {
  const originalValue = process.env.NEXT_PUBLIC_AUTH_PHONE_ENABLED;

  afterEach(() => {
    if (originalValue === undefined) delete process.env.NEXT_PUBLIC_AUTH_PHONE_ENABLED;
    else process.env.NEXT_PUBLIC_AUTH_PHONE_ENABLED = originalValue;
  });

  it("is disabled by default when the env var is unset", () => {
    delete process.env.NEXT_PUBLIC_AUTH_PHONE_ENABLED;
    expect(phoneAuthEnabled()).toBe(false);
  });

  it("is disabled for any value other than the literal string 'true'", () => {
    process.env.NEXT_PUBLIC_AUTH_PHONE_ENABLED = "1";
    expect(phoneAuthEnabled()).toBe(false);
  });

  it("is enabled once explicitly set to 'true'", () => {
    process.env.NEXT_PUBLIC_AUTH_PHONE_ENABLED = "true";
    expect(phoneAuthEnabled()).toBe(true);
  });
});
