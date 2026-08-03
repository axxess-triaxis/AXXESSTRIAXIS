import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWhatsAppLiveEvents } from "./useWhatsAppLiveEvents";

describe("useWhatsAppLiveEvents", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("never polls when disabled", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => useWhatsAppLiveEvents(false));
    await vi.advanceTimersByTimeAsync(60_000);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("polls on an interval and surfaces new events (deliberately polling, not a websocket subscription)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ events: [{ id: "evt-1", eventType: "message_inbound", receivedAt: "2026-08-02T00:00:00.000Z" }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useWhatsAppLiveEvents(true));
    expect(result.current.events).toEqual([]);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });

    expect(result.current.events.length).toBe(1);
    expect(result.current.events[0].id).toBe("evt-1");
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/whatsapp/events/recent?since="), expect.any(Object));
  });

  it("dismissing an event removes only that event from the local queue", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ events: [{ id: "evt-1", eventType: "message_inbound", receivedAt: "2026-08-02T00:00:00.000Z" }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useWhatsAppLiveEvents(true));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(result.current.events.length).toBe(1);

    act(() => result.current.dismiss("evt-1"));
    expect(result.current.events).toEqual([]);
  });

  it("stays on the last known cursor (no fabricated events) when a poll fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useWhatsAppLiveEvents(true));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });

    expect(result.current.events).toEqual([]);
  });
});
