import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { adminActionFetch, useAdminAction } from "./useAdminAction";

describe("useAdminAction", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports the action's resolved message once settled", async () => {
    const { result } = renderHook(() => useAdminAction());
    let received = "";

    act(() => {
      result.current.run(async () => "Action completed.", (message) => {
        received = message;
      });
    });

    await waitFor(() => expect(received).toBe("Action completed."));
  });

  it("falls back to a readable message when the action throws", async () => {
    const { result } = renderHook(() => useAdminAction());
    let received = "";

    act(() => {
      result.current.run(async () => {
        throw new Error("boom");
      }, (message) => {
        received = message;
      });
    });

    await waitFor(() => expect(received).toBe("The action could not be completed. Please try again."));
  });
});

describe("adminActionFetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the parsed JSON body on a successful response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ decision: "approved" }),
    }));

    const data = await adminActionFetch("/api/example");
    expect(data).toEqual({ decision: "approved" });
  });

  it("throws the server's error message when the response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: "Forbidden." }),
    }));

    await expect(adminActionFetch("/api/example")).rejects.toThrow("Forbidden.");
  });

  it("falls back to a generic message when the error body has no error field", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    }));

    await expect(adminActionFetch("/api/example")).rejects.toThrow("Request failed (500).");
  });
});
