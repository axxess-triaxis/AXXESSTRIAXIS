-- Customer-fireable stack, PR 5 (2026-11-20): what AXXESS needs to fire Callismatic and Omnidamus
-- for an organization. Additive only.
--
-- Organization admins set call_purpose and sms_opening_text (their own words). Triaxis, as the
-- platform operator, sets the numbers, sender identifiers, WhatsApp template and the registration
-- flags in org_agent_settings, after linking the number in its AWS account and seeing proof of
-- registration. Writes go through the service role; the routes decide who may change which field.

alter table public.org_agent_settings
  add column if not exists call_purpose text
    check (call_purpose is null or length(call_purpose) between 1 and 500),
  add column if not exists sms_opening_text text
    check (sms_opening_text is null or length(sms_opening_text) between 1 and 320),
  add column if not exists whatsapp_template text
    check (whatsapp_template is null or whatsapp_template ~ '^[a-z0-9_]{1,512}$'),
  add column if not exists whatsapp_number_e164 text
    check (whatsapp_number_e164 is null or whatsapp_number_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  add column if not exists sms_number_e164 text
    check (sms_number_e164 is null or sms_number_e164 ~ '^\+[1-9][0-9]{6,14}$');

comment on column public.org_agent_settings.call_purpose is 'Set by the organization: why its voice agent calls a lead. Sent to Callismatic.';
comment on column public.org_agent_settings.sms_opening_text is 'Set by the organization: the first SMS of an Omnidamus conversation. India needs it to match a DLT template.';
comment on column public.org_agent_settings.whatsapp_template is 'Set by Triaxis: the Meta-approved template that opens an Omnidamus WhatsApp conversation.';
comment on column public.org_agent_settings.whatsapp_number_e164 is 'Set by Triaxis: the organization''s WhatsApp number (Omnidamus line). Also claimed in org_channel_numbers.';
comment on column public.org_agent_settings.sms_number_e164 is 'Set by Triaxis: the organization''s SMS number (Omnidamus line). Also claimed in org_channel_numbers.';
