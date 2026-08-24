import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = {
  user: { id: "admin-1", organizationId: "org-1", role: "Organization Admin" as const },
  users: [] as { id: string; displayName: string; email: string; avatarInitials: string; role: string; status: string; createdAt: string; updatedAt: string }[],
  invitations: [] as { id: string; email: string; role: string; status: string; expiresAt: string }[],
};

const { updateUser, updateInvitation } = vi.hoisted(() => ({
  updateUser: vi.fn(async (_scope: unknown, id: string, input: Record<string, unknown>) => {
    const found = state.users.find((u) => u.id === id)!;
    return { ...found, ...input };
  }),
  updateInvitation: vi.fn(async () => undefined),
}));

vi.mock("../../../auth/AuthProvider", () => ({
  useAuth: () => ({ session: { user: state.user, status: "authenticated" } }),
}));
vi.mock("../../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
}));
// EmptyState (rendered here whenever no user is selected) imports trackEvent directly from this
// module, alongside this panel's own useAnalytics() call -- both must be present or EmptyState's
// own mount effect throws.
vi.mock("../../../services/analytics", () => ({ useAnalytics: () => ({ trackEvent: vi.fn() }), trackEvent: vi.fn() }));
vi.mock("../../../providers/serviceProvider", () => ({
  applicationServices: {
    usersRepository: { listByOrganization: async () => state.users, update: updateUser },
    invitationsRepository: { listPending: async () => state.invitations, update: updateInvitation },
  },
}));

import { MobileBackHandlerProvider } from "../MobileBackHandlerContext";
import { MobileSettingsTeamPanel } from "./MobileSettingsTeamPanel";

function renderPanel() {
  return render(<MobileBackHandlerProvider><MobileSettingsTeamPanel /></MobileBackHandlerProvider>);
}

// MN-7 (2026-08-24): native port of desktop SettingsSection.tsx's UserAdministration -- same
// repository/route calls, restructured as list->detail. `canManageUsers` reproduces desktop's own
// inline RBAC check verbatim (see MobileSettingsTeamPanel.tsx's own comment) -- these tests lock in
// that the write affordances are actually gated by it, not just present.
describe("MobileSettingsTeamPanel (MN-7)", () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaQueryList);
    state.users = [{ id: "u1", displayName: "Bikash Deka", email: "bikash@axxess.dev", avatarInitials: "BD", role: "Employee", status: "active", createdAt: "2026-01-01", updatedAt: "2026-01-01" }];
    state.invitations = [{ id: "i1", email: "new@axxess.dev", role: "Employee", status: "pending", expiresAt: "2026-09-01" }];
  });

  afterEach(() => {
    state.user = { id: "admin-1", organizationId: "org-1", role: "Organization Admin" };
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("lists real users and pending invitations from the repositories", async () => {
    renderPanel();
    await waitFor(() => expect(screen.getByText("Bikash Deka")).toBeInTheDocument());
    expect(screen.getByText("new@axxess.dev")).toBeInTheDocument();
  });

  it("admin: invites a user via POST /api/invitations", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ emailDelivery: "sent" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    renderPanel();
    await waitFor(() => expect(screen.getByText("Bikash Deka")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Invite user"));
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "fresh@axxess.dev" } });
    fireEvent.click(screen.getByText("Invite"));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/invitations", expect.objectContaining({ method: "POST" })));
    expect(JSON.parse(String(fetchMock.mock.calls[0][1].body))).toEqual({ email: "fresh@axxess.dev", role: "Employee" });
  });

  it("admin: changes a user's role via usersRepository.update", async () => {
    renderPanel();
    await waitFor(() => expect(screen.getByText("Bikash Deka")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Bikash Deka"));
    await waitFor(() => expect(screen.getByDisplayValue("Employee")).toBeInTheDocument());
    fireEvent.change(screen.getByDisplayValue("Employee"), { target: { value: "Manager" } });
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith(expect.anything(), "u1", { role: "Manager" }));
  });

  it("admin: suspends a user through the confirm dialog", async () => {
    renderPanel();
    await waitFor(() => expect(screen.getByText("Bikash Deka")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Bikash Deka"));
    await waitFor(() => expect(screen.getByText("Disable")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Disable"));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Disable" }));
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith(expect.anything(), "u1", { status: "suspended" }));
  });

  it("non-admin: hides the invite control and disables write affordances on the roster", async () => {
    state.user = { id: "emp-1", organizationId: "org-1", role: "Employee" };
    renderPanel();
    await waitFor(() => expect(screen.getByText("Bikash Deka")).toBeInTheDocument());

    expect(screen.queryByText("Invite user")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Bikash Deka"));
    await waitFor(() => expect(screen.getByText("Your role can view users but cannot modify access.")).toBeInTheDocument());
    expect(screen.getByDisplayValue("Employee")).toBeDisabled();
    expect(screen.getByText("Disable")).toBeDisabled();
  });

  it("revokes a pending invitation via invitationsRepository.update", async () => {
    renderPanel();
    await waitFor(() => expect(screen.getByText("new@axxess.dev")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Revoke"));
    await waitFor(() => expect(updateInvitation).toHaveBeenCalledWith(expect.anything(), "i1", { status: "revoked" }));
  });

  it("falls back to the PATCH route when the repository revoke call rejects", async () => {
    updateInvitation.mockRejectedValueOnce(new Error("down"));
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    renderPanel();
    await waitFor(() => expect(screen.getByText("new@axxess.dev")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Revoke"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/repositories/invitations?id=i1", expect.objectContaining({ method: "PATCH" })));
  });
});
