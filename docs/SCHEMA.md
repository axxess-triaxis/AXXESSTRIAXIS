# Schema Notes

The Supabase schema is migration-driven.

## Core Tables

- Organizations
- Users and profiles
- Roles and permissions
- Programs
- Projects
- Tasks
- Meetings
- Notifications
- Audit logs
- Documents
- Knowledge articles
- Beta feedback

## Sprint 12 Tables

- Departments
- Workspaces
- Workspace members
- Security audit events
- Privacy requests
- Privacy consents
- Retention policies
- Compliance policies
- Prompt registry
- Prompt versions
- AI output audit
- Encryption key registry
- Vector index manifests

## Required Tenant Columns

Tenant-owned tables should include:

- `organization_id`
- User/owner where applicable
- Department/workspace where applicable
- Classification or visibility where applicable
- Audit timestamps

## RLS Rule

Every table exposed through Supabase APIs must have RLS enabled and policies that combine authentication with authorization.
