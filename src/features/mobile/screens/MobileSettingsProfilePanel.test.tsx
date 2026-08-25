import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  source: "supabase-auth" as "supabase-auth" | "mock-rbac",
  user: {
    id: "user-1",
    organizationId: "org-1",
    role: "Employee" as const,
    displayName: "Ananya Rao",
    email: "ananya@axxess.dev",
    phone: undefined as string | undefined,
  },
};

const { updateProfile } = vi.hoisted(() => ({ updateProfile: vi.fn(async (input: Record<string, unknown>) => ({ ...state.user, ...input })) }));

vi.mock("../../../auth/AuthProvider", () => ({
  useAuth: () => ({ session: { status: "authenticated", source: state.source, user: state.user }, updateProfile }),
}));
vi.mock("../../../services/analytics", () => ({ useAnalytics: () => ({ trackEvent: vi.fn() }) }));

import { MobileSettingsProfilePanel } from "./MobileSettingsProfilePanel";

// MN-7 (2026-08-24): native port of desktop SettingsSection.tsx's ProfilePanel + LinkedPhoneSection
// + AgenticGateTogglePanel -- reuses the identical updateProfile/route/localStorage calls, so these
// tests mirror SettingsSection.linkedPhone.test.tsx's own assertions rather than inventing new
// behavior to verify.
describe("MobileSettingsProfilePanel (MN-7)", () => {
  afterEach(() => {
    state.source = "supabase-auth";
    state.user.phone = undefined;
    window.localStorage.clear();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("pre-fills the form from the current session user", () => {
    render(<MobileSettingsProfilePanel />);
    expect(screen.getByDisplayValue("Ananya Rao")).toBeInTheDocument();
    expect(screen.getByDisplayValue("ananya@axxess.dev")).toBeInTheDocument();
  });

  it("calls updateProfile with the edited field shape when Save Profile is tapped", async () => {
    render(<MobileSettingsProfilePanel />);
    fireEvent.change(screen.getByDisplayValue("Ananya Rao"), { target: { value: "Ananya R. Rao" } });
    fireEvent.click(screen.getByText("Save Profile"));
    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ displayName: "Ananya R. Rao", email: "ananya@axxess.dev" })));
    expect(await screen.findByText("Profile updated.")).toBeInTheDocument();
  });

  it("shows the linked-phone flow and hits the real start/verify routes", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: { id: "user-1" } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<MobileSettingsProfilePanel />);

    fireEvent.change(screen.getByPlaceholderText("+91 XXXXX XXXXX"), { target: { value: "+911234567890" } });
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Verify" })).toBeInTheDocument());
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/auth/phone/link/start", expect.objectContaining({ method: "POST" }));

    fireEvent.change(screen.getByPlaceholderText("Enter code"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    await waitFor(() => expect(screen.getByText(/Phone number linked/)).toBeInTheDocument());
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({ phone: "+911234567890", token: "123456" });
  });

  it("hides the linked-phone section for a mock-rbac (Investor Preview) session", () => {
    state.source = "mock-rbac";
    render(<MobileSettingsProfilePanel />);
    expect(screen.queryByText("Linked sign-in methods")).not.toBeInTheDocument();
  });

  it("flips the real Agentic Gate localStorage preference", () => {
    render(<MobileSettingsProfilePanel />);
    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "true");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(window.localStorage.getItem("axxess.agenticGate.enabled")).toBe("false");
  });
});
