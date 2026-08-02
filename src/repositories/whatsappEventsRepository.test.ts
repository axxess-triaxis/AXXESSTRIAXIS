import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  isConfigured: true,
  calls: [] as Array<{ table: string; options: Record<string, unknown> }>,
  responses: [] as unknown[],
};

vi.mock("./supabaseAdmin", () => ({
  isSupabaseAdminConfigured: () => state.isConfigured,
  supabaseAdminRest: async (table: string, options: Record<string, unknown>) => {
    state.calls.push({ table, options });
    return state.responses.shift();
  },
}));

import { acknowledgeWhatsAppBusinessEvent, listWhatsAppBusinessEventsSince, recordWhatsAppBusinessEvent } from "./whatsappEventsRepository";

const scope = { organizationId: "org-1", userId: "user-1", role: "Manager" as const };

function eventRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "evt-1", organization_id: "org-1", connection_id: null, event_type: "message_inbound",
    waba_phone_number_id: "12345", wa_message_id: "wamid.abc", direction: "inbound",
    from_number: "+911234567890", to_number: "+919999999999", message_type: "text",
    message_status: "received", call_status: null, payload: { text: "hello" },
    received_at: "2026-08-02T00:00:00.000Z", acknowledged_at: null, acknowledged_by: null,
    created_at: "2026-08-02T00:00:00.000Z",
    ...overrides,
  };
}

describe("whatsappEventsRepository", () => {
  afterEach(() => {
    state.calls = [];
    state.responses = [];
    state.isConfigured = true;
    vi.clearAllMocks();
  });

  it("returns undefined (not a throw) when Supabase admin isn't configured, so the webhook never crashes on a misconfigured deploy", async () => {
    state.isConfigured = false;
    const result = await recordWhatsAppBusinessEvent({ organizationId: "org-1", eventType: "message_inbound", payload: {} });
    expect(result).toBeUndefined();
    expect(state.calls.length).toBe(0);
  });

  it("upserts on the (organization_id, wa_message_id, event_type) conflict target for webhook-retry idempotency", async () => {
    state.responses = [[eventRow()]];
    await recordWhatsAppBusinessEvent({
      organizationId: "org-1", eventType: "message_inbound", waMessageId: "wamid.abc", payload: { text: "hi" },
    });
    const query = state.calls[0].options.query as URLSearchParams;
    expect(query.get("on_conflict")).toBe("organization_id,wa_message_id,event_type");
    expect(state.calls[0].options.prefer).toBe("resolution=merge-duplicates,return=representation");
  });

  it("scopes 'since' queries to the requesting organization only", async () => {
    state.responses = [[]];
    await listWhatsAppBusinessEventsSince({ ...scope, organizationId: "org-42" }, "2026-08-02T00:00:00.000Z");
    const query = state.calls[0].options.query as URLSearchParams;
    expect(query.get("organization_id")).toBe("eq.org-42");
    expect(query.get("received_at")).toBe("gt.2026-08-02T00:00:00.000Z");
  });

  it("acknowledging an event scopes by id AND organization_id, and stamps the acknowledging user", async () => {
    state.responses = [[eventRow({ acknowledged_at: "2026-08-02T01:00:00.000Z", acknowledged_by: "user-1" })]];
    const event = await acknowledgeWhatsAppBusinessEvent(scope, "evt-1");
    expect(event?.acknowledgedBy).toBe("user-1");
    const query = state.calls[0].options.query as URLSearchParams;
    expect(query.get("id")).toBe("eq.evt-1");
    expect(query.get("organization_id")).toBe("eq.org-1");
    const body = state.calls[0].options.body as Record<string, unknown>;
    expect(body.acknowledged_by).toBe("user-1");
  });
});
