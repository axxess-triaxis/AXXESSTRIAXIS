-- Sprint 18: pilot conversion operations, governed audit exports, and invitation delivery evidence.

create table if not exists public.audit_exports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by_user_id uuid references public.users(id) on delete set null,
  export_token_hash text not null,
  filter text not null default 'all',
  record_count integer not null default 0 check (record_count >= 0),
  file_name text not null,
  csv_sha256 text not null,
  status text not null default 'created' check (status in ('created', 'downloaded', 'expired')),
  metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  downloaded_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists audit_exports_org_created_idx
  on public.audit_exports (organization_id, created_at desc);

create index if not exists audit_exports_org_status_idx
  on public.audit_exports (organization_id, status, expires_at);

alter table public.audit_exports enable row level security;

drop policy if exists audit_exports_admin_select on public.audit_exports;
create policy audit_exports_admin_select
  on public.audit_exports for select
  using (public.has_any_role(organization_id, array['Super Admin', 'Organization Admin']::public.app_role[]));

drop policy if exists audit_exports_admin_insert on public.audit_exports;
create policy audit_exports_admin_insert
  on public.audit_exports for insert
  with check (
    public.has_any_role(organization_id, array['Super Admin', 'Organization Admin']::public.app_role[])
    and (requested_by_user_id is null or requested_by_user_id = auth.uid())
  );

grant select, insert on public.audit_exports to authenticated;

create table if not exists public.invitation_delivery_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invitation_id uuid references public.invitations(id) on delete set null,
  provider text not null default 'resend',
  provider_message_id text,
  recipient_email_hash text,
  event_type text not null check (event_type in ('delivered', 'bounced', 'complained', 'suppressed')),
  raw_event jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists invitation_delivery_events_org_created_idx
  on public.invitation_delivery_events (organization_id, created_at desc);

create index if not exists invitation_delivery_events_invitation_idx
  on public.invitation_delivery_events (organization_id, invitation_id, created_at desc);

create unique index if not exists invitation_delivery_events_provider_once_idx
  on public.invitation_delivery_events (organization_id, provider, provider_message_id, event_type)
  where provider_message_id is not null;

alter table public.invitation_delivery_events enable row level security;

drop policy if exists invitation_delivery_events_admin_select on public.invitation_delivery_events;
create policy invitation_delivery_events_admin_select
  on public.invitation_delivery_events for select
  using (public.has_any_role(organization_id, array['Super Admin', 'Organization Admin']::public.app_role[]));

grant select on public.invitation_delivery_events to authenticated;
grant select, insert on public.invitation_delivery_events to service_role;

comment on table public.audit_exports is 'Immutable tenant-scoped audit export records created by organization administrators.';
comment on column public.audit_exports.export_token_hash is 'SHA-256 hash of the short-lived export token. The raw token is returned once by the server route and never stored.';
comment on column public.audit_exports.csv_sha256 is 'SHA-256 hash of the generated CSV payload for evidence integrity review.';
comment on table public.invitation_delivery_events is 'Tenant-scoped invitation email delivery events ingested from signed provider webhooks.';
comment on column public.invitation_delivery_events.recipient_email_hash is 'SHA-256 hash of the provider recipient address. Raw invitation recipient email is not stored in webhook evidence.';
