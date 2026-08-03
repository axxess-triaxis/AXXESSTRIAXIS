import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  verifySignature: true,
  connection: undefined as { id: string; organizationId: string } | undefined,
  recordedEvents: [] as Array<Record<string, unknown>>,
};

vi.mock("../../../../services/messaging/whatsappWebhookSignature", () => ({
  verifyWhatsAppWebhookSignature: () => state.verifySignature,
}));

vi.mock("../../../../repositories/whatsappEventsRepository", () => ({
  findWhatsAppConnectionByPhoneNumberId: async () => state.connection,
  recordWhatsAppBusinessEvent: async (input: Record<string, unknown>) => {
    state.recordedEvents.push(input);
    return { id: `evt-${state.recordedEvents.length}`, ...input };
  },
}));

import { GET, POST } from "./route";

const ORIGINAL_VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN;

function whatsAppPayload(overrides: Partial<{ phoneNumberId: string; messages: unknown[]; statuses: unknown[] }> = {}) {
  return JSON.stringify({
    object: "whatsapp_business_account",
    entry: [{
      id: "waba-1",
      changes: [{
        field: "messages",
        value: {
          metadata: { phone_number_id: overrides.phoneNumberId ?? "12345" },
          messages: overrides.messages ?? [],
          statuses: overrides.statuses ?? [],
        },
      }],
    }],
  });
}

describe("GET /api/webhooks/whatsapp (subscription verification)", () => {
  afterEach(() => {
    process.env.META_WEBHOOK_VERIFY_TOKEN = ORIGINAL_VERIFY_TOKEN;
  });

  it("echoes hub.challenge when the verify token matches", async () => {
    process.env.META_WEBHOOK_VERIFY_TOKEN = "expected-token";
    const request = new Request("https://app.test/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=expected-token&hub.challenge=echo-me");
    const response = await GET(request);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("echo-me");
  });

  it("rejects when the verify token does not match", async () => {
    process.env.META_WEBHOOK_VERIFY_TOKEN = "expected-token";
    const request = new Request("https://app.test/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=echo-me");
    const response = await GET(request);
    expect(response.status).toBe(403);
  });
});

describe("POST /api/webhooks/whatsapp (event delivery)", () => {
  afterEach(() => {
    state.verifySignature = true;
    state.connection = undefined;
    state.recordedEvents = [];
    vi.clearAllMocks();
  });

  it("rejects a payload with an invalid signature before touching any repository", async () => {
    state.verifySignature = false;
    const request = new Request("https://app.test/api/webhooks/whatsapp", { method: "POST", body: whatsAppPayload() });
    const response = await POST(request);
    expect(response.status).toBe(401);
    expect(state.recordedEvents.length).toBe(0);
  });

  it("stores nothing and reports skippedNoTenant when no tenant is registered for this phone_number_id, never guessing", async () => {
    state.connection = undefined;
    const request = new Request("https://app.test/api/webhooks/whatsapp", {
      method: "POST",
      body: whatsAppPayload({ messages: [{ id: "wamid.1", from: "911234567890", type: "text" }] }),
    });
    const response = await POST(request);
    const body = await response.json() as { received: boolean; stored: number; skippedNoTenant: number };
    expect(response.status).toBe(200);
    expect(body.stored).toBe(0);
    expect(body.skippedNoTenant).toBe(1);
    expect(state.recordedEvents.length).toBe(0);
  });

  it("records an inbound message event scoped to the resolved tenant's organization", async () => {
    state.connection = { id: "conn-1", organizationId: "org-1" };
    const request = new Request("https://app.test/api/webhooks/whatsapp", {
      method: "POST",
      body: whatsAppPayload({ phoneNumberId: "999", messages: [{ id: "wamid.1", from: "911234567890", type: "text" }] }),
    });
    const response = await POST(request);
    const body = await response.json() as { stored: number };
    expect(body.stored).toBe(1);
    expect(state.recordedEvents[0]).toMatchObject({
      organizationId: "org-1", connectionId: "conn-1", eventType: "message_inbound",
      wabaPhoneNumberId: "999", waMessageId: "wamid.1", direction: "inbound",
    });
  });

  it("records a message-status (broadcast/template delivery) event", async () => {
    state.connection = { id: "conn-1", organizationId: "org-1" };
    const request = new Request("https://app.test/api/webhooks/whatsapp", {
      method: "POST",
      body: whatsAppPayload({ statuses: [{ id: "wamid.2", status: "delivered", recipient_id: "911234567890" }] }),
    });
    await POST(request);
    expect(state.recordedEvents[0]).toMatchObject({ eventType: "message_status", messageStatus: "delivered", direction: "outbound" });
  });
});
