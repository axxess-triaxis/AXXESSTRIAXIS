-- AXXESS by Triaxis - Sprint 12 security, compliance, AI governance, and DevSecOps foundation.
-- Adds enterprise IAM hierarchy, privacy/compliance records, tenant-aware vector manifests,
-- immutable audit-chain fields, and governed AI prompt/output evidence tables.

create extension if not exists pgcrypto;

alter type public.app_role add value if not exists 'Department Admin';
alter type public.app_role add value if not exists 'Project Lead';
alter type public.app_role add value if not exists 'Member';
alter type public.app_role add value if not exists 'Auditor';
alter type public.app_role add value if not exists 'External Consultant';

do $$
begin
  alter table public.users drop constraint if exists users_enterprise_role_check;
  alter table public.users drop constraint if exists users_sprint12_role_check;
  alter table public.users
    add constraint users_sprint12_role_check check (
      role::text in (
        'Super Admin',
        'Organization Admin',
        'Department Admin',
        'Project Lead',
        'Executive',
        'Manager',
        'Member',
        'Employee',
        'Auditor',
        'External Consultant',
        'Consultant',
        'Guest'
      )
    );

  alter table public.invitations drop constraint if exists invitations_enterprise_role_check;
  alter table public.invitations drop constraint if exists invitations_sprint12_role_check;
  alter table public.invitations
    add constraint invitations_sprint12_role_check check (
      role::text in (
        'Super Admin',
        'Organization Admin',
        'Department Admin',
        'Project Lead',
        'Executive',
        'Manager',
        'Member',
        'Employee',
        'Auditor',
        'External Consultant',
        'Consultant',
        'Guest'
      )
    );
end $$;

create or replace function public.has_any_role_text(target_organization_id uuid, allowed_roles text[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.user_roles user_role
    join public.roles role on role.id = user_role.role_id
    where user_role.organization_id = target_organization_id
      and user_role.user_id = auth.uid()
      and role.name::text = any(allowed_roles)
  );
$$;

alter table public.organizations
  add column if not exists tenant_id uuid,
  add column if not exists data_residency_region text not null default 'global',
  add column if not exists encryption_profile text not null default 'supabase-managed',
  add column if not exists security_tier text not null default 'standard' check (security_tier in ('standard', 'regulated', 'mission-critical'));

update public.organizations
set tenant_id = id
where tenant_id is null;

alter table public.organizations
  alter column tenant_id set not null;

create unique index if not exists organizations_tenant_id_idx on public.organizations (tenant_id);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  parent_department_id uuid references public.departments(id) on delete set null,
  data_classification text not null default 'internal' check (data_classification in ('public', 'internal', 'confidential', 'restricted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  department_id uuid references public.departments(id) on delete set null,
  name text not null,
  slug text not null,
  workspace_type text not null default 'program' check (workspace_type in ('program', 'project', 'department', 'external-room')),
  data_classification text not null default 'internal' check (data_classification in ('public', 'internal', 'confidential', 'restricted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists public.workspace_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role public.app_role not null default 'Employee',
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

alter table public.users
  add column if not exists department_id uuid references public.departments(id) on delete set null,
  add column if not exists mfa_enforced boolean not null default false,
  add column if not exists passkey_enrolled_at timestamptz,
  add column if not exists last_session_id text;

create table if not exists public.security_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references public.users(id) on delete set null,
  actor_role public.app_role,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  ip_address inet,
  user_agent text,
  device_id text,
  session_id text,
  request_id text,
  previous_hash text,
  integrity_hash text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requester_user_id uuid references public.users(id) on delete set null,
  subject_user_id uuid references public.users(id) on delete cascade,
  request_type text not null check (request_type in ('access_export', 'erasure', 'rectification', 'consent_withdrawal', 'retention_review')),
  status text not null default 'queued' check (status in ('queued', 'in_review', 'approved', 'processing', 'completed', 'rejected')),
  lawful_basis text,
  execution_plan jsonb not null default '[]'::jsonb,
  approved_by_user_id uuid references public.users(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.privacy_consents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  purpose text not null,
  notice_version text not null,
  granted boolean not null default true,
  granted_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique (organization_id, user_id, purpose, notice_version)
);

create table if not exists public.retention_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  data_domain text not null,
  classification text not null check (classification in ('public', 'internal', 'confidential', 'restricted', 'personal', 'sensitive_personal')),
  retention_days integer not null check (retention_days > 0),
  legal_hold boolean not null default false,
  approved_by_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, data_domain, classification)
);

create table if not exists public.compliance_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  jurisdiction text not null check (jurisdiction in ('EU_GDPR', 'EU_AI_ACT', 'UAE_ADGM_DIFC', 'SAUDI_PDPL', 'SINGAPORE_AI_GOV', 'INDIA_DPDP')),
  control_id text not null,
  title text not null,
  required_evidence text[] not null default '{}'::text[],
  enabled boolean not null default true,
  owner_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, jurisdiction, control_id)
);

create table if not exists public.prompt_registry (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  purpose text not null,
  impact_level text not null default 'medium' check (impact_level in ('low', 'medium', 'high')),
  owner_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists public.prompt_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  prompt_id uuid not null references public.prompt_registry(id) on delete cascade,
  version integer not null check (version > 0),
  body text not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'retired')),
  change_summary text not null,
  owner_user_id uuid references public.users(id) on delete set null,
  approved_by_user_id uuid references public.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (prompt_id, version)
);

create table if not exists public.ai_output_audit (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  user_role public.app_role,
  prompt_id uuid references public.prompt_registry(id) on delete set null,
  prompt_version integer not null,
  model text not null,
  generated_at timestamptz not null default now(),
  confidence_score numeric(5,4) not null check (confidence_score >= 0 and confidence_score <= 1),
  source_document_ids uuid[] not null default '{}'::uuid[],
  source_chunk_ids text[] not null default '{}'::text[],
  human_review_required boolean not null default false,
  human_reviewer_user_id uuid references public.users(id) on delete set null,
  approved_at timestamptz,
  operator_notes text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.encryption_key_registry (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key_alias text not null,
  kms_provider text not null default 'supabase-managed',
  rotation_period_days integer not null default 90 check (rotation_period_days > 0),
  rotated_at timestamptz,
  status text not null default 'active' check (status in ('active', 'rotating', 'retired')),
  created_at timestamptz not null default now(),
  unique (organization_id, key_alias)
);

create table if not exists public.vector_index_manifests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  namespace text not null,
  embedding_provider text not null default 'local-deterministic',
  visibility_scope text not null check (visibility_scope in ('private', 'team', 'department', 'organization', 'shared')),
  document_count integer not null default 0 check (document_count >= 0),
  chunk_count integer not null default 0 check (chunk_count >= 0),
  last_rebuilt_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique (organization_id, namespace)
);

create index if not exists departments_org_parent_idx on public.departments (organization_id, parent_department_id);
create index if not exists workspaces_org_department_idx on public.workspaces (organization_id, department_id);
create index if not exists workspace_members_user_idx on public.workspace_members (organization_id, user_id, status);
create index if not exists users_department_idx on public.users (organization_id, department_id);
create index if not exists security_audit_events_org_created_idx on public.security_audit_events (organization_id, created_at desc);
create index if not exists security_audit_events_actor_idx on public.security_audit_events (organization_id, actor_user_id, created_at desc);
create index if not exists privacy_requests_subject_idx on public.privacy_requests (organization_id, subject_user_id, status);
create index if not exists privacy_consents_user_idx on public.privacy_consents (organization_id, user_id, purpose);
create index if not exists compliance_policies_org_jurisdiction_idx on public.compliance_policies (organization_id, jurisdiction, enabled);
create index if not exists prompt_versions_prompt_status_idx on public.prompt_versions (organization_id, prompt_id, status, version desc);
create index if not exists ai_output_audit_org_generated_idx on public.ai_output_audit (organization_id, generated_at desc);
create index if not exists vector_index_manifests_scope_idx on public.vector_index_manifests (organization_id, visibility_scope);

drop trigger if exists set_departments_updated_at on public.departments;
create trigger set_departments_updated_at
  before update on public.departments
  for each row execute function public.set_updated_at();

drop trigger if exists set_workspaces_updated_at on public.workspaces;
create trigger set_workspaces_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

drop trigger if exists set_privacy_requests_updated_at on public.privacy_requests;
create trigger set_privacy_requests_updated_at
  before update on public.privacy_requests
  for each row execute function public.set_updated_at();

drop trigger if exists set_retention_policies_updated_at on public.retention_policies;
create trigger set_retention_policies_updated_at
  before update on public.retention_policies
  for each row execute function public.set_updated_at();

drop trigger if exists set_compliance_policies_updated_at on public.compliance_policies;
create trigger set_compliance_policies_updated_at
  before update on public.compliance_policies
  for each row execute function public.set_updated_at();

drop trigger if exists set_prompt_registry_updated_at on public.prompt_registry;
create trigger set_prompt_registry_updated_at
  before update on public.prompt_registry
  for each row execute function public.set_updated_at();

alter table public.departments enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.security_audit_events enable row level security;
alter table public.privacy_requests enable row level security;
alter table public.privacy_consents enable row level security;
alter table public.retention_policies enable row level security;
alter table public.compliance_policies enable row level security;
alter table public.prompt_registry enable row level security;
alter table public.prompt_versions enable row level security;
alter table public.ai_output_audit enable row level security;
alter table public.encryption_key_registry enable row level security;
alter table public.vector_index_manifests enable row level security;

drop policy if exists departments_sprint12_select on public.departments;
create policy departments_sprint12_select
  on public.departments for select
  to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists departments_sprint12_admin_write on public.departments;
create policy departments_sprint12_admin_write
  on public.departments for all
  to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin', 'Department Admin']))
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin', 'Department Admin']));

drop policy if exists workspaces_sprint12_select on public.workspaces;
create policy workspaces_sprint12_select
  on public.workspaces for select
  to authenticated
  using (
    public.is_org_member(organization_id)
    and (
      public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin', 'Auditor'])
      or exists (
        select 1 from public.workspace_members member
        where member.workspace_id = workspaces.id
          and member.organization_id = workspaces.organization_id
          and member.user_id = (select auth.uid())
          and member.status = 'active'
      )
    )
  );

drop policy if exists workspaces_sprint12_admin_write on public.workspaces;
create policy workspaces_sprint12_admin_write
  on public.workspaces for all
  to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin', 'Department Admin']))
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin', 'Department Admin']));

drop policy if exists workspace_members_sprint12_select on public.workspace_members;
create policy workspace_members_sprint12_select
  on public.workspace_members for select
  to authenticated
  using (
    public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin', 'Department Admin', 'Auditor'])
    or user_id = (select auth.uid())
  );

drop policy if exists workspace_members_sprint12_admin_write on public.workspace_members;
create policy workspace_members_sprint12_admin_write
  on public.workspace_members for all
  to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin', 'Department Admin']))
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin', 'Department Admin']));

drop policy if exists security_audit_events_sprint12_select on public.security_audit_events;
create policy security_audit_events_sprint12_select
  on public.security_audit_events for select
  to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin', 'Auditor']));

drop policy if exists security_audit_events_sprint12_insert on public.security_audit_events;
create policy security_audit_events_sprint12_insert
  on public.security_audit_events for insert
  to authenticated
  with check (public.is_org_member(organization_id));

drop policy if exists privacy_requests_sprint12_select on public.privacy_requests;
create policy privacy_requests_sprint12_select
  on public.privacy_requests for select
  to authenticated
  using (
    subject_user_id = (select auth.uid())
    or requester_user_id = (select auth.uid())
    or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin', 'Auditor'])
  );

drop policy if exists privacy_requests_sprint12_admin_write on public.privacy_requests;
create policy privacy_requests_sprint12_admin_write
  on public.privacy_requests for all
  to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']))
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

drop policy if exists privacy_consents_sprint12_owner on public.privacy_consents;
create policy privacy_consents_sprint12_owner
  on public.privacy_consents for all
  to authenticated
  using (user_id = (select auth.uid()) or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']))
  with check (user_id = (select auth.uid()) or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

drop policy if exists retention_policies_sprint12_select on public.retention_policies;
create policy retention_policies_sprint12_select
  on public.retention_policies for select
  to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin', 'Auditor']));

drop policy if exists retention_policies_sprint12_admin_write on public.retention_policies;
create policy retention_policies_sprint12_admin_write
  on public.retention_policies for all
  to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']))
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

drop policy if exists compliance_policies_sprint12_select on public.compliance_policies;
create policy compliance_policies_sprint12_select
  on public.compliance_policies for select
  to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin', 'Department Admin', 'Auditor']));

drop policy if exists compliance_policies_sprint12_admin_write on public.compliance_policies;
create policy compliance_policies_sprint12_admin_write
  on public.compliance_policies for all
  to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']))
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

drop policy if exists prompt_registry_sprint12_select on public.prompt_registry;
create policy prompt_registry_sprint12_select
  on public.prompt_registry for select
  to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists prompt_registry_sprint12_admin_write on public.prompt_registry;
create policy prompt_registry_sprint12_admin_write
  on public.prompt_registry for all
  to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin', 'Department Admin']))
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin', 'Department Admin']));

drop policy if exists prompt_versions_sprint12_select on public.prompt_versions;
create policy prompt_versions_sprint12_select
  on public.prompt_versions for select
  to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists prompt_versions_sprint12_admin_write on public.prompt_versions;
create policy prompt_versions_sprint12_admin_write
  on public.prompt_versions for all
  to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin', 'Department Admin']))
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin', 'Department Admin']));

drop policy if exists ai_output_audit_sprint12_select on public.ai_output_audit;
create policy ai_output_audit_sprint12_select
  on public.ai_output_audit for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin', 'Auditor'])
  );

drop policy if exists ai_output_audit_sprint12_insert on public.ai_output_audit;
create policy ai_output_audit_sprint12_insert
  on public.ai_output_audit for insert
  to authenticated
  with check (public.is_org_member(organization_id));

drop policy if exists encryption_key_registry_sprint12_select on public.encryption_key_registry;
create policy encryption_key_registry_sprint12_select
  on public.encryption_key_registry for select
  to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin', 'Auditor']));

drop policy if exists encryption_key_registry_sprint12_admin_write on public.encryption_key_registry;
create policy encryption_key_registry_sprint12_admin_write
  on public.encryption_key_registry for all
  to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin']))
  with check (public.has_any_role_text(organization_id, array['Super Admin']));

drop policy if exists vector_index_manifests_sprint12_select on public.vector_index_manifests;
create policy vector_index_manifests_sprint12_select
  on public.vector_index_manifests for select
  to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin', 'Auditor']));

drop policy if exists vector_index_manifests_sprint12_admin_write on public.vector_index_manifests;
create policy vector_index_manifests_sprint12_admin_write
  on public.vector_index_manifests for all
  to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']))
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.departments,
  public.workspaces,
  public.workspace_members,
  public.security_audit_events,
  public.privacy_requests,
  public.privacy_consents,
  public.retention_policies,
  public.compliance_policies,
  public.prompt_registry,
  public.prompt_versions,
  public.ai_output_audit,
  public.encryption_key_registry,
  public.vector_index_manifests
to authenticated;

comment on table public.security_audit_events is 'Immutable security and compliance event chain with request, device, IP, session, and hash evidence.';
comment on table public.privacy_requests is 'Data subject and tenant privacy workflow records for export, erasure, consent withdrawal, and retention review.';
comment on table public.prompt_registry is 'Governed AI prompt registry. Only approved prompt versions should be used for production AI answers.';
comment on table public.ai_output_audit is 'Evidence trail for AI answers including model, prompt version, confidence, sources, and human review status.';
comment on table public.vector_index_manifests is 'Tenant-scoped vector index manifest. Namespaces must never span organizations or visibility scopes.';
