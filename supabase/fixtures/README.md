# Mock Seed Fixtures

These fixtures model the first local Supabase seed set for AXXESS. They are JSON
on purpose: the migration references `auth.users`, so executable SQL seeds should
be generated only after local Auth seed users are finalized.

Use these records to generate `supabase/seed.sql` in a later sprint.
