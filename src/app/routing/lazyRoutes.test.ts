import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/app/routing/lazyRoutes.tsx"), "utf8");

describe("lazy route component mapping", () => {
  it("keeps Documents and Knowledge Hub wired to distinct workspace components", () => {
    expect(source).toContain('knowledge: lazy(() => import("../../features/knowledge-hub/KnowledgeHubSection"))');
    expect(source).toContain('documents: lazy(() => import("../../features/documents/DocumentsSection"))');
  });

  it("keeps Documents and Knowledge Hub headings and empty states distinct (Sprint 4, F-019 regression)", () => {
    const documentsSource = readFileSync(join(process.cwd(), "src/features/documents/DocumentsSection.tsx"), "utf8");
    const knowledgeSource = readFileSync(join(process.cwd(), "src/features/knowledge-hub/KnowledgeHubSection.tsx"), "utf8");

    expect(documentsSource).toContain("Documents & File Intelligence");
    expect(knowledgeSource).toContain("Knowledge Hub");
    expect(documentsSource).not.toContain("Knowledge Hub");
    expect(knowledgeSource).not.toContain("Documents & File Intelligence");
  });
});
