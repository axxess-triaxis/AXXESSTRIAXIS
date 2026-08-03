-- Executive Dashboard Redesign Sprint ED-R2: minimal CRM leads/pipeline table.
-- A single crm_leads table represents first-version pipeline state (open leads, follow-ups due,
-- stalled opportunities) rather than a separate crm_deals table, per the sprint's "prefer a single
-- table if it can represent first-version pipeline state" guidance -- there is no existing
-- crm_lead/crm_deal table or Stakeholders-model extension that already covers this.

create table if not exists public.crm_leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  stakeholder_id uuid references public.stakeholders(id) on delete set null,
  title text not null,
  organization_name text,
  contact_name text,
  stage text not null default 'new' check (stage in ('new', 'qualifying', 'proposal', 'negotiation', 'won', 'lost')),
  estimated_value numeric,
  currency text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  owner_user_id uuid references public.users(id) on delete set null,
  next_follow_up_at timestamptz,
  status text not null default 'open' check (status in ('open', 'stalled', 'won', 'lost')),
  source text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_leads_org_idx on public.crm_leads(organization_id);
create index if not exists crm_leads_next_follow_up_idx on public.crm_leads(organization_id, next_follow_up_at);
create index if not exists crm_leads_status_idx on public.crm_leads(organization_id, status);

alter table public.crm_leads enable row level security;

drop policy if exists crm_leads_member_select on public.crm_leads;
create policy crm_leads_member_select on public.crm_leads for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists crm_leads_member_insert on public.crm_leads;
create policy crm_leads_member_insert on public.crm_leads for insert to authenticated
  with check (
    public.is_org_member(organization_id)
    and (
      created_by is null
      or created_by = (select auth.uid())
      or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin'])
    )
  );

drop policy if exists crm_leads_member_update on public.crm_leads;
create policy crm_leads_member_update on public.crm_leads for update to authenticated
  using (
    owner_user_id = (select auth.uid())
    or created_by = (select auth.uid())
    or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager'])
  )
  with check (
    public.is_org_member(organization_id)
    and (
      owner_user_id = (select auth.uid())
      or created_by = (select auth.uid())
      or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager'])
    )
  );

comment on table public.crm_leads is 'Executive Dashboard Redesign Sprint ED-R2: minimal tenant-scoped CRM pipeline (leads/opportunities/follow-ups). Deliberately a single table for first-version pipeline state.';
