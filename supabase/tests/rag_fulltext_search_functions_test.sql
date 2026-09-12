-- pgTAP tests for search_documents_fulltext / search_knowledge_articles_fulltext
-- (20260912180011_rag_fulltext_search_functions.sql).
--
-- NOTE: this repo's existing supabase/tests/rls_persona_tests.sql is a template with every real
-- assertion commented out (no persona fixtures were ever actually loaded) -- there was no working
-- pgTAP pattern in this repo to extend. This file seeds its own minimal, self-contained fixtures
-- rather than depending on that incomplete scaffold.
--
-- Run with: supabase start && supabase db reset && pnpm run supabase:test:rls
-- (requires a local Supabase/Docker stack -- not executed as part of this change; see the closeout
-- notes for why. Written to be correct and ready to run once that stack is available.)

begin;
select plan(6);

-- Two orgs, two users, one document + one distinctly-worded knowledge article per org.
insert into public.organizations (id, name, slug) values
  ('11111111-1111-1111-1111-111111111111', 'Org Alpha', 'org-alpha-fts-test'),
  ('22222222-2222-2222-2222-222222222222', 'Org Beta', 'org-beta-fts-test');

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'alpha@example.com'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'beta@example.com');

insert into public.users (id, organization_id, email, display_name, role, status) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'alpha@example.com', 'Alpha Admin', 'Organization Admin', 'active'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'beta@example.com', 'Beta Admin', 'Organization Admin', 'active');

insert into public.documents (id, organization_id, name, title, description, storage_path, file_name, mime_type, document_type, status, visibility, classification, owner_user_id, created_by_user_id) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'alpha-doc', 'Oxygen Resilience SOP', 'Biomedical maintenance oxygen manifold uptime procedure', 'x', 'x.pdf', 'application/pdf', 'pdf', 'active', 'organization', 'internal', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'beta-doc', 'Quarterly Budget Variance Review', 'Finance variance analysis for the quarter', 'x', 'x.pdf', 'application/pdf', 'pdf', 'active', 'organization', 'internal', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

-- 1. Ranked, correctly-scoped result for the org that actually owns the matching document.
select is(
  (select count(*)::int from public.search_documents_fulltext('11111111-1111-1111-1111-111111111111'::uuid, 'oxygen resilience', 10)),
  1,
  'search_documents_fulltext returns the one matching document for its own organization'
);

-- 2. The other org's document never appears for an unrelated query against org alpha.
select is(
  (select count(*)::int from public.search_documents_fulltext('11111111-1111-1111-1111-111111111111'::uuid, 'budget variance', 10)),
  0,
  'search_documents_fulltext does not match a document that only exists in a different organization'
);

-- 3. p_organization_id is a real filter, independent of query wording -- org beta's own budget
-- document IS found when queried under its own org id.
select is(
  (select count(*)::int from public.search_documents_fulltext('22222222-2222-2222-2222-222222222222'::uuid, 'budget variance', 10)),
  1,
  'search_documents_fulltext finds org beta''s own document when queried under its own organization id'
);

-- 4. Cross-tenant isolation: org alpha's oxygen document is never returned when p_organization_id
-- is org beta, even though the query text matches -- proves the WHERE organization_id = ... filter
-- is real, not just a documented intention.
select is(
  (select count(*)::int from public.search_documents_fulltext('22222222-2222-2222-2222-222222222222'::uuid, 'oxygen resilience', 10)),
  0,
  'search_documents_fulltext never returns another organization''s document, even for a matching query'
);

-- 5. RLS-backstop claim (security invoker): as the authenticated role with org alpha's user's JWT,
-- calling the function with a SPOOFED p_organization_id of org beta must still return nothing --
-- RLS on public.documents (documents_sprint9_select) applies underneath the function exactly as it
-- would for a direct table query, so a spoofed argument cannot see another tenant's row.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select is(
  (select count(*)::int from public.search_documents_fulltext('22222222-2222-2222-2222-222222222222'::uuid, 'budget variance', 10)),
  0,
  'RLS backstop: org alpha''s authenticated user gets zero rows even with a spoofed org-beta p_organization_id argument'
);
reset role;

-- 6. Same RLS-backstop proof for the knowledge_articles function, using the alpha document's own
-- organization id (not spoofed) to confirm the invoker-mode function still works normally for the
-- caller's own tenant once RLS is in effect.
insert into public.knowledge_articles (id, organization_id, title, body_markdown, summary, status, author_user_id) values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 'Oxygen Manifold Playbook', 'Oxygen manifold servicing and resilience guidance for district biomedical teams.', 'Oxygen resilience guidance', 'published', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select is(
  (select count(*)::int from public.search_knowledge_articles_fulltext('11111111-1111-1111-1111-111111111111'::uuid, 'oxygen manifold', 10)),
  1,
  'search_knowledge_articles_fulltext returns the matching article for the authenticated caller''s own organization'
);
reset role;

select * from finish();
rollback;
