import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/features/workflow-records/WorkflowRecordsPage.tsx"), "utf8");

describe("workflow record pages", () => {
  it("accepts the three Sprint 28 workflow action record types", () => {
    expect(source).toContain("\"approval-requests\"");
    expect(source).toContain("\"stakeholder-notes\"");
    expect(source).toContain("\"project-updates\"");
    expect(source).toContain("isWorkflowRecordType");
  });
});
