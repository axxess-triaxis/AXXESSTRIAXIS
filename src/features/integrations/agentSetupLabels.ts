// Customer-fireable stack (2026-11-20): what an organization still has to set up before its agents can
// call or message. The Agents card on the Integrations page shows the same list.
export const SETUP_LABELS: Record<string, string> = {
  callismatic_off: "the voice agent is turned off for your organization",
  caller_id_missing: "Triaxis has not linked your caller ID yet",
  call_purpose_missing: "your call purpose is not written yet",
  organization_name_missing: "your organization has no name",
  omnidamus_off: "the messaging agent is turned off for your organization",
  whatsapp_not_linked: "Triaxis has not linked your WhatsApp number yet",
  whatsapp_template_missing: "no approved WhatsApp template is set",
  sms_not_linked: "Triaxis has not linked your SMS number yet",
  sms_opening_text_missing: "your opening SMS is not written yet",
  triaxis_uses_its_own_numbers: "Triaxis messages leads from its own numbers",
};
