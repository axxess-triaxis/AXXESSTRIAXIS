import { describe, expect, it } from "vitest";
import {
  DEFAULT_AGENT_SETTINGS, callReadiness, isPlatformOperatorOrganization, messageReadiness, parseAgentSettingsPatch, registrationsOf,
} from "./agentSettings";

// Customer-fireable stack, PR 5 (2026-11-20): who may change which agent setting, and what each
// agent still needs.
describe("agent settings", () => {
  it("lets an organization admin change its switches and wording, trimming text and clearing empties", () => {
    expect(parseAgentSettingsPatch({ callismaticEnabled: true, callPurpose: "  Ask about the viewing.  ", smsOpeningText: "" }, { operator: false }))
      .toEqual({ ok: true, patch: { callismaticEnabled: true, callPurpose: "Ask about the viewing.", smsOpeningText: null } });
  });

  it.each(["callerIdE164", "whatsappNumberE164", "dltIndiaRegistered", "counselSignedOff", "smsOriginationIdentity"])(
    "never lets an organization admin set %s itself", (field) => {
      expect(parseAgentSettingsPatch({ [field]: field.endsWith("E164") ? "+919800000001" : true }, { operator: false }))
        .toEqual({ ok: false, error: "operator_only_field", field });
    },
  );

  it("lets the platform operator set numbers and registrations", () => {
    expect(parseAgentSettingsPatch({ callerIdE164: "+919800000001", dltIndiaRegistered: true, whatsappTemplate: "intro_v1" }, { operator: true }))
      .toEqual({ ok: true, patch: { callerIdE164: "+919800000001", dltIndiaRegistered: true, whatsappTemplate: "intro_v1" } });
  });

  it.each([
    [{ callerIdE164: "98000" }, "callerIdE164"],
    [{ whatsappTemplate: "Intro Template" }, "whatsappTemplate"],
    [{ callPurpose: "x".repeat(501) }, "callPurpose"],
    [{ smsOpeningText: "x".repeat(321) }, "smsOpeningText"],
    [{ callismaticEnabled: "yes" }, "callismaticEnabled"],
    [{ whatsappPhoneNumberId: "id with spaces" }, "whatsappPhoneNumberId"],
  ])("rejects an invalid value %o", (body, field) => {
    expect(parseAgentSettingsPatch(body, { operator: true })).toEqual({ ok: false, error: "invalid_value", field });
  });

  it("rejects unknown fields, empty patches and non-objects", () => {
    expect(parseAgentSettingsPatch({ organizationId: "x" }, { operator: true })).toEqual({ ok: false, error: "unknown_field", field: "organizationId" });
    expect(parseAgentSettingsPatch({}, { operator: true })).toEqual({ ok: false, error: "empty_patch" });
    expect(parseAgentSettingsPatch([1], { operator: true })).toEqual({ ok: false, error: "invalid_body" });
  });

  it("an organization without settings has every agent off and no registrations", () => {
    expect(callReadiness(DEFAULT_AGENT_SETTINGS, false)).toEqual(["callismatic_off", "caller_id_missing", "call_purpose_missing"]);
    expect(messageReadiness(DEFAULT_AGENT_SETTINGS, "whatsapp")).toEqual(["omnidamus_off", "whatsapp_not_linked", "whatsapp_template_missing"]);
    expect(messageReadiness(DEFAULT_AGENT_SETTINGS, "sms")).toEqual(["omnidamus_off", "sms_not_linked", "sms_opening_text_missing"]);
    expect(registrationsOf(DEFAULT_AGENT_SETTINGS)).toEqual({ dltIndia: false, tdraUae: false, counselSignedOff: false });
  });

  it("Triaxis's own organization needs only the switch to call", () => {
    expect(callReadiness({ ...DEFAULT_AGENT_SETTINGS, callismaticEnabled: true }, true)).toEqual([]);
  });

  it("a WhatsApp number needs both the End User Messaging id and the number", () => {
    const linked = { ...DEFAULT_AGENT_SETTINGS, omnidamusEnabled: true, whatsappPhoneNumberId: "pn-1", whatsappTemplate: "intro" };
    expect(messageReadiness(linked, "whatsapp")).toEqual(["whatsapp_not_linked"]);
    expect(messageReadiness({ ...linked, whatsappNumberE164: "+971500000001" }, "whatsapp")).toEqual([]);
  });

  it("recognises the platform operator only when configured", () => {
    expect(isPlatformOperatorOrganization("org-1", {} as NodeJS.ProcessEnv)).toBe(false);
    expect(isPlatformOperatorOrganization("org-1", { AXXESS_PLATFORM_OPERATOR_ORGANIZATION_ID: "org-1" } as unknown as NodeJS.ProcessEnv)).toBe(true);
    expect(isPlatformOperatorOrganization("org-2", { AXXESS_PLATFORM_OPERATOR_ORGANIZATION_ID: "org-1" } as unknown as NodeJS.ProcessEnv)).toBe(false);
  });
});
