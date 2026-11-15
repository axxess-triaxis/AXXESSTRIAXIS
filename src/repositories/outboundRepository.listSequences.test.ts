import { afterEach, describe, expect, it, vi } from "vitest";

const requests: Array<{ table: string; query: URLSearchParams }> = [];
const tables: Record<string, unknown[]> = {};

vi.mock("./supabaseAdmin", () => ({
  isSupabaseAdminConfigured: () => true,
  supabaseAdminRest: async (table: string, options: { query: URLSearchParams }) => {
    requests.push({ table, query: options.query });
    return Number(options.query.get("offset") ?? "0") === 0 ? tables[table] ?? [] : [];
  },
}));

import { listSequences } from "./outboundRepository";

const scope = { organizationId: "org-1", userId: "u1", role: "Organization Admin" } as Parameters<typeof listSequences>[0];

describe("listSequences", () => {
  afterEach(() => {
    requests.length = 0;
    for (const key of Object.keys(tables)) delete tables[key];
  });

  it("scopes both reads to the organization, counts enrollments per sequence, sorts newest first and leaves out bodies", async () => {
    tables.outreach_sequences = [
      { id: "old", name: "Missed calls", status: "draft", steps: [{ subject: "Missed calls", body: "secret body" }], created_at: "2026-11-12T10:00:00Z", approved_at: null },
      { id: "new", name: "Network", status: "approved", steps: [{ subject: "A", body: "b" }, { subject: "B", body: "c" }], created_at: "2026-11-14T15:24:00Z", approved_at: "2026-11-14T15:24:01Z" },
    ];
    tables.outreach_enrollments = [
      { sequence_id: "new", status: "stopped" },
      { sequence_id: "new", status: "stopped" },
      { sequence_id: "new", status: "active" },
    ];

    const result = await listSequences(scope);

    expect(requests.map((r) => [r.table, r.query.get("organization_id")])).toEqual([
      ["outreach_sequences", "eq.org-1"],
      ["outreach_enrollments", "eq.org-1"],
    ]);
    expect(result.map((s) => s.id)).toEqual(["new", "old"]);
    expect(result[0]).toEqual({
      id: "new", name: "Network", status: "approved", stepCount: 2, subjects: ["A", "B"],
      createdAt: "2026-11-14T15:24:00Z", approvedAt: "2026-11-14T15:24:01Z",
      enrollments: { active: 1, completed: 0, stopped: 2 },
    });
    expect(result[1].enrollments).toEqual({ active: 0, completed: 0, stopped: 0 });
    expect(JSON.stringify(result)).not.toContain("secret body");
  });
});
