import { afterEach, describe, expect, it, vi } from "vitest";
import { documentsRepository, knowledgeSearchRepository } from "./supabaseEnterpriseRepositories";
import type { TenantScope } from "./interfaces";

const scope: TenantScope = {
  organizationId: "org_public_safety",
  userId: "user_raj_anand",
  role: "Organization Admin",
};

function fetchCall(fetchMock: ReturnType<typeof vi.fn>, index = 0) {
  return fetchMock.mock.calls[index] as [RequestInfo | URL, RequestInit | undefined];
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Knowledge Hub repositories", () => {
  it("loads documents through the repository gateway when no access token is present", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([
      {
        id: "doc_1",
        organizationId: "org_public_safety",
        name: "Pilot Governance.pdf",
        storagePath: "organizations/org_public_safety/documents/doc_1/versions/v1/pilot-governance.pdf",
        mimeType: "application/pdf",
        status: "active",
        visibility: "organization",
        tags: ["pilot"],
        createdAt: "2026-07-04T00:00:00Z",
        updatedAt: "2026-07-04T00:00:00Z",
      },
    ]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const documents = await documentsRepository.list(scope, { search: "Pilot" });

    expect(documents[0].name).toBe("Pilot Governance.pdf");
    const [url] = fetchCall(fetchMock);
    expect(String(url)).toContain("/api/repositories/documents");
    expect(String(url)).toContain("search=Pilot");
  });

  it("creates document metadata through Supabase REST with tenant fields", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([
      {
        id: "doc_2",
        organization_id: "org_public_safety",
        project_id: null,
        category_id: null,
        name: "Risk Register.xlsx",
        title: "Risk Register",
        description: "Risk register",
        storage_path: "organizations/org_public_safety/documents/doc_2/versions/v1/risk-register.xlsx",
        file_name: "risk-register.xlsx",
        file_size: 1000,
        mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        document_type: "xlsx",
        status: "active",
        visibility: "organization",
        classification: "internal",
        owner_user_id: "user_raj_anand",
        created_by_user_id: "user_raj_anand",
        updated_by_user_id: "user_raj_anand",
        current_version: 1,
        tags: ["risk"],
        created_at: "2026-07-04T00:00:00Z",
        updated_at: "2026-07-04T00:00:00Z",
        archived_at: null,
        deleted_at: null,
      },
    ]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");

    const document = await documentsRepository.create({ ...scope, accessToken: "server-token" }, {
      name: "Risk Register.xlsx",
      title: "Risk Register",
      description: "Risk register",
      storagePath: "organizations/org_public_safety/documents/doc_2/versions/v1/risk-register.xlsx",
      fileName: "risk-register.xlsx",
      fileSize: 1000,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      documentType: "xlsx",
      tags: ["risk"],
    });

    expect(document.documentType).toBe("xlsx");
    const [url, init] = fetchCall(fetchMock);
    expect(String(url)).toContain("https://example.supabase.co/rest/v1/documents");
    expect(init?.method).toBe("POST");
    expect(String(init?.body)).toContain("org_public_safety");
    expect(String(init?.body)).toContain("risk-register.xlsx");
  });

  it("searches documents and articles through the abstraction", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("knowledge_articles")) {
        return new Response(JSON.stringify([
          {
            id: "article_1",
            organizationId: "org_public_safety",
            title: "Risk Operating Model",
            bodyMarkdown: "Risk governance article",
            status: "published",
            authorUserId: "user_raj_anand",
            tags: ["risk"],
            createdAt: "2026-07-04T00:00:00Z",
            updatedAt: "2026-07-04T00:00:00Z",
          },
        ]), { status: 200 });
      }
      return new Response(JSON.stringify([
        {
          id: "doc_1",
          organizationId: "org_public_safety",
          name: "Risk Register.xlsx",
          storagePath: "organizations/org_public_safety/documents/doc_1/versions/v1/risk-register.xlsx",
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          tags: ["risk"],
          createdAt: "2026-07-04T00:00:00Z",
          updatedAt: "2026-07-04T00:00:00Z",
        },
      ]), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const results = await knowledgeSearchRepository.search(scope, { search: "risk" });

    expect(results.map((result) => result.type)).toEqual(["document", "article"]);
  });
});
