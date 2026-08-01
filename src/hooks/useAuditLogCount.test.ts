import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAuditLogCount } from "./useAuditLogCount";

describe("useAuditLogCount (Executive Dashboard Sprint ED-2)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const scope = { organizationId: "org_a", userId: "user_a", role: "Organization Admin" } as never;

  it("returns a real row count from the tenant-scoped audit_logs repository route", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: "1" }, { id: "2" }, { id: "3" }],
    }));

    const { result } = renderHook(() => useAuditLogCount(scope));

    await waitFor(() => expect(result.current).toBe(3));
  });

  it("is undefined (not yet loaded) rather than a fabricated 0 before the fetch resolves, without a scope", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useAuditLogCount(undefined));

    expect(result.current).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stays undefined (not a fabricated 0) on a failed fetch -- 'don't know' is not 'genuinely zero'", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    const { result } = renderHook(() => useAuditLogCount(scope));

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(result.current).toBeUndefined();
  });
});
