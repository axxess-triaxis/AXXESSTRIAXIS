import { afterEach, describe, expect, it, vi } from "vitest";

// Number claims (customer-fireable stack, PR 5, 2026-11-20): one number belongs to one organization.
type Options = { method?: string; query?: URLSearchParams; body?: Record<string, unknown> };
const state = { calls: [] as Array<{ table: string; options: Options }>, handler: ((): unknown => []) as (table: string, options: Options) => unknown };

vi.mock("./supabaseAdmin", () => ({
  isSupabaseAdminConfigured: () => true,
  supabaseAdminRest: async (table: string, options: Options = {}) => {
    state.calls.push({ table, options });
    return state.handler(table, options);
  },
}));

import { NumberClaimedError, loadAgentSettings, loadRegistrations, saveAgentSettings } from "./orgAgentSettingsRepository";

const ORG = "org-a";
const row = (over: Record<string, unknown> = {}) => ({
  callismatic_enabled: false, omnidamus_enabled: false, call_purpose: null, sms_opening_text: null, caller_id_e164: null,
  whatsapp_phone_number_id: null, whatsapp_number_e164: null, whatsapp_template: null, sms_origination_identity: null,
  sms_number_e164: null, dlt_india_registered: false, tdra_uae_registered: false, counsel_signed_off: false, updated_at: "2026-11-20T00:00:00Z",
  ...over,
});
const writes = () => state.calls.filter((c) => c.options.method && c.options.method !== "GET").map((c) => `${c.options.method} ${c.table}`);

describe("orgAgentSettingsRepository", () => {
  afterEach(() => { state.calls = []; state.handler = () => []; });

  it("an organization without a row has every agent off and no registrations", async () => {
    expect((await loadAgentSettings(ORG)).callismaticEnabled).toBe(false);
    expect(await loadRegistrations(ORG)).toEqual({ dltIndia: false, tdraUae: false, counselSignedOff: false });
  });

  it("claims a new caller ID before saving, scoped to the organization", async () => {
    state.handler = (table, o) => (table === "org_agent_settings" && o.method === "POST" ? [row({ caller_id_e164: "+919800000001" })] : []);
    const settings = await saveAgentSettings(ORG, { callerIdE164: "+919800000001" }, "u1");
    expect(settings.callerIdE164).toBe("+919800000001");
    expect(writes()).toEqual(["POST org_channel_numbers", "POST org_agent_settings"]);
    const claim = state.calls.find((c) => c.table === "org_channel_numbers" && c.options.method === "POST");
    expect(claim?.options.body).toEqual({ organization_id: ORG, channel: "voice", identifier: "+919800000001", created_by: "u1" });
    const upsert = state.calls.find((c) => c.table === "org_agent_settings" && c.options.method === "POST");
    expect(upsert?.options.body).toEqual(expect.objectContaining({ organization_id: ORG, caller_id_e164: "+919800000001", updated_by: "u1" }));
  });

  it("refuses a number another organization holds and saves nothing", async () => {
    state.handler = (table, o) => (table === "org_channel_numbers" && !o.method ? [{ organization_id: "org-b" }] : []);
    await expect(saveAgentSettings(ORG, { whatsappNumberE164: "+971500000001", omnidamusEnabled: true }, "u1"))
      .rejects.toBeInstanceOf(NumberClaimedError);
    expect(writes()).toEqual([]);
  });

  it("releases the old number when it changes", async () => {
    state.handler = (table, o) => {
      if (table === "org_agent_settings" && !o.method) return [row({ sms_number_e164: "+919800000001" })];
      if (table === "org_agent_settings") return [row({ sms_number_e164: "+919800000002" })];
      return [];
    };
    await saveAgentSettings(ORG, { smsNumberE164: "+919800000002" }, "u1");
    expect(writes()).toEqual(["DELETE org_channel_numbers", "POST org_channel_numbers", "POST org_agent_settings"]);
    const release = state.calls.find((c) => c.options.method === "DELETE");
    expect(release?.options.query?.get("organization_id")).toBe(`eq.${ORG}`);
    expect(release?.options.query?.get("identifier")).toBe("eq.+919800000001");
  });

  it("turns a lost race on the unique constraint into NumberClaimedError", async () => {
    state.handler = (table, o) => {
      if (table === "org_channel_numbers" && o.method === "POST") throw new Error("Supabase admin request failed for org_channel_numbers: 409 duplicate key");
      return [];
    };
    await expect(saveAgentSettings(ORG, { callerIdE164: "+919800000001" }, "u1")).rejects.toBeInstanceOf(NumberClaimedError);
  });

  it("a wording change touches no number claims", async () => {
    state.handler = (table, o) => (table === "org_agent_settings" && o.method === "POST" ? [row({ call_purpose: "Hi" })] : []);
    await saveAgentSettings(ORG, { callPurpose: "Hi" }, "u1");
    expect(writes()).toEqual(["POST org_agent_settings"]);
  });
});
