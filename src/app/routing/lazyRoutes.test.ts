import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/app/routing/lazyRoutes.tsx"), "utf8");

describe("lazy route component mapping", () => {
  it("keeps Documents and Knowledge Hub wired to distinct workspace components", () => {
    expect(source).toContain('knowledge: lazy(() => import("../../features/knowledge-hub/KnowledgeHubSection"))');
    expect(source).toContain('documents: lazy(() => import("../../features/documents/DocumentsSection"))');
  });
});
