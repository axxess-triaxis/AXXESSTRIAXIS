import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingsSection } from "./SettingsSection";

// A-84 (2026-08-02): the "Linked sign-in methods" section is the real fix for the tenant-identity-
// linking bug -- an already-authenticated user attaches a phone number to their EXISTING account
// so a future phone-only sign-in resolves to the same tenant instead of creating a duplicate one.
const state = {
  phone: undefined as string | undefined,
};

vi.mock("../../auth/AuthProvider", () => ({
  useAuth: () => ({
    session: {
      status: "authenticated",
      source: "supabase-auth",
      user: { id: "user-1", organizationId: "org-1", role: "Organization Admin", displayName: "Founder", email: "founder@axxess.dev", phone: state.phone },
    },
    updateProfile: vi.fn(),
  }),
}));

vi.mock("../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
}));

vi.mock("../../providers/serviceProvider", () => ({
  applicationServices: {
    organizationsRepository: { getById: async () => undefined },
    projectsRepository: { list: async () => [] },
    documentsRepository: { list: async () => [] },
  },
}));

vi.mock("../../services/analytics", () => ({
  useAnalytics: () => ({ trackEvent: vi.fn() }),
}));

function setProfileTab() {
  window.history.pushState({}, "", "/settings?tab=profile");
}

describe("Linked sign-in methods (A-84)", () => {
  afterEach(() => {
    state.phone = undefined;
    vi.unstubAllGlobals();
  });

  it("shows a 'no phone linked yet' prompt when the user has none", () => {
    setProfileTab();
    render(<SettingsSection />);
    expect(screen.getByText(/Link a phone number to sign in with it directly/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send code" })).toBeInTheDocument();
  });

  it("shows the currently linked phone number when one exists", () => {
    state.phone = "+911234567890";
    setProfileTab();
    render(<SettingsSection />);
    expect(screen.getByText(/Phone sign-in is linked to/)).toBeInTheDocument();
    expect(screen.getByText("+911234567890")).toBeInTheDocument();
  });

  it("sends a code via /api/auth/phone/link/start, then verifies via /api/auth/phone/link/verify", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: { id: "user-1" } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    setProfileTab();
    render(<SettingsSection />);

    fireEvent.change(screen.getByPlaceholderText("+91 XXXXX XXXXX"), { target: { value: "+911234567890" } });
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Verify" })).toBeInTheDocument());
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/auth/phone/link/start", expect.objectContaining({ method: "POST" }));

    fireEvent.change(screen.getByPlaceholderText("Enter code"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    await waitFor(() => expect(screen.getByText(/Phone number linked/)).toBeInTheDocument());
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({ phone: "+911234567890", token: "123456" });
  });

  it("shows the real error (e.g. already claimed by a stray identity) rather than swallowing it", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "A user with this phone number already exists" }), { status: 502 }));
    vi.stubGlobal("fetch", fetchMock);
    setProfileTab();
    render(<SettingsSection />);

    fireEvent.change(screen.getByPlaceholderText("+91 XXXXX XXXXX"), { target: { value: "+911234567890" } });
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));
    await waitFor(() => expect(screen.getByText("A user with this phone number already exists")).toBeInTheDocument());
  });
});
