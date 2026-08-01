import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/app/routing/lazyRoutes.tsx"), "utf8");

describe("lazy route component mapping", () => {
  it("keeps Documents and Knowledge Hub wired to distinct workspace components", () => {
    expect(source).toContain('knowledge: lazy(() => import("../../features/knowledge-hub/KnowledgeHubSection"))');
    expect(source).toContain('documents: lazy(() => import("../../features/documents/DocumentsSection"))');
  });

  it("keeps Documents and Knowledge Hub module headings distinct (Sprint 4, F-019 regression)", () => {
    const documentsSource = readFileSync(join(process.cwd(), "src/features/documents/DocumentsSection.tsx"), "utf8");
    const knowledgeSource = readFileSync(join(process.cwd(), "src/features/knowledge-hub/KnowledgeHubSection.tsx"), "utf8");

    // F-019's original bug was the two modules rendering as if they were the same component --
    // guarded here by each module's own SectionHeader/ModuleHeader title staying its own, distinct
    // string, never the other module's. RAG Remediation Sprint 1 (2026-07-26) legitimately added a
    // "Knowledge Hub" cross-reference to DocumentsSection's copy (guiding the user to where they
    // upload a document before selecting it here for indexing, per the founder's own requirement in
    // A-61) -- so a blanket "file must never contain the other module's name" check is now too
    // strict; this asserts module-identity distinctness directly instead.
    expect(documentsSource).toContain('title="Documents & File Intelligence"');
    expect(knowledgeSource).toContain('title="Knowledge Hub"');
    expect(documentsSource).not.toContain('title="Knowledge Hub"');
    expect(knowledgeSource).not.toContain('title="Documents & File Intelligence"');
  });
});
