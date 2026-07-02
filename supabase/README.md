# AXXESS Supabase Preparation

Sprint 2 adds migration drafts only. The React app does not connect to Supabase yet.

Planned backend responsibilities:

- Supabase Auth for identity.
- PostgreSQL for organizations, users, RBAC, projects, programs, tasks, documents, meetings, decisions, stakeholders, risks, notifications, and audit logs.
- Row Level Security on every tenant-scoped table.
- Object Storage and vector embeddings in later sprints after the core tenant model is stable.

Apply these migrations only after environment setup, project credentials, and seed data strategy are approved.

Mock fixtures live in `supabase/fixtures`. They are intentionally JSON until
local Supabase Auth seed users are finalized.
