import { afterEach, describe, expect, it, vi } from "vitest";
import { clearPendingCall, readPendingCall, savePendingCall } from "./pendingCall";

const NOW = new Date("2026-11-13T10:00:00Z");

describe("pendingCall", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("remembers the lead dialled and when", () => {
    savePendingCall({ leadId: "l1", title: "Personal - Rita" }, NOW);
    expect(readPendingCall(new Date(NOW.getTime() + 5 * 60_000))).toEqual({ leadId: "l1", title: "Personal - Rita", startedAt: NOW.toISOString() });
  });

  it("drops a pending call older than 2 hours", () => {
    savePendingCall({ leadId: "l1", title: "Rita" }, NOW);
    expect(readPendingCall(new Date(NOW.getTime() + 2 * 3_600_000 + 1))).toBeNull();
    expect(window.sessionStorage.getItem("axxess.pendingCall")).toBeNull();
  });

  it("clears it", () => {
    savePendingCall({ leadId: "l1", title: "Rita" }, NOW);
    clearPendingCall();
    expect(readPendingCall(NOW)).toBeNull();
  });

  it("returns null for bad stored data or a blocked store", () => {
    window.sessionStorage.setItem("axxess.pendingCall", "{not json");
    expect(readPendingCall(NOW)).toBeNull();
    window.sessionStorage.setItem("axxess.pendingCall", JSON.stringify({ leadId: 3 }));
    expect(readPendingCall(NOW)).toBeNull();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(readPendingCall(NOW)).toBeNull();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(() => savePendingCall({ leadId: "l1", title: "Rita" }, NOW)).not.toThrow();
  });
});
