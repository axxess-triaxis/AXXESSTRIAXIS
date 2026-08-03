-- Meta Business Suite + Threads + WhatsApp Live Ops (MC-2): tables for data that had nowhere to
-- live before this migration. Confirmed by a full migration-directory search: social_alert_events
-- (202607100001_sprint14_rag_integrations_alerts.sql) is a flat "alert" shape with no columns for
-- media/engagement metrics/campaign budget/reply threads, and nothing in the app writes to it --
-- it is not reused here. Styled directly on financial_watch_items.sql (RLS via is_org_member/
-- has_any_role_text, organization_id cascade FK, updated_at, targeted indexes).

-- Tenant-scoped WhatsApp Business event log: inbound messages, outbound delivery-status updates
-- (this is how broadcast/template campaign delivery status arrives), and call events. Populated
-- only by the webhook receiver (MC-3) -- this migration only creates the table.
create table if not exists public.whatsapp_business_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid references public.integration_connections(id) on delete set null,
  event_type text not null check (event_type in ('message_inbound', 'message_status', 'call', 'system')),
  waba_phone_number_id text,
  wa_message_id text,
  direction text check (direction in ('inbound', 'outbound')),
  from_number text,
  to_number text,
  message_type text,
  message_status text check (message_status in ('sent', 'delivered', 'read', 'failed', 'received')),
  call_status text,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Idempotency for webhook retries: Meta retries delivery on non-2xx/timeout, and a nulls-distinct
-- unique constraint lets the receiver upsert-or-ignore rather than accumulate duplicates.
create unique index if not exists whatsapp_business_events_dedupe_idx
  on public.whatsapp_business_events(organization_id, wa_message_id, event_type)
  where wa_message_id is not null;
create index if not exists whatsapp_business_events_org_received_idx
  on public.whatsapp_business_events(organization_id, received_at desc);

alter table public.whatsapp_business_events enable row level security;

drop policy if exists whatsapp_business_events_member_select on public.whatsapp_business_events;
create policy whatsapp_business_events_member_select on public.whatsapp_business_events for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists whatsapp_business_events_member_update on public.whatsapp_business_events;
create policy whatsapp_business_events_member_update on public.whatsapp_business_events for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

comment on table public.whatsapp_business_events is 'MC-2: tenant-scoped WhatsApp Business message/status/call event log, populated by the webhook receiver (MC-3). Writes come from the service role only (RLS has no authenticated insert policy) -- authenticated users may only select and acknowledge.';

-- Published content: Facebook Page posts, Instagram posts/reels, Threads posts. provider_id
-- deliberately includes x_twitter/linkedin up front (not yet built connectors) so the later
-- deferred phase needs no further migration.
create table if not exists public.published_content_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider_id text not null check (provider_id in ('threads', 'meta_business', 'x_twitter', 'linkedin')),
  connection_id uuid references public.integration_connections(id) on delete set null,
  platform_surface text not null check (platform_surface in ('facebook_page', 'instagram', 'threads', 'x', 'linkedin')),
  external_post_id text,
  content_type text not null check (content_type in ('text', 'image', 'video', 'carousel', 'reel', 'link')),
  caption text,
  media_urls text[] not null default array[]::text[],
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'published', 'failed')),
  scheduled_at timestamptz,
  published_at timestamptz,
  permalink text,
  like_count integer not null default 0,
  comment_count integer not null default 0,
  share_count integer not null default 0,
  impression_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists published_content_items_dedupe_idx
  on public.published_content_items(organization_id, provider_id, external_post_id)
  where external_post_id is not null;
create index if not exists published_content_items_org_idx on public.published_content_items(organization_id);
create index if not exists published_content_items_org_provider_idx on public.published_content_items(organization_id, provider_id);

alter table public.published_content_items enable row level security;

drop policy if exists published_content_items_member_select on public.published_content_items;
create policy published_content_items_member_select on public.published_content_items for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists published_content_items_admin_write on public.published_content_items;
create policy published_content_items_admin_write on public.published_content_items for all to authenticated
  using (public.is_org_member(organization_id) and public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']))
  with check (public.is_org_member(organization_id) and public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

comment on table public.published_content_items is 'MC-2: Facebook Page/Instagram/Threads (and later X/LinkedIn) published content, populated by pull-based sync (MC-4). Authenticated writes are admin-only manual actions -- normal ingestion writes come from the service role.';

-- Ads Manager campaigns/promotions.
create table if not exists public.campaigns_promotions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider_id text not null default 'meta_business',
  connection_id uuid references public.integration_connections(id) on delete set null,
  external_campaign_id text,
  name text not null,
  objective text,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'completed', 'archived')),
  budget_amount numeric,
  budget_currency text not null default 'USD',
  spend_amount numeric not null default 0,
  start_at timestamptz,
  end_at timestamptz,
  reach_count integer not null default 0,
  click_count integer not null default 0,
  conversion_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists campaigns_promotions_dedupe_idx
  on public.campaigns_promotions(organization_id, provider_id, external_campaign_id)
  where external_campaign_id is not null;
create index if not exists campaigns_promotions_org_status_idx on public.campaigns_promotions(organization_id, status);

alter table public.campaigns_promotions enable row level security;

drop policy if exists campaigns_promotions_member_select on public.campaigns_promotions;
create policy campaigns_promotions_member_select on public.campaigns_promotions for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists campaigns_promotions_admin_write on public.campaigns_promotions;
create policy campaigns_promotions_admin_write on public.campaigns_promotions for all to authenticated
  using (public.is_org_member(organization_id) and public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']))
  with check (public.is_org_member(organization_id) and public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

comment on table public.campaigns_promotions is 'MC-2: Meta Ads Manager campaigns/promotions, populated by pull-based sync (MC-4). Authenticated writes are admin-only manual actions -- normal ingestion writes come from the service role.';

-- Community engagement: comments/DMs/mentions needing reply.
create table if not exists public.community_engagement_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider_id text not null check (provider_id in ('threads', 'meta_business', 'x_twitter', 'linkedin')),
  connection_id uuid references public.integration_connections(id) on delete set null,
  platform_surface text not null check (platform_surface in ('facebook_page', 'instagram', 'threads', 'x', 'linkedin')),
  engagement_type text not null check (engagement_type in ('comment', 'dm', 'mention', 'reply')),
  external_engagement_id text,
  related_content_id uuid references public.published_content_items(id) on delete set null,
  author_handle text,
  author_display_name text,
  body_text text,
  sentiment text not null default 'neutral' check (sentiment in ('positive', 'neutral', 'negative')),
  status text not null default 'open' check (status in ('open', 'replied', 'dismissed')),
  received_at timestamptz not null default now(),
  replied_at timestamptz,
  replied_by uuid references public.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists community_engagement_items_dedupe_idx
  on public.community_engagement_items(organization_id, provider_id, external_engagement_id)
  where external_engagement_id is not null;
create index if not exists community_engagement_items_org_status_idx on public.community_engagement_items(organization_id, status);

alter table public.community_engagement_items enable row level security;

drop policy if exists community_engagement_items_member_select on public.community_engagement_items;
create policy community_engagement_items_member_select on public.community_engagement_items for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists community_engagement_items_member_update on public.community_engagement_items;
create policy community_engagement_items_member_update on public.community_engagement_items for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

comment on table public.community_engagement_items is 'MC-2: comments/DMs/mentions across Meta Business Suite/Threads (and later X/LinkedIn) needing reply, populated by pull-based sync (MC-4). Authenticated members may select and mark replied/dismissed -- ingestion writes come from the service role.';
