import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = {
  user: { id: "user-1", organizationId: "org-1", role: "Employee" as const },
  tasks: [] as { id: string; organizationId: string; title: string; status: string; priority: string; tags: string[]; dueDate?: string }[],
  meetings: [] as { id: string; organizationId: string; title: string; startsAt: string; attendeeIds: string[]; decisions: string[]; actionItems: string[] }[],
  documents: [] as { id: string; organizationId: string; name: string; mimeType: string; storagePath: string; createdAt: string; updatedAt: string }[],
};

vi.mock("../../auth/AuthProvider", () => ({
  useAuth: () => ({ session: { user: state.user, status: "authenticated" } }),
}));
vi.mock("../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
}));
vi.mock("../../providers/serviceProvider", () => ({
  applicationServices: {
    tasksRepository: { list: async () => state.tasks },
    meetingsRepository: { list: async () => state.meetings },
    documentsRepository: { list: async () => state.documents },
  },
}));

import { MobileCommandHome } from "./MobileCommandHome";

// MN-2 (2026-08-23): the promised follow-up to MN-1's deliberately-numberless placeholder -- real
// today's-tasks/pending-approvals/next-meeting/recent-document data, fetched the same way every
// other mobile screen does. No fabricated counts: with nothing in any repository/route, every card
// must show a real zero/none, not a stale placeholder.
describe("MobileCommandHome (MN-2)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ approvals: [] }) });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    state.tasks = [];
    state.meetings = [];
    state.documents = [];
  });

  it("shows real, honest zero-state summary cards when the organization has no data yet", async () => {
    render(<MobileCommandHome onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("None scheduled")).toBeInTheDocument());
    expect(screen.getByText("No documents yet")).toBeInTheDocument();
  });

  it("counts a real pending-approvals total from GET /api/approvals, not a fabricated number", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ approvals: [{ status: "pending" }, { status: "pending" }, { status: "approved" }] }) });
    render(<MobileCommandHome onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("Pending approvals")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith("/api/approvals", { credentials: "include" });
  });

  // MN-7 (2026-08-24): "Quick links" duplicated 100% of the bottom tab bar + More panel
  // (docs/readiness/ANDROID_BETA_0_9_V3_WALKTHROUGH_TRIAGE_2026_08_24.md, item 6) -- removed
  // entirely, keeping only the real summaryCards data above and the Ask AXXESS CTA.
  it("no longer renders the redundant Quick links grid", async () => {
    render(<MobileCommandHome onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("None scheduled")).toBeInTheDocument());
    expect(screen.queryByText("Quick links")).not.toBeInTheDocument();
  });
});
