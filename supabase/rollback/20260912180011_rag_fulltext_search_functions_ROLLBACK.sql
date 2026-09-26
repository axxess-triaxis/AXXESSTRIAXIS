-- ROLLBACK for supabase/migrations/20260912180011_rag_fulltext_search_functions.sql
--
-- NOT a migration -- kept outside supabase/migrations/ so the CLI never auto-applies it.
--
-- Purely additive migration (two new functions, no existing object touched), so rollback is a
-- plain drop -- there is no prior function body to restore. Safe to run even if application code
-- has already been deployed to call these functions: every caller falls back to the pre-existing
-- full-scan retrieval path whenever the RPC call fails (governedRag.ts/tenantRagWorkflow.ts treat
-- a thrown error from this repository method as "no full-text candidates," not a hard failure).

drop function if exists public.search_documents_fulltext(uuid, text, int);
drop function if exists public.search_knowledge_articles_fulltext(uuid, text, int);
