# Changelog

All notable changes to AXXESS are documented here. This project follows the spirit of Keep a Changelog and uses semantic versioning during pre-1.0 development.

## Unreleased

- Added `docs/SPRINT_1_TO_4_GAP_ANALYSIS_2026_07_22.md`: a dedicated, sprint-by-sprint review of what each of Sprints 1-4 left undone within its own scope, plus cross-cutting structural gaps that span all four. Notable code-verified finding: audit/timeline evidence (added in Sprint 2) is wired for the `projects` resource only -- of 16 resource types the generic `src/app/api/repositories/[resource]/route.ts` handles, tasks/meetings get a notification but no audit/timeline row, and documents/knowledge articles/invitations/programs/etc. get neither. Also confirms no live two-tenant isolation test exists anywhere in the repository (only unit/RLS-level coverage), and that no Playwright/E2E spec has been added for any Sprint 1-4 fix.
- Sprint 4 (Demo/Live Data Separation, Navigation Integrity And Tenant Trust): root-caused F-018 (onboarding progress inconsistency) to `src/features/dashboard/DashboardSection.tsx`, not the onboarding widget -- its `projects` state was seeded with 186 fabricated demo projects unconditionally on initial render and on any live-fetch failure, feeding a false project count into `BetaOnboardingChecklist.tsx`'s completion logic and permanently advancing its "first_project" step for any tenant. Fixed by gating both the initial state and the failure-path fallback behind `isDemoModeEnabled()`. Fixed F-020 (sidebar badges contradicting tenant state): added a `badgeKind?: "tag" | "count"` discriminator to `NavItem` in `src/app/navigation.ts`, so `src/app/layout/Sidebar.tsx` only renders the hardcoded "4"/"23" tenant-count badges in Demo Mode, while the static "AI" feature tag continues to render unconditionally. Regression-verified F-015, F-017 (demo timeline/workflow-records fallbacks) and F-019 (`/documents` route mapping) as already correctly fixed by prior sprints, with no regression found.
- Added tests: `src/features/dashboard/DashboardSection.test.ts`, `src/app/layout/Sidebar.test.tsx` (new); extended `src/features/onboarding/BetaOnboardingChecklist.test.tsx` (+2) and `src/app/routing/lazyRoutes.test.ts` (+1). Full suite: 110 files / 331 tests passing (up from 108/324).
- Verification for Sprint 4: `pnpm run typecheck` clean, `pnpm --dir apps/mobile run typecheck` clean, `pnpm run lint` clean (zero warnings), `pnpm run test` passing, `pnpm run build` succeeded, `pnpm run supabase:verify` passed (27 migrations, 100 RLS-protected tables, no migration changes), `pnpm run mobile:store:release-gate` passed, `pnpm run mobile:capacitor:store:doctor` passed. Doc updates: `docs/SPRINT_LOG.md`, `docs/DEMO_MODE.md`, `docs/BETA_QA_ACTIONABLES_2026_07_22.md`, `docs/BETA_QA_5_SPRINT_REMEDIATION_CHECKLIST_2026_07_22.md`, `docs/BETA_QA_ANALYSIS_AND_REMEDIATION_ROADMAP_2026_07_22.md`, `docs/Post-Claude Code exhaustive workflow audit production remediation package.md`.
- Sprint 3 (Workspace Loading And Error-State Hardening): audited all 9 workspaces the QA report found hanging (F-006-F-014) against the current codebase and found 7 of 9 do not reproduce at all (Approvals/Stakeholders/Analytics are synchronous Demo-Mode-gated stubs; AI Workspace/Integrations/Settings/AI Review Inbox never block render). Fixed a genuine defect in the remaining two (`OrganizationAdminSection.tsx`, `AuditLogsSection.tsx`): a `loading` flag with no terminal fallback on an early return, plus a blank-page pattern for an absent user, replaced with a sign-in-required state. Root-caused and fixed the QA report's exact "Loading Executive Dashboard" mislabel on Approvals: `src/app/routing/routes.ts` had no `appRoutes` entry for `"approvals"` at all, so route lookups silently fell back to the Dashboard route's metadata. Found and fixed 9 raw-backend-error-text leaks (F-016 and the same anti-pattern beyond the one confirmed instance) across `AIReviewInboxPage.tsx`, `AIWorkspaceSection.tsx`, and `IntegrationsSection.tsx` -- all now map 401/403 to fixed, role-aware copy instead of surfacing the raw backend string.
- Added tests: `ApprovalsSection.test.tsx`, `StakeholdersSection.test.tsx`, `AnalyticsSection.test.tsx`, `SettingsSection.test.ts`, `OrganizationAdminSection.test.ts`, `AuditLogsSection.test.ts`, `AIReviewInboxPage.test.ts`, `AIWorkspaceSection.test.ts`, `IntegrationsSection.test.ts`, `RouteBoundary.test.tsx`, plus an `approvals` regression case in `routes.test.ts`. Full suite: 108 files / 324 tests passing (up from 98/299).
- Verification for Sprint 3: `pnpm run typecheck` clean, `pnpm --dir apps/mobile run typecheck` clean, `pnpm run lint` clean (zero warnings), `pnpm run test` passing, `pnpm run build` succeeded, `pnpm run supabase:verify` passed (no migration changes). Doc updates: `docs/SPRINT_LOG.md`, `docs/BETA_QA_ACTIONABLES_2026_07_22.md`, `docs/BETA_QA_5_SPRINT_REMEDIATION_CHECKLIST_2026_07_22.md`, `docs/BETA_QA_ANALYSIS_AND_REMEDIATION_ROADMAP_2026_07_22.md`.
- Sprint 2 (Live Tenant Persistence And Golden Path Writes): fixed the audit/timeline evidence gap behind the QA report's `POST /api/repositories/projects -> 401` finding. Project creation, refresh-survival, unauthenticated failure handling, and tenant-scoped mutation filtering were already correct; the missing piece was that a successful project create wrote no audit or workflow-timeline evidence. Added `recordProjectCreateEvidence` to `src/app/api/repositories/[resource]/route.ts`, reusing the existing `auditLogsRepository`/`recordWorkflowTimelineEvent` pattern. Doc updates: `docs/SPRINT_LOG.md`, `docs/BETA_QA_ACTIONABLES_2026_07_22.md`, `docs/BETA_QA_5_SPRINT_REMEDIATION_CHECKLIST_2026_07_22.md`, `docs/BETA_QA_ANALYSIS_AND_REMEDIATION_ROADMAP_2026_07_22.md`.
- Added tests: 3 new repository-level tests proving cross-tenant write isolation (`src/repositories/supabaseEnterpriseRepositories.test.ts`), a new `src/app/api/repositories/[resource]/route.test.ts` (6 tests), and a new `src/features/projects/ProjectsSection.test.ts` (4 tests). Full suite: 98 files / 299 tests passing (up from 96/286).
- Verification for Sprint 2: `pnpm run typecheck` clean, `pnpm --dir apps/mobile run typecheck` clean, `pnpm run lint` clean (zero warnings), `pnpm run test` passing, `pnpm run build` succeeded, `pnpm run supabase:verify` passed (no migration changes -- same 27 migrations, 100 RLS-protected tables as before).
- Added `docs/AUTOMATION_OVERVIEW.md`: a consolidated reference across GitHub Actions (currently inert, GitHub still suspended), GitLab CI, GitLab Duo Code Review, and the local scheduled task, including an explicit "what is NOT automated" section (production deploys, live migrations, git commit/push itself, live QA replay, mobile store submission, doc updates, secret rotation, and GitHub-only gates with no GitLab equivalent).
- Automated post-sprint CI verification: `.gitlab-ci.yml`'s `quality` and `pnpm-audit` jobs now also trigger on every push to `canonical/sprint-1-35-unified-gitlab` (previously only on merge-request events and `main`/`staging`/`dev`). Automated MR code review is provided by GitLab's native Duo Agent Platform "Code Review" foundational flow rather than a custom pipeline job -- a custom `ai-code-review` job calling the Anthropic API directly was built and then removed the same day once GitLab Duo access was confirmed as the intended path. See `docs/GITLAB_MIRROR.md` "Automated Post-Sprint CI Verification And AI Code Review".
- Added local, git-host-independent post-sprint automation: `scripts/post-sprint-verify-and-preview-deploy.ps1` runs the full verification suite (typecheck, mobile typecheck, lint, test, build, supabase:verify) and, only if every check passes, a Vercel **preview** deploy plus a final supabase:verify -- never a production deploy, never a live migration push. Registered as a Windows Scheduled Task (`AXXESS-PostSprint-VerifyAndPreviewDeploy`, every 2 hours) so it runs regardless of GitHub/GitLab availability, using the already-authenticated local Vercel/Supabase CLIs. Pinned `vercel@56.2.0` as a devDependency and linked this checkout to the `axxesstriaxis` Vercel project (`.vercel/project.json`, gitignored). See `docs/LOCAL_AUTOMATION.md`.
- Sprint 1 (Auth Integrity And Protected Access): fixed `src/middleware.ts` so its edge-level route guard treats the auth-shell flag as production-safe by default (`NEXT_PUBLIC_AXXESS_AUTH_SHELL` unset now behaves as `true`, matching `src/config/featureFlags.ts`). Previously the middleware used a stale `=== "true"` check, so a deployment with the variable unset would leave protected routes unguarded at the edge even after the client-side flag was corrected -- the last gap behind the 2026-07-22 QA report's F-001/F-003/F-004 findings.
- Added `src/auth/AuthProvider.test.tsx` (logout clears session state and does not rehydrate a mock/demo session; client stays unauthenticated when the server reports no session), `src/app/auth/page.test.tsx` (`/auth` renders the real login form, not a mock "Signed in" state, for a fresh unauthenticated browser), and new `src/middleware.test.ts` cases for the auth-shell/demo-mode/session-cookie redirect decision.
- Full verification for this sprint: `pnpm run typecheck` clean, `pnpm --dir apps/mobile run typecheck` clean, `pnpm run lint` clean (zero warnings), `pnpm run test` 96 files / 286 tests passing, `pnpm run build` succeeded (114 routes generated; pre-existing Next.js 16 "middleware file convention is deprecated, use proxy instead" warning noted as unrelated follow-up), `pnpm run supabase:verify` passed (27 migrations, 100 tables, 100 RLS-protected; one pre-existing permissive-RLS warning on the initial schema migration, unrelated to this sprint), `pnpm run mobile:store:release-gate` passed, `pnpm run mobile:capacitor:store:doctor` passed.
- Added next-five-milestones document defining completion gates for Enterprise Beta 1.0, iOS App Store release, Android Google Play release, Mixpanel/PostHog instrumentation across web/iOS/Android betas, and first-30-users analytics review.
- Added beta QA remediation package documenting the raw Claude Code QA artifact, 20 actionables, five-sprint remediation roadmap, per-sprint checklist, exit criteria, verification gates and diligence requirements.
- Added 2026-07-22 beta end-to-end QA report covering live auth failure, loading-state blockers, demo/live data leakage and pilot golden-path readiness.
- Hardened live auth defaults so deployed environments require Supabase-backed auth unless local mock auth is explicitly enabled with `NEXT_PUBLIC_AXXESS_AUTH_SHELL=false`.
- Gated workflow timeline and workflow record demo fallbacks behind Demo Mode so clean live tenants do not show seeded governance records.
- Fixed the lazy route mapping so `/documents` renders the dedicated Documents workspace instead of Knowledge Hub.
- Added canonical workspace migration record documenting the Codex Sprint 1-32 workspace, later Claude workspace, unified GitLab state, verification evidence, remaining duplicate-folder lock, and final verified commit `615faf218fbfe538dcdcd1eb1a079ee05ad65b4b`.
- Added documentation governance standard requiring future work to document changes for technical reviewers, investors, enterprise buyers, due diligence teams, and government or sovereign stakeholders.
- Updated engineering workflow and GitLab continuity documentation to reflect the verified GitLab remote, CLI/API deployment strategy, fast-forward-only safety policy, and documentation-as-product requirements.
- Added Sprint 32 Mobile Store Launch Console for full-stack release readiness across Android, iOS, store metadata, reviewer access, screenshots, release health and staged rollout controls.
- Added role-protected `GET /api/admin/mobile-release` and `POST /api/admin/mobile-release` for mobile release snapshots and audit-backed operator actions.
- Added Sprint 32 Supabase migration for `mobile_release_runs`, `mobile_store_listings`, `mobile_reviewer_accounts`, `mobile_crash_events`, and `mobile_rollout_events` with tenant-scoped RLS.
- Added Apple review notes, Google Play review notes, Apple privacy labels draft, Google Play Data Safety draft, and screenshot manifest under `docs/store`.
- Added `pnpm run mobile:store:release-gate` plus Mobile Store Release Readiness GitHub Actions workflow for listing, reviewer, screenshot, health, route and RLS validation.
- Added Sprint 31 Capacitor store-release certification with strict Android/iOS store readiness validation.
- Added Android Play-ready release configuration with API 36, environment-driven application ID/versioning, signed AAB enforcement, hardened manifest settings, and optional Google Play internal testing upload.
- Added iOS TestFlight-ready release configuration with environment-driven bundle/version/build settings, privacy manifest, export options, App Store Connect key handling, IPA export, validation, and optional TestFlight upload.
- Added VS Code mobile release tasks plus static tests for native store configuration and GitHub Actions release signoff gates.
- Updated mobile release workflow signoff to require an exported iOS `.ipa` and release manifest evidence for store-bound builds.
- Added Sprint 30 customer-success live-ops snapshot engine for stuck-step recovery, SLA timers, regional key policy posture, and operator recommendations.
- Added role-protected `GET /api/admin/customer-success/live-ops` and `POST /api/admin/customer-success/live-ops` for reading and recording live-ops evidence.
- Added Customer-Success Live Operations panel under `/admin/support-ops`.
- Added Sprint 30 Supabase migration for `customer_success_live_ops_snapshots`, `customer_success_recovery_items`, `customer_success_sla_timers`, and `regional_key_policies` with tenant-scoped RLS.
- Added workflow record list/detail pages for approval requests, stakeholder notes, and project updates.
- Added live Microsoft Graph mailbox listing API and Integrations UI control for selected-message import.
- Added Sprint 29 pilot tenant acceptance engine that converts golden-path, pilot health, command-center, and live workspace evidence into a customer-success acceptance score.
- Added Pilot Command Center acceptance panel with checklist evidence, blockers, live-ops handoffs, and operator actions for recording acceptance or handoff.
- Added `GET /api/admin/pilot-acceptance` and `POST /api/admin/pilot-acceptance` for role-protected acceptance reads and writes.
- Added Sprint 29 Supabase migration for `pilot_tenant_acceptance_runs`, `pilot_acceptance_checklist_items`, and `pilot_live_ops_events` with tenant-scoped RLS.
- Extended the Pilot Golden Path Release Gate to include Sprint 29 pilot acceptance Playwright coverage.
- Added Sprint 28 pilot release hardening with first-class approval request, stakeholder note, and project update repositories for reviewed AI actions.
- Added live Microsoft Graph selected-message import parity with preview/confirm workflow, token vault access, document ingestion, task creation, timeline evidence, and audit events.
- Added dashboard snapshot deltas for persisted Pilot Command Center snapshots, linked back to workflow timeline events.
- Added audit export timeline linkage so governed exports can reference workflow provenance evidence.
- Added dedicated Pilot Golden Path Release Gate GitHub Actions workflow for the Sprint 27 golden-path Playwright spec.
- Added Sprint 28 Supabase migration for `approval_requests`, `stakeholder_notes`, `project_updates`, `microsoft_selected_message_imports`, `dashboard_snapshot_deltas`, and `audit_export_timeline_links` with tenant-scoped RLS.
- Added Sprint 27 live tenant workflow execution with tenant-scoped golden-path progress persistence and workflow timeline evidence.
- Added AI Review Inbox “approve and create” workflow action path that creates work through existing repositories, writes audit evidence, sends notification intent, and updates progress.
- Added tenant health command center plus workflow timeline panels across Dashboard, AI Review Inbox, Projects, Tasks, Documents, and Approvals.
- Added selected Gmail/Microsoft message picker UI with preview/confirm flow for imported knowledge and created tasks.
- Added Sprint 27 Supabase migration for `enterprise_workflow_progress` and `workflow_timeline_events` with RLS.
- Added Sprint 27 tests for workflow evidence, review-to-work execution, tenant health/timeline rendering, and seed-gated Playwright golden-path coverage.
- Added Sprint 26 enterprise golden-path workflow service and reusable journey UX tying onboarding, Knowledge Hub, AI Workspace, AI Review Inbox, Tasks, Dashboard, and Audit Logs into one role-aware customer journey.
- Added Sprint 26 dashboard and AI Workspace journey surfaces with readiness score, next-best action, workflow-aware action queue, and tests for sequencing, RBAC locks, and rendering.
- Added repo-local Supabase CLI integration with pinned `supabase@2.109.1`, committed `supabase/config.toml`, migration verification script, package scripts, docs, and GitHub Actions coverage.
- Added Sprint 25 encrypted OAuth token vault with AES-GCM sealed token bundles, keyed fingerprints, and service-role-only Supabase storage.
- Added live Gmail selected-message import endpoint that fetches one authorized message, previews extracted tasks/decisions/stakeholders, and requires confirmation before creating records.
- Added all-tenant scheduled Pilot Command Center snapshot fan-out with run evidence.
- Added AI Workspace navigation entry to the tenant AI Review Inbox.
- Added required RAG release gate script and GitHub Actions workflow for citation, confidence, human-review, and permission regression checks.
- Added Sprint 25 Supabase migration for `oauth_token_vault`, `gmail_selected_message_imports`, and `command_center_snapshot_runs` with RLS.
- Added Sprint 24 tenant-facing AI Review Inbox with review read/decision APIs.
- Added Sprint 24 OAuth callback/token exchange path with signed state verification and token-reference connection upserts.
- Added daily Vercel Cron route for command-center snapshot persistence.
- Added approved sandbox runner invocation path behind policy attestation.
- Added RAG release gate evaluator and persistence API.
- Added Sprint 24 Supabase migration for OAuth state records, sandbox runner invocations, and RAG release gates with RLS.
- Added Sprint 22/23 Pilot Command Center for readiness, connector execution, governed AI review, sandbox policy, RAG evaluation, and audit evidence.
- Added `GET /api/admin/pilot-command-center` and a role-protected `/admin/pilot-command-center` admin surface.
- Added Sprint 22/23 Supabase migration for command-center snapshots, AI operation reviews, connector execution queue, sandbox attestations, and RAG evaluation runs with tenant-scoped RLS.
- Added tests for Pilot Command Center scoring, route metadata, and Sprint 22/23 RLS policy expectations.
- Added Sprint 18 Pilot Conversion dashboard with tenant-scoped pilot health scoring and demo fallback.
- Added governed server-side audit exports with immutable export metadata and short-lived export tokens.
- Added signed Resend invitation delivery webhook ingestion with hashed recipient evidence.
- Added Sprint 18 Supabase migration for `audit_exports` and `invitation_delivery_events` with admin-scoped RLS.
- Added mobile admin visual regression workflow and screenshots for organization admin, audit logs, and pilot conversion.
- Added Sprint 17 pilot readiness event API with authenticated Supabase writes, sanitized metadata, and audit logging.
- Added optional Resend-compatible invitation email delivery with manual acceptance URL fallback when email is not configured.
- Added mobile card fallbacks for Organization Admin and Audit Logs tables plus seed-gated Playwright coverage.
- Added Sprint 16 pilot readiness hardening with tenant administration, audit-log review/export, expanded first-tenant onboarding, and admin navigation entries.
- Added Sprint 16 Supabase migration for tenant-scoped pilot readiness events plus audit-log indexes for review and export workflows.
- Added Sprint 16 routing, RBAC, onboarding, and RLS tests for pilot admin and audit surfaces.
- Added a Capacitor/Webnative mobile shell under `apps/mobile-capacitor` with Android/iOS build scripts, signing placeholders, environment validation, versioning metadata, and release documentation.
- Added Sprint 15 enterprise frontend coherence pass with shared module headers, metrics, data-state badges, confidence/human-review/audit badges, activity feeds, workflow cards, and demo notices.
- Added guided investor demo state, progress banner, dashboard start CTA, clean screenshot mode, and coherent demo seed slices for metrics, activity, documents, stakeholders, approvals, and workflows.
- Polished Executive Dashboard, AI Workspace, Knowledge Hub, Approvals, CRM, Projects, Tasks, and Analytics with live/demo/provider-gated labels and cross-screen workflow context.
- Added Sprint 15 frontend audit, product walkthrough, frontend architecture, screenshot guide, and sprint log documentation.
- Added Sprint 14 AI-native platform layer with provider-gated routing for OpenAI, Anthropic, Google, xAI, Falcon, Jais, and local fallback.
- Added Sprint 14 RAG ingestion, embedding, vector store, evaluation, repository foundation, and Supabase migration for RAG chunks, ingestion runs, integration connections, and social alert events.
- Added open-source NLP model registry covering IndicBERT, MuRIL, IndicTrans2, LaBSE, XLM-R, multilingual-e5, bge-m3, sentence-transformers, fastText, and NLLB.
- Added productivity plugin registry, integration health cards, live dashboard provider hooks, social alerts screen, cross-screen workflow demo service, and Wix-safe public website export.
- Fixed Expo GitHub build readiness by adding required EAS GitHub build images and documenting the correct `apps/mobile` base directory.
- Configured Expo mobile builds to use EAS-managed remote credentials for iOS and Android app signing, with explicit app identifiers and credential safety docs.
- Added Expo EAS workflow for manual Android and iOS production builds.
- Added root and mobile scripts for direct all-platform EAS production builds and EAS workflow runs.
- Added Wix setup correction docs so local setup points to `axxess-triaxis/AXXESSTRIAXIS` instead of stale repository instructions.
- Added Sprint 13 audit document, onboarding route family, sign-up/password recovery/MFA/passkey-ready route surfaces, account deletion and privacy request initiation.
- Added Sprint 13 admin readiness pages for organization, departments, workspaces, users, roles, invitations, privacy, compliance, AI governance, prompt approvals, audit logs, and backups.
- Added Sprint 13 Supabase migration for tenant/workspace metadata, RLS helper functions, prompt review states, AI output review states, and checked-in RLS persona test artifacts.
- Added Expo mobile scaffold under `apps/mobile` with EAS profiles, mobile auth helper, core beta screens, and mobile README.
- Added Bitrise workflows, GitHub Playwright/mobile/Supabase RLS workflows, backup/restore scripts, store readiness docs, analytics docs, and due diligence pack.
- Added Sprint 12 enterprise IAM, tenant guard, immutable audit-chain, privacy request, compliance control, prompt governance, and PostHog observability foundations.
- Added Sprint 12 Supabase migration for departments, workspaces, security audit events, privacy requests, consents, retention policies, compliance policies, prompt registry, AI output audit, encryption key registry, and vector index manifests with RLS policies.
- Added GitHub security workflow for CodeQL, dependency review, critical `pnpm audit`, and Gitleaks secret scanning.
- Added security architecture, compliance, privacy engineering, AI governance, observability, DevSecOps, backup/DR, mobile release, API, schema, admin operations, and Sprint 12 readiness documentation.
- Added Sprint 11 production demo hardening with Supabase-to-demo repository fallback for investor-facing dashboards.
- Expanded the North East Health Mission demo corpus to 2,200 realistic institutional documents and 4,200 document activity records.
- Added governed RAG services for document chunking, tenant-aware retrieval, permission filtering, citations, confidence scoring, human review flags, and answer audit logging.
- Added deterministic local NLP utilities for keyword extraction, summary fallback, entity extraction, document classification, tag suggestions, and regional language script detection.
- Added profile creation/editing helpers and Settings profile, organization, and permission panels.
- Updated dashboard, AI workspace, analytics, CRM, approvals, and Knowledge Hub copy to remove stale prototype/demo names.
- Added Sprint 11 tests for dashboard fallback, auth profile helpers, investor preview login, local NLP, and RAG permission filtering.
- Added Product Release 0.7 Knowledge Hub with documents, knowledge articles, categories, tags, search, activity, shared, favorites, and archived sections.
- Added Supabase Storage signed URL architecture for private enterprise documents.
- Added Sprint 9 document, version, permission, activity, knowledge article, search, and storage migration.
- Added Knowledge Hub repository, storage, permission, and E2E test foundations.
- Added document, storage, and search architecture documentation.
- Added Product Release 0.6 beta analytics, feedback, and pilot readiness work.
- Hardened repository documentation for enterprise collaboration.
- Added GitHub issue templates for bugs, features, documentation, and enhancements.
- Added pull request checklist, Dependabot configuration, and CI workflow coverage.
- Expanded environment variable documentation and ignore rules.
- Added repository audit documentation for follow-up engineering work.

## v0.7.0-beta - Knowledge Hub & Document Foundation

- Added repository-backed Knowledge Hub UI while preserving the existing AXXESS shell and visual language.
- Added enterprise document metadata workflows for upload, view, rename, visibility update, archive, restore, delete, categories, tags, and favorites-ready filtering.
- Added knowledge article drafting and publishing foundations without AI or RAG.
- Added private Supabase Storage bucket policy design with signed upload and download URL endpoint.
- Added PostgreSQL `tsvector` search vectors for documents and knowledge articles.
- Added RLS policies for tenant isolation, role-aware writes, explicit sharing, and guest-safe access.
- Added audit activity tracking for document actions and metadata changes.
- Added `docs/DOCUMENTS.md`, `docs/STORAGE.md`, and `docs/SEARCH.md`.

## v0.6.0-beta - Beta Analytics & Pilot Readiness

- Added Mixpanel-ready analytics service architecture with mock analytics as the default when no token is configured.
- Added privacy sanitization for tracked event payloads and user properties.
- Added safe product event tracking across sessions, navigation, projects, tasks, meetings, notifications, administration, feedback, empty states, and error boundaries.
- Added beta feedback submission workflow with Supabase-backed repository and API route.
- Added `beta_feedback` migration with RLS policies and explicit authenticated grants.
- Added internal beta readiness and product analytics admin pages.
- Added beta onboarding checklist with local progress persistence.
- Added Sprint 8 unit, RLS, route, onboarding, and Playwright E2E foundations.
- Updated beta testing, analytics, privacy, and release process documentation.

## 0.4.0 - Sprint 4

- Migrated runtime architecture toward Next.js 15 App Router.
- Added enterprise route metadata and route guard architecture.
- Added repository/service interfaces and provider boundary.
- Added GitHub, Vercel, Docker, Supabase, and test readiness scaffolding.

## 0.3.0 - Sprint 3

- Added route metadata, module boundaries, auth facade, and Supabase mock fixtures.

## 0.2.0 - Sprint 2

- Extracted feature modules and introduced lazy route chunks.

## 0.1.0 - Sprint 1

- Added app shell, dashboard foundation, domain types, mock data, feedback states, and design tokens.
