-- MN-8 (2026-08-24): user display picture + availability, organization logo upload.
-- docs/readiness/ANDROID_BETA_0_9_V3_WALKTHROUGH_TRIAGE_2026_08_24.md items 13-14. Founder-
-- confirmed scope: `availability` is a self-reported label only (no visibility/access-control
-- logic reads it anywhere), user-set manually (no activity-based inference). New field name, not
-- a second `status` -- users.status already means account lifecycle (active/invited/suspended).

alter table public.users
  add column if not exists avatar_path text,
  add column if not exists availability text not null default 'public'
    check (availability in ('public', 'private', 'inactive'));

-- Mirrors the existing avatar_initials symmetry between profiles and users (both already written
-- by updateTenantProfile in src/auth/provisioning.ts).
alter table public.profiles
  add column if not exists avatar_path text;

alter table public.organizations
  add column if not exists logo_path text;

-- Dedicated bucket, not a path prefix in axxess-documents: that bucket's own write RLS excludes
-- Consultant/Guest, but avatar upload needs every role; a dedicated bucket also lets Supabase
-- enforce a much smaller size cap and an image-only mime allowlist at the config level rather than
-- only in application code. public = true is a deliberate tradeoff (flagged to the founder in the
-- MN-8 plan) -- the only public bucket in this schema, chosen because avatars/logos are
-- low-sensitivity and render in 8+ Avatar.tsx call sites without a signed-URL round trip. Object
-- paths still embed the org/user UUID, so nothing is enumerable, but anyone holding a URL can
-- fetch the image without an active session.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'axxess-avatars',
  'axxess-avatars',
  true,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update
set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists axxess_avatars_storage_select on storage.objects;
drop policy if exists axxess_avatars_storage_avatar_insert on storage.objects;
drop policy if exists axxess_avatars_storage_avatar_delete on storage.objects;
drop policy if exists axxess_avatars_storage_logo_insert on storage.objects;
drop policy if exists axxess_avatars_storage_logo_delete on storage.objects;

-- Read: any active member of the org. Bucket is also public=true above (so a raw object URL needs
-- no auth at all), but this policy still documents intent for anyone querying via an authenticated
-- Postgres/PostgREST session rather than the public URL.
create policy axxess_avatars_storage_select
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'axxess-avatars'
    and (storage.foldername(name))[1] = 'organizations'
    and (storage.foldername(name))[2] ~* '^[0-9a-f-]{36}$'
    and public.is_org_member(((storage.foldername(name))[2])::uuid)
  );

-- Path: organizations/{orgId}/users/{userId}/avatar/{filename}. Self-service, ANY role, but only
-- into the caller's own userId subfolder -- item 14's stated scope (every role, no admin gate).
create policy axxess_avatars_storage_avatar_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'axxess-avatars'
    and (storage.foldername(name))[1] = 'organizations'
    and (storage.foldername(name))[2] ~* '^[0-9a-f-]{36}$'
    and (storage.foldername(name))[3] = 'users'
    and (storage.foldername(name))[4] = auth.uid()::text
    and (storage.foldername(name))[5] = 'avatar'
    and public.is_org_member(((storage.foldername(name))[2])::uuid)
  );

create policy axxess_avatars_storage_avatar_delete
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'axxess-avatars'
    and (storage.foldername(name))[1] = 'organizations'
    and (storage.foldername(name))[3] = 'users'
    and (storage.foldername(name))[4] = auth.uid()::text
    and (storage.foldername(name))[5] = 'avatar'
  );

-- Path: organizations/{orgId}/logo/{filename}. Item 13's stated scope: Super Admin/Organization
-- Admin of that org only -- mirrors canManageOrganization in src/security/rbac.ts.
create policy axxess_avatars_storage_logo_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'axxess-avatars'
    and (storage.foldername(name))[1] = 'organizations'
    and (storage.foldername(name))[2] ~* '^[0-9a-f-]{36}$'
    and (storage.foldername(name))[3] = 'logo'
    and public.has_any_role(((storage.foldername(name))[2])::uuid, array['Super Admin', 'Organization Admin']::public.app_role[])
  );

create policy axxess_avatars_storage_logo_delete
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'axxess-avatars'
    and (storage.foldername(name))[1] = 'organizations'
    and (storage.foldername(name))[3] = 'logo'
    and public.has_any_role(((storage.foldername(name))[2])::uuid, array['Super Admin', 'Organization Admin']::public.app_role[])
  );

grant select, insert, delete on storage.objects to authenticated;

comment on column public.users.avatar_path is 'Supabase Storage path in axxess-avatars, e.g. organizations/{orgId}/users/{userId}/avatar/{filename}. Not a public URL -- resolved client-side via buildPublicAvatarUrl.';
comment on column public.users.availability is 'Self-reported label only (public/private/inactive) -- no visibility/access-control logic reads this field. User-set manually, never inferred.';
comment on column public.organizations.logo_path is 'Supabase Storage path in axxess-avatars, e.g. organizations/{orgId}/logo/{filename}. Write gated to Super Admin/Organization Admin via canManageOrganization.';
