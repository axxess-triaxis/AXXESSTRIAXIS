import { describe, expect, it } from "vitest";
import { approvedWebsiteContent, sanitizePublicWebsiteContent } from "./publicWebsiteExport";

describe("Wix public website export", () => {
  it("exports approved public content only", () => {
    const sanitized = sanitizePublicWebsiteContent({
      ...approvedWebsiteContent,
      serviceRoleKey: "should-not-export",
      nested: { apiToken: "should-not-export", title: "safe" },
    }) as Record<string, unknown>;

    expect(JSON.stringify(sanitized)).not.toContain("should-not-export");
    expect(sanitized.nested).toEqual({ title: "safe" });
  });
});
