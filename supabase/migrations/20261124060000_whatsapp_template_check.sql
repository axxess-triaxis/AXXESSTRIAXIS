-- The check added by 20261120140000 used {1,512}, and PostgreSQL allows at most 255 repetitions in a
-- regular expression, so saving any WhatsApp template failed with 2201B. Same rule, valid form.
alter table public.org_agent_settings
  drop constraint if exists org_agent_settings_whatsapp_template_check;

alter table public.org_agent_settings
  add constraint org_agent_settings_whatsapp_template_check
    check (whatsapp_template is null or (whatsapp_template ~ '^[a-z0-9_]+$' and length(whatsapp_template) <= 512));
