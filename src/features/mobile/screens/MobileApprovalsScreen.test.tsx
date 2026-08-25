import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MobileBackHandlerProvider } from "../MobileBackHandlerContext";
import { MobileApprovalsScreen } from "./MobileApprovalsScreen";

// MN-2 (2026-08-23): approvalRequestsRepository is service-role-key-gated -- confirmed during MN-2
// research this must never be imported directly into client/mobile code. This screen only ever
// talks to GET/PATCH /api/approvals, the same routes desktop ApprovalsSection.tsx uses, so its tests
// mock fetch rather than a repository.
describe("MobileApprovalsScreen (MN-2)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    // jsdom has no matchMedia implementation at all -- this screen's useMobileTabletLayout() calls
    // it on mount, so it needs a stub here (no global polyfill exists in src/test/setup.ts).
    window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaQueryList);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("shows an honest empty state when there are no approvals", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ approvals: [] }) });
    render(<MobileBackHandlerProvider><MobileApprovalsScreen /></MobileBackHandlerProvider>);
    await waitFor(() => expect(screen.getByText("No approvals")).toBeInTheDocument());
  });

  it("lists real pending approvals fetched from GET /api/approvals", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ approvals: [{ id: "a1", title: "Approve pilot MOU spend", priority: "high", status: "pending", createdAt: new Date().toISOString() }] }),
    });
    render(<MobileBackHandlerProvider><MobileApprovalsScreen /></MobileBackHandlerProvider>);
    await waitFor(() => expect(screen.getByText("Approve pilot MOU spend")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith("/api/approvals", { credentials: "include" });
  });

  it("requires a decision reason before rejecting, matching PATCH /api/approvals/[id]'s own validation", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ approvals: [{ id: "a1", title: "Approve pilot MOU spend", priority: "high", status: "pending", createdAt: new Date().toISOString() }] }),
    });
    render(<MobileBackHandlerProvider><MobileApprovalsScreen /></MobileBackHandlerProvider>);
    await waitFor(() => expect(screen.getByText("Approve pilot MOU spend")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Approve pilot MOU spend"));
    fireEvent.click(screen.getByText("Reject"));

    expect(await screen.findByText("A reason is required to reject.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("PATCHes /api/approvals/[id] with credentials included when approving", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ approvals: [{ id: "a1", title: "Approve pilot MOU spend", priority: "high", status: "pending", createdAt: new Date().toISOString() }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ approval: { id: "a1", status: "approved" } }) });

    render(<MobileBackHandlerProvider><MobileApprovalsScreen /></MobileBackHandlerProvider>);
    await waitFor(() => expect(screen.getByText("Approve pilot MOU spend")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Approve pilot MOU spend"));
    fireEvent.click(screen.getByText("Approve"));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/approvals/a1",
      expect.objectContaining({ method: "PATCH", credentials: "include" }),
    ));
  });
});
