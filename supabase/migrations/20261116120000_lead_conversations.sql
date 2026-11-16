-- Lead conversations (automation plan Phase 1, 2026-11-16: the context layer). A conversation that an
-- agent or channel held with a lead -- an inbound call Callismatic triaged, an SMS/WhatsApp/email thread
-- Omnidamus completed -- stored as one summary row on the lead, so every agent and the in-app copilot
-- read the same history through get_lead_context.
-- Append-only like lead_replies and lead_milestones: no insert, update or delete policy; only the
-- server (service role, via the MCP tool log_conversation) writes.
-- (source, external_id) is unique per organization so a retried STILL delivery cannot log twice.

create table if not exists public.lead_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null references public.crm_leads(id) on delete cascade,
  channel text not null check (channel in ('voice', 'sms', 'whatsapp', 'email', 'chat', 'other')),
  direction text not null check (direction in ('inbound', 'outbound')),
  source text not null check (length(source) between 1 and 60),
  external_id text check (external_id is null or length(external_id) <= 200),
  summary text not null check (length(summary) between 1 and 2000),
  occurred_at timestamptz not null,
  recorded_by_agent_connection_id uuid,
  created_at timestamptz not null default now()
);

create unique index if not exists lead_conversations_external_uidx
  on public.lead_conversations(organization_id, source, external_id) where external_id is not null;
create index if not exists lead_conversations_lead_idx on public.lead_conversations(organization_id, lead_id, occurred_at desc);

alter table public.lead_conversations enable row level security;

-- Senior members read every conversation; other staff read conversations on leads they own.
drop policy if exists lead_conversations_role_select on public.lead_conversations;
create policy lead_conversations_role_select on public.lead_conversations for select to authenticated
  using (
    public.is_senior_member(organization_id)
    or (
      public.is_staff_member(organization_id)
      and exists (
        select 1 from public.crm_leads l
        where l.id = lead_conversations.lead_id and l.organization_id = lead_conversations.organization_id and l.owner_user_id = (select auth.uid())
      )
    )
  );

comment on table public.lead_conversations is 'Agent and channel conversations summarised on a CRM lead (Callismatic calls, Omnidamus threads). Append-only; written by the server only.';
