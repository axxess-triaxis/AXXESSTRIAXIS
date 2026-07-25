import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePendingAiReviewCount } from "./usePendingAiReviewCount";

describe("usePendingAiReviewCount (Executive Dashboard Sprint ED-2)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const scope = { organizationId: "org_a", userId: "user_a", role: "Organization Admin" } as never;

  it("counts only pending reviews from the real /api/ai/reviews response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        reviews: [
          { status: "pending" },
          { status: "approved" },
          { status: "pending" },
          { status: "rejected" },
        ],
      }),
    }));

    const { result } = renderHook(() => usePendingAiReviewCount(scope));

    await waitFor(() => expect(result.current).toBe(2));
  });

  it("stays 0 without a scope, never fetching", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => usePendingAiReviewCount(undefined));

    expect(result.current).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to 0 on a failed fetch rather than throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    const { result } = renderHook(() => usePendingAiReviewCount(scope));

    await waitFor(() => expect(result.current).toBe(0));
  });
});
