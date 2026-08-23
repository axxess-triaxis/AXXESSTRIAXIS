import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  user: { id: "user-1", organizationId: "org-1", role: "Employee" as const },
  meetings: [] as { id: string; organizationId: string; title: string; startsAt: string; attendeeIds: string[]; decisions: string[]; actionItems: string[] }[],
};

vi.mock("../../../auth/AuthProvider", () => ({
  useAuth: () => ({ session: { user: state.user, status: "authenticated" } }),
}));
vi.mock("../../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
}));

// vi.mock factories are hoisted above regular top-level declarations, so a value referenced
// directly inside one (not lazily, inside a nested closure) must itself be declared via
// vi.hoisted() -- otherwise it's read before its own `const` has initialized (TDZ).
const { updateMeeting } = vi.hoisted(() => ({
  updateMeeting: vi.fn(async (_scope: unknown, _id: string, input: Record<string, unknown>) => input),
}));

vi.mock("../../../providers/serviceProvider", () => ({
  applicationServices: {
    meetingsRepository: { list: async () => state.meetings, update: updateMeeting, create: vi.fn() },
  },
}));

import { MobileBackHandlerProvider } from "../MobileBackHandlerContext";
import { MobileMeetingsScreen } from "./MobileMeetingsScreen";

describe("MobileMeetingsScreen (MN-2)", () => {
  afterEach(() => {
    state.meetings = [];
    vi.clearAllMocks();
  });

  it("shows an honest empty state when there are no meetings", async () => {
    render(<MobileBackHandlerProvider><MobileMeetingsScreen /></MobileBackHandlerProvider>);
    await waitFor(() => expect(screen.getByText("No meetings yet")).toBeInTheDocument());
  });

  it("buckets real meetings into Upcoming and Past by their real startsAt timestamp", async () => {
    state.meetings = [
      { id: "m1", organizationId: "org-1", title: "Future planning sync", startsAt: new Date(Date.now() + 86400000).toISOString(), attendeeIds: [], decisions: [], actionItems: [] },
      { id: "m2", organizationId: "org-1", title: "Last week retro", startsAt: new Date(Date.now() - 86400000).toISOString(), attendeeIds: [], decisions: [], actionItems: [] },
    ];
    render(<MobileBackHandlerProvider><MobileMeetingsScreen /></MobileBackHandlerProvider>);
    await waitFor(() => expect(screen.getByText("Future planning sync")).toBeInTheDocument());
    expect(screen.getByText("Upcoming")).toBeInTheDocument();
    expect(screen.getByText("Past")).toBeInTheDocument();
    expect(screen.getByText("Last week retro")).toBeInTheDocument();
  });

  it("appends a real decision to Meeting.decisions via meetingsRepository.update, not a local-only note", async () => {
    state.meetings = [{ id: "m1", organizationId: "org-1", title: "Board sync", startsAt: new Date(Date.now() + 3600000).toISOString(), attendeeIds: [], decisions: [], actionItems: [] }];
    render(<MobileBackHandlerProvider><MobileMeetingsScreen /></MobileBackHandlerProvider>);
    await waitFor(() => expect(screen.getByText("Board sync")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Board sync"));
    fireEvent.change(screen.getByPlaceholderText("Record a decision…"), { target: { value: "Approved Q3 budget" } });
    fireEvent.click(screen.getByText("Add"));

    await waitFor(() => expect(updateMeeting).toHaveBeenCalledWith(expect.anything(), "m1", { decisions: ["Approved Q3 budget"] }));
  });
});
