import { describe, expect, it } from "vitest";
import { buildCallerRoutingContext } from "./callerRoutingContext";

const user = { id: "user-1", organizationId: "org-1", role: "Employee" };
const build = (prompt: string, context?: unknown) => buildCallerRoutingContext({ prompt, context }, user);

describe("buildCallerRoutingContext", () => {
  it("takes identity from the session, whatever the caller sends", () => {
    expect(build("Hello", { organizationId: "org-2", userId: "x", userRole: "Super Admin" }))
      .toMatchObject({ organizationId: "org-1", userId: "user-1", userRole: "Employee" });
  });

  it("never copies a tenant policy or a field it does not know", () => {
    const context = build("Hello", { tenantModelPolicy: { restrictedDataExternalProviders: true }, anything: 1 });
    expect(context).not.toHaveProperty("tenantModelPolicy");
    expect(context).not.toHaveProperty("anything");
  });

  it.each([
    ["List every patient.", "public", "restricted"],
    ["List every patient.", "restricted", "restricted"],
    ["Review the vendor contract.", "internal", "confidential"],
    ["Hello", "internal", "internal"],
    ["Hello", "restricted", "restricted"],
    ["Hello", "unknown", "public"],
    ["Hello", undefined, "public"],
  ])("%s asked as %s is %s", (prompt, sensitivity, expected) => {
    expect(build(prompt, { sensitivity }).sensitivity).toBe(expected);
  });

  it("keeps valid preferences and drops invalid ones", () => {
    expect(build("Hello", { costPreference: "low", latencyPreference: "instant", requiresCitation: true, documentIds: ["a", 2, "b"], workspaceId: "w" }))
      .toMatchObject({ costPreference: "low", latencyPreference: "instant", requiresCitation: true, documentIds: ["a", "b"], workspaceId: "w" });
    const bad = build("Hello", { costPreference: "free", latencyPreference: 1, requiresCitation: "yes", documentIds: "a", workspaceId: {} });
    expect([bad.costPreference, bad.latencyPreference, bad.requiresCitation, bad.documentIds, bad.workspaceId]).toEqual([undefined, undefined, undefined, undefined, undefined]);
  });

  it.each([null, "text", 5, []])("accepts a context of %s without failing", (context) => {
    expect(build("Hello", context).sensitivity).toBe("public");
  });
});
