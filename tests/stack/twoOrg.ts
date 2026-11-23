// Customer-fireable stack, PR 6 (2026-11-21). Pure helpers for the two-organization stack test:
// a customer organization ("org B") fires an Omnidamus WhatsApp conversation from AXXESS, and the
// finished conversation must become a task in org B only. Nothing here talks to a network.

export const SEEDED_ALPHA_ORGANIZATION_ID = "10000000-0000-4000-8000-000000000001";

export type TwoOrgConfig = {
  whatsappTopicArn: string;
  orgBAdmin: string;
  orgBWhatsAppLine: string;
  alphaOrganizationId: string;
  resultsSecret?: string;
};

const E164 = /^\+[1-9][0-9]{6,14}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Reads the two-organization settings. Returns a reason instead of a config when the scenario is
 * not set up, so the weekly run can say why it skipped rather than fail before the founder's
 * one-time setup. Anything set but not staging-shaped throws.
 */
export function loadTwoOrgConfig(env: Record<string, string | undefined> = process.env): TwoOrgConfig | { skip: string } {
  const whatsappTopicArn = env.STACK_OMNIDAMUS_WHATSAPP_TOPIC_ARN?.trim();
  if (!whatsappTopicArn) return { skip: "STACK_OMNIDAMUS_WHATSAPP_TOPIC_ARN is not set" };
  if (!/:omnidamus-staging-[^:]+$/.test(whatsappTopicArn)) {
    throw new Error("Refusing to run outside staging: the WhatsApp topic is not in omnidamus-staging");
  }
  const orgBWhatsAppLine = env.STACK_ORG_B_WHATSAPP_LINE?.trim() || "+12025550190";
  if (!E164.test(orgBWhatsAppLine)) throw new Error("STACK_ORG_B_WHATSAPP_LINE is not an E.164 number");
  const alphaOrganizationId = env.STACK_ALPHA_ORGANIZATION_ID?.trim() || SEEDED_ALPHA_ORGANIZATION_ID;
  if (!UUID.test(alphaOrganizationId)) throw new Error("STACK_ALPHA_ORGANIZATION_ID is not a UUID");
  return {
    whatsappTopicArn,
    orgBAdmin: env.STACK_ORG_B_ADMIN?.trim() || "orgadmin.beta@axxess.test",
    orgBWhatsAppLine,
    alphaOrganizationId,
    resultsSecret: env.STACK_RESULTS_SECRET?.trim() || undefined,
  };
}

// Ordinary geographic area codes. 555-0100 to 555-0199 is reserved for fiction in each of them.
const AREA_CODES = ["202", "203", "206", "208", "212", "213", "214", "215", "216", "217", "303", "304", "305", "307", "312", "313", "314", "315", "401", "402"];

/**
 * A fictional number outside `exclude`. Imported leads stay in org B, so one area code's 100 numbers
 * would run out, and one of them is org B's own WhatsApp line.
 */
export function fictionalPhone(exclude: readonly string[], random: () => number = Math.random): string {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const areaCode = AREA_CODES[Math.floor(random() * AREA_CODES.length)];
    const phone = `+1${areaCode}55501${String(Math.floor(random() * 100)).padStart(2, "0")}`;
    if (!exclude.includes(phone)) return phone;
  }
  throw new Error("No fictional number is left outside the excluded ones");
}

function csvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** One-row lead import that passes the WhatsApp contactability gate: a configured country and opt-in. */
export function leadImportCsv(lead: { company: string; contactName: string; email: string; phone: string; country?: "IN" | "AE" }): string {
  const header = "company,contact_name,email,phone,country,consent_basis,source";
  const row = [lead.company, lead.contactName, lead.email, lead.phone, lead.country ?? "AE", "opt_in", "stack-e2e"].map(csvField).join(",");
  return `${header}\n${row}\n`;
}

/**
 * The SNS message AWS End User Messaging Social publishes for an inbound WhatsApp message, reduced
 * to what Omnidamus reads: the receiving line (display_phone_number) and the sender. Meta sends
 * numbers without the leading "+".
 */
export function whatsappInboundMessage(input: { line: string; from: string; text: string; messageId: string; at?: Date }): string {
  const digits = (phone: string) => phone.replace(/^\+/, "");
  const entry = {
    id: "stack-e2e-waba",
    changes: [{
      field: "messages",
      value: {
        messaging_product: "whatsapp",
        metadata: { display_phone_number: digits(input.line), phone_number_id: "stack-e2e-org-b" },
        messages: [{
          from: digits(input.from),
          id: input.messageId,
          timestamp: String(Math.floor((input.at ?? new Date()).getTime() / 1000)),
          type: "text",
          text: { body: input.text },
        }],
      },
    }],
  };
  return JSON.stringify({ whatsAppWebhookEntry: JSON.stringify(entry) });
}

/** A conversation result as STILL would post it, for the forged-request checks. */
export function forgedConversationResult(jobId: string, organizationId?: string) {
  return {
    type: "conversation.completed.v1",
    data: {
      job_id: jobId,
      ...(organizationId ? { organization_id: organizationId } : {}),
      channel: "whatsapp",
      summary: "Forged result from the stack test. It must be refused.",
      key_facts: {},
    },
  };
}
