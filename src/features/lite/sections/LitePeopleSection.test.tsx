import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// XL-6 (2026-08-06): proves LitePeopleSection has a real contact create/list loop wired to the
// same stakeholdersRepository X0's StakeholdersSection uses, and -- like StakeholdersSection
// itself (A-58, RAG Remediation Sprint 3) -- never fabricates an influenceScore/engagementLevel
// default. No large stakeholder map, no relationship-owner picker.
const state = {
  user: { id: "user-1", organizationId: "org-1", role: "Employee" as const },
  contacts: [] as Array<{ id: string; organizationId: string; name: string; affiliation: string }>,
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
    stakeholdersRepository: {
      list: async () => state.contacts,
      create: async (_scope: unknown, input: Record<string, unknown>) => {
        state.created.push(input);
        const record = { id: `contact-${state.created.length}`, organizationId: "org-1", name: input.name, affiliation: input.affiliation ?? "" };
        state.contacts = [...state.contacts, record];
        return record;
      },
    },
  },
}));

import { LitePeopleSection } from "./LitePeopleSection";

describe("LitePeopleSection", () => {
  afterEach(() => {
    state.contacts = [];
    state.created = [];
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows an honest empty state before any contact is added", async () => {
    render(<LitePeopleSection />);
    await waitFor(() => expect(screen.getByText(/No contacts yet/)).toBeInTheDocument());
  });

  it("adds a real contact via the shared stakeholdersRepository, never fabricating influence/engagement values", async () => {
    render(<LitePeopleSection />);
    await waitFor(() => expect(screen.getByText(/No contacts yet/)).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText("Name"), { target: { value: "Priya Sharma" } });
    fireEvent.click(screen.getByText("Add contact"));

    await waitFor(() => expect(screen.getByText("Priya Sharma")).toBeInTheDocument());
    expect(state.created).toHaveLength(1);
    expect(state.created[0]).not.toHaveProperty("influenceScore");
    expect(state.created[0]).not.toHaveProperty("engagementLevel");
  });

  it("saves a follow-up note via the real /api/stakeholders/notes endpoint, not a client-only note", async () => {
    state.contacts = [{ id: "contact-1", organizationId: "org-1", name: "Priya Sharma", affiliation: "" }];
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ note: { id: "note-1" } }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<LitePeopleSection />);
    await waitFor(() => expect(screen.getByText("Priya Sharma")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("Note")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Note"));
    await waitFor(() => expect(screen.getByPlaceholderText("Follow-up note...")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText("Follow-up note..."), { target: { value: "Call back next week" } });
    fireEvent.click(screen.getByText("Save note"));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/stakeholders/notes", expect.objectContaining({ method: "POST" })));
    await waitFor(() => expect(screen.getByText(/Follow-up note saved/)).toBeInTheDocument());
  });

  it("never renders a large stakeholder map or X0 CRM vocabulary", () => {
    render(<LitePeopleSection />);
    expect(screen.queryByText(/Stakeholders & CRM/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/relationship owner/i)).not.toBeInTheDocument();
  });
});
