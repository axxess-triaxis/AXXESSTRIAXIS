import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// XL-6 (2026-08-06): proves LiteMeetingsSection has a real meeting create/list loop wired to the
// same meetingsRepository X0's MeetingsSection uses, and never invents a fake attendee UUID --
// attendeeIds is always sent empty, free-text attendee names fold into notes instead.
const state = {
  user: { id: "user-1", organizationId: "org-1", role: "Employee" as const },
  meetings: [] as Array<{ id: string; organizationId: string; title: string; startsAt: string }>,
  created: [] as Array<Record<string, unknown>>,
};

vi.mock("../../../auth/AuthProvider", () => ({
  useAuth: () => ({ session: { user: state.user, status: "authenticated" } }),
}));

vi.mock("../../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
}));

vi.mock("../../../providers/serviceProvider", () => ({
  applicationServices: {
    meetingsRepository: {
      list: async () => state.meetings,
      create: async (_scope: unknown, input: Record<string, unknown>) => {
        state.created.push(input);
        const record = { id: `meeting-${state.created.length}`, organizationId: "org-1", title: input.title, startsAt: input.startsAt };
        state.meetings = [...state.meetings, record];
        return record;
      },
    },
  },
}));

import { LiteMeetingsSection } from "./LiteMeetingsSection";

describe("LiteMeetingsSection", () => {
  afterEach(() => {
    state.meetings = [];
    state.created = [];
    vi.clearAllMocks();
  });

  it("shows an honest empty state before any meeting is added", async () => {
    render(<LiteMeetingsSection />);
    await waitFor(() => expect(screen.getByText(/No meetings yet/)).toBeInTheDocument());
  });

  it("creates a real meeting via the shared meetingsRepository, with attendeeIds always empty (never a fake UUID)", async () => {
    render(<LiteMeetingsSection />);
    await waitFor(() => expect(screen.getByText(/No meetings yet/)).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText("Meeting title"), { target: { value: "Vendor check-in" } });
    fireEvent.change(screen.getByPlaceholderText("Attendees (names, comma-separated -- optional)"), { target: { value: "Rahul, Priya" } });
    const startsAtInput = document.querySelector('input[type="datetime-local"]') as HTMLInputElement;
    fireEvent.change(startsAtInput, { target: { value: "2026-08-10T10:00" } });
    fireEvent.click(screen.getByText("Add meeting"));

    await waitFor(() => expect(screen.getByText("Vendor check-in")).toBeInTheDocument());
    expect(state.created).toHaveLength(1);
    expect(state.created[0].attendeeIds).toEqual([]);
    expect(state.created[0].notes).toContain("Attendees: Rahul, Priya");
  });

  it("never renders X0 workflow-records or golden-path vocabulary", () => {
    render(<LiteMeetingsSection />);
    expect(screen.queryByText(/Golden Path/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/workflow record/i)).not.toBeInTheDocument();
  });
});
