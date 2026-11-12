import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createUnsubscribeToken } from "../../../../services/outbound/outreachEmail";

const added: Array<{ organizationId: string; identifier: string; channel: string | null; reason: string }> = [];
vi.mock("../../../../repositories/outboundRepository", () => ({
  addSuppression: async (entry: { organizationId: string; identifier: string; channel: string | null; reason: string }) => { added.push(entry); },
}));

import { GET, POST } from "./route";

const SECRET = "x".repeat(40); // test-only placeholder
const url = (token: string) => `http://localhost/api/outreach/unsubscribe?token=${encodeURIComponent(token)}`;

describe("/api/outreach/unsubscribe", () => {
  beforeEach(() => { process.env.OUTREACH_UNSUBSCRIBE_SECRET = SECRET; });
  afterEach(() => { added.length = 0; delete process.env.OUTREACH_UNSUBSCRIBE_SECRET; });

  it("suppresses email for the signed contact on a link click", async () => {
    const token = createUnsubscribeToken(SECRET, { organizationId: "org-1", identifier: "ravi@acme.in" });
    const response = await GET(new Request(url(token)));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(await response.text()).toContain("unsubscribed");
    expect(added).toEqual([{ organizationId: "org-1", identifier: "ravi@acme.in", channel: "email", reason: "unsubscribe" }]);
  });

  it("supports RFC 8058 one-click POST", async () => {
    const token = createUnsubscribeToken(SECRET, { organizationId: "org-1", identifier: "ravi@acme.in" });
    const response = await POST(new Request(url(token), { method: "POST", body: "List-Unsubscribe=One-Click" }));
    expect(response.status).toBe(200);
    expect(added).toHaveLength(1);
  });

  it("rejects a forged or missing token without writing", async () => {
    const forged = createUnsubscribeToken("a-different-secret-that-is-long-enough", { organizationId: "org-1", identifier: "x@y.in" });
    expect((await GET(new Request(url(forged)))).status).toBe(400);
    expect((await GET(new Request("http://localhost/api/outreach/unsubscribe"))).status).toBe(400);
    expect(added).toEqual([]);
  });

  it("returns 503 when the secret is not configured", async () => {
    delete process.env.OUTREACH_UNSUBSCRIBE_SECRET;
    expect((await GET(new Request(url("a.b")))).status).toBe(503);
  });
});
