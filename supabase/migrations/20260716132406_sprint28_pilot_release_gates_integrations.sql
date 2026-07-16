-- Sprint 28: first-class workflow action records, Microsoft selected-message parity,
-- dashboard snapshot deltas, and audit export timeline linkage.

create extension if not exists pgcrypto;

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by_user_id uuid references public.users(id) on delete set null,
  reviewer_user_id uuid references public.users(id) on delete set null,
  source_ai_review_id text,
  source_audit_log_id uuid references public.audit_logs(id) on delete set null,
  title text not null,
  description text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'changes_requested', 'completed')),
  due_at timestamptz,
  decision_reason text,
  metadata jsonb not null default '{}'::jsonb,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stakeholder_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  stakeholder_id uuid references public.stakeholders(id) on delete set null,
  created_by_user_id uuid references public.users(id) on delete set null,
  source_ai_review_id text,
  source_audit_log_id uuid references public.audit_logs(id) on delete set null,
  title text not null,
  body text not null,
  sentiment text not null default 'neutral' check (sentiment in ('positive', 'neutral', 'risk', 'urgent')),
  visibility text not null default 'organization' check (visibility in ('private', 'team', 'department', 'organization')),
  tags text[] not null default array[]::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_updates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  created_by_user_id uuid references public.users(id) on delete set null,
  source_ai_review_id text,
  source_audit_log_id uuid references public.audit_logs(id) on delete set null,
  title text not null,
  body text not null,
  update_type text not null default 'ai_review' check (update_type in ('status', 'risk', 'budget', 'scope', 'ai_review', 'meeting_follow_up')),
  status text not null default 'recorded' check (status in ('draft', 'recorded', 'applied', 'superseded')),
  progress_delta integer not null default 0 check (progress_delta between -100 and 100),
  risk_level text check (risk_level in ('low', 'medium', 'high', 'urgent')),
  tags text[] not null default array[]::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.microsoft_selected_message_imports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  connection_id uuid references public.integration_connections(id) on delete set null,
  document_id uuid references public.documents(id) on delete set null,
  message_id text not null,
  source_link text,
  from_email text not null,
  subject text not null,
  received_at timestamptz,
  status text not null default 'previewed' check (status in ('previewed', 'imported', 'rejected', 'failed')),
  import_preview jsonb not null default '{}'::jsonb,
  body_excerpt text,
  created_task_ids uuid[] not null default array[]::uuid[],
  metadata jsonb not null default '{}'::jsonb,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.dashboard_snapshot_deltas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  snapshot_id uuid references public.pilot_command_center_snapshots(id) on delete cascade,
  previous_snapshot_id uuid references public.pilot_command_center_snapshots(id) on delete set null,
  generated_by_user_id uuid references public.users(id) on delete set null,
  timeline_event_id uuid references public.workflow_timeline_events(id) on delete set null,
  score_delta integer not null default 0,
  readiness_delta integer not null default 0,
  status_changed boolean not null default false,
  timeline_event_ids uuid[] not null default array[]::uuid[],
  key_changes jsonb not null default '[]'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_export_timeline_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  audit_export_id uuid not null references public.audit_exports(id) on delete cascade,
  timeline_event_id uuid not null references public.workflow_timeline_events(id) on delete cascade,
  audit_log_id uuid references public.audit_logs(id) on delete set null,
  link_reason text not null default 'export_includes_timeline_evidence',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (audit_export_id, timeline_event_id)
);

create index if not exists approval_requests_org_status_idx
  on public.approval_requests (organization_id, status, created_at desc);
create index if not exists stakeholder_notes_org_created_idx
  on public.stakeholder_notes (organization_id, created_at desc);
create index if not exists stakeholder_notes_stakeholder_idx
  on public.stakeholder_notes (organization_id, stakeholder_id, created_at desc);
create index if not exists project_updates_org_created_idx
  on public.project_updates (organization_id, created_at desc);
create index if not exists project_updates_project_idx
  on public.project_updates (organization_id, project_id, created_at desc);
create index if not exists microsoft_selected_message_imports_org_created_idx
  on public.microsoft_selected_message_imports (organization_id, created_at desc);
create index if not exists microsoft_selected_message_imports_user_idx
  on public.microsoft_selected_message_imports (organization_id, user_id, created_at desc);
create index if not exists dashboard_snapshot_deltas_org_created_idx
  on public.dashboard_snapshot_deltas (organization_id, created_at desc);
create index if not exists dashboard_snapshot_deltas_snapshot_idx
  on public.dashboard_snapshot_deltas (organization_id, snapshot_id);
create index if not exists audit_export_timeline_links_export_idx
  on public.audit_export_timeline_links (organization_id, audit_export_id);
create index if not exists audit_export_timeline_links_timeline_idx
  on public.audit_export_timeline_links (organization_id, timeline_event_id);

drop trigger if exists set_approval_requests_updated_at on public.approval_requests;
create trigger set_approval_requests_updated_at before update on public.approval_requests
  for each row execute function public.set_updated_at();

drop trigger if exists set_stakeholder_notes_updated_at on public.stakeholder_notes;
create trigger set_stakeholder_notes_updated_at before update on public.stakeholder_notes
  for each row execute function public.set_updated_at();

drop trigger if exists set_project_updates_updated_at on public.project_updates;
create trigger set_project_updates_updated_at before update on public.project_updates
  for each row execute function public.set_updated_at();

alter table public.approval_requests enable row level security;
alter table public.stakeholder_notes enable row level security;
alter table public.project_updates enable row level security;
alter table public.microsoft_selected_message_imports enable row level security;
alter table public.dashboard_snapshot_deltas enable row level security;
alter table public.audit_export_timeline_links enable row level security;

drop policy if exists approval_requests_member_select on public.approval_requests;
create policy approval_requests_member_select on public.approval_requests for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists approval_requests_member_insert on public.approval_requests;
create policy approval_requests_member_insert on public.approval_requests for insert to authenticated
  with check (
    public.is_org_member(organization_id)
    and (
      requested_by_user_id is null
      or requested_by_user_id = (select auth.uid())
      or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin'])
    )
  );

drop policy if exists approval_requests_reviewer_update on public.approval_requests;
create policy approval_requests_reviewer_update on public.approval_requests for update to authenticated
  using (
    reviewer_user_id = (select auth.uid())
    or requested_by_user_id = (select auth.uid())
    or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager'])
  )
  with check (
    public.is_org_member(organization_id)
    and (
      reviewer_user_id = (select auth.uid())
      or requested_by_user_id = (select auth.uid())
      or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager'])
    )
  );

drop policy if exists stakeholder_notes_member_select on public.stakeholder_notes;
create policy stakeholder_notes_member_select on public.stakeholder_notes for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists stakeholder_notes_member_insert on public.stakeholder_notes;
create policy stakeholder_notes_member_insert on public.stakeholder_notes for insert to authenticated
  with check (
    public.is_org_member(organization_id)
    and (
      created_by_user_id is null
      or created_by_user_id = (select auth.uid())
      or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin'])
    )
  );

drop policy if exists stakeholder_notes_member_update on public.stakeholder_notes;
create policy stakeholder_notes_member_update on public.stakeholder_notes for update to authenticated
  using (
    created_by_user_id = (select auth.uid())
    or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager'])
  )
  with check (
    public.is_org_member(organization_id)
    and (
      created_by_user_id = (select auth.uid())
      or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager'])
    )
  );

drop policy if exists project_updates_member_select on public.project_updates;
create policy project_updates_member_select on public.project_updates for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists project_updates_member_insert on public.project_updates;
create policy project_updates_member_insert on public.project_updates for insert to authenticated
  with check (
    public.is_org_member(organization_id)
    and (
      created_by_user_id is null
      or created_by_user_id = (select auth.uid())
      or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin'])
    )
  );

drop policy if exists project_updates_member_update on public.project_updates;
create policy project_updates_member_update on public.project_updates for update to authenticated
  using (
    created_by_user_id = (select auth.uid())
    or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager'])
  )
  with check (
    public.is_org_member(organization_id)
    and (
      created_by_user_id = (select auth.uid())
      or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager'])
    )
  );

drop policy if exists microsoft_selected_message_imports_member_select on public.microsoft_selected_message_imports;
create policy microsoft_selected_message_imports_member_select on public.microsoft_selected_message_imports for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin'])
  );

drop policy if exists microsoft_selected_message_imports_member_insert on public.microsoft_selected_message_imports;
create policy microsoft_selected_message_imports_member_insert on public.microsoft_selected_message_imports for insert to authenticated
  with check (
    user_id = (select auth.uid())
    or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin'])
  );

drop policy if exists microsoft_selected_message_imports_member_update on public.microsoft_selected_message_imports;
create policy microsoft_selected_message_imports_member_update on public.microsoft_selected_message_imports for update to authenticated
  using (
    user_id = (select auth.uid())
    or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin'])
  )
  with check (
    user_id = (select auth.uid())
    or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin'])
  );

drop policy if exists dashboard_snapshot_deltas_admin_select on public.dashboard_snapshot_deltas;
create policy dashboard_snapshot_deltas_admin_select on public.dashboard_snapshot_deltas for select to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin', 'Executive']));

drop policy if exists dashboard_snapshot_deltas_admin_insert on public.dashboard_snapshot_deltas;
create policy dashboard_snapshot_deltas_admin_insert on public.dashboard_snapshot_deltas for insert to authenticated
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

drop policy if exists audit_export_timeline_links_admin_select on public.audit_export_timeline_links;
create policy audit_export_timeline_links_admin_select on public.audit_export_timeline_links for select to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

drop policy if exists audit_export_timeline_links_admin_insert on public.audit_export_timeline_links;
create policy audit_export_timeline_links_admin_insert on public.audit_export_timeline_links for insert to authenticated
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

grant select, insert, update on public.approval_requests to authenticated;
grant select, insert, update on public.stakeholder_notes to authenticated;
grant select, insert, update on public.project_updates to authenticated;
grant select, insert, update on public.microsoft_selected_message_imports to authenticated;
grant select, insert on public.dashboard_snapshot_deltas to authenticated;
grant select, insert on public.audit_export_timeline_links to authenticated;

grant select, insert, update on
  public.approval_requests,
  public.stakeholder_notes,
  public.project_updates,
  public.microsoft_selected_message_imports,
  public.dashboard_snapshot_deltas,
  public.audit_export_timeline_links,
  public.workflow_timeline_events,
  public.pilot_command_center_snapshots,
  public.audit_exports
to service_role;

comment on table public.approval_requests is 'Tenant-scoped first-class approval requests created from reviewed AI output, email imports, and governed workflow actions.';
comment on table public.stakeholder_notes is 'Tenant-scoped stakeholder notes linked to reviewed AI output, messages, meetings, and audit evidence.';
comment on table public.project_updates is 'Tenant-scoped project updates created from reviewed AI output or imported institutional evidence.';
comment on table public.microsoft_selected_message_imports is 'Tenant-scoped evidence of selected Microsoft Graph messages previewed or imported by users.';
comment on table public.dashboard_snapshot_deltas is 'Tenant-scoped command-center snapshot deltas linked back to workflow timeline evidence.';
comment on table public.audit_export_timeline_links is 'Links governed audit exports to timeline events so exported evidence includes workflow provenance.';
