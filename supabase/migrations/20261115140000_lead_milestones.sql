-- Lead milestones (GTM funnel follow-up, 2026-11-15): meetings and trials logged against a lead, so
-- the outreach funnel counts them from real rows instead of reporting them as not tracked.
-- Paid stays out on purpose: revenue is reported only from billing records.
-- Append-only: no insert, update or delete policy, and only the server (service role) writes.
-- recorded_by has no foreign key because a staff user may have no profile row (see replyIntake.ts).

create table if not exists public.lead_milestones (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null references public.crm_leads(id) on delete cascade,
  kind text not null check (kind in ('meeting_booked', 'meeting_held', 'trial_started')),
  occurred_at timestamptz not null,
  note text check (note is null or length(note) <= 500),
  recorded_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists lead_milestones_org_kind_time_idx on public.lead_milestones(organization_id, kind, occurred_at desc);
create index if not exists lead_milestones_lead_idx on public.lead_milestones(organization_id, lead_id, occurred_at desc);

alter table public.lead_milestones enable row level security;

-- Senior members read every milestone; other staff read milestones on leads they own.
drop policy if exists lead_milestones_role_select on public.lead_milestones;
create policy lead_milestones_role_select on public.lead_milestones for select to authenticated
  using (
    public.is_senior_member(organization_id)
    or (
      public.is_staff_member(organization_id)
      and exists (
        select 1 from public.crm_leads l
        where l.id = lead_milestones.lead_id and l.organization_id = lead_milestones.organization_id and l.owner_user_id = (select auth.uid())
      )
    )
  );

comment on table public.lead_milestones is 'Meetings and trials logged against a CRM lead, counted by the outreach funnel. Append-only; written by the server only.';
