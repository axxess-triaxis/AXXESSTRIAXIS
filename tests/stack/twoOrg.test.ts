import { describe, expect, it } from "vitest";
import { parseLeadImport } from "../../src/services/outbound/leadImport";
import { fictionalPhone, forgedConversationResult, leadImportCsv, loadTwoOrgConfig, SEEDED_ALPHA_ORGANIZATION_ID, whatsappInboundMessage } from "./twoOrg";

const topic = "arn:aws:sns:ap-southeast-2:227214487086:omnidamus-staging-WhatsAppInboundTopic-abc";

describe("loadTwoOrgConfig", () => {
  it("skips with a reason when the WhatsApp topic is not configured", () => {
    expect(loadTwoOrgConfig({})).toEqual({ skip: "STACK_OMNIDAMUS_WHATSAPP_TOPIC_ARN is not set" });
  });

  it("uses the seeded defaults", () => {
    expect(loadTwoOrgConfig({ STACK_OMNIDAMUS_WHATSAPP_TOPIC_ARN: topic })).toEqual({
      whatsappTopicArn: topic,
      orgBAdmin: "orgadmin.beta@axxess.test",
      orgBWhatsAppLine: "+12025550190",
      alphaOrganizationId: SEEDED_ALPHA_ORGANIZATION_ID,
      resultsSecret: undefined,
    });
  });

  it("refuses a topic outside omnidamus-staging", () => {
    expect(() => loadTwoOrgConfig({ STACK_OMNIDAMUS_WHATSAPP_TOPIC_ARN: "arn:aws:sns:ap-southeast-2:1:omnidamus-WhatsAppInboundTopic-abc" }))
      .toThrow(/outside staging/);
  });

  it.each([
    ["STACK_ORG_B_WHATSAPP_LINE", "12025550190", /E\.164/],
    ["STACK_ALPHA_ORGANIZATION_ID", "alpha", /UUID/],
  ])("rejects a malformed %s", (name, value, error) => {
    expect(() => loadTwoOrgConfig({ STACK_OMNIDAMUS_WHATSAPP_TOPIC_ARN: topic, [name]: value })).toThrow(error);
  });
});

describe("fictionalPhone", () => {
  const line = "+12025550190";

  it("stays in the 555-01xx range reserved for fiction, across area codes", () => {
    const phones = Array.from({ length: 500 }, () => fictionalPhone([line]));
    phones.forEach((phone) => expect(phone).toMatch(/^\+1[2-9][0-9]{2}55501[0-9]{2}$/));
    expect(new Set(phones.map((phone) => phone.slice(2, 5))).size).toBeGreaterThan(5);
  });

  it("never returns an excluded number, such as org B's own line or one already imported", () => {
    // The first draw lands exactly on the excluded line, the second does not.
    const draws = [0, 0.905, 0, 0.5];
    const random = () => draws.shift() ?? 0.5;
    expect(fictionalPhone([line], random)).toBe("+12025550150");
  });

  it("stops instead of looping when the generator only produces excluded numbers", () => {
    expect(() => fictionalPhone([line], () => 0)).not.toThrow();
    expect(() => fictionalPhone(["+12025550100"], () => 0)).toThrow(/fictional/);
  });
});

describe("leadImportCsv", () => {
  it("produces a row the real importer accepts as an opt-in lead", () => {
    const csv = leadImportCsv({ company: "Stack run, 1", contactName: "Test Person", email: "stack@example.com", phone: "+12025550142" });
    const result = parseLeadImport(csv, { suppressed: new Set(), existing: new Set() });
    expect(result.fileError).toBeUndefined();
    expect(result.rejected).toEqual([]);
    expect(result.accepted).toEqual([expect.objectContaining({
      organizationName: "Stack run, 1", contactPhoneE164: "+12025550142", country: "AE", consentBasis: "opt_in", source: "stack-e2e",
    })]);
  });
});

describe("whatsappInboundMessage", () => {
  it("puts the receiving line and sender in Meta's bare-digit form", () => {
    const message = JSON.parse(whatsappInboundMessage({ line: "+12025550190", from: "+12025550142", text: "hi", messageId: "m1", at: new Date(1_700_000_000_000) }));
    const entry = JSON.parse(message.whatsAppWebhookEntry);
    const value = entry.changes[0].value;
    expect(value.metadata.display_phone_number).toBe("12025550190");
    expect(value.messages[0]).toEqual({ from: "12025550142", id: "m1", timestamp: "1700000000", type: "text", text: { body: "hi" } });
  });
});

describe("forgedConversationResult", () => {
  it("claims another organization only when asked to", () => {
    expect(forgedConversationResult("job-1", "org-a").data).toMatchObject({ job_id: "job-1", organization_id: "org-a" });
    expect(forgedConversationResult("job-1").data).not.toHaveProperty("organization_id");
  });
});
