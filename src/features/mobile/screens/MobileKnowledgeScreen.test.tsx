import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = {
  user: { id: "user-1", organizationId: "org-1", role: "Employee" as const },
  documents: [] as { id: string; organizationId: string; name: string; title?: string; mimeType: string; storagePath: string; createdAt: string; updatedAt: string }[],
  articles: [] as { id: string; organizationId: string; title: string; bodyMarkdown: string; tags: string[]; authorUserId: string; status: string; createdAt: string; updatedAt: string }[],
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
const { search, getSignedDownloadUrl } = vi.hoisted(() => ({
  search: vi.fn(async () => []),
  getSignedDownloadUrl: vi.fn(async () => "https://signed.example/doc"),
}));

vi.mock("../../../providers/serviceProvider", () => ({
  applicationServices: {
    documentsRepository: { list: async () => state.documents },
    knowledgeArticlesRepository: { list: async () => state.articles },
    knowledgeSearchRepository: { search },
    storageRepository: { getSignedDownloadUrl },
  },
}));

import { MobileKnowledgeScreen } from "./MobileKnowledgeScreen";

describe("MobileKnowledgeScreen (MN-2)", () => {
  beforeEach(() => {
    // jsdom has no matchMedia implementation at all -- useMobileTabletLayout() calls it on mount,
    // so it needs a stub here (no global polyfill exists in src/test/setup.ts).
    window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaQueryList);
  });

  afterEach(() => {
    state.documents = [];
    state.articles = [];
    vi.clearAllMocks();
  });

  it("shows an honest empty state when there are no documents or articles", async () => {
    render(<MobileKnowledgeScreen />);
    await waitFor(() => expect(screen.getByText("Nothing here yet")).toBeInTheDocument());
  });

  it("lists real documents and articles fetched from their repositories", async () => {
    state.documents = [{ id: "d1", organizationId: "org-1", name: "MOU draft.pdf", mimeType: "application/pdf", storagePath: "org-1/mou.pdf", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
    state.articles = [{ id: "a1", organizationId: "org-1", title: "Onboarding playbook", bodyMarkdown: "Steps...", tags: [], authorUserId: "user-1", status: "published", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
    render(<MobileKnowledgeScreen />);
    await waitFor(() => expect(screen.getByText("MOU draft.pdf")).toBeInTheDocument());
    expect(screen.getByText("Onboarding playbook")).toBeInTheDocument();
  });

  it("searches via knowledgeSearchRepository.search with the real query text, and reports a real match count", async () => {
    search.mockResolvedValueOnce([{ type: "document", item: { id: "d1", organizationId: "org-1", name: "MOU draft.pdf", mimeType: "application/pdf", storagePath: "org-1/mou.pdf", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } }]);
    render(<MobileKnowledgeScreen />);
    await waitFor(() => expect(screen.getByText("Nothing here yet")).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText("Search documents and articles…"), { target: { value: "MOU" } });
    fireEvent.click(screen.getByLabelText("Search"));

    await waitFor(() => expect(search).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ search: "MOU" })));
    expect(await screen.findByText("1 match found")).toBeInTheDocument();
  });

  it("opens a document via a real signed download URL, not a fabricated link", async () => {
    state.documents = [{ id: "d1", organizationId: "org-1", name: "MOU draft.pdf", mimeType: "application/pdf", storagePath: "org-1/mou.pdf", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<MobileKnowledgeScreen />);
    await waitFor(() => expect(screen.getByText("MOU draft.pdf")).toBeInTheDocument());

    fireEvent.click(screen.getByText("MOU draft.pdf"));
    fireEvent.click(screen.getByText("Open document"));

    await waitFor(() => expect(getSignedDownloadUrl).toHaveBeenCalledWith("org-1/mou.pdf"));
    await waitFor(() => expect(openSpy).toHaveBeenCalledWith("https://signed.example/doc", "_blank", "noopener,noreferrer"));
    openSpy.mockRestore();
  });
});
