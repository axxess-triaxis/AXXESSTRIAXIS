import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const routeSource = readFileSync(join(process.cwd(), "src", "app", "api", "beta-feedback", "route.ts"), "utf8");

describe("beta feedback API privacy and validation", () => {
  it("validates feedback type, module, rating, and message", () => {
    expect(routeSource).toContain("Feedback type is required.");
    expect(routeSource).toContain("Module is required.");
    expect(routeSource).toContain("Rating must be between 1 and 5.");
    expect(routeSource).toContain("Feedback message is required.");
  });

  it("does not write feedback message into audit metadata", () => {
    const metadataBlock = routeSource.slice(routeSource.indexOf("metadata: {"), routeSource.indexOf("}).catch"));
    expect(metadataBlock).not.toContain("message");
    expect(metadataBlock).toContain("feedback_type");
    expect(metadataBlock).toContain("rating");
  });
});
