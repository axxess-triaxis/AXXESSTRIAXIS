import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Document } from "../../domain";
import { AnalyticsProviderShell } from "../../services/analytics";
import { MockAnalyticsProvider } from "../../services/analytics/MockAnalyticsProvider";
import { selectableDocumentsForIndexing } from "./DocumentsSection";

// RAG Remediation Sprint 1 (RAG1-03/04/05/06/07/08/09): before this fix, the only way to index a
// document for governed RAG retrieval was to paste its full text into a form that always created a
// brand-new, disconnected document record -- there was no way to select an already-uploaded
// Knowledge Hub document and index *it*. These tests cover the new selector, the honest copy
// explaining the PDF-text-extraction limitation, and that submitting with a selected document sends
// its documentId so the real Knowledge Hub row gets indexed instead of duplicated.
function buildDocument(input: Partial<Document> & { id: string }): Document {
  return {
    organizationId: "org-1",
    name: input.title ?? "Untitled",
    storagePath: `organizations/org-1/documents/${input.id}.pdf`,
    mimeType: "application/pdf",
    status: "active",
    visibility: "organization",
    classification: "internal",
    createdAt: "2026-07-25T00:00:00.000Z",
    updatedAt: "2026-07-25T00:00:00.000Z",
    ...input,
  };
}

describe("selectableDocumentsForIndexing (RAG1-02/09)", () => {
  it("excludes archived and deleted documents from the indexing selector", () => {
    const active = buildDocument({ id: "doc-active", title: "Active Doc" });
    const archived = buildDocument({ id: "doc-archived", title: "Archived Doc", status: "archived" });
    const deleted = buildDocument({ id: "doc-deleted", title: "Deleted Doc", status: "deleted" });

    const result = selectableDocumentsForIndexing([active, archived, deleted]);

    expect(result.map((doc) => doc.id)).toEqual(["doc-active"]);
  });

  it("does not crash on a long list of documents with long titles", () => {
    const many = Array.from({ length: 250 }, (_, index) => buildDocument({
      id: `doc-${index}`,
      title: `Institutional Document ${index} ${"x".repeat(400)}`,
    }));

    expect(() => selectableDocumentsForIndexing(many)).not.toThrow();
    expect(selectableDocumentsForIndexing(many)).toHaveLength(250);
  });
});

const state = {
  user: { id: "user-1", organizationId: "org-1", role: "Organization Admin" as const },
  documents: [] as Document[],
  ingestRequests: [] as Array<Record<string, unknown>>,
};

vi.mock("../../auth/AuthProvider", () => ({
  useAuth: () => ({ session: { user: state.user, status: "authenticated" } }),
}));

vi.mock("../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
}));

vi.mock("../../providers/serviceProvider", () => ({
  applicationServices: {
    institutionalRepository: { getDocuments: () => [] },
    documentsRepository: {
      list: async () => state.documents,
    },
  },
}));

import { DocumentsSection } from "./DocumentsSection";

describe("DocumentsSection (RAG Remediation Sprint 1)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
    state.documents = [];
    state.ingestRequests = [];
  });

  function renderDocumentsSection() {
    render(
      <AnalyticsProviderShell provider={new MockAnalyticsProvider()}>
        <DocumentsSection />
      </AnalyticsProviderShell>,
    );
  }

  function stubFetch() {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/workflows/timeline")) {
        return new Response(JSON.stringify({ timeline: [] }), { status: 200 });
      }
      if (url.includes("/api/documents/ingest")) {
        const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
        state.ingestRequests.push(body);
        return new Response(JSON.stringify({ chunkCount: 3, reindexedExistingDocument: Boolean(body.documentId) }), { status: 201 });
      }
      return new Response(JSON.stringify({}), { status: 404 });
    }));
  }

  it("shows an uploaded Knowledge Hub document in the indexing selector, tenant-scoped by the repository call", async () => {
    stubFetch();
    state.documents = [buildDocument({ id: "doc-kh-1", title: "District SOP" })];
    renderDocumentsSection();

    fireEvent.click(screen.getByText("Upload"));
    await waitFor(() => {
      expect(screen.getByText("District SOP")).toBeInTheDocument();
    });
  });

  it("explains the PDF text-extraction limitation honestly", async () => {
    stubFetch();
    renderDocumentsSection();

    fireEvent.click(screen.getByText("Upload"));
    expect(await screen.findByText(/Automatic text extraction from PDFs and other files isn't available yet/)).toBeInTheDocument();
  });

  it("indexing a selected document sends its documentId and reports the real document title back", async () => {
    stubFetch();
    state.documents = [buildDocument({ id: "doc-kh-1", title: "District SOP" })];
    renderDocumentsSection();

    fireEvent.click(screen.getByText("Upload"));
    await waitFor(() => expect(screen.getByText("District SOP")).toBeInTheDocument());

    fireEvent.change(screen.getByDisplayValue("New document (paste text only)"), { target: { value: "doc-kh-1" } });
    expect(screen.getByText("Title, classification, and visibility are inherited from the selected document and cannot be changed here.")).toBeInTheDocument();

    fireEvent.change(window.document.body.querySelector("textarea") as HTMLTextAreaElement, { target: { value: "The district SOP requires biomedical sign-off." } });
    fireEvent.click(screen.getByText("Index document"));

    await waitFor(() => expect(state.ingestRequests).toHaveLength(1));
    expect(state.ingestRequests[0].documentId).toBe("doc-kh-1");
    await screen.findByText(/"District SOP" indexed with 3 governed chunks\./);
  });

  it("indexing without a selection still supports the paste-a-new-document path", async () => {
    stubFetch();
    renderDocumentsSection();

    fireEvent.click(screen.getByText("Upload"));
    fireEvent.change(screen.getByText("Document title").parentElement?.querySelector("input") as HTMLInputElement, { target: { value: "Ad-hoc Note" } });
    fireEvent.change(window.document.body.querySelector("textarea") as HTMLTextAreaElement, { target: { value: "A pasted note with no prior Knowledge Hub upload." } });
    fireEvent.click(screen.getByText("Index document"));

    await waitFor(() => expect(state.ingestRequests).toHaveLength(1));
    expect(state.ingestRequests[0].documentId).toBeUndefined();
    expect(state.ingestRequests[0].title).toBe("Ad-hoc Note");
    await screen.findByText("Document indexed with 3 governed chunks.");
  });
});
