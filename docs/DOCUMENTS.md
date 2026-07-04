# Knowledge Hub Document Architecture

Sprint 9 adds the enterprise document layer that future Institutional Memory, AI, and RAG features will use. This sprint does not add AI behavior.

## Scope

The Knowledge Hub supports:

- Documents
- Knowledge articles
- Categories
- Tags
- Search
- Recent activity
- Shared with me
- Favorites
- Archived documents

## Data Model

Document metadata lives in `public.documents`. File binaries live in the private Supabase Storage bucket named `axxess-documents`.

Related tables:

- `document_versions`: immutable version metadata for uploaded files.
- `document_categories`: tenant-scoped category hierarchy.
- `document_tags`: tenant-scoped tag dictionary.
- `document_tag_links`: normalized document-to-tag relationships.
- `document_permissions`: explicit sharing permissions.
- `document_favorites`: per-user favorites.
- `document_activity`: document action timeline.
- `knowledge_articles`: Markdown knowledge-base content.
- `knowledge_article_tags`: normalized article-to-tag relationships.

## Supported Types

The architecture recognizes PDF, DOCX, XLSX, PPTX, images, text, Markdown, links, and unknown file types. OCR is intentionally not included in Sprint 9.

## Workflows

Implemented foundations:

- Upload with metadata creation.
- Signed preview and download intent.
- Rename and metadata edit.
- Visibility update.
- Archive and restore.
- Soft delete.
- Category and tag management.
- Knowledge article draft and publish states.
- Activity records for document events.

## Permissions

Documents inherit organization membership and role boundaries. Guest users can only access documents through explicit/shared visibility paths. Manager and higher roles can manage taxonomy and document permissions.

See `docs/STORAGE.md` for private object access and `docs/SEARCH.md` for search behavior.
