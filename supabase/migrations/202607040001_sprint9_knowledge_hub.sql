-- AXXESS by Triaxis - Sprint 9 enterprise Knowledge Hub.
-- Upgrades document metadata, adds knowledge articles, private Supabase Storage
-- policies, PostgreSQL search vectors, and tenant-scoped permissions.

create extension if not exists pgcrypto;

create table if not exists public.document_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  parent_id uuid references public.document_categories(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists public.document_tags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

alter table public.documents
  add column if not exists category_id uuid references public.document_categories(id) on delete set null,
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists file_name text,
  add column if not exists file_size bigint check (file_size is null or file_size >= 0),
  add column if not exists document_type text not null default 'unknown' check (document_type in ('pdf', 'docx', 'xlsx', 'pptx', 'image', 'text', 'markdown', 'link', 'unknown')),
  add column if not exists status text not null default 'active' check (status in ('active', 'archived', 'deleted')),
  add column if not exists visibility text not null default 'organization' check (visibility in ('private', 'team', 'department', 'organization', 'shared')),
  add column if not exists owner_user_id uuid references public.users(id) on delete set null,
  add column if not exists created_by_user_id uuid references public.users(id) on delete set null,
  add column if not exists updated_by_user_id uuid references public.users(id) on delete set null,
  add column if not exists current_version integer not null default 1 check (current_version > 0),
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists is_favorite boolean not null default false,
  add column if not exists last_viewed_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists deleted_at timestamptz;

update public.documents
set
  title = coalesce(title, name),
  file_name = coalesce(file_name, name),
  owner_user_id = coalesce(owner_user_id, created_by_user_id),
  created_by_user_id = coalesce(created_by_user_id, owner_user_id)
where title is null
   or file_name is null
   or owner_user_id is null
   or created_by_user_id is null;

alter table public.documents
  add column if not exists search_vector tsvector generated always as (
    to_tsvector(
      'english',
      coalesce(name, '') || ' ' ||
      coalesce(title, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(file_name, '') || ' ' ||
      coalesce(mime_type, '') || ' ' ||
      coalesce(array_to_string(tags, ' '), '')
    )
  ) stored;

create table if not exists public.document_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  file_name text not null,
  file_size bigint not null default 0 check (file_size >= 0),
  mime_type text not null,
  storage_path text not null,
  checksum text,
  created_by_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (document_id, version_number)
);

create table if not exists public.document_tag_links (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  tag_id uuid not null references public.document_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (document_id, tag_id)
);

create table if not exists public.document_permissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  principal_type text not null check (principal_type in ('user', 'role', 'team', 'department', 'organization', 'external')),
  principal_id uuid,
  access_level text not null default 'viewer' check (access_level in ('viewer', 'editor', 'owner')),
  created_by_user_id uuid references public.users(id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.document_favorites (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (document_id, user_id)
);

create table if not exists public.document_activity (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  actor_user_id uuid references public.users(id) on delete set null,
  action text not null check (action in ('uploaded', 'viewed', 'edited', 'downloaded', 'deleted', 'archived', 'restored', 'permission_changed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.knowledge_articles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  body_markdown text not null default '',
  summary text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  category_id uuid references public.document_categories(id) on delete set null,
  author_user_id uuid references public.users(id) on delete set null,
  tags text[] not null default '{}'::text[],
  is_favorite boolean not null default false,
  last_viewed_at timestamptz,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.knowledge_articles
  add column if not exists search_vector tsvector generated always as (
    to_tsvector(
      'english',
      coalesce(title, '') || ' ' ||
      coalesce(summary, '') || ' ' ||
      coalesce(body_markdown, '') || ' ' ||
      coalesce(array_to_string(tags, ' '), '')
    )
  ) stored;

create table if not exists public.knowledge_article_tags (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  article_id uuid not null references public.knowledge_articles(id) on delete cascade,
  tag_id uuid not null references public.document_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (article_id, tag_id)
);

create index if not exists documents_sprint9_org_status_idx on public.documents (organization_id, status, updated_at desc);
create index if not exists documents_sprint9_category_idx on public.documents (organization_id, category_id);
create index if not exists documents_sprint9_owner_idx on public.documents (organization_id, owner_user_id, updated_at desc);
create index if not exists documents_sprint9_visibility_idx on public.documents (organization_id, visibility, status);
create index if not exists documents_sprint9_search_idx on public.documents using gin (search_vector);
create index if not exists document_versions_sprint9_document_idx on public.document_versions (organization_id, document_id, version_number desc);
create index if not exists document_permissions_sprint9_document_idx on public.document_permissions (organization_id, document_id, principal_type, principal_id);
create index if not exists document_activity_sprint9_document_idx on public.document_activity (organization_id, document_id, created_at desc);
create index if not exists document_activity_sprint9_actor_idx on public.document_activity (organization_id, actor_user_id, created_at desc);
create index if not exists knowledge_articles_sprint9_org_status_idx on public.knowledge_articles (organization_id, status, updated_at desc);
create index if not exists knowledge_articles_sprint9_search_idx on public.knowledge_articles using gin (search_vector);

drop trigger if exists set_document_categories_updated_at on public.document_categories;
create trigger set_document_categories_updated_at
  before update on public.document_categories
  for each row execute function public.set_updated_at();

drop trigger if exists set_document_tags_updated_at on public.document_tags;
create trigger set_document_tags_updated_at
  before update on public.document_tags
  for each row execute function public.set_updated_at();

drop trigger if exists set_knowledge_articles_updated_at on public.knowledge_articles;
create trigger set_knowledge_articles_updated_at
  before update on public.knowledge_articles
  for each row execute function public.set_updated_at();

drop trigger if exists audit_documents_changes on public.documents;
create trigger audit_documents_changes
  after insert or update on public.documents
  for each row execute function public.record_enterprise_audit_log();

drop trigger if exists audit_knowledge_articles_changes on public.knowledge_articles;
create trigger audit_knowledge_articles_changes
  after insert or update on public.knowledge_articles
  for each row execute function public.record_enterprise_audit_log();

drop trigger if exists audit_document_permissions_changes on public.document_permissions;
create trigger audit_document_permissions_changes
  after insert or update on public.document_permissions
  for each row execute function public.record_enterprise_audit_log();

alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.document_categories enable row level security;
alter table public.document_tags enable row level security;
alter table public.document_tag_links enable row level security;
alter table public.document_permissions enable row level security;
alter table public.document_favorites enable row level security;
alter table public.document_activity enable row level security;
alter table public.knowledge_articles enable row level security;
alter table public.knowledge_article_tags enable row level security;

drop policy if exists documents_member_select on public.documents;
drop policy if exists documents_manager_write on public.documents;
drop policy if exists documents_sprint9_select on public.documents;
drop policy if exists documents_sprint9_insert on public.documents;
drop policy if exists documents_sprint9_update on public.documents;

create policy documents_sprint9_select
  on public.documents for select
  to authenticated
  using (
    public.has_any_role(organization_id, array['Super Admin', 'Organization Admin']::public.app_role[])
    or (
      public.is_org_member(organization_id)
      and (
        owner_user_id = (select auth.uid())
        or created_by_user_id = (select auth.uid())
        or (
          visibility in ('organization', 'team', 'department')
          and public.has_any_role(organization_id, array['Executive', 'Manager', 'Employee', 'Consultant']::public.app_role[])
        )
        or (
          visibility = 'shared'
          and exists (
            select 1
            from public.document_permissions permission
            where permission.document_id = documents.id
              and permission.organization_id = documents.organization_id
              and (permission.expires_at is null or permission.expires_at > now())
              and (
                (permission.principal_type = 'user' and permission.principal_id = (select auth.uid()))
                or (permission.principal_type = 'organization' and public.is_org_member(documents.organization_id))
                or (
                  permission.principal_type = 'role'
                  and exists (
                    select 1
                    from public.user_roles user_role
                    where user_role.organization_id = documents.organization_id
                      and user_role.user_id = (select auth.uid())
                      and user_role.role_id = permission.principal_id
                  )
                )
              )
          )
        )
      )
    )
  );

create policy documents_sprint9_insert
  on public.documents for insert
  to authenticated
  with check (
    public.has_any_role(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager', 'Employee']::public.app_role[])
  );

create policy documents_sprint9_update
  on public.documents for update
  to authenticated
  using (
    public.has_any_role(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager']::public.app_role[])
    or (
      public.has_any_role(organization_id, array['Employee']::public.app_role[])
      and coalesce(owner_user_id, created_by_user_id) = (select auth.uid())
    )
  )
  with check (
    public.has_any_role(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager']::public.app_role[])
    or (
      public.has_any_role(organization_id, array['Employee']::public.app_role[])
      and coalesce(owner_user_id, created_by_user_id) = (select auth.uid())
    )
  );

drop policy if exists document_versions_sprint9_select on public.document_versions;
drop policy if exists document_versions_sprint9_insert on public.document_versions;

create policy document_versions_sprint9_select
  on public.document_versions for select
  to authenticated
  using (
    exists (
      select 1
      from public.documents document
      where document.id = document_versions.document_id
        and document.organization_id = document_versions.organization_id
    )
  );

create policy document_versions_sprint9_insert
  on public.document_versions for insert
  to authenticated
  with check (
    public.has_any_role(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager', 'Employee']::public.app_role[])
    and exists (
      select 1
      from public.documents document
      where document.id = document_versions.document_id
        and document.organization_id = document_versions.organization_id
    )
  );

drop policy if exists document_categories_sprint9_select on public.document_categories;
drop policy if exists document_categories_sprint9_write on public.document_categories;
drop policy if exists document_tags_sprint9_select on public.document_tags;
drop policy if exists document_tags_sprint9_write on public.document_tags;

create policy document_categories_sprint9_select
  on public.document_categories for select
  to authenticated
  using (public.is_org_member(organization_id));

create policy document_categories_sprint9_write
  on public.document_categories for all
  to authenticated
  using (public.has_any_role(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager']::public.app_role[]))
  with check (public.has_any_role(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager']::public.app_role[]));

create policy document_tags_sprint9_select
  on public.document_tags for select
  to authenticated
  using (public.is_org_member(organization_id));

create policy document_tags_sprint9_write
  on public.document_tags for all
  to authenticated
  using (public.has_any_role(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager']::public.app_role[]))
  with check (public.has_any_role(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager']::public.app_role[]));

drop policy if exists document_tag_links_sprint9_select on public.document_tag_links;
drop policy if exists document_tag_links_sprint9_write on public.document_tag_links;

create policy document_tag_links_sprint9_select
  on public.document_tag_links for select
  to authenticated
  using (public.is_org_member(organization_id));

create policy document_tag_links_sprint9_write
  on public.document_tag_links for all
  to authenticated
  using (public.has_any_role(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager']::public.app_role[]))
  with check (public.has_any_role(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager']::public.app_role[]));

drop policy if exists document_permissions_sprint9_select on public.document_permissions;
drop policy if exists document_permissions_sprint9_write on public.document_permissions;

create policy document_permissions_sprint9_select
  on public.document_permissions for select
  to authenticated
  using (
    public.has_any_role(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager']::public.app_role[])
    or created_by_user_id = (select auth.uid())
    or (principal_type = 'user' and principal_id = (select auth.uid()))
  );

create policy document_permissions_sprint9_write
  on public.document_permissions for all
  to authenticated
  using (public.has_any_role(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager']::public.app_role[]))
  with check (public.has_any_role(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager']::public.app_role[]));

drop policy if exists document_favorites_sprint9_owner on public.document_favorites;

create policy document_favorites_sprint9_owner
  on public.document_favorites for all
  to authenticated
  using (user_id = (select auth.uid()) and public.is_org_member(organization_id))
  with check (user_id = (select auth.uid()) and public.is_org_member(organization_id));

drop policy if exists document_activity_sprint9_select on public.document_activity;
drop policy if exists document_activity_sprint9_insert on public.document_activity;

create policy document_activity_sprint9_select
  on public.document_activity for select
  to authenticated
  using (public.is_org_member(organization_id));

create policy document_activity_sprint9_insert
  on public.document_activity for insert
  to authenticated
  with check (public.is_org_member(organization_id));

drop policy if exists knowledge_articles_sprint9_select on public.knowledge_articles;
drop policy if exists knowledge_articles_sprint9_insert on public.knowledge_articles;
drop policy if exists knowledge_articles_sprint9_update on public.knowledge_articles;

create policy knowledge_articles_sprint9_select
  on public.knowledge_articles for select
  to authenticated
  using (
    public.has_any_role(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager', 'Employee', 'Consultant']::public.app_role[])
    or (status = 'published' and public.is_org_member(organization_id))
    or author_user_id = (select auth.uid())
  );

create policy knowledge_articles_sprint9_insert
  on public.knowledge_articles for insert
  to authenticated
  with check (
    public.has_any_role(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager', 'Employee']::public.app_role[])
    and author_user_id = (select auth.uid())
  );

create policy knowledge_articles_sprint9_update
  on public.knowledge_articles for update
  to authenticated
  using (
    public.has_any_role(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager']::public.app_role[])
    or author_user_id = (select auth.uid())
  )
  with check (
    public.has_any_role(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager']::public.app_role[])
    or author_user_id = (select auth.uid())
  );

drop policy if exists knowledge_article_tags_sprint9_select on public.knowledge_article_tags;
drop policy if exists knowledge_article_tags_sprint9_write on public.knowledge_article_tags;

create policy knowledge_article_tags_sprint9_select
  on public.knowledge_article_tags for select
  to authenticated
  using (public.is_org_member(organization_id));

create policy knowledge_article_tags_sprint9_write
  on public.knowledge_article_tags for all
  to authenticated
  using (public.has_any_role(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager']::public.app_role[]))
  with check (public.has_any_role(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager']::public.app_role[]));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'axxess-documents',
  'axxess-documents',
  false,
  52428800,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain',
    'text/markdown',
    'text/x-markdown',
    'application/json'
  ]::text[]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists axxess_documents_storage_select on storage.objects;
drop policy if exists axxess_documents_storage_insert on storage.objects;
drop policy if exists axxess_documents_storage_update on storage.objects;
drop policy if exists axxess_documents_storage_delete on storage.objects;

create policy axxess_documents_storage_select
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'axxess-documents'
    and (storage.foldername(name))[1] = 'organizations'
    and (storage.foldername(name))[2] ~* '^[0-9a-f-]{36}$'
    and public.is_org_member(((storage.foldername(name))[2])::uuid)
  );

create policy axxess_documents_storage_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'axxess-documents'
    and (storage.foldername(name))[1] = 'organizations'
    and (storage.foldername(name))[2] ~* '^[0-9a-f-]{36}$'
    and public.has_any_role(((storage.foldername(name))[2])::uuid, array['Super Admin', 'Organization Admin', 'Executive', 'Manager', 'Employee']::public.app_role[])
  );

create policy axxess_documents_storage_update
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'axxess-documents'
    and (storage.foldername(name))[1] = 'organizations'
    and (storage.foldername(name))[2] ~* '^[0-9a-f-]{36}$'
    and public.has_any_role(((storage.foldername(name))[2])::uuid, array['Super Admin', 'Organization Admin', 'Executive', 'Manager', 'Employee']::public.app_role[])
  )
  with check (
    bucket_id = 'axxess-documents'
    and (storage.foldername(name))[1] = 'organizations'
    and (storage.foldername(name))[2] ~* '^[0-9a-f-]{36}$'
    and public.has_any_role(((storage.foldername(name))[2])::uuid, array['Super Admin', 'Organization Admin', 'Executive', 'Manager', 'Employee']::public.app_role[])
  );

create policy axxess_documents_storage_delete
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'axxess-documents'
    and (storage.foldername(name))[1] = 'organizations'
    and (storage.foldername(name))[2] ~* '^[0-9a-f-]{36}$'
    and public.has_any_role(((storage.foldername(name))[2])::uuid, array['Super Admin', 'Organization Admin']::public.app_role[])
  );

grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.documents,
  public.document_versions,
  public.document_categories,
  public.document_tags,
  public.document_tag_links,
  public.document_permissions,
  public.document_favorites,
  public.document_activity,
  public.knowledge_articles,
  public.knowledge_article_tags
to authenticated;

grant usage on schema storage to authenticated;
grant select, insert, update, delete on storage.objects to authenticated;

comment on table public.documents is 'Enterprise document metadata. Binary objects are private Supabase Storage files referenced by storage_path.';
comment on table public.document_versions is 'Immutable document version metadata for uploaded files.';
comment on table public.document_permissions is 'Explicit document sharing permissions for user, role, organization, and future external principals.';
comment on table public.knowledge_articles is 'Markdown knowledge-base articles for the non-AI Knowledge Hub.';
comment on table public.document_activity is 'Document audit activity for uploaded, viewed, edited, downloaded, archived, restored, and permission changed events.';
comment on column public.documents.storage_path is 'Private storage object path. Use signed URLs only; never expose public document URLs.';
