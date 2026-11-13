-- Agent call pipeline (2026-11-13, founder: "one button click, voice agent does the call, AI agent
-- logs the call, sets actionable, follows up"). One row per "Call with agent" request.
-- The contactability gate decision for the request stays in contact_attempts (channel 'voice_ai');
-- this row tracks the job through Callismatic and back (STILL -> MCP tool log_agent_call).
-- Written only by the server with the service role: users get read access and nothing else.
-- No transcript and no phone number is stored here.

create table if not exists public.agent_call_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null references public.crm_leads(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'calling', 'completed', 'failed')),
  outcome text check (
    outcome is null or outcome in ('connected', 'no_answer', 'voicemail', 'wrong_number', 'call_back', 'not_interested', 'interested')
  ),
  summary text check (summary is null or length(summary) <= 1000),
  action_items jsonb not null default '[]'::jsonb,
  failure_reason text check (failure_reason is null or length(failure_reason) <= 200),
  requested_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists agent_call_jobs_lead_idx on public.agent_call_jobs(organization_id, lead_id, created_at desc);

alter table public.agent_call_jobs enable row level security;

drop policy if exists agent_call_jobs_role_select on public.agent_call_jobs;
create policy agent_call_jobs_role_select on public.agent_call_jobs for select to authenticated
  using (
    public.is_senior_member(organization_id)
    or (public.is_staff_member(organization_id) and requested_by = (select auth.uid()))
  );

comment on table public.agent_call_jobs is 'AI voice agent call requests and their results. Service-role writes only; the gate decision is in contact_attempts.';
