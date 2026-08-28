import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Lite Settings real-modules pass (2026-08-27): proves the Lite Profile tab reuses AuthProvider's
// own updateProfile (no separate save path) and only ever writes the currently signed-in user's
// own profile -- no organization-wide or cross-user surface exists here.
const state = {
  user: {
    id: "user-1",
    organizationId: "org-1",
    role: "Employee" as const,
    displayName: "Asha Verma",
    email: "asha@example.com",
    avatarInitials: "AV",
    avatarPath: undefined as string | undefined,
    availability: "public" as const,
  },
  updateProfileCalls: [] as unknown[],
};

vi.mock("../../../auth/AuthProvider", () => ({
  useAuth: () => ({
    session: { user: state.user, status: "authenticated" },
    updateProfile: async (input: unknown) => {
      state.updateProfileCalls.push(input);
      return state.user;
    },
  }),
}));

import { LiteProfileSection } from "./LiteProfileSection";

describe("LiteProfileSection", () => {
  afterEach(() => {
    state.updateProfileCalls = [];
    vi.clearAllMocks();
  });

  it("renders the signed-in user's own profile fields, email read-only", () => {
    render(<LiteProfileSection />);
    expect(screen.getByDisplayValue("Asha Verma")).toBeInTheDocument();
    expect(screen.getByDisplayValue("asha@example.com")).toBeDisabled();
  });

  it("saves a display name change via AuthProvider's own updateProfile, not a new endpoint", async () => {
    render(<LiteProfileSection />);

    const nameInput = screen.getByDisplayValue("Asha Verma");
    fireEvent.change(nameInput, { target: { value: "Asha V. Verma" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(state.updateProfileCalls).toHaveLength(1));
    expect(state.updateProfileCalls[0]).toMatchObject({ displayName: "Asha V. Verma" });
  });

  it("shows a sign-in prompt, not a crash, when there is no session user", () => {
    state.user = null as unknown as typeof state.user;
    render(<LiteProfileSection />);
    expect(screen.getByText(/sign in to view your profile/i)).toBeInTheDocument();
    state.user = {
      id: "user-1",
      organizationId: "org-1",
      role: "Employee",
      displayName: "Asha Verma",
      email: "asha@example.com",
      avatarInitials: "AV",
      avatarPath: undefined,
      availability: "public",
    };
  });
});
