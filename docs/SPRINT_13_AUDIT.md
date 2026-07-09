# Sprint 13 Audit

This audit was completed before Sprint 13 implementation work. It reflects the current AXXESS TRIAXIS repository state after Sprint 12 security/compliance foundations.

## 1. Current Architecture Summary

AXXESS is currently a root-level Next.js 15 App Router application using React 18, TypeScript, Tailwind CSS, Radix/shadcn-style components, Supabase-oriented repositories, private document storage architecture, governed RAG, local NLP, analytics providers, and Vercel-ready deployment configuration.

Important existing strengths:

- Root web app builds through `pnpm run build` and is configured through `next.config.mjs` and `vercel.json`.
- Protected route middleware exists and checks the `axxess-access-token` httpOnly cookie when `NEXT_PUBLIC_AXXESS_AUTH_SHELL=true`.
- Supabase Auth REST calls are server-side in `src/auth/serverSession.ts`.
- Login/logout/session API routes exist under `src/app/api/auth`.
- Demo Mode is isolated through `src/demo` and has resilient repository fallback for investor preview.
- RAG retrieval is tenant-aware and permission-aware at the repository/service layer.
- Sprint 12 added enterprise IAM, tenant guard, privacy, compliance, AI governance, audit integrity, and PostHog-ready observability modules.
- Supabase migrations already cover organizations, users, programs, projects, tasks, meetings, documents, Knowledge Hub, beta feedback, and Sprint 12 governance tables.
- Playwright config and E2E tests already exist under `tests/e2e`.
- GitHub CI and security workflows exist.

Architecture decision for Sprint 13:

- Preserve the root Next.js app for Vercel instead of moving it into `apps/web`.
- Add `apps/mobile` as a separate Expo project.
- Add `packages/shared` only for low-risk shared constants/types.
- Document future monorepo migration rather than performing it during the enterprise beta readiness sprint.

Risk ranking: low risk for additive modules, medium risk for new pages/API routes, high risk for root app migration.

## 2. Current Auth Gaps

Existing:

- Email/password login.
- Logout.
- Server-side session cookies.
- Session refresh.
- Investor preview login.
- Protected route middleware.
- Local profile editing.

Gaps:

- No dedicated sign-up page.
- No forgot-password/reset-password pages.
- No MFA enrollment or challenge UI.
- No OAuth initiation routes/pages.
- No passkey-ready route surface.
- No account deletion initiation UI.
- No privacy export request UI.
- No admin deactivation workflow beyond basic settings user status controls.
- Auth events are logged for login/logout but not for every security workflow.
- `metadata.email` in audit logging should be avoided or tokenized for production privacy.

Risk ranking: high for MFA/OAuth/passkey real provider flows because they depend on Supabase project configuration; medium for page/API scaffolding.

## 3. Current Tenant/RLS Gaps

Existing:

- `organization_id` is broadly present.
- RLS policies exist across core tables and Knowledge Hub.
- Private storage policies are tenant-aware by organization folder path.
- Sprint 12 added departments, workspaces, privacy, compliance, prompt registry, AI audit, and vector manifest tables.

Gaps:

- Existing core tables do not consistently include `tenant_id`, `workspace_id`, `department_id`, `created_by`, `updated_by`, and `deleted_at`.
- RLS helper functions are split across earlier and Sprint 12 migrations.
- No checked-in SQL persona test suite exists under `supabase/tests`.
- No documented result file exists for staging RLS persona execution.
- Document access RLS is strong but workspace-aware policy coverage is still incomplete.
- No migration rollback notes for every staging promotion step.

Risk ranking: high for changing existing production table shape; medium for additive migration/test files.

## 4. Current Onboarding Gaps

Existing:

- Beta onboarding checklist component exists.
- Invitation creation and acceptance routes exist.
- User administration panel can invite and update users.

Gaps:

- No `/onboarding` route family.
- No create organization flow.
- No join organization flow beyond invitation acceptance.
- No sector selection.
- No workspace/department provisioning page.
- No terms/privacy/AI notice/beta disclaimer acceptance flow.
- No tenant provisioning repository abstraction.
- No onboarding audit event model.
- No organization/workspace switcher.

Risk ranking: medium for client-side onboarding flow and server stubs; high for fully live Supabase tenant provisioning without staging credentials.

## 5. Current Mobile-Readiness Gaps

Existing:

- Mobile release documentation exists from Sprint 12.

Gaps:

- No `apps/mobile` Expo project.
- No Expo/EAS config.
- No Android package or iOS bundle identifier.
- No mobile auth client.
- No mobile secure session storage.
- No mobile screens.
- No mobile build scripts.
- No Bitrise mobile workflows.
- No app icons/splash assets.

Risk ranking: medium for Expo scaffold and EAS config; high for actual store builds because Apple/Google credentials are external.

## 6. Current Analytics Gaps

Existing:

- Mixpanel provider.
- Mock/noop-like provider.
- PostHog adapter from Sprint 12.
- Sanitization blocks raw content, documents, notes, tokens, secrets, and PII-like keys.

Gaps:

- Provider selection is implicit: PostHog wins if `NEXT_PUBLIC_POSTHOG_KEY` is set, otherwise Mixpanel.
- Missing explicit `NEXT_PUBLIC_ANALYTICS_PROVIDER`.
- Event taxonomy does not yet include all Sprint 13 events.
- PostHog dashboard definitions are not documented.
- Mobile analytics path is not defined.
- User identifiers should be stable and hashed where feasible.

Risk ranking: low for provider abstraction updates and docs.

## 7. Current App Store / Play Store Readiness Gaps

Existing:

- Mobile release foundation doc exists.

Gaps:

- No actual Expo app.
- No account deletion initiation page.
- No privacy/data map.
- No AI data usage notice.
- No beta disclaimer.
- No Apple privacy label mapping.
- No Google Play Data Safety mapping.
- No support/privacy policy URL plan beyond placeholders.
- No Sign in with Apple assessment for future social login.

Risk ranking: medium for docs and account deletion request flow; high for store submission without credentials and final URLs.

## 8. Current Due Diligence Risk List

Highest risks before paid pilots:

1. MFA/OAuth/passkeys depend on Supabase project-side configuration.
2. RLS persona tests are not yet automated against a staging database.
3. Existing root app is not a formal monorepo, so mobile must be additive.
4. Mobile build cannot be proven without Expo/Apple/Google credentials.
5. Admin UI exists only partially through Settings and Product Analytics.
6. Compliance is an audit-ready foundation, not certification.
7. Backup/restore runbooks exist, but no completed restore drill evidence is checked in.
8. Analytics dashboards are not yet provisioned in PostHog/Mixpanel.
9. CSP currently needs external connect sources for Supabase/PostHog/Mixpanel deployments.
10. Service role must remain server-only for all provisioning workflows.

## 9. Proposed Implementation Plan

Sprint 13 should prioritize:

1. Preserve root web build and Vercel deployment path.
2. Add audit-ready onboarding/auth pages and route stubs.
3. Add tenant provisioning and security workflow utilities that never expose service-role keys client-side.
4. Add admin console pages for departments, workspaces, privacy, compliance, prompt approvals, audit logs, and backups.
5. Add Supabase staging migration and RLS persona tests.
6. Add analytics provider selection and dashboard docs.
7. Add additive Expo mobile project with EAS config and mobile README.
8. Add Bitrise, Playwright, Supabase RLS, and mobile validation workflows.
9. Add App Store, Play Store, privacy/data, account deletion, backup/restore, and due diligence docs.
10. Run feasible checks and document external blockers clearly.

## 10. Implementation Order With Risk Ranking

1. Audit document: low risk.
2. Environment variables and CSP updates: low risk.
3. Analytics provider selection and events: low risk.
4. Shared package constants: low risk.
5. Onboarding pages and local state model: medium risk.
6. Auth security pages and API placeholders: medium risk.
7. Admin pages using existing shell routing: medium risk.
8. Supabase additive migration and SQL persona tests: medium risk.
9. Expo mobile scaffold and EAS config: medium risk.
10. Bitrise and GitHub workflow expansion: medium risk.
11. Store readiness and due diligence docs: low risk.
12. Live Supabase migration execution, EAS builds, TestFlight, Play Console, PostHog dashboard provisioning: external/provider-gated high risk.

Sprint 13 should not migrate the root web app into `apps/web` because that would add deployment and import-path risk without improving immediate beta readiness.
