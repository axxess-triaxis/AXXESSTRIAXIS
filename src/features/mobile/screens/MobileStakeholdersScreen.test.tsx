import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = {
  user: { id: "user-1", organizationId: "org-1", role: "Employee" as const },
  stakeholders: [] as { id: string; organizationId: string; name: string; affiliation: string; influenceScore: number; engagementLevel: string }[],
};

vi.mock("../../../auth/AuthProvider", () => ({
  useAuth: () => ({ session: { user: state.user, status: "authenticated" } }),
}));
vi.mock("../../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
}));
vi.mock("../../../providers/serviceProvider", () => ({
  applicationServices: {
    stakeholdersRepository: { list: async () => state.stakeholders },
  },
}));

import { MobileStakeholdersScreen } from "./MobileStakeholdersScreen";

describe("MobileStakeholdersScreen (MN-2)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ notes: [] }) });
    // jsdom has no matchMedia implementation at all -- this screen's useMobileTabletLayout() calls
    // it on mount, so it needs a stub here (no global polyfill exists in src/test/setup.ts).
    window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaQueryList);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    state.stakeholders = [];
  });

  it("shows the real, honest engagementLevel default ('Not yet rated') and never a fabricated influence score", async () => {
    state.stakeholders = [{ id: "s1", organizationId: "org-1", name: "Dr. Priya Sharma", affiliation: "NE Health Mission", influenceScore: 0, engagementLevel: "unrated" }];
    render(<MobileStakeholdersScreen />);
    await waitFor(() => expect(screen.getByText("Dr. Priya Sharma")).toBeInTheDocument());
    expect(screen.getByText(/Not yet rated/)).toBeInTheDocument();
    expect(screen.queryByText(/influence score/i)).not.toBeInTheDocument();
  });

  it("posts a real quick note to POST /api/stakeholders/notes with credentials included", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ notes: [] }) });
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ note: { id: "n1", title: "Follow-up call", body: "Discussed renewal timeline.", createdAt: new Date().toISOString() } }) });

    render(<MobileStakeholdersScreen />);
    await waitFor(() => expect(screen.getByText("New quick note")).toBeInTheDocument());

    fireEvent.click(screen.getByText("New quick note"));
    fireEvent.change(screen.getByPlaceholderText("Note title"), { target: { value: "Follow-up call" } });
    fireEvent.change(screen.getByPlaceholderText("Note details…"), { target: { value: "Discussed renewal timeline." } });
    fireEvent.click(screen.getByText("Save note"));

    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/stakeholders/notes",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    ));
  });
});
