-- Verify a restored AXXESS staging database.

select 'organizations' as check_name, count(*) as row_count from public.organizations;
select 'users' as check_name, count(*) as row_count from public.users;
select 'workspaces' as check_name, count(*) as row_count from public.workspaces;
select 'documents' as check_name, count(*) as row_count from public.documents;
select 'audit_logs' as check_name, count(*) as row_count from public.audit_logs;
select 'prompt_versions' as check_name, count(*) as row_count from public.prompt_versions;
select 'ai_output_audit' as check_name, count(*) as row_count from public.ai_output_audit;
