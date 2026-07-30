-- Real document text extraction (PDF text-layer / OCR / DOCX / plain text) needs somewhere to
-- persist what was actually extracted from a version's file, and how, so the RAG pipeline and UI
-- never have to guess or re-derive it. document_versions is the right home: it is already
-- version-specific (matches the existing checksum/storage_path-per-version pattern), and a
-- re-extraction naturally becomes a new version rather than mutating history.
alter table public.document_versions
  add column if not exists extracted_text text,
  add column if not exists extraction_method text
    check (extraction_method is null or extraction_method in ('text-layer', 'ocr', 'docx', 'plain')),
  add column if not exists extraction_truncated boolean not null default false;

comment on column public.document_versions.extracted_text is 'Real text extracted from this version''s file (PDF text-layer/OCR, DOCX, or plain-text decode). Null when extraction was not attempted or not supported for the file type.';
comment on column public.document_versions.extraction_method is 'How extracted_text was produced: text-layer (PDF text layer), ocr (rendered pages + Tesseract), docx (mammoth), or plain (direct UTF-8 decode).';
comment on column public.document_versions.extraction_truncated is 'True when extraction hit a page/character cap and extracted_text is a partial result, not the full document.';
