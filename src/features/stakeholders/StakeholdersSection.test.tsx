import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Sprint 5, Priority 4: before this fix, "Add Contact" was a dead-end button on every tenant --
// no live stakeholdersRepository existed at all. These tests preserve the Sprint 3 F-011
// non-hanging guarantee (the page must never block on an unresolved spinner) while proving the
// new minimal live path is real, and that a live tenant never sees the demo storyline as if it
// were their own data.
const state = {
  user: { id: "user-1", organizationId: "org-1", role: "Employee" as const },
  stakeholders: [] as Array<{ id: string; organizationId: string; name: string; affiliation: string; influenceScore: number; engagementLevel: string }>,
  created: [] as Array<Record<string, unknown>>,
};

vi.mock("../../auth/AuthProvider", () => ({
  useAuth: () => ({ session: { user: state.user, status: "authenticated" } }),
}));

vi.mock("../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
}));

vi.mock("../../providers/serviceProvider", () => ({
  applicationServices: {
    institutionalRepository: { getStakeholders: () => [] },
    stakeholdersRepository: {
      list: async () => state.stakeholders,
      create: async (_scope: unknown, input: Record<string, unknown>) => {
        state.created.push(input);
        // RAG Remediation Sprint 3 (A-58): mirrors the real repository's honest defaults --
        // 0/"unrated" when the caller doesn't supply a value, not a fabricated 50/"medium".
        const record = {
          id: `stakeholder-${state.created.length}`,
          organizationId: "org-1",
          name: input.name,
          affiliation: input.affiliation ?? "",
          influenceScore: typeof input.influenceScore === "number" ? input.influenceScore : 0,
          engagementLevel: input.engagementLevel ?? "unrated",
        };
        state.stakeholders = [...state.stakeholders, record];
        return record;
      },
    },
  },
}));

import { StakeholdersSection } from "./StakeholdersSection";
import { writeAgenticDraft } from "../../services/agentic/agenticDraftHandoff";

describe("StakeholdersSection (Sprint 3 F-011 non-hanging guarantee, Sprint 5 live Stakeholders/CRM path, RAG Remediation Sprint 3)", () => {
  function stubNotesFetch(notes: Array<Record<string, unknown>> = []) {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/stakeholders/notes")) {
        return new Response(JSON.stringify({ notes }), { status: 200 });
      }
      return new Response(JSON.stringify({}), { status: 404 });
    }));
  }

  afterEach(() => {
    window.localStorage.clear();
    state.stakeholders = [];
    state.created = [];
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders its content immediately, with no unresolved loading gate blocking the page", () => {
    stubNotesFetch();
    render(<StakeholdersSection />);

    expect(screen.getByText("Stakeholders & CRM")).toBeInTheDocument();
    expect(screen.queryByText(/^Loading/)).not.toBeInTheDocument();
  });

  it("shows an honest empty state for a live tenant with zero real stakeholders, not the demo storyline", async () => {
    stubNotesFetch();
    render(<StakeholdersSection />);

    await waitFor(() => {
      expect(screen.getByText(/No stakeholders yet/i)).toBeInTheDocument();
    });
    expect(screen.queryByText("Dr. Purnima Bora")).not.toBeInTheDocument();
  });

  it("shows the demo storyline only in Demo Mode, with Add Contact disabled", () => {
    window.localStorage.setItem("axxess.demoMode.enabled", "true");
    render(<StakeholdersSection />);

    expect(screen.getAllByText("Dr. Purnima Bora").length).toBeGreaterThan(0);
    expect(screen.queryByText(/No stakeholders yet/i)).not.toBeInTheDocument();
    const addButton = screen.getByRole("button", { name: /Add Contact/i });
    expect(addButton).toBeDisabled();
  });

  it("Add Contact opens a real form and saving creates a real stakeholder via the repository", async () => {
    stubNotesFetch();
    render(<StakeholdersSection />);
    await waitFor(() => expect(screen.getByText(/No stakeholders yet/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /Add Contact/i }));
    fireEvent.change(screen.getByLabelText("Contact name"), { target: { value: "Dr. Purnima Bora" } });
    fireEvent.click(screen.getByRole("button", { name: /Save contact/i }));

    await waitFor(() => {
      expect(state.created).toHaveLength(1);
    });
    expect(state.created[0].name).toBe("Dr. Purnima Bora");
    await waitFor(() => {
      expect(screen.getByText("Dr. Purnima Bora")).toBeInTheDocument();
    });
  });

  // RAG Remediation Sprint 3 (A-58): the form previously collected no influence/engagement input
  // at all, so the repository always silently substituted a fabricated 50/"medium" for every live
  // contact. This proves the honest path end to end: leaving the fields blank sends no fake value.
  it("Add Contact does not send a fabricated influence/engagement value when left blank", async () => {
    stubNotesFetch();
    render(<StakeholdersSection />);
    await waitFor(() => expect(screen.getByText(/No stakeholders yet/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /Add Contact/i }));
    fireEvent.change(screen.getByLabelText("Contact name"), { target: { value: "Unrated Contact" } });
    fireEvent.click(screen.getByRole("button", { name: /Save contact/i }));

    await waitFor(() => expect(state.created).toHaveLength(1));
    expect(state.created[0].influenceScore).toBeUndefined();
    expect(state.created[0].engagementLevel).toBeUndefined();
    await waitFor(() => {
      expect(screen.getByText("unrated")).toBeInTheDocument();
    });
  });

  it("Add Contact sends real influence/engagement values when the user explicitly supplies them", async () => {
    stubNotesFetch();
    render(<StakeholdersSection />);
    await waitFor(() => expect(screen.getByText(/No stakeholders yet/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /Add Contact/i }));
    fireEvent.change(screen.getByLabelText("Contact name"), { target: { value: "Rated Contact" } });
    fireEvent.change(screen.getByLabelText("Influence score"), { target: { value: "78" } });
    fireEvent.change(screen.getByLabelText("Engagement level"), { target: { value: "high" } });
    fireEvent.click(screen.getByRole("button", { name: /Save contact/i }));

    await waitFor(() => expect(state.created).toHaveLength(1));
    expect(state.created[0].influenceScore).toBe(78);
    expect(state.created[0].engagementLevel).toBe("high");
  });

  // RAG Remediation Sprint 3 (A-57): stakeholder notes created from an approved AI Review Inbox
  // escalation are real rows, but nothing here previously fetched or displayed them -- the founder's
  // walkthrough found no trace of the escalation for exactly this reason.
  it("shows AI-escalated stakeholder notes fetched from the real notes endpoint", async () => {
    stubNotesFetch([{
      id: "note-1",
      organizationId: "org-1",
      title: "Escalated: Oxygen resilience risk",
      body: "Question: What is the district oxygen resilience risk?\n\nDibrugarh's oxygen resilience risk is elevated.",
      sentiment: "risk",
      visibility: "organization",
      tags: ["ai-review"],
      metadata: {},
      sourceAiReviewId: "review-abc12345",
      createdAt: "2026-07-26T00:00:00.000Z",
      updatedAt: "2026-07-26T00:00:00.000Z",
    }]);
    render(<StakeholdersSection />);

    await waitFor(() => {
      expect(screen.getByText("Escalated: Oxygen resilience risk")).toBeInTheDocument();
    });
    expect(screen.getByText(/Dibrugarh's oxygen resilience risk is elevated/)).toBeInTheDocument();
    expect(screen.getByText(/From AI review review-a/)).toBeInTheDocument();
  });

  it("shows an honest empty state for AI-escalated notes when there are none yet", async () => {
    stubNotesFetch([]);
    render(<StakeholdersSection />);

    await waitFor(() => {
      expect(screen.getByText(/No AI-escalated stakeholder notes yet/i)).toBeInTheDocument();
    });
  });

  // A-79: "Save stakeholder mapping" from the AI Workspace actionables pop-up lands here as a
  // sessionStorage draft -- not a pre-filled Contact form (a mapping isn't a new contact), but a
  // "Save as note" card that POSTs to the already-live stakeholder_notes surface.
  it("shows a Save-as-note card for a pending stakeholder-mapping draft, and saving posts to the real notes endpoint", async () => {
    writeAgenticDraft({
      actionType: "stakeholder_mapping",
      summary: "District stakeholder map: Dr. Bora leads oxygen resilience, Secretary Deka owns budget approval.",
      sourceType: "rag_answer",
      createdAt: new Date().toISOString(),
    });
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/stakeholders/notes") && init?.method === "POST") {
        return new Response(JSON.stringify({ note: { id: "note-new", title: "Stakeholder mapping from AI Workspace", body: "..." } }), { status: 201 });
      }
      if (url.includes("/api/stakeholders/notes")) return new Response(JSON.stringify({ notes: [] }), { status: 200 });
      return new Response(JSON.stringify({}), { status: 404 });
    }));

    render(<StakeholdersSection />);

    expect(await screen.findByText("Draft from AI Workspace")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Save as note/i }));

    await waitFor(() => {
      expect(screen.queryByText("Draft from AI Workspace")).not.toBeInTheDocument();
    });
  });

  // 2026-08-07: founder live-tested this exact flow in production and found the newly-saved note
  // never became visible -- the "AI-escalated notes" panel stayed stuck on "Checking for
  // AI-escalated notes..." indefinitely, even though the POST had genuinely succeeded (a "Saved as
  // a stakeholder note." toast rendered). Root cause: tenantScopeFromUser() returns a new object
  // literal on every call; calling it directly in the render body (not memoized) made `scope` a
  // fresh reference on every render, re-triggering the notes-fetching useEffect -- including its
  // setNotesLoading(true) reset -- on every render, so the loading state never durably resolved to
  // false long enough for the just-added note to render. This test forces multiple re-renders via
  // an unrelated state update (opening the add-contact form) after a note is saved, and asserts the
  // note is still visible afterward -- it would have failed against the pre-fix code.
  it("keeps a newly-saved AI-escalated note visible even after later, unrelated re-renders", async () => {
    writeAgenticDraft({
      actionType: "stakeholder_mapping",
      summary: "District stakeholder map: Dr. Bora leads oxygen resilience.",
      sourceType: "rag_answer",
      createdAt: new Date().toISOString(),
    });
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/stakeholders/notes") && init?.method === "POST") {
        return new Response(JSON.stringify({ note: { id: "note-new", title: "Stakeholder mapping from AI Workspace", body: "District stakeholder map: Dr. Bora leads oxygen resilience." } }), { status: 201 });
      }
      if (url.includes("/api/stakeholders/notes")) return new Response(JSON.stringify({ notes: [] }), { status: 200 });
      return new Response(JSON.stringify({}), { status: 404 });
    }));

    render(<StakeholdersSection />);
    fireEvent.click(await screen.findByRole("button", { name: /Save as note/i }));

    await waitFor(() => {
      expect(screen.getByText("Stakeholder mapping from AI Workspace")).toBeInTheDocument();
    });

    // Trigger further re-renders unrelated to the notes fetch, mirroring the founder's real session
    // (navigating, other state updates) that exposed the unstable-scope bug in production.
    fireEvent.click(screen.getByRole("button", { name: /Add Contact/i }));
    fireEvent.click(screen.getByRole("button", { name: /Add Contact/i }));

    expect(screen.getByText("Stakeholder mapping from AI Workspace")).toBeInTheDocument();
    expect(screen.queryByText(/Checking for AI-escalated notes/i)).not.toBeInTheDocument();
  });

  it("lists real stakeholders for a live tenant that has them", async () => {
    stubNotesFetch();
    state.stakeholders = [{ id: "s1", organizationId: "org-1", name: "Real Contact", affiliation: "Ministry of Health", influenceScore: 72, engagementLevel: "high" }];
    render(<StakeholdersSection />);

    await waitFor(() => {
      expect(screen.getByText("Real Contact")).toBeInTheDocument();
    });
    expect(screen.getByText("Ministry of Health")).toBeInTheDocument();
  });
});
