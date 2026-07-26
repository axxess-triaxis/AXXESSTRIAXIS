import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// RAG Remediation Sprint 3 (A-60): mocking useAuth directly (rather than the real AuthProvider +
// a blanket fetch-based session stub) so both the unauthenticated path and a real authenticated
// session with real fetched approvals can be exercised in the same file without one approach
// fighting the other's session stubbing. vi.mock is hoisted and file-scoped in Vitest, so this
// single mock (reading from a mutable `state.user`) covers every test below.
const state = {
  user: null as null | { id: string; organizationId: string; role: string },
};

vi.mock("../../auth/AuthProvider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../auth/AuthProvider")>();
  return {
    ...actual,
    useAuth: () => ({ session: { user: state.user, status: state.user ? "authenticated" : "unauthenticated" } }),
  };
});

import { ApprovalsSection } from "./ApprovalsSection";

function stubApprovalsFetch(approvals: Array<Record<string, unknown>> = []) {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/api/approvals/export")) {
      return new Response(JSON.stringify({ ok: true, auditLogId: "audit-1" }), { status: 200 });
    }
    if (url.includes("/api/approvals")) {
      return new Response(JSON.stringify({ approvals }), { status: 200 });
    }
    return new Response(JSON.stringify({}), { status: 404 });
  }));
}

describe("ApprovalsSection (Sprint 3 -- does not hang, F-010)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
    state.user = null;
  });

  it("renders its content immediately, with no unresolved loading gate blocking the page", async () => {
    render(<ApprovalsSection />);

    expect(await screen.findByText("Approvals & Governance")).toBeInTheDocument();
    expect(screen.queryByText(/^Loading/)).not.toBeInTheDocument();
  });

  // RAG Remediation Sprint 3 (A-60 precondition): real approval_requests rows now exist (created
  // from an approved AI Review Inbox item) and this page fetches them for a live tenant instead of
  // showing an unconditional "not wired yet" message -- the old text is now stale/inaccurate and
  // is replaced with an honest empty state describing how a real approval request gets created.
  it("shows the honest empty state outside Demo Mode when there are no real approval requests yet, not a spinner", async () => {
    render(<ApprovalsSection />);

    expect(await screen.findByText(/No approval requests yet/i)).toBeInTheDocument();
  });
});

describe("ApprovalsSection live queue and Export Report (RAG Remediation Sprint 3, A-60)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
    state.user = null;
  });

  it("shows real approval requests fetched from the live endpoint", async () => {
    state.user = { id: "user-1", organizationId: "org-1", role: "Manager" };
    stubApprovalsFetch([{
      id: "approval-1",
      organizationId: "org-1",
      title: "Approve oxygen resilience escalation",
      status: "pending",
      priority: "high",
      createdAt: "2026-07-26T00:00:00.000Z",
    }]);

    render(<ApprovalsSection />);

    await waitFor(() => {
      expect(screen.getByText("Approve oxygen resilience escalation")).toBeInTheDocument();
    });
  });

  it("Export Report downloads a real JSON file and records a real audit event", async () => {
    state.user = { id: "user-1", organizationId: "org-1", role: "Manager" };
    stubApprovalsFetch([{
      id: "approval-1",
      organizationId: "org-1",
      title: "Approve oxygen resilience escalation",
      status: "pending",
      priority: "high",
      createdAt: "2026-07-26T00:00:00.000Z",
    }]);
    const createObjectURL = vi.fn(() => "blob:mock-url");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<ApprovalsSection />);
    await waitFor(() => expect(screen.getByText("Approve oxygen resilience escalation")).toBeInTheDocument());

    const exportButton = screen.getByRole("button", { name: /Export Report/i });
    expect(exportButton).not.toBeDisabled();
    fireEvent.click(exportButton);

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const [blob] = createObjectURL.mock.calls[0] as [Blob];
    expect(blob.type).toBe("application/json");
    expect(clickSpy).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.getByText(/Exported 1 approval record/i)).toBeInTheDocument();
    });

    clickSpy.mockRestore();
  });
});
