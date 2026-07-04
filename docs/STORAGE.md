# Supabase Storage Strategy

Sprint 9 introduces private enterprise document storage through Supabase Storage.

## Bucket

Bucket name: `axxess-documents`

Properties:

- Private bucket.
- 50 MB file limit.
- MIME allowlist for PDF, Office documents, images, text, Markdown, and JSON.
- No public URLs.

## Object Path

Objects use an organization-first path:

```text
organizations/{organization_id}/documents/{document_id}/versions/{version_id}/{filename}
```

This makes storage policies tenant-aware and keeps future version, retention, and legal hold workflows straightforward.

## Access

The app requests signed upload and download URLs through:

```text
POST /api/documents/storage-url
```

The endpoint:

- Requires a server-side Supabase Auth session.
- Confirms the path belongs to the active organization.
- Validates MIME type and file size for uploads.
- Uses the user's Supabase access token, not the service role key.
- Records signed URL intent events in audit logs.

## RLS

The migration creates `storage.objects` policies for:

- Tenant-scoped read.
- Authenticated role-scoped insert.
- Authenticated role-scoped update for upload replacement support.
- Admin-only delete.

The storage policies match Supabase's Storage RLS model and avoid exposing the service role key to browser code.

## Security Notes

- Do not make `axxess-documents` public.
- Do not place `SUPABASE_SERVICE_ROLE_KEY` in `NEXT_PUBLIC_*` variables.
- Prefer soft deletion in `public.documents` before object deletion.
- Keep signed URL expiry short.
- Audit uploads, downloads, archive, restore, delete, and permission changes.
